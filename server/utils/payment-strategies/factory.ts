import { StripePaymentStrategy } from './stripe'
import { PayPalPaymentStrategy } from './paypal'
import { GooglePayPaymentStrategy } from './google-pay'
import { AppleIAPPaymentStrategy } from './apple-iap'
import { ManualPaymentStrategy } from './manual'
import { AlipayPaymentStrategy } from './alipay'
import { WechatPaymentStrategy } from './wechat'
import type { PaymentStrategy } from './types'

const strategies: Record<string, PaymentStrategy> = {
  stripe: new StripePaymentStrategy(),
  paypal: new PayPalPaymentStrategy(),
  google_pay: new GooglePayPaymentStrategy(),
  apple_iap: new AppleIAPPaymentStrategy(),
  manual: new ManualPaymentStrategy(),
  alipay: new AlipayPaymentStrategy(),
  wechat: new WechatPaymentStrategy(),
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
export * from './paypal'
export * from './google-pay'
export * from './apple-iap'
export * from './manual'
export * from './alipay'
export * from './wechat'
