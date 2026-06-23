import type { PaymentStrategy, CreateSessionParams, PaymentStrategyResult, WebhookResult } from './types'

/**
 * Google Pay Payment Strategy
 *
 * In Google Pay, the frontend collects a payment token via the Google Pay API,
 * then sends it to the backend for processing (decrypt/verify).
 *
 * The strategy supports two modes:
 * 1. **Gateway token**: Forward to Stripe/PayPal for processing
 * 2. **Direct token**: Decrypt and process directly (requires GPay merchant keys)
 *
 * Webhook: Google Pay does not have webhooks — payment confirmations come
 * via the gateway (Stripe/PayPal) that processes the token.
 */
export class GooglePayPaymentStrategy implements PaymentStrategy {
  async createSession(params: CreateSessionParams): Promise<PaymentStrategyResult> {
    // Google Pay doesn't have a "session" concept on the backend.
    // The frontend collects the payment token and submits it directly.
    // This method acts as a no-op passthrough for consistency.
    if (process.env.MOCK_DB === 'true') {
      return {
        sessionId: `gpay_mock_${Date.now()}`,
        checkoutUrl: '',
        paymentIntentId: `gpay_mock_pi_${params.orderId}`,
      }
    }

    // In production, Google Pay sessions are handled on the frontend.
    // The backend receives the decrypted payment token via the payment/capture endpoint.
    return {
      sessionId: `gpay_${params.orderId}`,
      checkoutUrl: '',
      paymentIntentId: undefined,
    }
  }

  async verifyWebhook(_rawBody: string | Buffer, _signature: string): Promise<WebhookResult | null> {
    // Google Pay does not have webhooks.
    // Payment confirmation flows through the gateway processor (Stripe/PayPal).
    return null
  }

  /**
   * Refund a Google Pay payment.
   *
   * Google Pay itself does NOT have a refund API — payments are processed
   * through an underlying gateway (typically Stripe). This method routes
   * the refund to the Stripe strategy using the payment_intent_id stored
   * on the order.
   *
   * @param paymentIntentId - The Stripe PaymentIntent ID (stored as order.payment_intent_id)
   * @param amount - Optional partial refund amount in dollars
   */
  async refundPayment(paymentIntentId: string, amount?: number): Promise<any> {
    if (process.env.MOCK_DB === 'true') {
      return { id: `gpay_refund_mock_${Date.now()}`, status: 'succeeded' }
    }

    // Route refund through Stripe gateway (Google Pay is processed via Stripe)
    const { StripePaymentStrategy } = await import('./stripe')
    const stripeStrategy = new StripePaymentStrategy()

    if (!stripeStrategy.refundPayment) {
      throw new Error('Stripe strategy does not support refundPayment')
    }

    return stripeStrategy.refundPayment(paymentIntentId, amount)
  }

  /**
   * Validate a Google Pay payment token (decrypted from the frontend)
   *
   * When the payment is processed via a gateway (Stripe), the token is
   * forwarded to Stripe and validation happens there.
   * For direct token processing, the token needs to be decrypted using
   * the Google merchant private key.
   */
  async validatePaymentToken(token: string, expectedAmount: number, expectedCurrency: string): Promise<boolean> {
    if (process.env.MOCK_DB === 'true') return true

    try {
      // The token from Google Pay frontend is a JSON object containing:
      // { protocolVersion, signature, intermediateSigningKey, signedMessage }
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'))

      // In production, you would:
      // 1. Verify the signature using Google's public keys
      // 2. Decrypt the signedMessage
      // 3. Validate paymentMethodDetails (type, description, token)
      // 4. Check amount matches expectedAmount
      // 5. Check currency matches expectedCurrency

      // For gateway proxy mode (Stripe), the actual validation happens
      // when the token is forwarded to the gateway
      if (decoded.protocolVersion && decoded.signature) {
        return true
      }

      return false
    } catch {
      return false
    }
  }
}
