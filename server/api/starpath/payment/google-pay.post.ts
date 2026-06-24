// @api-auth: public
import { z } from 'zod'
import { sendSuccess } from '~~/server/utils/response'
import { starpathService } from '~~/server/services/starpath-service'
import { getPaymentStrategy } from '~~/server/utils/payment-strategies/factory'
import { logPaymentTransaction } from '~~/server/utils/payment-transaction'

const googlePaySchema = z.object({
  orderId: z.string().min(1),
  googlePayToken: z.string().min(1),
})

defineRouteMeta({
  openAPI: {
    tags: ['智能问卷'],
    summary: 'Google Pay 支付确认',
    description: '接收 Google Pay 支付成功后的确认回调，经过策略层验证 token 后更新统一订单表并写入交易流水。',
    responses: { 200: { description: '支付已确认' } },
  } as any,
})

/**
 * Google Pay 支付确认
 * POST /api/starpath/payment/google-pay
 */
export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, googlePaySchema.parse)

  // Validate token via strategy layer
  const strategy = getPaymentStrategy('google_pay')
  if (!strategy.validatePaymentToken) {
    throw createError({ statusCode: 500, statusMessage: 'Google Pay token validation not supported' })
  }
  const isValid = await strategy.validatePaymentToken(body.googlePayToken, 0, 'USD')
  if (!isValid) {
    throw createError({ statusCode: 400, statusMessage: 'Google Pay token validation failed' })
  }

  // Confirm order
  const result = await starpathService.confirmOrder(event, {
    orderId: body.orderId,
    paymentProvider: 'google_pay',
    transactionId: body.googlePayToken,
  })

  // Log transaction
  await logPaymentTransaction(event, {
    orderId: body.orderId,
    provider: 'google_pay',
    type: 'payment',
    gatewayTransactionId: body.googlePayToken.slice(0, 50),
    status: 'succeeded',
    gatewayResponse: { tokenValidated: true },
  })

  return sendSuccess(event, result, 'Google Pay payment confirmed')
})
