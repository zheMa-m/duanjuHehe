export interface CreateSessionParams {
  userId: string
  orderId: string
  productName: string
  amount: number
  currency: string
  priceMeta: Record<string, any> // 可以存放 Price ID 等
  successUrl: string
  cancelUrl: string
}

export interface PaymentStrategyResult {
  sessionId?: string       // 渠道会话 ID
  checkoutUrl: string      // 收银台跳转 URL
  paymentIntentId?: string  // 支付意图 ID
}

export interface WebhookResult {
  orderId?: string
  paymentIntentId?: string
  gatewaySubscriptionId?: string
  status: 'paid' | 'failed' | 'refunded'
  eventLog: string
  priceId?: string
  userId?: string // 用于订阅和解耦绑定
  subscriptionDetails?: {
    gatewaySubscriptionId: string
    priceId: string
    quantity: number
    cancelAtPeriodEnd: boolean
    currentPeriodStart: string
    currentPeriodEnd: string
  }
}

/**
 * Subscription record from the database
 */
export interface SubscriptionRecord {
  id: string
  user_id: string
  gateway_subscription_id: string
  subscription_provider: string
  status: string
  price_id: string
  quantity: number
  cancel_at_period_end: boolean
  current_period_start: string
  current_period_end: string
  created_at?: string
  updated_at?: string
}

export interface PaymentStrategy {
  createSession(params: CreateSessionParams): Promise<PaymentStrategyResult>
  verifyWebhook(rawBody: string | Buffer, signature: string): Promise<WebhookResult | null>

  /**
   * Cancel a subscription at the payment gateway level.
   * Not all providers support this (e.g. Apple IAP requires user action on-device).
   *
   * @param subscription - The subscription record from DB
   * @param immediate - true = cancel immediately, false = cancel at period end
   */
  cancelSubscription?(subscription: SubscriptionRecord, immediate: boolean): Promise<void>

  /**
   * Change the plan/price of an active subscription.
   * Not all providers support this (e.g. Apple IAP uses upgrade/downgrade through StoreKit).
   *
   * @param subscription - The subscription record from DB
   * @param newPriceId - The new price/plan identifier in the provider's system
   */
  changeSubscriptionPlan?(subscription: SubscriptionRecord, newPriceId: string): Promise<void>

  /**
   * Refund a payment. Provider-specific implementation.
   *
   * @param paymentIntentId - The payment intent ID to refund
   * @param amount - Optional partial refund amount
   */
  refundPayment?(paymentIntentId: string, amount?: number): Promise<any>
}
