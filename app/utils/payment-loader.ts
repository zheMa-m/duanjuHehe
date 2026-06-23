/**
 * 前端支付 SDK 动态/延迟加载器
 *
 * 用于在官网或营销 H5 的支付环节动态加载各渠道的官方 JS 库，
 * 避免首屏静态加载造成包体积与 LCP 指标恶化。
 *
 * 支持的支付方式：
 * - Stripe: 国际信用卡/借记卡
 * - PayPal: PayPal 按钮 & Checkout
 * - Google Pay: Google Pay API
 * - Apple IAP: WebKit message handlers（iOS WebView 内购）
 */

declare global {
  interface Window {
    Stripe?: (publicKey: string) => any
    paypal?: any
    google?: {
      payments?: {
        api?: {
          PaymentsClient?: new (config: { environment: string }) => any
        }
      }
    }
    webkit?: {
      messageHandlers?: {
        makeApplePay?: {
          postMessage: (body: any) => void
        }
        applePayStatus?: {
          postMessage: (body: any) => void
        }
      }
    }
  }
}

// 单例缓存已加载完成的实例
let _stripePromise: Promise<any> | null = null
let _paypalPromise: Promise<any> | null = null
let _googlePayPromise: Promise<any> | null = null

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
        _stripePromise = null
        reject(new Error('[Payments] Failed to load Stripe.js script: ' + String(err)))
      }
      document.head.appendChild(script)
    })
  }

  return _stripePromise
}

/**
 * 动态引入 PayPal Checkout SDK 并初始化
 *
 * @param clientId - PayPal REST App Client ID
 * @param currency - 币种（默认 USD）
 * @param intent - 意图（capture | authorize，默认 capture）
 * @param components - 需要加载的组件（默认 buttons,messages）
 */
export function loadPayPalSdk(
  clientId: string,
  currency: string = 'USD',
  intent: 'capture' | 'authorize' = 'capture',
  components: string = 'buttons,messages',
): Promise<any> {
  if (typeof window === 'undefined') return Promise.resolve(null)

  if (window.paypal) {
    return Promise.resolve(window.paypal)
  }

  if (!_paypalPromise) {
    _paypalPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      const params = new URLSearchParams({
        'client-id': clientId,
        currency: currency.toUpperCase(),
        intent,
        components,
      })
      script.src = `https://www.paypal.com/sdk/js?${params.toString()}`
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

/**
 * 动态加载 Google Pay API（通过已加载的 JS 库或动态插入）
 *
 * Google Pay 的客户端库通过以下方式加载：
 * 1. 已通过 <script src="https://pay.google.com/gp/p/js/pay.js"> 加载
 * 2. 或通过此函数动态注入
 *
 * @param environment - 运行环境（TEST | PRODUCTION，默认 TEST）
 */
export function loadGooglePaySdk(environment: 'TEST' | 'PRODUCTION' = 'TEST'): Promise<any> {
  if (typeof window === 'undefined') return Promise.resolve(null)

  if (window.google?.payments?.api?.PaymentsClient) {
    return Promise.resolve(new window.google.payments.api.PaymentsClient({ environment }))
  }

  if (!_googlePayPromise) {
    _googlePayPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://pay.google.com/gp/p/js/pay.js'
      script.async = true
      script.onload = () => {
        const checkLoaded = (retries = 0) => {
          if (window.google?.payments?.api?.PaymentsClient) {
            resolve(new window.google.payments.api.PaymentsClient({ environment }))
          } else if (retries < 10) {
            setTimeout(() => checkLoaded(retries + 1), 200)
          } else {
            reject(new Error('[Payments] Google Pay SDK loaded but PaymentsClient is missing.'))
          }
        }
        checkLoaded()
      }
      script.onerror = (err) => {
        _googlePayPromise = null
        reject(new Error('[Payments] Failed to load Google Pay SDK script: ' + String(err)))
      }
      document.head.appendChild(script)
    })
  }

  return _googlePayPromise
}

/**
 * 检测是否在 iOS WebView 环境中（Apple IAP 可用）
 */
export function isApplePayAvailable(): boolean {
  if (typeof window === 'undefined') return false
  return !!(
    window.webkit?.messageHandlers?.makeApplePay?.postMessage
  )
}

/**
 * 通过 WebKit Bridge 发起 Apple IAP 支付请求
 * 仅在 iOS App WebView 中可用
 */
export function requestAppleIAPPayment(productId: string, quantity: number = 1): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!isApplePayAvailable()) {
      reject(new Error('[Payments] Apple IAP is not available in this browser.'))
      return
    }

    // 设置一次性回调
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'applePayResult') {
        window.removeEventListener('message', handler)
        resolve(event.data)
      }
      if (event.data?.type === 'applePayError') {
        window.removeEventListener('message', handler)
        reject(new Error(event.data.error || 'Apple Pay failed'))
      }
    }
    window.addEventListener('message', handler)

    // 发起支付请求到 iOS 原生层
    window.webkit!.messageHandlers!.makeApplePay!.postMessage({
      productId,
      quantity,
    })

    // 超时处理
    setTimeout(() => {
      window.removeEventListener('message', handler)
      reject(new Error('[Payments] Apple IAP request timed out.'))
    }, 60000)
  })
}
