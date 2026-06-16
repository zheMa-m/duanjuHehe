// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },
  
  // 启用 Nuxt 4 新版结构兼容性
  future: {
    compatibilityVersion: 4,
  },

  routeRules: {
    // 管理后台强制设为 SPA 纯客户端渲染，完全隔离 SSR 安全隐患
    // /admin/** 路径由 01.subdomain-rewrite 中间件将 admin. 子域名重写而来
    '/admin/**': { ssr: false },
    // 营销 H5 页面走 ISR 短间隔，后台修改配置后前端秒级热更新
    '/h5/**': { isr: 600 },
    // 官网首页与任务看板走 ISR（(client) route group 不出现在 URL 中）
    '/': { isr: 3600 },
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

  modules: ['@unocss/nuxt', '@nuxt/image', '@nuxtjs/i18n'],

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
})