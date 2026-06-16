<script setup lang="ts">
/**
 * LanguageSwitcher — 极简语言切换按钮
 *
 * 放置在主站顶部导航栏和 H5 用户状态栏区域
 */

const { localeLabel, toggleLocale } = useLocaleDetect()
</script>

<template>
  <button
    class="lang-switch-btn"
    :title="localeLabel === '中文' ? 'Switch to English' : '切换到中文'"
    @click="toggleLocale"
  >
    <span class="lang-icon">🌐</span>
    <span class="lang-label">{{ localeLabel === '中文' ? 'EN' : '中' }}</span>
  </button>
</template>

<style scoped>
.lang-switch-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 6px;
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.7);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(4px);
}
.lang-switch-btn:hover {
  background: rgba(255,255,255,0.1);
  border-color: rgba(255,255,255,0.25);
  color: #fff;
}
.lang-icon {
  font-size: 12px;
  line-height: 1;
}
.lang-label {
  font-family: 'Inter', sans-serif;
  letter-spacing: 0.02em;
}
</style>
