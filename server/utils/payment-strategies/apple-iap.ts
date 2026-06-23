import type { PaymentStrategy, CreateSessionParams, PaymentStrategyResult, WebhookResult } from './types'

/**
 * Apple In-App Purchase (IAP) Payment Strategy
 *
 * Apple IAP is handled differently from web payments:
 * 1. The frontend (iOS app or WebView) uses StoreKit to make a purchase
 * 2. The receipt is sent to the backend
 * 3. The backend verifies the receipt with Apple's App Store Server API
 *
 * For App Store Server Notifications (v2), Apple sends signed JWT payloads
 * to the webhook endpoint. The `signature` parameter is the JWT itself.
 *
 * API reference:
 * - Receipt verification (deprecated): https://buy.itunes.apple.com/verifyReceipt
 * - App Store Server API: https://api.storekit-sandbox.itunes.apple.com
 */
export class AppleIAPPaymentStrategy implements PaymentStrategy {
  async createSession(params: CreateSessionParams): Promise<PaymentStrategyResult> {
    // Apple IAP does not use server-side session creation.
    // Purchases are initiated on the device via StoreKit.
    // This method returns a no-op result for interface consistency.

    if (process.env.MOCK_DB === 'true') {
      return {
        sessionId: `apple_mock_${Date.now()}`,
        checkoutUrl: '',
        paymentIntentId: `apple_mock_pi_${params.orderId}`,
      }
    }

    return {
      sessionId: `apple_iap_${params.orderId}`,
      checkoutUrl: '',
    }
  }

  async verifyWebhook(rawBody: string | Buffer, _signature: string): Promise<WebhookResult | null> {
    // Apple IAP uses App Store Server Notifications v2 (signed JWT payloads)
    // The entire POST body is a signed JWT in the `signedPayload` field
    const body = typeof rawBody === 'string' ? rawBody : rawBody.toString()

    if (process.env.MOCK_DB === 'true') {
      try {
        const parsed = JSON.parse(body)
        const payload = parsed.signedPayload
          ? this.decodeJWTPayload(parsed.signedPayload)
          : parsed
        return this.parseNotification(payload)
      } catch {
        return null
      }
    }

    try {
      const parsed = JSON.parse(body)

      if (!parsed.signedPayload) {
        console.error('[Apple IAP] Missing signedPayload in notification')
        return null
      }

      // Decode and verify the JWT
      // In production, verify the JWT signature using Apple's public keys
      // fetched from https://appleid.apple.com/auth/keys
      const payload = this.decodeJWTPayload(parsed.signedPayload)
      if (!payload) {
        console.error('[Apple IAP] Failed to decode JWT payload')
        return null
      }

      return this.parseNotification(payload)
    } catch (e: any) {
      console.error('[Apple IAP] Webhook verification error:', e.message)
      return null
    }
  }

  /**
   * Verify an App Store receipt (legacy API, kept for backward compatibility)
   *
   * @param receiptData - Base64-encoded receipt data from the device
   * @param isSandbox - Whether to use the sandbox environment
   */
  async verifyReceipt(receiptData: string, isSandbox = true): Promise<{
    valid: boolean
    transactionId?: string
    productId?: string
    expirationDate?: string
    error?: string
  }> {
    if (process.env.MOCK_DB === 'true') {
      return { valid: true, transactionId: `mock_txn_${Date.now()}` }
    }

    const config = await this.getConfig()
    const url = isSandbox
      ? 'https://sandbox.itunes.apple.com/verifyReceipt'
      : 'https://buy.itunes.apple.com/verifyReceipt'

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          'receipt-data': receiptData,
          password: config.sharedSecret,
          'exclude-old-transactions': true,
        }),
      })

      const result = await response.json()

      if (result.status === 0 || result.status === 21006) {
        const receipt = result.receipt
        const latestReceipt = result.latest_receipt_info?.[0]

        return {
          valid: true,
          transactionId: latestReceipt?.transaction_id || receipt?.transaction_id,
          productId: latestReceipt?.product_id || receipt?.product_id,
          expirationDate: latestReceipt?.expires_date,
        }
      }

      // 21007 = sandbox receipt sent to production, retry in sandbox
      if (result.status === 21007) {
        return this.verifyReceipt(receiptData, true)
      }

      return {
        valid: false,
        error: `Apple receipt verification failed with status: ${result.status}`,
      }
    } catch (e: any) {
      return {
        valid: false,
        error: `Apple receipt verification error: ${e.message}`,
      }
    }
  }

  private decodeJWTPayload(jwt: string): Record<string, any> | null {
    try {
      const parts = jwt.split('.')
      if (parts.length !== 3) return null
      const payload = Buffer.from(parts[1]!, 'base64url').toString('utf-8')
      return JSON.parse(payload)
    } catch {
      return null
    }
  }

  private parseNotification(payload: Record<string, any>): WebhookResult | null {
    const notificationType = payload.notificationType
    const subtype = payload.subtype
    const data = payload.data || {}
    const signedTransactionInfo = data.signedTransactionInfo
    const signedRenewalInfo = data.signedRenewalInfo

    // Decode JWT-wrapped transaction info
    let transaction: Record<string, any> = {}
    if (signedTransactionInfo) {
      const decoded = this.decodeJWTPayload(signedTransactionInfo)
      if (decoded) transaction = decoded
    }

    const result: WebhookResult = {
      status: 'failed',
      eventLog: `apple_iap:${notificationType}${subtype ? `.${subtype}` : ''}`,
    }

    if (transaction.transactionId) {
      result.paymentIntentId = transaction.transactionId
      result.orderId = transaction.transactionId
    }

    switch (notificationType) {
      case 'SUBSCRIBED':
      case 'DID_RENEW':
      case 'INITIAL_BUY':
      case 'INTERNAL_PURCHASE':
        result.status = 'paid'
        break

      case 'CANCEL':
      case 'DID_FAIL_TO_RENEW':
      case 'EXPIRED':
        result.status = 'failed'
        break

      case 'REFUND':
      case 'REFUND_DECLINED':
        result.status = 'refunded'
        break

      case 'REVOKE':
        result.status = 'failed'
        break
    }

    return result
  }

  private async getConfig(): Promise<{ sharedSecret: string; bundleId: string; environment: string }> {
    const { getDB } = await import('../db')
    const db = getDB()
    const { data } = await db.from('system_configs').select('value').eq('key', 'payment_secrets').single()
    const apple = data?.value?.apple_iap || {}

    return {
      sharedSecret: apple.sharedSecret || '',
      bundleId: apple.bundleId || '',
      environment: apple.environment || 'sandbox',
    }
  }
}
