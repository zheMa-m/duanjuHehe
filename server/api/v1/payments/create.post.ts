
// @api-auth: user
import { z } from 'zod'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { assertUser } from '~~/server/utils/auth'
import { logAuditEvent } from '~~/server/utils/logger'
import { createCheckoutSession, generateOrderNo } from '~~/server/utils/payments'

defineRouteMeta({
  openAPI: {
    tags: ['Payments'],
    summary: '创建 Stripe Checkout 会话',
    description: '创建订单记录并发起 Stripe Checkout 会话，返回结账链接。',
    security: [{ BearerAuth: [] }],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              productId: { type: 'string' },
              productName: { type: 'string' },
              amount: { type: 'number' },
              currency: { type: 'string', default: 'USD' },
            },
            required: ['productId', 'productName', 'amount'],
          },
        },
      },
    },
    responses: {
      200: { description: '结账会话创建成功 — 返回 orderId、checkoutUrl、sessionId' },
    },
  } as any,
})

const createPaymentSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().min(3).max(3).default('USD'),
})

/**
 * 创建 Stripe Checkout 会话
 * POST /api/v1/payments/create
 */
export default defineEventHandler(async (event) => {
  const user = assertUser(event)
  const body = await readValidatedBody(event, createPaymentSchema.parse)
  const db = getDB(event)

  // 创建订单记录
  const orderNo = generateOrderNo()
  const orderId = `ord-${Date.now()}`

  await db.from('orders').insert({
    id: orderId,
    order_no: orderNo,
    product_id: body.productId,
    product_name: body.productName,
    amount: body.amount,
    currency: body.currency.toUpperCase(),
    status: 'pending',
    user_id: user.id,
    payment_provider: 'stripe',
  })

  // 创建 Stripe Checkout 会话
  const session = await createCheckoutSession({
    productName: body.productName,
    amount: body.amount,
    currency: body.currency,
    orderId,
  })

  // 使用支付意图 ID 更新订单
  await db.from('orders').update({ payment_intent_id: session.paymentIntentId }).eq('id', orderId)

  await logAuditEvent(event, user, `PAYMENT_CREATE:${orderNo}`, 'SUCCESS')

  return sendSuccess(event, {
    orderId,
    orderNo,
    checkoutUrl: session.url,
    sessionId: session.sessionId,
  }, 'Checkout session created')
})
