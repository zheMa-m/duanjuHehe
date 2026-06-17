/**
 * 支付工具层 — Stripe 集成封装
 *
 * 双模式运行：
 * - MOCK_DB=true: 返回模拟 session/fake PI，无需 Stripe SDK
 * - MOCK_DB=false: 真实 Stripe API 调用
 */

export interface CheckoutParams {
  productName: string
  amount: number
  currency: string
  orderId: string
  successUrl?: string
  cancelUrl?: string
}

export interface CheckoutResult {
  sessionId: string
  url: string
  paymentIntentId: string
}

export interface StripeEvent {
  type: string
  data: {
    object: Record<string, any>
  }
}

// ── 初始化 Stripe Client ─────────────────────────────────────
let _stripeClient: any = null

export function getStripeClient() {
  if (process.env.MOCK_DB === 'true') {
    return null // Mock 模式不需要真实 client
  }

  if (!_stripeClient) {
    // 动态导入 Stripe SDK（仅真实环境加载）
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Stripe = require('stripe')
      _stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
        apiVersion: '2024-12-18.acacia'
      })
    } catch {
      console.warn('[Payments] Stripe SDK not installed. Run: npm install stripe')
      return null
    }
  }
  return _stripeClient
}

// ── 生成唯一订单号 ───────────────────────────────────────────
export function generateOrderNo(): string {
  const ts = Date.now().toString(36).toUpperCase()
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `ORD-${ts}-${rand}`
}

// ── 创建 Checkout Session ────────────────────────────────────
export async function createCheckoutSession(params: CheckoutParams): Promise<CheckoutResult> {
  const { productName, amount, currency, orderId, successUrl, cancelUrl } = params

  // Mock 模式：返回模拟数据
  if (process.env.MOCK_DB === 'true') {
    const fakeSessionId = `cs_mock_${Date.now()}`
    const fakePI = `pi_mock_${orderId}`
    return {
      sessionId: fakeSessionId,
      url: successUrl || `${process.env.NUXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payments/confirm?session_id=${fakeSessionId}`,
      paymentIntentId: fakePI,
    }
  }

  // 真实 Stripe 模式
  const stripe = getStripeClient()
  if (!stripe) {
    throw new Error('Stripe client not initialized. Check STRIPE_SECRET_KEY.')
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: currency.toLowerCase(),
          product_data: { name: productName },
          unit_amount: Math.round(amount * 100), // Stripe 使用最小单位（cents）
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: successUrl || `${process.env.NUXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payments/confirm?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl || `${process.env.NUXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payments/cancel`,
    metadata: { orderId },
  })

  return {
    sessionId: session.id,
    url: session.url || '',
    paymentIntentId: (session.payment_intent as string) || '',
  }
}

// ── 验证 Webhook 签名 ────────────────────────────────────────
export function verifyWebhookSignature(rawBody: string | Buffer, signature: string): StripeEvent | null {
  if (process.env.MOCK_DB === 'true') {
    // Mock 模式：直接解析 body 为事件
    try {
      return typeof rawBody === 'string' ? JSON.parse(rawBody) : JSON.parse(rawBody.toString())
    } catch {
      return null
    }
  }

  const stripe = getStripeClient()
  if (!stripe) return null

  try {
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    )
    return event as StripeEvent
  } catch (err: any) {
    console.error('[Payments] Webhook signature verification failed:', err.message)
    return null
  }
}

// ── 多币种金额格式化 ─────────────────────────────────────────
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${currency.toUpperCase()} ${amount.toFixed(2)}`
  }
}
