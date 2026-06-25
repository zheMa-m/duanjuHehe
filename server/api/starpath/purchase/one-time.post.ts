// @api-auth: public
import { z } from 'zod'
import { getDB } from '~~/server/utils/db'
import { sendSuccess, throwError } from '~~/server/utils/response'
import { starpathService } from '~~/server/services/starpath-service'

const purchaseSchema = z.object({
  bizCode: z.literal('starpath'),
  sessionId: z.string().min(1),
  platform: z.enum(['ios', 'android']),
  paymentMethod: z.enum(['paypal', 'apple-pay', 'google-pay', 'card']),
  campaignId: z.string().uuid().optional(),
})

defineRouteMeta({
  openAPI: {
    tags: ['智能问卷'],
    summary: '一次性购买报告',
    description: '用户完成问卷后，一次性购买 AI 占星报告。创建订单并关联报告记录，支付后触发报告生成与邮件发送。',
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['sessionId', 'platform', 'paymentMethod'],
            properties: {
              bizCode: { type: 'string', enum: ['starpath'] },
              sessionId: { type: 'string', description: '问卷 session ID' },
              platform: { type: 'string', enum: ['ios', 'android'] },
              paymentMethod: { type: 'string', enum: ['paypal', 'apple-pay', 'google-pay', 'card'] },
              campaignId: { type: 'string', format: 'uuid', description: '营销活动 ID（可选）' },
            },
          },
        },
      },
    },
    responses: {
      200: { description: '订单创建成功，含 orderId 与金额' },
      400: { description: '参数校验失败' },
      404: { description: 'Session 不存在' },
    },
  } as any,
})

/**
 * 一次性购买报告
 * POST /api/starpath/purchase/one-time
 *
 * 流程：
 *   1. 验证 session 存在且为 completed
 *   2. 查找或创建 ai_reports 记录（pending，支付后才生成内容）
 *   3. 创建一次性购买订单（orders + campaign_orders）
 *   4. 返回 orderId + amount（前端跳转到支付渠道完成支付）
 */
export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, purchaseSchema.parse)
  const db = getDB(event)

  // 1. 验证 session 存在且已完成
  const { data: session, error: sessionError } = await db
    .from('questionnaire_sessions')
    .select('id, campaign_id, status')
    .eq('id', body.sessionId)
    .single()

  if (sessionError || !session) {
    throwError(404, 'Session not found')
  }

  if (session.status !== 'completed') {
    throwError(400, 'Questionnaire not yet completed')
  }

  // 2. 解析 campaign ID
  const campaignId = body.campaignId || session.campaign_id

  // 3. 解析支付渠道
  const paymentProviderMap: Record<string, string> = {
    'apple-pay': 'apple_iap',
    'google-pay': 'google_pay',
    'paypal': 'paypal',
    'card': 'stripe',
  }
  const paymentMethod = paymentProviderMap[body.paymentMethod] || body.paymentMethod

  // 4. 创建一次性购买订单
  const result = await starpathService.createOneTimeOrder(event, {
    sessionId: body.sessionId,
    campaignId,
    platform: body.platform,
    paymentMethod,
  })

  return sendSuccess(event, result, 'One-time purchase order created')
})
