// @api-auth: public
import { getPaymentStrategy } from '~~/server/utils/payment-strategies/factory'
import { logPaymentTransaction } from '~~/server/utils/payment-transaction'
import { starpathService } from '~~/server/utils/starpath-service'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['智能问卷'],
    summary: 'PayPal Webhook 接收端点',
    description: '接收 PayPal REST API 的支付状态回调通知（CHECKOUT.ORDER.APPROVED, PAYMENT.CAPTURE.* 等事件）。',
    responses: { 200: { description: 'Webhook 已处理' } },
  } as any,
})

/**
 * PayPal Webhook 回调
 * POST /api/starpath/payment/webhook/paypal
 *
 * PayPal sends the webhook body + verification headers.
 * This endpoint verifies the signature via PayPal's API
 * and updates the corresponding order.
 */
export default defineEventHandler(async (event) => {
  // Read raw body for signature verification
  const rawBody = await readRawBody(event) || ''

  // Collect PayPal verification headers
  const headers = getHeaders(event)
  const verificationHeaders: Record<string, string> = {}
  for (const [k, v] of Object.entries(headers)) {
    const lower = k.toLowerCase()
    if (lower.startsWith('paypal-')) {
      const normalized = lower.startsWith('paypal-') ? lower : `paypal-${lower}`
      verificationHeaders[normalized] = v as string
    }
  }

  const strategy = getPaymentStrategy('paypal')
  const result = await strategy.verifyWebhook(rawBody, JSON.stringify(verificationHeaders))

  if (!result) {
    throw createError({ statusCode: 400, statusMessage: 'Webhook verification failed' })
  }

  // Log transaction
  if (result.orderId) {
    await logPaymentTransaction(event, {
      orderId: result.orderId,
      provider: 'paypal',
      type: 'payment',
      gatewayTransactionId: result.paymentIntentId,
      status: result.status === 'paid' ? 'succeeded' : result.status === 'refunded' ? 'refunded' : 'failed',
      gatewayResponse: result,
    })

    // Update order status
    if (result.status === 'paid') {
      await starpathService.confirmOrder(event, {
        orderId: result.orderId,
        paymentProvider: 'paypal',
        transactionId: result.paymentIntentId || 'webhook',
      })
    }
  }

  return sendSuccess(event, { event: result.eventLog }, 'PayPal webhook processed')
})
