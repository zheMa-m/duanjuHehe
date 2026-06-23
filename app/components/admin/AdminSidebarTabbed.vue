<script setup lang="ts">
import { useAdminMenu, tabDomains } from '~/composables/useAdminMenu'

const props = defineProps<{ activeTab: string; activeDomain: string }>()
const emit = defineEmits<{ navigate: [key: string]; 'switch-domain': [domainId: string] }>()

const { getTabItems } = useAdminMenu()
const currentItems = computed(() => getTabItems(props.activeDomain))
const currentDomain = computed(() => tabDomains.find(d => d.id === props.activeDomain))
</script>

<template>
  <aside class="nav-tabbed">
    <div class="nav-tabbed__bg" />

    <!-- Logo -->
    <div class="nav-tabbed__header">
      <div class="nav-tabbed__logo">
        <span class="nav-tabbed__logo-glow" />
        <span class="nav-tabbed__logo-letter">H</span>
      </div>
      <span class="nav-tabbed__brand">Hehe Admin</span>
    </div>

    <!-- 域标题 -->
    <div class="nav-tabbed__domain-label">
      <span class="nav-tabbed__domain-name">{{ currentDomain?.label }}</span>
      <span class="nav-tabbed__domain-count">{{ currentItems.length }}</span>
    </div>

    <!-- 子菜单 -->
    <nav class="nav-tabbed__nav">
      <button
        v-for="item in currentItems" :key="item.key"
        class="nav-tab-item"
        :class="{ 'nav-tab-item--active': activeTab === item.key }"
        @click="$emit('navigate', item.key)"
      >
        <span class="nav-tab-item__dot" :class="{ 'nav-tab-item__dot--active': activeTab === item.key }" />
        <span :class="[item.icon, 'nav-tab-item__icon', { 'nav-tab-item__icon--active': activeTab === item.key }]" />
        <span class="nav-tab-item__label">{{ item.label }}</span>
        <kbd v-if="item.shortcut" class="nav-tab-item__kbd">{{ item.shortcut }}</kbd>
      </button>
    </nav>

    <!-- 底部 -->
    <div class="nav-tabbed__footer">
      <span class="text-[10px] text-white/12 font-mono tracking-wider">v1.0.0</span>
    </div>
  </aside>
</template>

<style scoped>
.nav-tabbed {
  position: relative; display: none; flex-direction: column;
  flex-shrink: 0; z-index: 20; width: 200px; height: 100vh;
}
@media (min-width: 1024px) { .nav-tabbed { display: flex; } }

.nav-tabbed__bg {
  position: absolute; inset: 0;
  background: #08080f;
  border-right: 1px solid rgba(255,255,255,0.06);
  box-shadow: 3px 0 20px rgba(0,0,0,0.35);
}

/* Header */
.nav-tabbed__header {
  position: relative; z-index: 1;
  display: flex; align-items: center; gap: 10px;
  height: 60px; padding: 0 20px; flex-shrink: 0;
}
.nav-tabbed__logo {
  position: relative; width: 28px; height: 28px; flex-shrink: 0;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--brand-accent), var(--brand-blue-500));
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 8px rgba(99,102,241,0.3);
}
.nav-tabbed__logo-glow {
  position: absolute; inset: -2px; border-radius: 10px;
  background: linear-gradient(135deg, rgba(99,102,241,0.12), rgba(59,130,246,0.12));
  filter: blur(5px); z-index: -1;
}
.nav-tabbed__logo-letter {
  font-size: 12px; font-weight: 700; color: #fff;
}
.nav-tabbed__brand {
  font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.88);
  letter-spacing: -0.01em;
}

/* 域标题 */
.nav-tabbed__domain-label {
  position: relative; z-index: 1;
  display: flex; align-items: center; justify-content: space-between;
  padding: 6px 20px; margin-bottom: 4px;
}
.nav-tabbed__domain-name {
  font-size: 11px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.08em; color: rgba(255,255,255,0.2);
}
.nav-tabbed__domain-count {
  font-size: 9px; font-family: ui-monospace, monospace;
  padding: 1px 6px; border-radius: 10px;
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.15);
}

/* 导航 */
.nav-tabbed__nav {
  position: relative; z-index: 1;
  flex: 1; overflow-y: auto; padding: 4px 12px;
}
.nav-tabbed__nav::-webkit-scrollbar { width: 3px; }
.nav-tabbed__nav::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.04); border-radius: 2px; }

/* 子菜单项 */
.nav-tab-item {
  position: relative;
  display: flex; align-items: center; gap: 10px;
  width: 100%; padding: 9px 12px;
  border-radius: 8px; border: none; outline: none;
  background: transparent; cursor: pointer; text-align: left;
  font-size: 14px; font-weight: 450;
  color: var(--admin-text-muted, rgba(255,255,255,0.38));
  letter-spacing: -0.008em;
  transition: all 0.15s ease;
  margin-bottom: 2px;
}
.nav-tab-item:hover {
  color: var(--admin-text-secondary, rgba(255,255,255,0.78));
  background: rgba(255,255,255,0.03);
}
.nav-tab-item--active {
  color: var(--admin-text-primary, #fff) !important;
  background: rgba(99,102,241,0.08) !important;
}
.nav-tab-item--active:hover {
  background: rgba(99,102,241,0.12) !important;
}

/* 圆点指示器 */
.nav-tab-item__dot {
  width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0;
  background: rgba(255,255,255,0.1);
  transition: all 0.2s ease;
}
.nav-tab-item__dot--active {
  background: var(--brand-accent-light);
  box-shadow: 0 0 6px rgba(129,140,248,0.5);
  transform: scale(1.3);
}

/* 图标 */
.nav-tab-item__icon {
  font-size: 16px; flex-shrink: 0;
  color: var(--admin-text-muted, rgba(255,255,255,0.40));
  transition: opacity 0.15s, color 0.15s;
}
.nav-tab-item:hover .nav-tab-item__icon { color: var(--admin-text-secondary, rgba(255,255,255,0.65)); }
.nav-tab-item__icon--active {
  color: var(--brand-accent-soft) !important;
}

/* 标签 */
.nav-tab-item__label {
  flex: 1; min-width: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* 快捷键 */
.nav-tab-item__kbd {
  font-size: 9px; font-family: ui-monospace, monospace;
  padding: 1px 5px; border-radius: 3px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.12);
  margin-left: auto; flex-shrink: 0;
}

/* 底部 */
.nav-tabbed__footer {
  position: relative; z-index: 1;
  flex-shrink: 0; padding: 12px 20px;
  border-top: 1px solid rgba(255,255,255,0.04);
}
</style>
