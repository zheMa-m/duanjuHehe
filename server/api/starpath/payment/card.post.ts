// @api-auth: public
import { z } from 'zod'
import { sendSuccess } from '~~/server/utils/response'
import { starpathService } from '~~/server/services/starpath-service'
import { logPaymentTransaction } from '~~/server/utils/payment-transaction'

const cardSchema = z.object({
  bizCode: z.literal('starpath'),
  orderId: z.string().min(1),
  paymentToken: z.string().min(1),
  cardholderName: z.string().min(1),
})

defineRouteMeta({
  openAPI: {
    tags: ['智能问卷'],
    summary: '信用卡支付确认',
    description: '确认 智能问卷 信用卡（Stripe）支付，更新订单状态并写入交易流水。',
    requestBody: {
      content: { 'application/json': { schema: { type: 'object' } } },
    },
    responses: {
      200: { description: '支付已确认' },
      400: { description: '参数校验失败' },
    },
  } as any,
})

/**
 * 智能问卷 信用卡支付确认
 * POST /api/starpath/payment/card
 */
export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, cardSchema.parse)

  const result = await starpathService.confirmOrder(event, {
    orderId: body.orderId,
    paymentProvider: 'stripe',
    transactionId: body.paymentToken,
  })

  // Log transaction
  await logPaymentTransaction(event, {
    orderId: body.orderId,
    provider: 'stripe',
    type: 'payment',
    gatewayTransactionId: body.paymentToken,
    status: 'succeeded',
    gatewayResponse: { cardholderName: body.cardholderName },
  })

  return sendSuccess(event, result, 'Payment confirmed')
})
