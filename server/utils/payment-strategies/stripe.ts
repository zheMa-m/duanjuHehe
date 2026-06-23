import type { PaymentStrategy, CreateSessionParams, PaymentStrategyResult, WebhookResult } from './types'
import { getStripeClient, verifyWebhookSignature } from '../payments'
import { getDB } from '../db'

export class StripePaymentStrategy implements PaymentStrategy {
  async createSession(params: CreateSessionParams): Promise<PaymentStrategyResult> {
    const { productName, amount, currency, orderId, priceMeta, successUrl, cancelUrl } = params

    // Mock 模式直接返回模拟 data
    if (process.env.MOCK_DB === 'true') {
      const fakeSessionId = `cs_mock_${Date.now()}`
      const fakePI = `pi_mock_${orderId}`
      return {
        sessionId: fakeSessionId,
        checkoutUrl: successUrl || `http://localhost:3000/payments/confirm?session_id=${fakeSessionId}`,
        paymentIntentId: fakePI,
      }
    }

    const db = getDB()
    const { data: secretsRow } = await db.from('system_configs').select('value').eq('key', 'payment_secrets').single()
    const stripeSecretKey = secretsRow?.value?.stripe?.secretKey || undefined

    const stripe = getStripeClient(stripeSecretKey)
    if (!stripe) {
      throw new Error('Stripe client not initialized. Check payment_secrets in system_configs.')
    }

    // 检查是订阅制模式还是一次性模式
    const isSubscription = priceMeta.mode === 'subscription'
    const priceId = priceMeta.stripePriceId || priceMeta.priceId

    const sessionPayload: any = {
      payment_method_types: ['card'],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { orderId, userId: params.userId },
    }

    if (isSubscription && priceId) {
      // 订阅计费模式
      sessionPayload.mode = 'subscription'
      sessionPayload.line_items = [
        {
          price: priceId,
          quantity: 1,
        },
      ]
    } else {
      // 一次性消费模式
      sessionPayload.mode = 'payment'
      sessionPayload.line_items = [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: { name: productName },
            unit_amount: Math.round(amount * 100), // Stripe 最小单位是分 (cents)
          },
          quantity: 1,
        },
      ]
    }

    // 如果用户 profile 绑定了 Stripe Customer ID，传入以实现客户归户
    if (priceMeta.stripeCustomerId) {
      sessionPayload.customer = priceMeta.stripeCustomerId
    } else {
      // 允许自动创建客户并发送收据
      sessionPayload.customer_creation = 'always'
    }

    const session = await stripe.checkout.sessions.create(sessionPayload)

    return {
      sessionId: session.id,
      checkoutUrl: session.url || '',
      paymentIntentId: (session.payment_intent as string) || undefined,
    }
  }

  async verifyWebhook(rawBody: string | Buffer, signature: string): Promise<WebhookResult | null> {
    let stripeSecretKey: string | undefined
    let stripeWebhookSecret: string | undefined

    if (process.env.MOCK_DB !== 'true') {
      try {
        const db = getDB()
        const { data: secretsRow } = await db.from('system_configs').select('value').eq('key', 'payment_secrets').single()
        stripeSecretKey = secretsRow?.value?.stripe?.secretKey || undefined
        stripeWebhookSecret = secretsRow?.value?.stripe?.webhookSecret || undefined
      } catch (e: any) {
        console.error('[Payments] Failed to fetch secrets from database for webhook validation:', e.message)
      }
    }

    const stripeEvent = verifyWebhookSignature(rawBody, signature, stripeSecretKey, stripeWebhookSecret)
    if (!stripeEvent) return null

    const type = stripeEvent.type
    const dataObj = stripeEvent.data.object

    const result: WebhookResult = {
      status: 'failed',
      eventLog: `stripe:${type}`,
    }

    // 1. 一次性付款成功
    if (type === 'checkout.session.completed') {
      result.orderId = dataObj.metadata?.orderId
      result.userId = dataObj.metadata?.userId
      result.paymentIntentId = dataObj.payment_intent as string
      result.status = 'paid'
    }

    // 2. 订阅状态创建/修改
    if (type === 'customer.subscription.created' || type === 'customer.subscription.updated') {
      const subscription = dataObj
      const priceId = subscription.items?.data?.[0]?.price?.id
      const subStatus = subscription.status // 'active' | 'trialing' | 'past_due' | 'unpaid' | 'canceled' | 'incomplete' ...
      const isAuthorized = subStatus === 'active' || subStatus === 'trialing'
      
      result.status = isAuthorized ? 'paid' : 'failed'
      result.stripeSubscriptionId = subscription.id
      result.priceId = priceId
      result.userId = subscription.metadata?.userId
      
      result.subscriptionDetails = {
        stripeSubscriptionId: subscription.id,
        priceId: priceId || '',
        quantity: subscription.quantity || 1,
        cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
        currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      }
    }

    // 3. 订阅取消/过期
    if (type === 'customer.subscription.deleted') {
      const subscription = dataObj
      result.status = 'failed'
      result.stripeSubscriptionId = subscription.id
      result.userId = subscription.metadata?.userId
    }

    // 4. 扣款失败/退款
    if (type === 'invoice.payment_failed') {
      result.stripeSubscriptionId = dataObj.subscription as string
      result.status = 'failed'
    }

    if (type === 'charge.refunded') {
      result.paymentIntentId = dataObj.payment_intent as string
      result.status = 'refunded'
    }

    return result
  }
}
