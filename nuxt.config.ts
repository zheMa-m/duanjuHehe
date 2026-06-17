// ── 站点 URL 自动探测（本地 / Vercel 统一） ──
// 优先级：显式 NUXT_PUBLIC_BASE_URL > Vercel VERCEL_URL > 本地默认值
// Vercel 会自动注入 VERCEL_URL：Preview 为分支 URL，Production 为绑定的自定义域名
const _resolveBaseUrl = (): string => {
  if (process.env.NUXT_PUBLIC_BASE_URL) return process.env.NUXT_PUBLIC_BASE_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },

  app: {
    head: {
      link: [
        // 字体预加载：Inter 400/700 woff2，消除 FOUT
        { rel: 'preload', href: '/fonts/inter-v18-latin-400.woff2', as: 'font', type: 'font/woff2', crossorigin: 'anonymous' },
        { rel: 'preload', href: '/fonts/inter-v18-latin-700.woff2', as: 'font', type: 'font/woff2', crossorigin: 'anonymous' },
        // SVG favicon（轻量 <1KB）
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        // Apple Touch Icon
        { rel: 'apple-touch-icon', href: '/og-default.png' },
      ],
    },
  },

  runtimeConfig: {
    // 站点访问密码（生产环境保护内部访问，服务端专用，严禁暴露给前端）
    accessPassword: process.env.SITE_ACCESS_PASSWORD || '',
    // 根域名，从 baseUrl 自动提取 hostname；本地子域名开发可用 ROOT_DOMAIN 覆盖
    rootDomain: process.env.ROOT_DOMAIN || (() => {
      try { return new URL(_resolveBaseUrl()).hostname } catch { return 'localhost' }
    })(),
    public: {
      baseUrl: _resolveBaseUrl(),
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL || '',
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || '',
    },
  },
  
  future: {
    compatibilityVersion: 4,
  },

  routeRules: {
    // 管理后台强制设为 SPA 纯客户端渲染，完全隔离 SSR 安全隐患
    // /admin/** 路径由 01.subdomain-rewrite 中间件将 admin. 子域名重写而来
    '/admin/**': { ssr: false },
    // 营销 H5 页面走 ISR 短间隔，后台修改配置后前端秒级热更新
    '/h5/**': { isr: 600 },
    '/h5-v2/**': { isr: 600 },
    // ── 客户端页面：ISR 3600s（(client) route group 不出现在 URL 中）──
    // 新增客户端页面时需同步注册到此列表
    '/': { isr: 3600 },
    '/architecture': { isr: 3600 },
    '/help': { isr: 3600 },
    '/tasks': { isr: 3600 },
    // API 接口绝对禁止缓存，确保每次请求实时响应
    '/api/**': { cors: true, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
  },

  image: {
    provider: 'ipx',
    ipx: {
      maxAge: 60 * 60 * 24 * 7, // 7 天缓存
    },
  },

  nitro: {
    compressPublicAssets: true,
    // Vercel 部署需指定 preset，确保 Nitro 生成正确的 Serverless Function
    preset: 'vercel',
    experimental: {
      openAPI: true,
    },
    openAPI: {
      // 'prerender' 模式：spec 在构建/启动时预生成静态 JSON，后续请求零扫描开销
      // 'runtime' 模式：每次请求实时扫描所有 API 路由生成 spec，49 个路由下非常慢
      production: 'prerender',
      meta: {
        title: 'HeHe App API',
        description: '单人全栈脚手架 API — Nuxt 4 + Supabase + Stripe，包含认证、支付、广告、营销活动、评价及管理端接口。',
        version: '1.0.0',
      },
      ui: {
        scalar: { theme: 'purple' },
        swagger: { route: '/_swagger' },
      },
    },
  },

  modules: ['@unocss/nuxt', '@nuxt/image', '@nuxtjs/i18n', '@vite-pwa/nuxt'],

  // Bundle 分析：ANALYZE=true npm run build 生成可视化报告
  build: {
    analyze: process.env.ANALYZE === 'true',
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
})