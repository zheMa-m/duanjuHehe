<script setup lang="ts">
import { computed } from 'vue'

const route = useRoute()
const { t } = useI18n()

const tabs = computed(() => [
  { key: 'home', icon: '🏠', label: 'Home', to: '/app' },
  { key: 'browse', icon: '🔍', label: t('reelshort.browse'), to: '/app/browse' },
  { key: 'library', icon: '📚', label: 'Library', to: '/app/library' },
  { key: 'profile', icon: '👤', label: 'Profile', to: '/app/profile' },
])

function isActive(tab: { key: string; to: string }): boolean {
  if (tab.key === 'home') return route.path === '/app'
  return route.path.startsWith(tab.to)
}
</script>

<template>
  <nav class="bottom-nav">
    <NuxtLink
      v-for="tab in tabs"
      :key="tab.key"
      :to="tab.to"
      class="bottom-nav-item"
      :class="{ active: isActive(tab) }"
    >
      <span class="bottom-nav-icon">{{ tab.icon }}</span>
      <span class="bottom-nav-label">{{ tab.label }}</span>
    </NuxtLink>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  align-items: center;
  height: 60px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid #e8ecf1;
  z-index: 100;
  padding-bottom: env(safe-area-inset-bottom);
}
.bottom-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  text-decoration: none;
  padding: 6px 12px;
  border-radius: 8px;
  transition: all 0.15s;
}
.bottom-nav-icon { font-size: 1.25rem; }
.bottom-nav-label { font-size: 0.625rem; font-weight: 500; color: #94a3b8; }
.bottom-nav-item.active .bottom-nav-label { color: #6366f1; font-weight: 700; }
</style>
