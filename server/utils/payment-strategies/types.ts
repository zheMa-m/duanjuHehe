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
  stripeSubscriptionId?: string
  status: 'paid' | 'failed' | 'refunded'
  eventLog: string
  priceId?: string
  userId?: string // 用于订阅和解耦绑定
  subscriptionDetails?: {
    stripeSubscriptionId: string
    priceId: string
    quantity: number
    cancelAtPeriodEnd: boolean
    currentPeriodStart: string
    currentPeriodEnd: string
  }
}

export interface PaymentStrategy {
  createSession(params: CreateSessionParams): Promise<PaymentStrategyResult>
  verifyWebhook(rawBody: string | Buffer, signature: string): Promise<WebhookResult | null>
}
