/**
 * analytics.client.ts — 多平台埋点 SDK 动态加载插件（仅客户端）
 *
 * 策略：
 *   1. 插件启动时异步（非阻塞）拉取 /api/v1/analytics/config
 *   2. 根据当前路由和开关决定加载哪些平台 SDK
 *   3. 注入 DNS preconnect 加速外部脚本建连
 *   4. 动态加载各平台 SDK：GA4 / Meta Pixel / TikTok Pixel
 *   5. 对于 H5 活动页（/h5/:subdomain），额外检查 Campaign 级别的 pixel override
 *   6. 监听路由变化，在每次 SPA 导航后重新上报 page_view
 */

interface AnalyticsConfig {
  isEnabled:       boolean
  enableClient:    boolean
  enableH5:        boolean
  enableAdmin:     boolean
  gaMeasurementId: string | null
  metaPixelId:     string | null
  tiktokPixelId:   string | null
}

// 默认配置（接口失败时的安全降级值）
const DEFAULT_CFG: AnalyticsConfig = {
  isEnabled: false,
  enableClient: false,
  enableH5: false,
  enableAdmin: false,
  gaMeasurementId: null,
  metaPixelId: null,
  tiktokPixelId: null,
}

let globalConfig: AnalyticsConfig | null = null

/** 当前路由是否应该启用埋点 */
function shouldTrackPath(path: string, cfg: AnalyticsConfig): boolean {
  if (!cfg.isEnabled) return false
  if (path.startsWith('/admin'))  return cfg.enableAdmin
  if (path.startsWith('/h5') || path.startsWith('/h5-v2')) return cfg.enableH5
  return cfg.enableClient
}

/** 判断当前路由类型 */
function getRouteType(path: string): 'admin' | 'h5' | 'client' {
  if (path.startsWith('/admin'))  return 'admin'
  if (path.startsWith('/h5') || path.startsWith('/h5-v2')) return 'h5'
  return 'client'
}

/** 注入 DNS preconnect，加速外部脚本建连（幂等，已存在则跳过） */
function injectPreconnect(href: string) {
  if (document.querySelector(`link[rel="preconnect"][href="${href}"]`)) return
  const link = document.createElement('link')
  link.rel = 'preconnect'
  link.href = href
  link.crossOrigin = 'anonymous'
  document.head.appendChild(link)
}

/** 动态加载外部 Script（幂等，已存在则跳过） */
function loadScript(src: string, id: string): Promise<void> {
  return new Promise((resolve) => {
    if (document.getElementById(id)) { resolve(); return }
    const s = document.createElement('script')
    s.id  = id
    s.src = src
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => resolve() // 降级：加载失败不阻断页面
    document.head.appendChild(s)
  })
}

/** 初始化 GA4 */
async function initGA4(measurementId: string) {
  const w = window as any
  if (w.__ga4Initialized === measurementId) return // 幂等

  // gtag 全局队列
  w.dataLayer = w.dataLayer || []
  w.gtag = function () { w.dataLayer.push(arguments) }
  w.gtag('js', new Date())
  w.gtag('config', measurementId, { send_page_view: false }) // 手动控制 page_view

  await loadScript(`https://www.googletagmanager.com/gtag/js?id=${measurementId}`, 'ga4-script')
  w.__ga4Initialized = measurementId
}

/** 初始化 Meta Pixel */
async function initMetaPixel(pixelId: string) {
  const w = window as any
  if (w.__metaPixelInitialized === pixelId) return

  // 官方 Pixel 初始化队列（精简版，无外部 polyfill 依赖）
  if (!w.fbq) {
    const f = function (...args: any[]) { (f as any).callMethod ? (f as any).callMethod.apply(f, args) : (f as any).queue.push(args) } as any
    f.push = f; f.loaded = true; f.version = '2.0'; f.queue = []
    w.fbq = f; w._fbq = f
  }
  w.fbq('init', pixelId)

  await loadScript('https://connect.facebook.net/en_US/fbevents.js', 'meta-pixel-script')
  w.__metaPixelInitialized = pixelId
}

/** 初始化 TikTok Pixel */
async function initTikTokPixel(pixelId: string) {
  const w = window as any
  if (w.__tiktokPixelInitialized === pixelId) return

  // 官方 TikTok Pixel 初始化队列
  if (!w.ttq) {
    const ttq: any = { _i: [], load: function (e: string, t?: any) { ttq._i.push([e, t]) }, page: function () { ttq._i.push(['page']) }, track: function (e: string, p?: any) { ttq._i.push(['track', e, p]) }, identify: function (e: any) { ttq._i.push(['identify', e]) }, instances: function (e: string[]) { return e.map(i => ttq) }, debug: function (e: any) { ttq._i.push(['debug', e]) }, on: function (e: string, fn: Function) { ttq._i.push(['on', e, fn]) }, off: function (e: string, fn: Function) { ttq._i.push(['off', e, fn]) }, once: function (e: string, fn: Function) { ttq._i.push(['once', e, fn]) }, ready: function (fn: Function) { ttq._i.push(['ready', fn]) }, alias: function (a: string, b: string) { ttq._i.push(['alias', a, b]) }, group: function (e: string) { ttq._i.push(['group', e]) }, enableCookie: function () { ttq._i.push(['enableCookie']) }, disableCookie: function () { ttq._i.push(['disableCookie']) } }
    w.ttq = ttq
  }
  w.ttq.load(pixelId)

  await loadScript('https://analytics.tiktok.com/i18n/pixel/events.js', 'tiktok-pixel-script')
  w.__tiktokPixelInitialized = pixelId
}

