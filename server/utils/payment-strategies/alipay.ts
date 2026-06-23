import type { PaymentStrategy, CreateSessionParams, PaymentStrategyResult, WebhookResult, SubscriptionRecord } from './types'

/**
 * Alipay Payment Strategy (支付宝)
 *
 * Uses Alipay Open Platform API (支付宝开放平台):
 * - Page Pay (PC 网页支付): alipay.trade.page.pay
 * - Wap Pay (移动端支付): alipay.trade.wap.pay
 * - Webhook (异步通知): POST 验签
 * - Refund (退款): alipay.trade.refund
 *
 * Configuration stored in system_configs.payment_secrets.alipay:
 *   - appId, privateKey, alipayPublicKey, notifyUrl, gatewayUrl
 *
 * API reference: https://opendocs.alipay.com/open
 */
export class AlipayPaymentStrategy implements PaymentStrategy {
  async createSession(params: CreateSessionParams): Promise<PaymentStrategyResult> {
    const { amount, currency, orderId, productName, priceMeta, successUrl } = params

    if (process.env.MOCK_DB === 'true') {
      const fakeSessionId = `alipay_mock_${Date.now()}`
      return {
        sessionId: fakeSessionId,
        checkoutUrl: successUrl || `http://localhost:3000/payments/confirm?alipay_order_id=mock_${orderId}`,
        paymentIntentId: `alipay_mock_pi_${orderId}`,
      }
    }

    const config = await this.getConfig()

    // Build the order parameters for Alipay
    const bizContent: Record<string, any> = {
      out_trade_no: orderId,
      total_amount: amount.toFixed(2),
      subject: productName,
      product_code: priceMeta?.isWap ? 'QUICK_WAP_WAY' : 'FAST_INSTANT_TRADE_PAY',
    }

    // Optional subscription/periodic deduction parameters
    if (priceMeta?.agreementInfo) {
      bizContent.agreement_sign_params = priceMeta.agreementInfo
    }

    const params_ = {
      app_id: config.appId,
      method: priceMeta?.isWap ? 'alipay.trade.wap.pay' : 'alipay.trade.page.pay',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, '+08:00'),
      version: '1.0',
      notify_url: config.notifyUrl,
      return_url: params.successUrl,
      biz_content: JSON.stringify(bizContent),
    }

    const sign = this.buildSign(params_, config.privateKey)
    const queryString = this.buildQuery(params_, sign)

