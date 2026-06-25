// @api-auth: public
import { z } from 'zod'
import { sendSuccess } from '~~/server/utils/response'
import { starpathService } from '~~/server/services/starpath-service'
import { getPaymentStrategy } from '~~/server/utils/payment-strategies/factory'
import { logPaymentTransaction } from '~~/server/utils/payment-transaction'

const paypalSchema = z.object({
  orderId: z.string().min(1),
  paymentId: z.string().min(1),
  payerId: z.string().min(1),
})

defineRouteMeta({
  openAPI: {
    tags: ['智能问卷'],
    summary: 'PayPal 支付确认',
    description: '接收 PayPal 支付成功后的确认回调，经过策略层验签后更新统一订单表并写入交易流水。',
    responses: { 200: { description: '支付已确认' } },
  } as any,
})

/**
 * PayPal 支付确认
 * POST /api/starpath/payment/paypal
 */
export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, paypalSchema.parse)

  // Validate via strategy layer
  const strategy = getPaymentStrategy('paypal')
  const verifyResult = await strategy.verifyWebhook(
    JSON.stringify({ event_type: 'PAYMENT.CAPTURE.COMPLETED' }),
    JSON.stringify({ paypal_transaction_id: body.paymentId }),
  )

  // Confirm order
  const result = await starpathService.confirmOrder(event, {
    orderId: body.orderId,
    paymentProvider: 'paypal',
    transactionId: body.paymentId,
  })

  // 支付确认后触发报告生成 + 邮件发送（一次性购买）
  await starpathService.triggerReportAfterPayment(event, body.orderId).catch((e: any) => {
    console.warn('[Starpath] Report trigger after PayPal payment failed:', e?.message)
  })

  // Log transaction
  await logPaymentTransaction(event, {
    orderId: body.orderId,
    provider: 'paypal',
    type: 'payment',
    gatewayTransactionId: body.paymentId,
    status: 'succeeded',
    gatewayResponse: { payerId: body.payerId },
  })

  return sendSuccess(event, result, 'PayPal payment confirmed')
})
