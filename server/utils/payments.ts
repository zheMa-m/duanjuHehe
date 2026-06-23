/**
 * 支付工具层 — Stripe 集成封装
 *
 * 双模式运行：
 * - MOCK_DB=true: 返回模拟 session/fake PI，无需 Stripe SDK
 * - MOCK_DB=false: 真实 Stripe API 调用
 *
 * 注意：Stripe 密钥已迁移至 DB system_configs.payment_secrets，
 * 所有调用方需通过 getStripeClient(secretKeyOverride) 传入密钥。
 */

export interface StripeEvent {
  type: string
  data: {
    object: Record<string, any>
  }
}

// ── 初始化 Stripe Client ─────────────────────────────────────
let _stripeClient: any = null
let _lastSecretKey: string = ''

export function getStripeClient(secretKeyOverride?: string) {
  if (process.env.MOCK_DB === 'true') {
    return null // Mock 模式不需要真实 client
  }

  const keyToUse = secretKeyOverride || ''

  if (!_stripeClient || (secretKeyOverride && _lastSecretKey !== secretKeyOverride)) {
    // 动态导入 Stripe SDK（仅真实环境加载）
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Stripe = require('stripe')
      _stripeClient = new Stripe(keyToUse, {
        apiVersion: '2024-12-18.acacia'
      })
      _lastSecretKey = keyToUse
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

// ── 验证 Webhook 签名 ────────────────────────────────────────
export function verifyWebhookSignature(
  rawBody: string | Buffer,
  signature: string,
  secretKeyOverride?: string,
  webhookSecretOverride?: string
): StripeEvent | null {
  if (process.env.MOCK_DB === 'true') {
    // Mock 模式：直接解析 body 为事件
    try {
      return typeof rawBody === 'string' ? JSON.parse(rawBody) : JSON.parse(rawBody.toString())
    } catch {
      return null
    }
  }

  const stripe = getStripeClient(secretKeyOverride)
  if (!stripe) return null

  const webhookSecret = webhookSecretOverride || ''

  try {
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret
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
