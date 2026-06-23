// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { assertAdmin } from '~~/server/utils/auth'
import { logAuditEvent } from '~~/server/utils/logger'
import { getStripeClient } from '~~/server/utils/payments'
import { getPaymentStrategy } from '~~/server/utils/payment-strategies/factory'

defineRouteMeta({
  openAPI: {
    tags: ['管理端订单'],
    summary: '管理员订单退款与降级（支持部分退款）',
    description: '管理员可用此端点对已付（paid）订单发起全额或部分退款。如果是周期性计费订阅，全额退款时同步取消 Stripe 的订阅合同并将用户 Profiles 降级为 free 级别。',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: '订单 ID (UUID)' },
    ],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              refundAmount: { type: 'number', minimum: 0.01, description: '部分退款金额，不传则全额退款' },
            },
          },
        },
      },
    },
    responses: {
      200: { description: '退款与降级成功完成' },
      400: { description: '订单不满足退款条件' },
      404: { description: '订单未找到' },
    },
  } as any,
})

/**
 * 订单退款与降级处理
 * POST /api/admin/orders/:id/refund
 */
export default defineEventHandler(async (event) => {
  const adminUser = assertAdmin(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing order ID' })
  }

  const body = await readBody(event).catch(() => ({}))
  let refundAmount: number | undefined = body?.refundAmount
    ? Number(body.refundAmount)
    : undefined

  const db = getDB(event)

  // 1. 查询订单
  const { data: order, error: orderErr } = await db
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (orderErr || !order) {
    throw createError({ statusCode: 404, statusMessage: 'Order not found' })
  }

  // 2. 校验退款可行性
  if (order.status !== 'paid') {
    throw createError({
      statusCode: 400,
      statusMessage: `Order status is [${order.status}], only 'paid' orders can be refunded.`
    })
  }

  if (!order.payment_intent_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Refund failed: Missing payment intent ID on this order.'
    })
  }

  // 校验退款金额
  const orderAmount = Number(order.amount)
  const isPartialRefund = refundAmount !== undefined && refundAmount < orderAmount
  if (refundAmount !== undefined) {
    if (refundAmount <= 0) {
      throw createError({ statusCode: 400, statusMessage: 'Refund amount must be positive' })
    }
    if (refundAmount > orderAmount) {
      throw createError({ statusCode: 400, statusMessage: `Refund amount ${refundAmount} exceeds order amount ${orderAmount}` })
    }
  }

  const actualRefundAmount = refundAmount ?? orderAmount
  const isFullRefund = !isPartialRefund

  const provider = order.payment_provider || 'stripe'

  if (process.env.MOCK_DB === 'true') {
    // 3. Mock 模式下，直接修改数据库状态模拟闭环
    const newStatus = isFullRefund ? 'refunded' : 'paid'

    await db.from('orders').update({
      status: newStatus,
      refund_amount: actualRefundAmount,
      refund_reason: 'requested_by_customer',
      refunded_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq('id', id)

    // 仅全额退款时降级用户
    if (isFullRefund && order.user_id) {
      await db.from('profiles').update({
        plan_status: 'free',
        updated_at: new Date().toISOString()
      }).eq('id', order.user_id)

      await db.from('subscriptions').update({
        status: 'canceled',
        updated_at: new Date().toISOString()
      }).eq('user_id', order.user_id).eq('status', 'active')
    }

    const { logPaymentTransaction } = await import('~~/server/utils/payment-transaction')
    await logPaymentTransaction(event, {
      orderId: id,
      provider,
      type: isFullRefund ? 'refund' : 'partial_refund',
      gatewayTransactionId: order.payment_intent_id,
      amount: actualRefundAmount,
      currency: order.currency || 'USD',
      status: isFullRefund ? 'refunded' : 'partial_refund',
    })
  } else {
    // 4. 真实支付渠道退款闭环
    // Stripe: native refund API
    // PayPal: REST refund API via strategy
    // Manual: confirmManualRefund via strategy
    // Google Pay / Apple IAP: refund through associated gateway or strategy
    if (provider === 'stripe') {
      // 从 system_configs 读取 Stripe 私钥
      const { data: secretsRow } = await db
        .from('system_configs')
        .select('value')
        .eq('key', 'payment_secrets')
        .single()

      const stripeSecretKey = secretsRow?.value?.stripe?.secretKey || undefined
      const stripe = getStripeClient(stripeSecretKey)

      if (!stripe) {
        throw createError({ statusCode: 500, statusMessage: 'Stripe client is not configured' })
      }

      try {
        // (1) 向 Stripe 发起退款（支持部分退款）
        const refundParams: any = {
          payment_intent: order.payment_intent_id,
          reason: 'requested_by_customer',
        }
        if (isPartialRefund) {
          refundParams.amount = Math.round(actualRefundAmount * 100)
        }
        await stripe.refunds.create(refundParams)

        // (2) 仅全额退款时联动取消活跃订阅并降级用户
        if (isFullRefund && order.user_id) {
          const { data: activeSub } = await db
            .from('subscriptions')
            .select('*')
            .eq('user_id', order.user_id)
            .eq('status', 'active')
            .single()

          if (activeSub) {
            const stripeStrategy = getPaymentStrategy('stripe')
            if (stripeStrategy.cancelSubscription) {
              await stripeStrategy.cancelSubscription(activeSub, true)
            }
            await db.from('subscriptions').update({
              status: 'canceled',
              updated_at: new Date().toISOString()
            }).eq('id', activeSub.id)
          }

          await db.from('profiles').update({
            plan_status: 'free',
            updated_at: new Date().toISOString()
          }).eq('id', order.user_id)
        }

        // (3) 本地订单状态更新
        const newStatus = isFullRefund ? 'refunded' : 'paid'
        await db.from('orders').update({
          status: newStatus,
          refund_amount: actualRefundAmount,
          refund_reason: 'requested_by_customer',
          refunded_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }).eq('id', id)

        // Log refund transaction
        const { logPaymentTransaction: logTx } = await import('~~/server/utils/payment-transaction')
        await logTx(event, {
          orderId: id,
          provider: 'stripe',
          type: isFullRefund ? 'refund' : 'partial_refund',
          gatewayTransactionId: order.payment_intent_id,
          amount: actualRefundAmount,
          currency: order.currency || 'USD',
          status: isFullRefund ? 'refunded' : 'partial_refund',
        })
      } catch (err: any) {
        console.error('[Stripe Refund] Action failed:', err.message)
        throw createError({
          statusCode: 500,
          statusMessage: `Gateway refund failed: ${err.message}`
        })
      }
    } else if (provider === 'paypal' && order.payment_intent_id) {
      // PayPal refund via strategy (full refund only)
      const { PayPalPaymentStrategy } = await import('~~/server/utils/payment-strategies/paypal')
      const paypal = new PayPalPaymentStrategy()
      await paypal.refundPayment(order.payment_intent_id, actualRefundAmount)

      const newStatus = isFullRefund ? 'refunded' : 'paid'
      await db.from('orders').update({
        status: newStatus,
        refund_amount: actualRefundAmount,
        refund_reason: 'requested_by_customer',
        refunded_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).eq('id', id)

      const { logPaymentTransaction: logTx } = await import('~~/server/utils/payment-transaction')
      await logTx(event, {
        orderId: id,
        provider: 'paypal',
        type: isFullRefund ? 'refund' : 'partial_refund',
        gatewayTransactionId: order.payment_intent_id,
        amount: actualRefundAmount,
        currency: order.currency || 'USD',
        status: isFullRefund ? 'refunded' : 'partial_refund',
      })
    } else if (provider === 'manual') {
      // Manual refund via strategy
      const { ManualPaymentStrategy } = await import('~~/server/utils/payment-strategies/manual')
      const manual = new ManualPaymentStrategy()
      await manual.recordManualRefund(id, adminUser.id, 'requested_by_admin')

      // Manual strategy already updates orders + audit log
      const { logPaymentTransaction: logTx } = await import('~~/server/utils/payment-transaction')
      await logTx(event, {
        orderId: id,
        provider: 'manual',
        type: 'refund',
        status: 'refunded',
      })
    } else if (provider === 'google_pay') {
      // Google Pay refund — route through Stripe gateway
      // Google Pay payments are processed via Stripe, so we use the Stripe strategy
      const strategy = getPaymentStrategy('google_pay')
      if (!strategy.refundPayment) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Refund not supported for Google Pay'
        })
      }

      try {
        await strategy.refundPayment(order.payment_intent_id, isPartialRefund ? actualRefundAmount : undefined)

        // Cancel active subscriptions and downgrade user on full refund
        if (isFullRefund && order.user_id) {
          const { data: activeSub } = await db
            .from('subscriptions')
            .select('*')
            .eq('user_id', order.user_id)
            .eq('status', 'active')
            .single()

          if (activeSub) {
            const stripeStrategy = getPaymentStrategy('stripe')
            if (stripeStrategy.cancelSubscription) {
              await stripeStrategy.cancelSubscription(activeSub, true)
            }
            await db.from('subscriptions').update({
              status: 'canceled',
              updated_at: new Date().toISOString()
            }).eq('id', activeSub.id)
          }

          await db.from('profiles').update({
            plan_status: 'free',
            updated_at: new Date().toISOString()
          }).eq('id', order.user_id)
        }

        const newStatus = isFullRefund ? 'refunded' : 'paid'
        await db.from('orders').update({
          status: newStatus,
          refund_amount: actualRefundAmount,
          refund_reason: 'requested_by_customer',
          refunded_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }).eq('id', id)

        const { logPaymentTransaction: logTx } = await import('~~/server/utils/payment-transaction')
        await logTx(event, {
          orderId: id,
          provider: 'google_pay',
          type: isFullRefund ? 'refund' : 'partial_refund',
          gatewayTransactionId: order.payment_intent_id,
          amount: actualRefundAmount,
          currency: order.currency || 'USD',
          status: isFullRefund ? 'refunded' : 'partial_refund',
        })
      } catch (err: any) {
        console.error('[Google Pay Refund via Stripe] Action failed:', err.message)
        throw createError({
          statusCode: 500,
          statusMessage: `Google Pay refund via Stripe gateway failed: ${err.message}`
        })
      }
    } else if (provider === 'apple_iap') {
      // Apple IAP refund — record-only mode
      // Apple does not provide a server-side refund API.
      // Admin must process via App Store Connect manually.
      const strategy = getPaymentStrategy('apple_iap')
      if (!strategy.refundPayment) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Refund not supported for Apple IAP'
        })
      }

      try {
        // Call strategy to record the intent (returns informational response)
        const refundResult = await strategy.refundPayment(order.payment_intent_id)

        // Mark order as refunded locally
        await db.from('orders').update({
          status: 'refunded',
          refund_amount: order.amount,
          refund_reason: 'apple_iap_manual_refund_required',
          refunded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          extra_meta: {
            apple_iap_refund_note: refundResult.note || 'Apple IAP refund must be processed via App Store Connect manually.',
            apple_transaction_id: order.apple_transaction_id,
            refund_recorded_by: adminUser.id,
          },
        }).eq('id', id)

        const { logPaymentTransaction: logTx } = await import('~~/server/utils/payment-transaction')
        await logTx(event, {
          orderId: id,
          provider: 'apple_iap',
          type: 'refund',
          gatewayTransactionId: order.apple_transaction_id || order.payment_intent_id,
          amount: Number(order.amount),
          currency: order.currency || 'USD',
          status: 'refunded',
        })
      } catch (err: any) {
        console.error('[Apple IAP Refund Record] Action failed:', err.message)
        throw createError({
          statusCode: 500,
          statusMessage: `Apple IAP refund recording failed: ${err.message}`
        })
      }
    } else if (provider === 'alipay') {
      // Alipay refund via strategy
      const strategy = getPaymentStrategy('alipay')
      if (!strategy.refundPayment) {
        throw createError({ statusCode: 400, statusMessage: 'Refund not supported for Alipay' })
      }

      try {
        await strategy.refundPayment(order.payment_intent_id, isPartialRefund ? actualRefundAmount : undefined)

        // Cancel active subscriptions and downgrade user on full refund
        if (isFullRefund && order.user_id) {
          await db.from('subscriptions').update({
            status: 'canceled',
            updated_at: new Date().toISOString()
          }).eq('user_id', order.user_id).eq('status', 'active')

          await db.from('profiles').update({
            plan_status: 'free',
            updated_at: new Date().toISOString()
          }).eq('id', order.user_id)
        }

        const newStatus = isFullRefund ? 'refunded' : 'paid'
        await db.from('orders').update({
          status: newStatus,
          refund_amount: actualRefundAmount,
          refund_reason: 'requested_by_customer',
          refunded_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }).eq('id', id)

        const { logPaymentTransaction: logTx } = await import('~~/server/utils/payment-transaction')
        await logTx(event, {
          orderId: id,
          provider: 'alipay',
          type: isFullRefund ? 'refund' : 'partial_refund',
          gatewayTransactionId: order.payment_intent_id,
          amount: actualRefundAmount,
          currency: order.currency || 'CNY',
          status: isFullRefund ? 'refunded' : 'partial_refund',
        })
      } catch (err: any) {
        console.error('[Alipay Refund] Action failed:', err.message)
        throw createError({
          statusCode: 500,
          statusMessage: `Alipay refund failed: ${err.message}`
        })
      }
    } else if (provider === 'wechat') {
      // WeChat Pay refund via strategy
      const strategy = getPaymentStrategy('wechat')
      if (!strategy.refundPayment) {
        throw createError({ statusCode: 400, statusMessage: 'Refund not supported for WeChat Pay' })
      }

      try {
        await strategy.refundPayment(order.payment_intent_id, isPartialRefund ? actualRefundAmount : undefined)

        // Cancel active subscriptions and downgrade user on full refund
        if (isFullRefund && order.user_id) {
          await db.from('subscriptions').update({
            status: 'canceled',
            updated_at: new Date().toISOString()
          }).eq('user_id', order.user_id).eq('status', 'active')

          await db.from('profiles').update({
            plan_status: 'free',
            updated_at: new Date().toISOString()
          }).eq('id', order.user_id)
        }

        const newStatus = isFullRefund ? 'refunded' : 'paid'
        await db.from('orders').update({
          status: newStatus,
          refund_amount: actualRefundAmount,
          refund_reason: 'requested_by_customer',
          refunded_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }).eq('id', id)

        const { logPaymentTransaction: logTx } = await import('~~/server/utils/payment-transaction')
        await logTx(event, {
          orderId: id,
          provider: 'wechat',
          type: isFullRefund ? 'refund' : 'partial_refund',
          gatewayTransactionId: order.payment_intent_id,
          amount: actualRefundAmount,
          currency: order.currency || 'CNY',
          status: isFullRefund ? 'refunded' : 'partial_refund',
        })
      } catch (err: any) {
        console.error('[WeChat Pay Refund] Action failed:', err.message)
        throw createError({
          statusCode: 500,
          statusMessage: `WeChat Pay refund failed: ${err.message}`
        })
      }
    } else {
      throw createError({
        statusCode: 400,
        statusMessage: `Automated refund for provider [${provider}] is not yet supported. Use manual refund for this order.`
      })
    }
  }

  // 5. 审计日志记录
  await logAuditEvent(
    event,
    adminUser,
    `ADMIN_REFUND_${isFullRefund ? 'FULL' : 'PARTIAL'}:${order.order_no}:amount=${actualRefundAmount}:user_id=${order.user_id || 'none'}`,
    'SUCCESS'
  )

  return sendSuccess(event, {
    orderId: id,
    status: isFullRefund ? 'refunded' : 'paid',
    refundAmount: actualRefundAmount,
    isFullRefund,
  }, isFullRefund
    ? 'Order fully refunded and user plan status downgraded'
    : `Partial refund of ${actualRefundAmount} ${order.currency} processed`)
})
