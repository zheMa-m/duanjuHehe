
// @api-auth: user
import { z } from 'zod'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { assertUser } from '~~/server/utils/auth'
import { logAuditEvent } from '~~/server/utils/logger'
import { createCheckoutSession, generateOrderNo } from '~~/server/utils/payments'

defineRouteMeta({
  openAPI: {
    tags: ['支付'],
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
  provider: z.string().default('stripe'),
  mode: z.enum(['payment', 'subscription']).default('payment'),
  priceId: z.string().optional(),
})

/**
 * 创建支付 Checkout 会话
 * POST /api/v1/payments/create
 */
export default defineEventHandler(async (event) => {
  const user = await assertUser(event)
  const body = await readValidatedBody(event, createPaymentSchema.parse)
  const db = getDB(event)

  // 1. 获取该渠道的开启状态
  const { data: config } = await db
    .from('payment_configs')
    .select('is_enabled')
    .eq('provider', body.provider.toLowerCase())
    .single()

  if (config && !config.is_enabled) {
    throw createError({
      statusCode: 400,
      statusMessage: `Payment channel [${body.provider}] is currently disabled.`
    })
  }

  // 2. 检索并同步 Stripe Customer ID
  const { data: userProfile } = await db
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  let stripeCustomerId = userProfile?.stripe_customer_id
  if (!stripeCustomerId && body.provider.toLowerCase() === 'stripe') {
    if (process.env.MOCK_DB === 'true') {
      stripeCustomerId = `cus_mock_${user.id}`
    } else {
      const stripe = getStripeClient()
      if (stripe) {
        try {
          const customer = await stripe.customers.create({
            email: user.email || undefined,
            metadata: { userId: user.id }
          })
          stripeCustomerId = customer.id
        } catch (err: any) {
          console.error('[Payments] Create customer failed:', err.message)
        }
      }
    }
    if (stripeCustomerId) {
      await db.from('profiles').update({ stripe_customer_id: stripeCustomerId }).eq('id', user.id)
    }
  }

  // 3. 创建本地订单记录（一次性订单）
  const orderNo = generateOrderNo()
  const orderId = crypto.randomUUID()

  await db.from('orders').insert({
    id: orderId,
    order_no: orderNo,
    product_id: body.productId,
    product_name: body.productName,
    amount: body.amount,
    currency: body.currency.toUpperCase(),
    status: 'pending',
    user_id: user.id,
    payment_provider: body.provider.toLowerCase(),
  })

  // 4. 调用策略创建会话并重定向
  const strategy = getPaymentStrategy(body.provider)
  const session = await strategy.createSession({
    userId: user.id,
    orderId,
    productName: body.productName,
    amount: body.amount,
    currency: body.currency,
    priceMeta: {
      mode: body.mode,
      priceId: body.priceId,
      stripePriceId: body.priceId,
      stripeCustomerId,
    },
    successUrl: `${process.env.NUXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payments/confirm?order_id=${orderId}&session_id={CHECKOUT_SESSION_ID}&provider=${body.provider}`,
    cancelUrl: `${process.env.NUXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payments/cancel?provider=${body.provider}`,
  })

  // 5. 更新订单意图凭证
  if (session.paymentIntentId) {
    await db.from('orders').update({ payment_intent_id: session.paymentIntentId }).eq('id', orderId)
  }

  await logAuditEvent(event, user, `PAYMENT_CREATE:${orderNo}:${body.provider}`, 'SUCCESS')

  return sendSuccess(event, {
    orderId,
    orderNo,
    checkoutUrl: session.checkoutUrl,
    sessionId: session.sessionId,
  }, 'Payment session created')
})
