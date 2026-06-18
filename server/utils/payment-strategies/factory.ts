import { StripePaymentStrategy } from './stripe'
import type { PaymentStrategy } from './types'

const strategies: Record<string, PaymentStrategy> = {
  stripe: new StripePaymentStrategy(),
  // 这里可以预留并随时扩展其他三方支付：
  // paypal: new PayPalPaymentStrategy(),
  // wechat: new WeChatPaymentStrategy(),
}

export function getPaymentStrategy(provider: string): PaymentStrategy {
  const strategy = strategies[provider.toLowerCase()]
  if (!strategy) {
    throw createError({
      statusCode: 400,
      statusMessage: `Payment provider [${provider}] is not supported by current gateway.`
    })
  }
  return strategy
}
export * from './types'
export * from './stripe'
