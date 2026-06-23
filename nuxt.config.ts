// ── 站点 URL 自动探测（本地 / Vercel 统一） ──
// 优先级：显式 NUXT_PUBLIC_BASE_URL > Vercel VERCEL_URL > 本地默认值
// Vercel 会自动注入 VERCEL_URL：Preview 为分支 URL，Production 为绑定的自定义域名
import { resolve } from 'path'
const _resolveBaseUrl = (): string => {
  if (process.env.NUXT_PUBLIC_BASE_URL) return process.env.NUXT_PUBLIC_BASE_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

// Sentry 模块仅在配置了有效 DSN 时才启用
const _hasSentry = !!(process.env.SENTRY_DSN || process.env.NUXT_PUBLIC_SENTRY_DSN)

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },

  // StarPath #shell/http 兼容别名
  alias: {
    '#shell/http': resolve(__dirname, './app/utils/http-client.ts'),
  },

  app: {
    head: {
      link: [
        // 🚀 字体预加载（全部自托管 woff2，零外部依赖）
        { rel: 'preload', href: '/fonts/inter-v18-latin-400.woff2', as: 'font', type: 'font/woff2', crossorigin: 'anonymous' },
        { rel: 'preload', href: '/fonts/inter-v18-latin-700.woff2', as: 'font', type: 'font/woff2', crossorigin: 'anonymous' },
        { rel: 'preload', href: '/fonts/ibm-plex-sans-v19-latin-400.woff2', as: 'font', type: 'font/woff2', crossorigin: 'anonymous' },
        { rel: 'preload', href: '/fonts/jetbrains-mono-v18-latin-400.woff2', as: 'font', type: 'font/woff2', crossorigin: 'anonymous' },
        // SVG favicon（轻量 <1KB）
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        // Apple Touch Icon (webp 优化)
        { rel: 'apple-touch-icon', href: '/og-default.webp' },
      ],
    },
  },

  runtimeConfig: {
    // 根域名，从 baseUrl 自动提取 hostname；本地子域名开发可用 ROOT_DOMAIN 覆盖
    // ✅ 自动去除 www. 前缀，避免 Vercel VERCEL_URL=www.xxx.com 导致子域名路由失效
    rootDomain: process.env.ROOT_DOMAIN || (() => {
      try {
        const hostname = new URL(_resolveBaseUrl()).hostname
        return hostname.replace(/^www\./, '')
      } catch { return 'localhost' }
    })(),
    // Sentry DSN（服务器端，不暴露给浏览器）
    sentryDSN: process.env.SENTRY_DSN || '',
    public: {
      baseUrl: _resolveBaseUrl(),
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL || '',
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || '',
      // 支付渠道公开密钥已迁移至 DB payment_configs，
      // 前端通过 /api/v1/payments/config 获取，不再通过 env var
      // Sentry SDK 初始化参数（v10 必须放在 runtimeConfig.public.sentry，而非模块选项）
      ...(_hasSentry ? {
        sentry: {
          dsn: process.env.SENTRY_DSN || process.env.NUXT_PUBLIC_SENTRY_DSN || '',
          environment: process.env.NODE_ENV || 'development',
          tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0.0,
          replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0.0,
          replaysOnErrorSampleRate: process.env.NODE_ENV === 'production' ? 1.0 : 0.0,
        },
      } : {}),
    },
  },
  
  future: {
    compatibilityVersion: 4,
  },

  routeRules: {
    // 管理后台强制设为 SPA 纯客户端渲染，完全隔离 SSR 安全隐患
    // /admin/** 路径由 01.subdomain-rewrite 中间件将 admin. 子域名重写而来
    '/admin/**': { ssr: false },
    // 营销 H5 页面走 ISR 短间隔 + swr CDN 缓存
    '/h5/**': { isr: 600, headers: { 'Cache-Control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=3600' } },
    '/h5-v2/**': { isr: 600, headers: { 'Cache-Control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=3600' } },
    // 智能问卷 (StarPath) 独立路由
    '/starpath/**': { isr: 600, headers: { 'Cache-Control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=3600' } },
    // ── 客户端页面：ISR 3600s + CDN swr 24h，新增页面需同步注册 ──
    '/': { isr: 3600, headers: { 'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400' } },
    '/architecture': { isr: 3600, headers: { 'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400' } },
    '/help': { isr: 3600, headers: { 'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400' } },
    // 静态资源 (hashed 文件名，内容永不变) — 1 年浏览器缓存
    '/_nuxt/**': { headers: { 'Cache-Control': 'public, max-age=31536000, immutable' } },
    // API 接口绝对禁止缓存，确保每次请求实时响应
    '/api/**': { cors: true, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } },
    // 公开 API 端点允许短时 CDN 缓存（读多写少，高频访问）
    // 注意：routeRules 独立匹配不继承父规则，需显式声明 cors
    '/api/v1/products/**': { cors: true, headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } },
    '/api/v1/campaigns/**': { cors: true, headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=600' } },
    '/api/v1/analytics/config': { cors: true, headers: { 'Cache-Control': 'public, max-age=3600' } },
    '/api/v1/payments/config': { cors: true, headers: { 'Cache-Control': 'public, max-age=3600' } },
    '/api/v1/feedback/**': { cors: true, headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=600' } },
    '/api/starpath/report/**': { cors: true, headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } },
  },

  image: {
    provider: 'ipx',
    ipx: {
      maxAge: 60 * 60 * 24 * 7, // 7 天缓存
    },
  },

  nitro: {
    compressPublicAssets: true,
    minify: true,
    // Vercel 部署需指定 preset，确保 Nitro 生成正确的 Serverless Function
    preset: 'vercel',
    prerender: {
      crawlLinks: true,
    },
    experimental: {
      openAPI: true,
    },
    openAPI: {
      // 'prerender' 模式：spec 在构建/启动时预生成静态 JSON，后续请求零扫描开销
      // 'runtime' 模式：每次请求实时扫描所有 API 路由生成 spec，49 个路由下非常慢
      production: 'prerender',
      meta: {
        title: 'HeHe App API',
        description: 'HeHe 应用全量 API 文档 — 涵盖认证、支付、商品、任务、营销活动、存储及管理端接口。',
        version: '1.0.0',
      },
      ui: {
        scalar: { theme: 'purple' },
        swagger: { route: '/_swagger' },
      },
    },
  },

  modules: [
    '@pinia/nuxt',
    '@unocss/nuxt',
    '@nuxt/image',
    '@nuxtjs/i18n',
    '@nuxtjs/sitemap',
    '@vite-pwa/nuxt',
    '@nuxt/eslint',
    ...(_hasSentry ? ['@sentry/nuxt/module'] : []),
  ],

  // Bundle 分析：ANALYZE=true npm run build 生成可视化报告
  build: {
    analyze: process.env.ANALYZE === 'true',
  },

  experimental: {
    payloadExtraction: true,
    renderJsonPayloads: true,
  },

  // ── SEO 基础设施 ──
  site: {
    url: _resolveBaseUrl(),
    name: 'HeHe App',
    description: 'HeHe 全栈应用平台 — 智能问券、营销活动、支付一站式解决方案',
    defaultLocale: 'zh',
  },

  sitemap: {
    sources: [
      '/api/__sitemap__/urls',
    ],
  },

  i18n: {
    restructureDir: '.',
    locales: [
      { code: 'zh', language: 'zh-CN', name: '中文', file: 'zh.json' },
      { code: 'en', language: 'en-US', name: 'English', file: 'en.json' },
    ],
    defaultLocale: 'zh',
    strategy: 'prefix_except_default',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_locale',
      redirectOn: 'root',
      fallbackLocale: 'zh',
    },
    langDir: 'locales/',
  },

  pwa: {
    registerType: 'autoUpdate',
    scope: '/admin/',
    manifest: {
      name: 'HEHE Admin',
      short_name: 'HEHE',
      description: 'HEHE 管理后台',
      theme_color: '#0a0e1a',
      background_color: '#0a0e1a',
      display: 'standalone',
      scope: '/admin/',
      start_url: '/admin/',
      icons: [
        { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
      ],
    },
    workbox: {
      // 仅缓存 admin SPA 静态资源，不缓存其他页面
      navigateFallback: '/admin/',
      globPatterns: ['**/*.{js,css,html,svg,woff2}'],
      runtimeCaching: [
        {
          urlPattern: /\/api\/admin\//,
          handler: 'NetworkFirst',
          options: { cacheName: 'admin-api', expiration: { maxEntries: 50, maxAgeSeconds: 300 } },
        },
      ],
    },
    client: {
      installPrompt: true,
    },
  },

  // ── Sentry 模块配置（SDK 初始化参数已移至 runtimeConfig.public.sentry）──
  ...(_hasSentry ? {
    sentry: {
      sourceMapsUploadOptions: {
        enabled: false,
      },
    },
  } : {}),
})