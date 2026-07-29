<script setup lang="ts">
import { inject } from '@vercel/analytics'
import { injectSpeedInsights } from '@vercel/speed-insights'
import { onErrorCaptured, ref, onMounted, computed } from 'vue'
import { useLocaleDetect } from '~/composables/useLocaleDetect'
import { isH5MarketingContext } from '~/utils/is-h5-context'

const MAIN_SITE_FONT_PRELOADS = [
  { rel: 'preload', href: '/fonts/inter-v18-latin-400.woff2', as: 'font', type: 'font/woff2', crossorigin: 'anonymous' },
  { rel: 'preload', href: '/fonts/inter-v18-latin-700.woff2', as: 'font', type: 'font/woff2', crossorigin: 'anonymous' },
  { rel: 'preload', href: '/fonts/ibm-plex-sans-v19-latin-400.woff2', as: 'font', type: 'font/woff2', crossorigin: 'anonymous' },
  { rel: 'preload', href: '/fonts/jetbrains-mono-v18-latin-400.woff2', as: 'font', type: 'font/woff2', crossorigin: 'anonymous' },
] as const

function resolveHostname(): string {
  if (import.meta.server) {
    return (useRequestHeaders(['host']).host || '').split(':')[0] || ''
  }
  return window.location.hostname
}

const route = useRoute()
const hostname = resolveHostname()
const isH5 = computed(() => isH5MarketingContext(hostname, route.path))

function runWhenIdle(fn: () => void, timeoutMs = 2500) {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(fn, { timeout: timeoutMs })
  } else {
    setTimeout(fn, 1)
  }
}

// 生产环境：H5 营销页延后注入 Analytics，降低 TBT
if (import.meta.client && import.meta.env.PROD) {
  const bootAnalytics = () => {
    inject()
    injectSpeedInsights()
  }
  if (isH5MarketingContext(window.location.hostname, window.location.pathname)) {
    runWhenIdle(bootAnalytics)
  } else {
    bootAnalytics()
  }
}

const { autoDetect } = useLocaleDetect()
onMounted(() => {
  const detect = () => autoDetect()
  if (isH5MarketingContext(window.location.hostname, route.path)) {
    runWhenIdle(detect)
  } else {
    detect()
  }
})

const supabaseUrl = useRuntimeConfig().public.supabaseUrl as string
const supabaseHost = supabaseUrl ? new URL(supabaseUrl).hostname : ''

useHead(computed(() => ({
  link: [
    ...(!isH5.value ? MAIN_SITE_FONT_PRELOADS : []),
    ...(supabaseHost && !isH5.value
      ? [{ rel: 'preconnect', href: `https://${supabaseHost}` } as const]
      : []),
  ],
})))

const appError = ref<Error | null>(null)
const pageKey = ref(0)

// 全局图片 fallback：空 src 或加载失败时显示渐变占位图
const FALLBACK_SVG = 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#1e1b4b"/><stop offset="100%" stop-color="#312e81"/></linearGradient></defs><rect width="400" height="600" fill="url(#g)"/><text x="200" y="280" text-anchor="middle" fill="rgba(255,255,255,0.3)" font-size="64" font-family="sans-serif">🎬</text><text x="200" y="340" text-anchor="middle" fill="rgba(255,255,255,0.2)" font-size="14" font-family="sans-serif">NO IMAGE</text></svg>`)

function fixBrokenImages() {
  document.querySelectorAll('img').forEach((img) => {
    if (!img.src || img.src === window.location.href || img.src.endsWith('/')) {
      img.src = FALLBACK_SVG
    }
    if (!img.onerror) {
      img.onerror = () => { if (img.src !== FALLBACK_SVG) img.src = FALLBACK_SVG }
    }
  })
}

let imgFixTimer: ReturnType<typeof setTimeout> | null = null
function scheduleImgFix() {
  if (imgFixTimer) clearTimeout(imgFixTimer)
  imgFixTimer = setTimeout(fixBrokenImages, 200)
}

onMounted(() => {
  fixBrokenImages()
  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(() => scheduleImgFix()).observe(document.body, { childList: true, subtree: true })
  }
})

// 路由切换时重新扫描
watch(() => route.fullPath, () => { scheduleImgFix() })

onErrorCaptured((err) => {
  appError.value = err instanceof Error ? err : new Error(String(err))
  return false
})

function handleRetry() {
  appError.value = null
  pageKey.value++
}
</script>

