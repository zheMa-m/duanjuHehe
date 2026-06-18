<script setup lang="ts">
import { inject } from '@vercel/analytics'
import { injectSpeedInsights } from '@vercel/speed-insights'

// 仅在生产环境注入 Vercel Analytics + Speed Insights
if (import.meta.client && import.meta.env.PROD) {
  inject()
  injectSpeedInsights()
}

// ── 客户端站点访问密码门控已废除 ──
</script>

<template>
  <div class="app-root">
    <NuxtPage />
  </div>
</template>

<style>
/* ─── 自托管字体 @font-face（Inter woff2，消除外部依赖） ─── */
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

</style>
