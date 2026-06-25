// @api-auth: public
import { getPaymentStrategy } from '~~/server/utils/payment-strategies/factory'
import { logPaymentTransaction } from '~~/server/utils/payment-transaction'
import { starpathService } from '~~/server/services/starpath-service'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['智能问卷'],
    summary: 'Apple IAP Server Notification 接收端点',
    description: '接收 Apple App Store Server Notifications v2 的订阅状态变更通知。',
    responses: { 200: { description: 'Notification 已处理' } },
  } as any,
})

/**
 * Apple App Store Server Notification (v2)
 * POST /api/starpath/payment/webhook/apple-iap
 *
 * Apple sends a signed JWT payload in the `signedPayload` field.
 * The payload contains notificationType, subtype, and nested
 * signed JWTs for transactionInfo and renewalInfo.
 */
export default defineEventHandler(async (event) => {
  const rawBody = await readRawBody(event) || ''
  const strategy = getPaymentStrategy('apple_iap')
  const result = await strategy.verifyWebhook(rawBody, '')

  if (!result) {
    throw createError({ statusCode: 400, statusMessage: 'Apple IAP webhook verification failed' })
  }

  // Log transaction
  if (result.orderId) {
    await logPaymentTransaction(event, {
      orderId: result.orderId,
      provider: 'apple_iap',
      type: 'payment',
      gatewayTransactionId: result.paymentIntentId,
      status: result.status === 'paid' ? 'succeeded' : result.status === 'refunded' ? 'refunded' : 'failed',
      gatewayResponse: result,
    })

    // Update order for paid events
    if (result.status === 'paid') {
      await starpathService.confirmOrder(event, {
        orderId: result.orderId,
        paymentProvider: 'apple_iap',
        transactionId: result.paymentIntentId || 'webhook',
      })

      // 支付确认后触发报告生成 + 邮件发送（一次性购买）
      await starpathService.triggerReportAfterPayment(event, result.orderId).catch((e: any) => {
        console.warn('[Starpath] Report trigger after Apple IAP payment failed:', e?.message)
      })
    }
  }

  return sendSuccess(event, { event: result.eventLog }, 'Apple IAP notification processed')
})
