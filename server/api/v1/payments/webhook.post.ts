import { getHeader, readRawBody } from 'h3'
import { getDB } from '~~/server/utils/db'
import { verifyWebhookSignature } from '~~/server/utils/payments'
import { logAuditEvent } from '~~/server/utils/logger'

defineRouteMeta({
  openAPI: {
    tags: ['Payments'],
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
  const rawBody = await readRawBody(event, false)
  const signature = getHeader(event, 'stripe-signature') || ''

  if (!rawBody) {
    throw createError({ statusCode: 400, statusMessage: 'Missing request body' })
  }

  const stripeEvent = verifyWebhookSignature(rawBody, signature)
  if (!stripeEvent) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid webhook signature' })
  }

  const db = getDB(event)

  // 处理 checkout.session.completed
  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object
    const orderId = session.metadata?.orderId
    const paymentIntentId = session.payment_intent as string

    if (orderId) {
      await db.from('orders').update({
        status: 'paid',
        payment_intent_id: paymentIntentId,
        updated_at: new Date().toISOString()
      }).eq('id', orderId)

      await logAuditEvent(
        event,
        { id: 'stripe-webhook', username: 'stripe', role: 'system' },
        `PAYMENT_WEBHOOK:checkout.completed:${orderId}`,
        'SUCCESS'
      )
    }
  }

  // 处理 charge.refunded
  if (stripeEvent.type === 'charge.refunded') {
    const charge = stripeEvent.data.object
    const paymentIntentId = charge.payment_intent

    if (paymentIntentId) {
      await db.from('orders').update({
        status: 'refunded',
        updated_at: new Date().toISOString()
      }).eq('payment_intent_id', paymentIntentId)

      await logAuditEvent(
        event,
        { id: 'stripe-webhook', username: 'stripe', role: 'system' },
        `PAYMENT_WEBHOOK:charge.refunded:${paymentIntentId}`,
        'WARNING'
      )
    }
  }

  return { received: true }
})