<template>
  <div v-if="appError" class="error-fallback">
    <div class="error-fallback__icon">⚠</div>
    <h2 class="error-fallback__title">页面加载异常</h2>
    <p class="error-fallback__desc">{{ appError.message || '组件渲染失败，请刷新重试' }}</p>
    <button class="error-fallback__retry" @click="handleRetry">
      <span class="i-lucide-refresh-cw mr-1 text-[13px]" />
      重试
    </button>
  </div>
  <div v-else class="app-root">
    <NuxtPage :key="pageKey" />
  </div>
</template>

<style>
/* ─── 自托管字体 @font-face（主站 / 管理后台；H5 营销页用 system-ui 不触发下载） ─── */
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/inter-v18-latin-400.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('/fonts/inter-v18-latin-700.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
  font-family: 'IBM Plex Sans';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/ibm-plex-sans-v19-latin-400.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
@font-face {
  font-family: 'IBM Plex Sans';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url('/fonts/ibm-plex-sans-v19-latin-600.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
@font-face {
  font-family: 'IBM Plex Sans';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('/fonts/ibm-plex-sans-v19-latin-700.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
  font-family: 'JetBrains Mono';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/jetbrains-mono-v18-latin-400.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
@font-face {
  font-family: 'JetBrains Mono';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('/fonts/jetbrains-mono-v18-latin-400.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

:root {
  --bg-base: #f8fafc;
  --bg-card: #ffffff;
  --bg-hover: #f1f5f9;
  --text-base: #0f172a;
  --text-secondary: #475569;
  --text-muted: #94a3b8;
  --border-base: #e2e8f0;
  --border-light: #e8ecf1;
  --font-sans: 'Inter', 'Noto Sans SC', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --brand-accent: #6366f1;
  --brand-accent-light: #818cf8;
  --brand-accent-dark: #4f46e5;
  --brand-accent-soft: #a5b4fc;
  --brand-blue-500: #3b82f6;
  --brand-violet: #bf5af2;
  --brand-status-ok: #22c55e;
  --brand-status-err: #ef4444;
  --brand-status-warn: #f59e0b;
  --brand-status-info: #bf5af2;
  /* Admin light theme tokens */
  --admin-bg: #f8fafc;
  --admin-bg-elevated: rgba(0,0,0,0.03);
  --admin-bg-input: rgba(0,0,0,0.02);
  --admin-bg-hover: rgba(0,0,0,0.04);
  --admin-border-subtle: rgba(0,0,0,0.06);
  --admin-border-medium: rgba(0,0,0,0.10);
  --admin-text-primary: #0f172a;
  --admin-text-secondary: #475569;
  --admin-text-muted: #64748b;
  --admin-text-ultra-muted: #94a3b8;
  --admin-brand: #6366f1;
}

*,
*::before,
*::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-family: var(--font-sans);
  background: var(--bg-base);
  color: var(--text-base);
  line-height: 1.7;
  overflow-x: hidden;
}

[data-biz="starpath"] {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: var(--bg-base); }
::-webkit-scrollbar-thumb { background: var(--border-base); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }

::selection {
  background: rgba(99, 102, 241, 0.15);
  color: var(--text-base);
}

a {
  color: inherit;
  text-decoration: none;
}

img {
  max-width: 100%;
  height: auto;
}

.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }

</style>

<style scoped>
.app-root {
  min-height: 100vh;
  background: var(--bg-base);
  color: var(--text-base);
}

/* ─── App 手机模式 ─── */
.app-mode {
  background: #e8ecf1;
  display: flex;
  justify-content: center;
}
.phone-frame {
  width: 100%;
  max-width: 480px;
  min-height: 100vh;
  background: #f8fafc;
  box-shadow: 0 0 60px rgba(0, 0, 0, 0.15);
  position: relative;
  overflow: hidden;
}
.phone-screen {
  min-height: calc(100vh - 48px - 56px);
  padding-bottom: 56px;
  overflow-x: hidden;
}

.error-fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
  padding: 2rem;
}
.error-fallback__icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}
.error-fallback__title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-base);
  margin-bottom: 0.5rem;
}
.error-fallback__desc {
  font-size: 0.875rem;
  color: rgba(0,0,0,0.45);
  max-width: 400px;
  margin-bottom: 1.5rem;
}
.error-fallback__retry {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1.25rem;
  border-radius: 0.5rem;
  background: var(--brand-accent);
  color: #fff;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: background 0.2s;
}
.error-fallback__retry:hover {
  background: var(--brand-accent-dark);
}
</style>
