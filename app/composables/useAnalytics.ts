/**
 * useAnalytics — 多平台统一埋点组合式函数
 *
 * 功能：
 *   - 统一接口：trackEvent(name, params) 一次调用，自动分发到所有已加载的平台
 *   - 支持平台：GA4 (gtag) / Meta Pixel (fbq) / TikTok Pixel (ttq)
 *   - Dev 模式：本地开发时只打印 console.log，不发送真实网络请求
 *   - PII 过滤：自动移除 email/phone/password/token 等敏感字段，防止上传个人信息
 *   - 静默降级：平台 SDK 未加载时自动跳过，不抛错
 *
 * 统一事件映射表：
 *   | 统一事件名           | GA4               | Meta Pixel          | TikTok Pixel       |
 *   |---------------------|-------------------|---------------------|--------------------|
 *   | page_view           | page_view         | PageView            | page()             |
 *   | campaign_register   | generate_lead     | Lead                | SubmitForm         |
 *   | purchase_initiate   | begin_checkout    | InitiateCheckout    | InitiateCheckout   |
 *   | purchase_complete   | purchase          | Purchase            | CompletePayment    |
 */

// PII 字段黑名单（严禁上传到任何分析平台）
const PII_FIELDS = ['email', 'phone', 'password', 'token', 'access_token', 'refresh_token', 'mobile', 'id_card']

function maskPII(params: Record<string, any>): Record<string, any> {
  const safe: Record<string, any> = {}
  for (const [k, v] of Object.entries(params)) {
    if (PII_FIELDS.some(pii => k.toLowerCase().includes(pii))) continue
    safe[k] = v
  }
  return safe
}

// 统一事件名到各平台的映射
const GA4_EVENT_MAP: Record<string, string> = {
  page_view:         'page_view',
  campaign_register: 'generate_lead',
  purchase_initiate: 'begin_checkout',
  purchase_complete: 'purchase',
}

const META_EVENT_MAP: Record<string, string> = {
  page_view:         'PageView',
  campaign_register: 'Lead',
  purchase_initiate: 'InitiateCheckout',
  purchase_complete: 'Purchase',
}

const TIKTOK_EVENT_MAP: Record<string, string> = {
  campaign_register: 'SubmitForm',
  purchase_initiate: 'InitiateCheckout',
  purchase_complete: 'CompletePayment',
}

export function useAnalytics() {
  function trackEvent(eventName: string, params: Record<string, any> = {}) {
    const safeParams = maskPII(params)

    // ── 开发模式：仅打印，不发送真实请求 ──────────────────────────
    if (import.meta.dev) {
      console.log(`[Analytics Debug] trackEvent("${eventName}")`, safeParams)
      return
    }

    // ── 生产模式：多平台并行分发 ────────────────────────────────
    const w = typeof window !== 'undefined' ? (window as any) : null
    if (!w) return

    // GA4
    const ga4Event = GA4_EVENT_MAP[eventName] || eventName
    if (w.gtag) {
      try { w.gtag('event', ga4Event, safeParams) } catch {}
    }

    // Meta Pixel
    const metaEvent = META_EVENT_MAP[eventName]
    if (metaEvent && w.fbq) {
      try {
        if (metaEvent === 'PageView') {
          w.fbq('track', 'PageView')
        } else {
          w.fbq('track', metaEvent, safeParams)
        }
      } catch {}
    }

    // TikTok Pixel
    const tiktokEvent = TIKTOK_EVENT_MAP[eventName]
    if (tiktokEvent && w.ttq) {
      try { w.ttq.track(tiktokEvent, safeParams) } catch {}
    }
  }

  function trackPageView(path?: string, title?: string) {
    const safeParams: Record<string, any> = {}
    if (path)  safeParams.page_path  = path
    if (title) safeParams.page_title = title

    // 开发模式直接打印
    if (import.meta.dev) {
      console.log(`[Analytics Debug] trackPageView("${path || ''}")`)
      return
    }

    const w = typeof window !== 'undefined' ? (window as any) : null
    if (!w) return

    // GA4
    if (w.gtag) {
      try { w.gtag('event', 'page_view', safeParams) } catch {}
    }
    // Meta Pixel
    if (w.fbq) {
      try { w.fbq('track', 'PageView') } catch {}
    }
    // TikTok Pixel — page() 是专属 API
    if (w.ttq) {
      try { w.ttq.page() } catch {}
    }
  }

  return { trackEvent, trackPageView }
}
