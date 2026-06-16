<template>
  <div class="app-root">
    <NuxtPage />
  </div>
</template>

<style>
/* ─── 全局基底样式（三大子系统统一视觉基础） ─── */
:root {
  --bg-base: #0a0e1a;
  --text-base: #e2e8f0;
  --border-base: #1e2d4d;
  --font-sans: 'Inter', 'Noto Sans SC', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
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
