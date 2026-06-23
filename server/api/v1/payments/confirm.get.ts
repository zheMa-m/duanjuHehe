
// @api-auth: public
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { getStripeClient } from '~~/server/utils/payments'
import { logAuditEvent } from '~~/server/utils/logger'

defineRouteMeta({
  openAPI: {
    tags: ['支付'],
    summary: '支付确认回调',
    description: '处理 Stripe 结账后的重定向，验证 session_id 并将订单标记为已支付。',
    parameters: [
      { in: 'query', name: 'order_id', required: true, schema: { type: 'string' }, description: '本地订单 ID' },
      { in: 'query', name: 'session_id', required: true, schema: { type: 'string' }, description: 'Stripe Checkout 会话 ID' },
    ],
    responses: {
      200: { description: '支付已确认' },
      400: { description: '参数错误或校验失败' },
      404: { description: '订单未找到' },
    },
  } as any,
})

/**
 * 支付确认页面处理
 * GET /api/v1/payments/confirm?order_id=xxx&session_id=yyy
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const orderId = query.order_id as string
  const sessionId = query.session_id as string

  if (!orderId || !sessionId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing order_id or session_id parameter' })
  }

  const db = getDB(event)

  // 1. 精确查询订单
  const { data: order, error } = await db.from('orders').select('*').eq('id', orderId).single()
  if (error || !order) {
    throw createError({ statusCode: 404, statusMessage: 'Order not found' })
  }

  // 2. 幂等性处理：若已支付，直接返回成功
  if (order.status === 'paid') {
    return sendSuccess(event, {
      orderId: order.id,
      orderNo: order.order_no,
      status: 'paid',
      message: 'Payment has already been confirmed'
    }, 'Payment already confirmed')
  }

  let paymentIntentId = ''

  // 3. 校验 Session 并提取真实的 Payment Intent ID
  if (process.env.MOCK_DB === 'true') {
    // Mock 模式校验
    if (!sessionId.startsWith('cs_mock_')) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid mock session ID' })
    }
    paymentIntentId = `pi_mock_${order.id}`
  } else {
    // 真实模式：必须向 Stripe API 发送检索请求，确保并非前端伪造
    // 从 system_configs 读取 Stripe 私钥（已迁移至 DB 管理）
    const { data: secretsRow } = await db
      .from('system_configs')
      .select('value')
      .eq('key', 'payment_secrets')
      .single()
    const stripeSecretKey = secretsRow?.value?.stripe?.secretKey || undefined
    const stripe = getStripeClient(stripeSecretKey)
    if (!stripe) {
      throw createError({ statusCode: 500, statusMessage: 'Stripe client is not initialized' })
    }

    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId)
      if (!session) {
        throw new Error('Session not found in Stripe')
      }

      // 验证 metadata 是否和当前订单匹配，且支付状态是否为 paid
      const metaOrderId = session.metadata?.orderId
      if (metaOrderId !== orderId) {
        throw new Error(`Order ID mismatch. Expected: ${orderId}, Stripe session meta: ${metaOrderId}`)
      }

      if (session.payment_status !== 'paid') {
        throw new Error(`Payment status not paid yet: ${session.payment_status}`)
      }

      paymentIntentId = session.payment_intent as string || ''
    } catch (err: any) {
      console.error('[Payments] Confirm session retrieve failed:', err.message)
      throw createError({ statusCode: 400, statusMessage: `Payment validation failed: ${err.message}` })
    }
  }

  // 4. 更新订单状态为已支付，并更新真实的 payment_intent_id
  await db.from('orders').update({
    status: 'paid',
    payment_intent_id: paymentIntentId || null,
    updated_at: new Date().toISOString()
  }).eq('id', orderId)

  // 5. 联动升级用户 Profiles (在 Webhook 漏掉或延迟到达时，Confirm 起到同步防卡关作用)
  if (order.user_id) {
    await db.from('profiles').update({
      plan_status: 'pro',
      updated_at: new Date().toISOString()
    }).eq('id', order.user_id)
  }

  // 6. 审计日志记录
  await logAuditEvent(
    event,
    { id: order.user_id || 'anonymous', username: 'payment-confirm', role: 'user' },
    `PAYMENT_CONFIRM:${order.order_no}:status=paid`,
    'SUCCESS'
  )

  return sendSuccess(event, {
    orderId: order.id,
    orderNo: order.order_no,
    status: 'paid',
    message: 'Payment confirmed successfully'
  }, 'Payment confirmed')
})
