<script setup lang="ts">
import { inject } from '@vercel/analytics'
import { injectSpeedInsights } from '@vercel/speed-insights'
import { onErrorCaptured, ref, onMounted } from 'vue'
import { useLocaleDetect } from '~/composables/useLocaleDetect'

// 仅在生产环境注入 Vercel Analytics + Speed Insights
if (import.meta.client && import.meta.env.PROD) {
  inject()
  injectSpeedInsights()
}

// 自动检测并应用多语言
const { autoDetect } = useLocaleDetect()
onMounted(() => {
  autoDetect()
})

// 🔗 预连接关键域名（消减 DNS/TCP/TLS 耗时）
const supabaseUrl = useRuntimeConfig().public.supabaseUrl as string
const supabaseHost = supabaseUrl ? new URL(supabaseUrl).hostname : ''

useHead({
  link: [
    // Supabase API / Auth / Storage 预连接
    ...(supabaseHost ? [{ rel: 'preconnect', href: `https://${supabaseHost}` } as const] : []),
  ],
})

// ─── ErrorBoundary：捕获子组件崩溃，防止白屏 ───
const appError = ref<Error | null>(null)
const pageKey = ref(0)

onErrorCaptured((err) => {
  appError.value = err instanceof Error ? err : new Error(String(err))
  return false // 阻止向上传播
})

function handleRetry() {
  appError.value = null
  pageKey.value++ // 强制重新挂载 NuxtPage
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
/* ─── 自托管字体 @font-face（全部 woff2，零外部依赖） ─── */
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

/* IBM Plex Sans — 首页标题/UI 字体 */
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

/* JetBrains Mono — 代码/终端字体 */
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
  src: url('/fonts/jetbrains-mono-v18-latin-700.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

/* ─── 全局基底样式（三大子系统统一视觉基础） ─── */
:root {
  --bg-base: #0a0e1a;
  --text-base: #e2e8f0;
  --border-base: #1e2d4d;
  --font-sans: 'Inter', 'Noto Sans SC', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  /* 品牌色 (indigo) */
  --brand-accent: #6366f1;
  --brand-accent-light: #818cf8;
  --brand-accent-dark: #4f46e5;
  --brand-accent-soft: #a5b4fc;
  --brand-blue-500: #3b82f6;
  --brand-violet: #bf5af2;
  /* 状态色 (Apple HIG) */
  --brand-status-ok: #30d158;
  --brand-status-err: #ff453a;
  --brand-status-warn: #ff9f0a;
  --brand-status-info: #bf5af2;
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

/* 全局滚动条风格 */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: var(--bg-base); }
::-webkit-scrollbar-thumb { background: var(--border-base); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #2d4470; }

/* 文本选中高亮 */
::selection {
  background: rgba(79, 142, 247, 0.3);
  color: #ffffff;
}

/* 全局链接风格重置 */
a {
  color: inherit;
  text-decoration: none;
}

/* 图片响应式默认行为 */
img {
  max-width: 100%;
  height: auto;
}

/* 隐藏滚动条的通用工具类 */
.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
</style>

<style scoped>
.app-root {
  min-height: 100vh;
  background: var(--bg-base);
  color: var(--text-base);
}

/* ─── ErrorBoundary 兜底界面 ─── */
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
  color: rgba(255,255,255,0.45);
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
