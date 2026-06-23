import type { PaymentStrategy, CreateSessionParams, PaymentStrategyResult, WebhookResult } from './types'

/**
 * PayPal Payment Strategy
 *
 * Uses PayPal REST API (Orders v2) to create and capture payments.
 * - Sandbox/Live via system_configs.payment_secrets.paypal.environment
 * - Webhooks validated via PayPal Webhook ID
 *
 * The `signature` parameter in verifyWebhook should be a JSON object containing
 * the PayPal webhook verification headers:
 *   paypal-auth-algo, paypal-cert-url, paypal-transmission-id,
 *   paypal-transmission-sig, paypal-transmission-time
 */
export class PayPalPaymentStrategy implements PaymentStrategy {
  async createSession(params: CreateSessionParams): Promise<PaymentStrategyResult> {
    const { amount, currency, orderId, successUrl, cancelUrl } = params

    if (process.env.MOCK_DB === 'true') {
      return {
        sessionId: `paypal_mock_${Date.now()}`,
        checkoutUrl: successUrl || `http://localhost:3000/payments/confirm?paypal_order_id=mock_${orderId}`,
        paymentIntentId: `paypal_mock_pi_${orderId}`,
      }
    }

    const config = await this.getConfig()
    const accessToken = await this.getAccessToken(config)

    const response = await fetch(`${config.baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: orderId,
            amount: {
              currency_code: currency.toUpperCase(),
              value: amount.toFixed(2),
            },
            custom_id: orderId,
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              return_url: successUrl,
              cancel_url: cancelUrl,
            },
          },
        },
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`PayPal create order failed: ${err}`)
    }

    const order = await response.json()

    return {
      sessionId: order.id,
      checkoutUrl: order.links?.find((l: any) => l.rel === 'payer-action')?.href || '',
      paymentIntentId: order.id,
    }
  }

  async verifyWebhook(rawBody: string | Buffer, signature: string): Promise<WebhookResult | null> {
    const body = typeof rawBody === 'string' ? rawBody : rawBody.toString()

    // Parse the PayPal verification headers from the signature string (JSON-encoded)
    let webhookHeaders: Record<string, string> = {}
    try {
      webhookHeaders = JSON.parse(signature)
    } catch {
      // Not JSON-encoded, fall back to treating as raw signature string
    }

    if (process.env.MOCK_DB === 'true') {
      try {
        const event = JSON.parse(body)
        return this.parseWebhookEvent(event)
      } catch {
        return null
      }
    }

    try {
      const config = await this.getConfig()

      if (!webhookHeaders['paypal-transmission-id']) {
        console.error('[PayPal] Missing webhook verification headers')
        return null
      }

      const accessToken = await this.getAccessToken(config)

      const verifyRes = await fetch(`${config.baseUrl}/v1/notifications/verify-webhook-signature`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          auth_algo: webhookHeaders['paypal-auth-algo'],
          cert_url: webhookHeaders['paypal-cert-url'],
          transmission_id: webhookHeaders['paypal-transmission-id'],
          transmission_sig: webhookHeaders['paypal-transmission-sig'],
          transmission_time: webhookHeaders['paypal-transmission-time'],
          webhook_id: config.webhookId,
          webhook_event: JSON.parse(body),
        }),
      })

      const verification = await verifyRes.json()
      if (verification.verification_status !== 'SUCCESS') {
        console.error('[PayPal] Webhook signature verification failed')
        return null
      }

      return this.parseWebhookEvent(JSON.parse(body))
    } catch (e: any) {
      console.error('[PayPal] Webhook verification error:', e.message)
      return null
    }
  }

  private parseWebhookEvent(event: any): WebhookResult | null {
    const eventType = event.event_type

    const result: WebhookResult = {
      status: 'failed',
      eventLog: `paypal:${eventType}`,
    }

    const resource = event.resource

    if (eventType === 'CHECKOUT.ORDER.APPROVED') {
      result.orderId = resource.purchase_units?.[0]?.custom_id || resource.id
      result.paymentIntentId = resource.id
      result.status = 'paid'
    }

    if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
      result.orderId = resource.custom_id || resource.invoice_id
      result.paymentIntentId = resource.id
      result.status = 'paid'
    }

    if (eventType === 'PAYMENT.CAPTURE.DENIED' || eventType === 'PAYMENT.CAPTURE.FAILED') {
      result.paymentIntentId = resource.id
      result.status = 'failed'
    }

    if (eventType === 'PAYMENT.CAPTURE.REFUNDED') {
      result.paymentIntentId = resource.id
      result.status = 'refunded'
    }

    return result
  }

  /**
   * Refund a captured PayPal payment
   *
   * POST /v2/payments/captures/{captureId}/refund
   *
   * @param captureId - PayPal capture ID (payment_intent_id on the order)
   * @param amount - Optional partial refund amount
   */
  async refundPayment(captureId: string, amount?: number): Promise<any> {
    if (process.env.MOCK_DB === 'true') {
      return { id: `refund_mock_${Date.now()}`, status: 'COMPLETED' }
    }

    const config = await this.getConfig()
    const accessToken = await this.getAccessToken(config)

    const body: any = {}
    if (amount !== undefined) {
      body.amount = { value: amount.toFixed(2), currency_code: 'USD' }
    }

    const response = await fetch(`${config.baseUrl}/v2/payments/captures/${captureId}/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`PayPal refund failed: ${err}`)
    }

    return response.json()
  }

  private async getConfig(): Promise<{ clientId: string; clientSecret: string; webhookId: string; baseUrl: string }> {
    const { getDB } = await import('../db')
    const db = getDB()
    const { data } = await db.from('system_configs').select('value').eq('key', 'payment_secrets').single()
    const paypal = data?.value?.paypal || {}

    const environment = paypal.environment || 'sandbox'
    const baseUrl = environment === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com'

    return {
      clientId: paypal.clientId || '',
      clientSecret: paypal.clientSecret || '',
      webhookId: paypal.webhookId || '',
      baseUrl,
    }
  }

  private async getAccessToken(config: { clientId: string; clientSecret: string; baseUrl: string }): Promise<string> {
    const response = await fetch(`${config.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`PayPal auth failed: ${err}`)
    }

    const data = await response.json()
    return data.access_token
  }
}
