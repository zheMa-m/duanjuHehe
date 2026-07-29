<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()

const tabs = computed(() => [
  { label: t('reelshort.home'), icon: '🏠', to: '/' },
  { label: t('reelshort.browse'), icon: '🔍', to: '/browse' },
  { label: t('reelshort.landingPages'), icon: '📄', to: '/', match: false },
])
</script>

<template>
  <nav class="app-nav">
    <NuxtLink
      v-for="tab in tabs"
      :key="tab.to"
      :to="tab.to"
      class="app-nav-item"
      :class="{ active: route.path === tab.to || (tab.to === '/' && route.path === '/') }"
    >
      <span class="app-nav-icon">{{ tab.icon }}</span>
      <span class="app-nav-label">{{ tab.label }}</span>
    </NuxtLink>
  </nav>
</template>

<style scoped>
.app-nav {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 480px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-top: 1px solid #e8ecf1;
  z-index: 200;
  padding-bottom: env(safe-area-inset-bottom);
}
.app-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  text-decoration: none;
  color: #94a3b8;
  font-size: 10px;
  font-weight: 500;
  padding: 4px 16px;
  border-radius: 8px;
  transition: all 0.15s;
}
.app-nav-item.active {
  color: #6366f1;
}
.app-nav-icon {
  font-size: 20px;
  line-height: 1;
}
.app-nav-label {
  font-size: 10px;
}
</style>