/** 上报 page_view 到所有已激活平台 */
function reportPageView(path: string, title?: string) {
  const w = window as any
  if (w.gtag) {
    try { w.gtag('event', 'page_view', { page_path: path, page_title: title || document.title }) } catch {}
  }
  if (w.fbq) {
    try { w.fbq('track', 'PageView') } catch {}
  }
  if (w.ttq) {
    try { w.ttq.page() } catch {}
  }
}

/** 根据当前配置和路由，激活并加载对应平台 SDK */
async function activateForRoute(path: string, cfg: AnalyticsConfig, overrides?: { ga?: string | null, meta?: string | null, tiktok?: string | null }) {
  if (!shouldTrackPath(path, cfg)) return

  // 注入预连接
  injectPreconnect('https://www.google-analytics.com')
  injectPreconnect('https://www.googletagmanager.com')
  injectPreconnect('https://connect.facebook.net')
  injectPreconnect('https://analytics.tiktok.com')

  // 各平台：优先使用 Campaign 级覆盖 ID，其次使用全局 ID
  const gaId     = overrides?.ga     ?? cfg.gaMeasurementId
  const metaId   = overrides?.meta   ?? cfg.metaPixelId
  const tiktokId = overrides?.tiktok ?? cfg.tiktokPixelId

  const tasks: Promise<void>[] = []
  if (gaId)     tasks.push(initGA4(gaId))
  if (metaId)   tasks.push(initMetaPixel(metaId))
  if (tiktokId) tasks.push(initTikTokPixel(tiktokId))

  await Promise.allSettled(tasks)
}

export default defineNuxtPlugin({
  name: 'analytics',
  enforce: 'post', // 确保在 supabase-auth 插件之后执行
  async setup(nuxtApp) {
    if (typeof window === 'undefined') return

    // 异步获取配置（非阻塞，不延误页面渲染）
    const fetchConfig = async (): Promise<AnalyticsConfig> => {
      try {
        const res = await $fetch<{ success: boolean; data: AnalyticsConfig }>('/api/v1/analytics/config')
        return res.data || DEFAULT_CFG
      } catch {
        return DEFAULT_CFG
      }
    }

    const router = useRouter()

    // 初始化
    globalConfig = await fetchConfig()

    // 当前路由初始化激活
    const initialPath = router.currentRoute.value.fullPath
    let campaignOverrides: { ga?: string | null; meta?: string | null; tiktok?: string | null } | undefined

    // H5 活动页：从当前路由的 campaign 数据中读取活动级像素覆盖
    if (getRouteType(initialPath) === 'h5') {
      const subdomain = router.currentRoute.value.params.subdomain as string
      if (subdomain) {
        try {
          const res = await $fetch<any>(`/api/v1/campaigns/${subdomain}`)
          const campaign = res?.data
          if (campaign) {
            campaignOverrides = {
              ga:     campaign.ga_measurement_id   || null,
              meta:   campaign.meta_pixel_id        || null,
              tiktok: campaign.tiktok_pixel_id      || null,
            }
          }
        } catch {}
      }
    }

    await activateForRoute(initialPath, globalConfig, campaignOverrides)
    reportPageView(initialPath)

    // 监听路由变化，重新上报 page_view
    router.afterEach(async (to) => {
      if (!globalConfig) return

      let overrides: { ga?: string | null; meta?: string | null; tiktok?: string | null } | undefined

      if (getRouteType(to.fullPath) === 'h5') {
        const subdomain = to.params.subdomain as string
        if (subdomain) {
          try {
            const res = await $fetch<any>(`/api/v1/campaigns/${subdomain}`)
            const campaign = res?.data
            if (campaign) {
              overrides = {
                ga:     campaign.ga_measurement_id   || null,
                meta:   campaign.meta_pixel_id        || null,
                tiktok: campaign.tiktok_pixel_id      || null,
              }
            }
          } catch {}
        }
      }

      await activateForRoute(to.fullPath, globalConfig, overrides)
      reportPageView(to.fullPath, typeof document !== 'undefined' ? document.title : undefined)
    })
  },
})