    return {
      sessionId: orderId, // Alipay uses out_trade_no as session identifier
      checkoutUrl: `${config.gatewayUrl}?${queryString}`,
      paymentIntentId: orderId,
    }
  }

  async verifyWebhook(rawBody: string | Buffer, signature: string): Promise<WebhookResult | null> {
    const body = typeof rawBody === 'string' ? rawBody : rawBody.toString()

    if (process.env.MOCK_DB === 'true') {
      try {
        const params = this.parseFormBody(body)
        return this.parseNotification(params)
      } catch {
        return null
      }
    }

    try {
      const config = await this.getConfig()

      // Parse the x-www-form-urlencoded POST body from Alipay
      const params = this.parseFormBody(body)

      // Verify Alipay signature
      const sign = signature || params.sign || ''
      const isValid = this.verifySign(params, sign, config.alipayPublicKey)
      if (!isValid) {
        console.error('[Alipay] Webhook signature verification failed')
        return null
      }

      return this.parseNotification(params)
    } catch (e: any) {
      console.error('[Alipay] Webhook verification error:', e.message)
      return null
    }
  }

  /**
   * Cancel a subscription/periodic deduction agreement
   */
  async cancelSubscription(subscription: SubscriptionRecord, _immediate: boolean): Promise<void> {
    if (process.env.MOCK_DB === 'true') {
      return
    }

    const config = await this.getConfig()

    const bizContent = {
      personal_product_code: 'GENERAL_WITHHOLDING',
      agreement_no: subscription.gateway_subscription_id, // Alipay agreement no
    }

    const params_ = {
      app_id: config.appId,
      method: 'alipay.user.agreement.unsign',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, '+08:00'),
      version: '1.0',
      biz_content: JSON.stringify(bizContent),
    }

    const sign = this.buildSign(params_, config.privateKey)
    const queryString = this.buildQuery(params_, sign)

    const response = await fetch(`${config.gatewayUrl}?${queryString}`)
    const result = await response.json()

    const responseData = JSON.parse(result.alipay_user_agreement_unsign_response || '{}')
    if (responseData.code !== '10000') {
      throw new Error(`Alipay agreement unsign failed: ${responseData.sub_msg || responseData.msg || JSON.stringify(responseData)}`)
    }
  }

  /**
   * Change subscription plan — Alipay periodic deduction plan update
   */
  async changeSubscriptionPlan(_subscription: SubscriptionRecord, _newPriceId: string): Promise<void> {
    // Alipay periodic deduction plans are typically fixed at sign-up time.
    // Plan changes require a new agreement sign-up flow.
    throw new Error(
      'Alipay periodic deduction plan changes are not supported. ' +
      'Cancel current agreement and create a new one with the desired plan.'
    )
  }

  /**
   * Refund an Alipay payment
   */
  async refundPayment(outTradeNo: string, amount?: number): Promise<any> {
    if (process.env.MOCK_DB === 'true') {
      return { fund_change: 'Y', refund_fee: amount || 0 }
    }

    const config = await this.getConfig()

    const bizContent: Record<string, any> = {
      out_trade_no: outTradeNo,
      refund_amount: amount ? amount.toFixed(2) : undefined,
    }

    const params_ = {
      app_id: config.appId,
      method: 'alipay.trade.refund',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, '+08:00'),
      version: '1.0',
      biz_content: JSON.stringify(bizContent),
    }

    const sign = this.buildSign(params_, config.privateKey)
    const queryString = this.buildQuery(params_, sign)

    const response = await fetch(`${config.gatewayUrl}?${queryString}`)
    const result = await response.json()

    const responseData = JSON.parse(result.alipay_trade_refund_response || '{}')
    if (responseData.code !== '10000') {
      throw new Error(`Alipay refund failed: ${responseData.sub_msg || responseData.msg}`)
    }

    return responseData
  }

  private parseNotification(params: Record<string, string>): WebhookResult {
    const tradeStatus = params.trade_status
    const result: WebhookResult = {
      status: 'failed',
      eventLog: `alipay:${tradeStatus}`,
      orderId: params.out_trade_no,
      paymentIntentId: params.trade_no,
    }

    switch (tradeStatus) {
      case 'TRADE_SUCCESS':
      case 'TRADE_FINISHED':
        result.status = 'paid'
        result.userId = params.buyer_id || params.buyer_logon_id
        break
      case 'TRADE_CLOSED':
        result.status = 'failed'
        break
      default:
        result.status = 'failed'
    }

    return result
  }

  // ---- Signature utilities for Alipay RSA2 signing ----

  private buildSign(params: Record<string, string>, privateKey: string): string {
    // Alipay signature: sort params alphabetically, concatenate with '&',
    // then sign with RSA-SHA256 using merchant private key
    try {
      const crypto = require('crypto')
      const sortedKeys = Object.keys(params)
        .filter((k) => k !== 'sign' && k !== 'sign_type' && params[k] !== '' && params[k] !== undefined && params[k] !== null)
        .sort()

      const signString = sortedKeys.map((k) => `${k}=${params[k]}`).join('&')

      const signer = crypto.createSign('RSA-SHA256')
      signer.update(signString, 'utf8')
      return signer.sign(privateKey, 'base64')
    } catch {
      // Mock or fallback
      return 'mock_sign'
    }
  }

  private verifySign(params: Record<string, string>, sign: string, publicKey: string): boolean {
    try {
      const crypto = require('crypto')
      const sortedKeys = Object.keys(params)
        .filter((k) => k !== 'sign' && k !== 'sign_type' && params[k] !== '' && params[k] !== undefined && params[k] !== null)
        .sort()

      const signString = sortedKeys.map((k) => `${k}=${params[k]}`).join('&')

      const verifier = crypto.createVerify('RSA-SHA256')
      verifier.update(signString, 'utf8')
      return verifier.verify(publicKey, sign, 'base64')
    } catch {
      return false
    }
  }

  private buildQuery(params: Record<string, string>, sign: string): string {
    const encoded = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&')
    return `${encoded}&sign=${encodeURIComponent(sign)}`
  }

  private parseFormBody(body: string): Record<string, string> {
    const params: Record<string, string> = {}
    const pairs = body.split('&')
    for (const pair of pairs) {
      const [key, value] = pair.split('=')
      if (key) {
        params[decodeURIComponent(key)] = value !== undefined ? decodeURIComponent(value) : ''
      }
    }
    return params
  }

  private async getConfig(): Promise<{
    appId: string
    privateKey: string
    alipayPublicKey: string
    notifyUrl: string
    gatewayUrl: string
  }> {
    const { getDB } = await import('../db')
    const db = getDB()
    const { data } = await db.from('system_configs').select('value').eq('key', 'payment_secrets').single()
    const alipay = data?.value?.alipay || {}

    return {
      appId: alipay.appId || '',
      privateKey: alipay.privateKey || '',
      alipayPublicKey: alipay.alipayPublicKey || '',
      notifyUrl: alipay.notifyUrl || '',
      gatewayUrl: alipay.gatewayUrl || 'https://openapi.alipay.com/gateway.do',
    }
  }
}
