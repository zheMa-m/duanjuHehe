// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { assertAdmin } from '~~/server/utils/auth'
import { logAuditEvent } from '~~/server/utils/logger'
import { getStripeClient } from '~~/server/utils/payments'

defineRouteMeta({
  openAPI: {
    tags: ['管理端订单'],
    summary: '管理员订单一键退款与降级',
    description: '管理员可用此端点对已付（paid）订单发起全额退款。如果是周期性计费订阅，会同步取消 Stripe 的订阅合同并立即将用户 Profiles 降级为 free 级别。',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: '订单 ID (UUID)' },
    ],
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

  const provider = order.payment_provider || 'stripe'

  if (process.env.MOCK_DB === 'true') {
    // 3. Mock 模式下，直接修改数据库状态模拟闭环
    // 修改订单状态
    await db.from('orders').update({
      status: 'refunded',
      refund_reason: 'requested_by_customer',
      refunded_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq('id', id)

    if (order.user_id) {
      // 降级用户 Profile
      await db.from('profiles').update({
        plan_status: 'free',
        updated_at: new Date().toISOString()
      }).eq('id', order.user_id)

      // 取消关联订阅
      await db.from('subscriptions').update({
        status: 'canceled',
        updated_at: new Date().toISOString()
      }).eq('user_id', order.user_id).eq('status', 'active')
    }

    // Log refund transaction
    const { logPaymentTransaction } = await import('~~/server/utils/payment-transaction')
    await logPaymentTransaction(event, {
      orderId: id,
      provider,
      type: 'refund',
      gatewayTransactionId: order.payment_intent_id,
      amount: order.amount,
      currency: order.currency || 'USD',
      status: 'refunded',
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
        // (1) 向 Stripe 发起原路退款
        await stripe.refunds.create({
          payment_intent: order.payment_intent_id,
          reason: 'requested_by_customer'
        })

        // (2) 联动检索并取消该用户的活跃订阅（若存在）
        if (order.user_id) {
          const { data: activeSub } = await db
            .from('subscriptions')
            .select('*')
            .eq('user_id', order.user_id)
            .eq('status', 'active')
            .single()

          if (activeSub) {
            await stripe.subscriptions.cancel(activeSub.stripe_subscription_id)
            await db.from('subscriptions').update({
              status: 'canceled',
              updated_at: new Date().toISOString()
            }).eq('id', activeSub.id)
          }
        }

        // (3) 本地订单设为已退款
        await db.from('orders').update({
          status: 'refunded',
          refund_reason: 'requested_by_customer',
          refunded_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }).eq('id', id)

        if (order.user_id) {
          await db.from('profiles').update({
            plan_status: 'free',
            updated_at: new Date().toISOString()
          }).eq('id', order.user_id)
        }

        // Log refund transaction
        const { logPaymentTransaction: logTx } = await import('~~/server/utils/payment-transaction')
        await logTx(event, {
          orderId: id,
          provider: 'stripe',
          type: 'refund',
          gatewayTransactionId: order.payment_intent_id,
          amount: order.amount,
          currency: order.currency || 'USD',
          status: 'refunded',
        })
      } catch (err: any) {
        console.error('[Stripe Refund] Action failed:', err.message)
        throw createError({
          statusCode: 500,
          statusMessage: `Gateway refund failed: ${err.message}`
        })
      }
    } else if (provider === 'paypal' && order.payment_intent_id) {
      // PayPal refund via strategy
      const { PayPalPaymentStrategy } = await import('~~/server/utils/payment-strategies/paypal')
      const paypal = new PayPalPaymentStrategy()
      await paypal.refundPayment(order.payment_intent_id)

      await db.from('orders').update({
        status: 'refunded',
        refund_reason: 'requested_by_customer',
        refunded_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).eq('id', id)

      const { logPaymentTransaction: logTx } = await import('~~/server/utils/payment-transaction')
      await logTx(event, {
        orderId: id,
        provider: 'paypal',
        type: 'refund',
        gatewayTransactionId: order.payment_intent_id,
        amount: order.amount,
        currency: order.currency || 'USD',
        status: 'refunded',
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
    `ADMIN_REFUND_SUCCESS:${order.order_no}:user_id=${order.user_id || 'none'}`,
    'SUCCESS'
  )

  return sendSuccess(event, { orderId: id, status: 'refunded' }, 'Order refunded and user plan status downgraded')
})
