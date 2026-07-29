<script setup lang="ts">
const { t } = useI18n()
const { isAppMode, disable } = useAppMode()
</script>

<template>
  <header class="app-header">
    <span class="app-header-logo">🎬 {{ t('reelshort.siteName') }}</span>
    <button class="app-header-exit" @click="disable" title="退出 App 模式">
      ✕
    </button>
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 16px;
  background: rgba(255,255,255,0.95);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid #e8ecf1;
  position: sticky;
  top: 0;
  z-index: 100;
}
.app-header-logo {
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
}
.app-header-exit {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #94a3b8;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
