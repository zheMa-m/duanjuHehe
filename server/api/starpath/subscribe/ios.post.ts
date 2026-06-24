// @api-auth: public
import { z } from 'zod'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { starpathService } from '~~/server/services/starpath-service'

const subscribeSchema = z.object({
  bizCode: z.literal('starpath'),
  platform: z.enum(['ios', 'android']),
  plan: z.enum(['trial-7d', 'monthly']),
  paymentMethod: z.enum(['paypal', 'apple-pay', 'google-pay', 'card']),
  reportId: z.string().min(1).optional(),
  campaignId: z.string().uuid().optional(),
})

const PLAN_PRICES: Record<string, number> = { 'trial-7d': 7.99, monthly: 29.99 }

defineRouteMeta({
  openAPI: {
    tags: ['智能问卷'],
    summary: '创建订阅订单',
    description: '处理 智能问卷 订阅下单（iOS / Android 通用），写入统一 orders 表。',
    requestBody: {
      content: { 'application/json': { schema: { type: 'object' } } },
    },
    responses: {
      200: { description: '订单创建结果（含 orderId）' },
      400: { description: '参数校验失败' },
    },
  } as any,
})

/**
 * 智能问卷 订阅下单
 * POST /api/starpath/subscribe/ios
 * POST /api/starpath/subscribe/android
 */
export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, subscribeSchema.parse)
  const db = getDB(event)

  const campaignId = body.campaignId || (await resolveCampaign(db))
  const amount = PLAN_PRICES[body.plan] || 7.99

  const paymentProviderMap: Record<string, string> = {
    'apple-pay': 'apple_iap',
    'google-pay': 'google_pay',
    'paypal': 'paypal',
    'card': 'stripe',
  }
  const paymentMethod = paymentProviderMap[body.paymentMethod] || body.paymentMethod

  const order = await starpathService.createOrder(event, {
    campaignId,
    userId: null,
    sessionId: undefined,
    reportId: body.reportId,
    platform: body.platform,
    paymentMethod,
    plan: body.plan,
    amount,
    currency: 'USD',
  })

  return sendSuccess(event, {
    orderId: order.id,
    status: order.status,
    plan: body.plan,
    amount,
  }, 'Order created')
})

async function resolveCampaign(db: any): Promise<string> {
  const { data } = await db
    .from('campaigns')
    .select('id')
    .eq('subdomain', 'starpath')
    .single()
  if (data) return data.id
  throw createError({ statusCode: 500, statusMessage: '智能问卷 campaign not configured' })
}
