
// @api-auth: public
import { getHeader, readRawBody } from 'h3'
import { getDB } from '~~/server/utils/db'
import { verifyWebhookSignature } from '~~/server/utils/payments'
import { logAuditEvent } from '~~/server/utils/logger'

defineRouteMeta({
  openAPI: {
    tags: ['支付'],
    summary: 'Stripe Webhook 处理器',
    description: '接收 Stripe webhook 事件（checkout.session.completed、charge.refunded），通过 stripe-signature 头部验证。',
    requestBody: {
      description: 'Stripe 原始事件 payload',
      content: { 'application/json': { schema: { type: 'object' } } },
    },
    responses: {
      200: { description: '事件已处理 — { received: true }' },
      400: { description: '签名无效或缺少请求体' },
    },
  } as any,
})

/**
 * Stripe Webhook 端点
 * POST /api/v1/payments/webhook
 *
 * 注意：此端点不受 Auth 中间件保护 — 使用 Stripe 签名验证替代。
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const provider = ((query.provider as string) || 'stripe').toLowerCase()

  const rawBody = await readRawBody(event, false)
  // 不同支付提供商的 signature 头部不同，我们做兼容处理
  const signature = getHeader(event, 'stripe-signature') || getHeader(event, 'paypal-transmission-sig') || ''

  if (!rawBody) {
    throw createError({ statusCode: 400, statusMessage: 'Missing request body' })
  }

  // 获取对应策略实例进行 Webhook 验证
  const strategy = getPaymentStrategy(provider)
  const result = await strategy.verifyWebhook(rawBody, signature)

  if (!result) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid webhook signature' })
  }

  const db = getDB(event)

  // 1. 幂等性检查与反查 user_id
  let existingOrder: any = null
  if (result.orderId) {
    const { data } = await db.from('orders').select('status, user_id').eq('id', result.orderId).single()
    existingOrder = data
  } else if (result.paymentIntentId) {
    // 兼容退款事件：通常只能拿到 paymentIntentId，需要反查订单
    const { data } = await db.from('orders').select('status, user_id').eq('payment_intent_id', result.paymentIntentId).single()
    existingOrder = data
  }

  // 如果事件已被成功消费且状态一致，直接幂等返回，防止重复处理和审计日志冗余
  if (existingOrder && existingOrder.status === result.status) {
    return { received: true, message: 'duplicate event ignored' }
  }

  const targetUserId = result.userId || existingOrder?.user_id

  // 2. 同步订单状态 (Orders)
  if (result.orderId) {
    const updatePayload: any = {
      status: result.status,
      updated_at: new Date().toISOString()
    }
    if (result.paymentIntentId) {
      updatePayload.payment_intent_id = result.paymentIntentId
    }
    await db.from('orders').update(updatePayload).eq('id', result.orderId)
  } else if (result.paymentIntentId) {
    await db.from('orders').update({
      status: result.status,
      updated_at: new Date().toISOString()
    }).eq('payment_intent_id', result.paymentIntentId)
  }

  // 3. 同步订阅周期 (Subscriptions)
  if (result.subscriptionDetails) {
    const details = result.subscriptionDetails
    await db.from('subscriptions').upsert({
      user_id: targetUserId,
      stripe_subscription_id: details.stripeSubscriptionId,
      status: result.status === 'paid' ? 'active' : 'canceled',
      price_id: details.priceId,
      quantity: details.quantity,
      cancel_at_period_end: details.cancelAtPeriodEnd,
      current_period_start: details.currentPeriodStart,
      current_period_end: details.currentPeriodEnd,
    })
  } else if (result.stripeSubscriptionId && result.status === 'failed') {
    await db.from('subscriptions').update({
      status: 'canceled',
      updated_at: new Date().toISOString()
    }).eq('stripe_subscription_id', result.stripeSubscriptionId)
  }

  // 4. 联动升级/降级用户资料表 (Profiles)
  if (targetUserId) {
    let nextPlanStatus = 'free'
    if (result.status === 'paid') {
      nextPlanStatus = 'pro'
    }
    
    await db.from('profiles').update({
      plan_status: nextPlanStatus,
      updated_at: new Date().toISOString()
    }).eq('id', targetUserId)
  }

  await logAuditEvent(
    event,
    { id: `${provider}-webhook`, username: provider, role: 'system' },
    `PAYMENT_WEBHOOK:${result.eventLog}:status=${result.status}`,
    result.status === 'paid' ? 'SUCCESS' : 'WARNING'
  )

  return { received: true }
})
