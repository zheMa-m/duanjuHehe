/**
 * 前端支付 SDK 动态/延迟加载器
 *
 * 用于在官网或营销 H5 的支付环节动态加载各渠道的官方 JS 库，
 * 避免首屏静态加载造成包体积与 LCP 指标恶化。
 */

declare global {
  interface Window {
    Stripe?: (publicKey: string) => any
    paypal?: any
  }
}

// 单例缓存已加载完成的实例
let _stripePromise: Promise<any> | null = null
let _paypalPromise: Promise<any> | null = null

/**
 * 动态引入 Stripe.js v3 并初始化 Stripe 实例
 */
export function loadStripeSdk(publicKey: string): Promise<any> {
  if (typeof window === 'undefined') return Promise.resolve(null)
  
  if (window.Stripe) {
    return Promise.resolve(window.Stripe(publicKey))
  }

  if (!_stripePromise) {
    _stripePromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://js.stripe.com/v3/'
      script.async = true
      script.onload = () => {
        if (window.Stripe) {
          resolve(window.Stripe(publicKey))
        } else {
          reject(new Error('[Payments] Stripe.js loaded but window.Stripe is missing.'))
        }
      }
      script.onerror = (err) => {
        _stripePromise = null // 出错重置缓存以允许重试
        reject(new Error('[Payments] Failed to load Stripe.js script: ' + String(err)))
      }
      document.head.appendChild(script)
    })
  }

  return _stripePromise
}

/**
 * 预留：动态引入 PayPal Checkout SDK 并初始化
 */
export function loadPayPalSdk(clientId: string, currency: string = 'USD'): Promise<any> {
  if (typeof window === 'undefined') return Promise.resolve(null)

  if (window.paypal) {
    return Promise.resolve(window.paypal)
  }

  if (!_paypalPromise) {
    _paypalPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      // 动态拼接 client-id 和币种限制
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${currency.toUpperCase()}`
      script.async = true
      script.onload = () => {
        if (window.paypal) {
          resolve(window.paypal)
        } else {
          reject(new Error('[Payments] PayPal SDK loaded but window.paypal is missing.'))
        }
      }
      script.onerror = (err) => {
        _paypalPromise = null
        reject(new Error('[Payments] Failed to load PayPal SDK script: ' + String(err)))
      }
      document.head.appendChild(script)
    })
  }

  return _paypalPromise
}
