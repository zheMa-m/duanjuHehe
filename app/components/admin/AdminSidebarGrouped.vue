<script setup lang="ts">
import { useAdminMenu } from '~/composables/useAdminMenu'

const props = defineProps<{ activeTab: string; collapsed: boolean }>()
const emit = defineEmits<{ navigate: [key: string]; 'toggle-collapse': [] }>()

const { getGroupedItems } = useAdminMenu()
const groupedMenu = getGroupedItems()

const COLLAPSE_KEY = 'admin-group-collapse'
const collapsedGroups = ref<Record<string, boolean>>({})
onMounted(() => {
  try {
    const s = localStorage.getItem(COLLAPSE_KEY)
    if (s) collapsedGroups.value = JSON.parse(s)
  } catch {}
})
const toggleGroup = (id: string) => {
  collapsedGroups.value[id] = !collapsedGroups.value[id]
  localStorage.setItem(COLLAPSE_KEY, JSON.stringify(collapsedGroups.value))
}
const isCollapsed = (id: string) => !!collapsedGroups.value[id]
</script>

<template>
  <aside class="nav-sidebar" :class="{ 'nav-sidebar--collapsed': collapsed }">
    <!-- 背景层 -->
    <div class="nav-sidebar__bg" />

    <!-- Logo -->
    <div class="nav-sidebar__header">
      <div class="nav-sidebar__logo-row" :class="{ 'nav-sidebar__logo-row--center': collapsed }">
        <div class="nav-sidebar__logo">
          <span class="nav-sidebar__logo-glow" />
          <span class="nav-sidebar__logo-letter">H</span>
        </div>
        <transition name="nav-fade">
          <div v-if="!collapsed" class="nav-sidebar__brand">
            <span class="nav-sidebar__brand-name">Hehe Admin</span>
            <span class="nav-sidebar__brand-sub">v1.0</span>
          </div>
        </transition>
      </div>
      <transition name="nav-fade">
        <button v-if="!collapsed" class="nav-sidebar__collapse-btn" @click="$emit('toggle-collapse')">
          <span class="i-lucide-panel-left text-[15px]" />
        </button>
      </transition>
    </div>

    <!-- 折叠态展开按钮 -->
    <button v-if="collapsed" class="nav-sidebar__expand" @click="$emit('toggle-collapse')">
      <span class="i-lucide-chevron-right text-[11px]" />
    </button>

    <!-- 导航列表 -->
    <nav class="nav-sidebar__nav">
      <template v-for="group in groupedMenu" :key="group.id">
        <!-- 无标题的核心项 -->
        <template v-if="!group.label">
          <button
            v-for="item in group.items" :key="item.key"
            class="nav-item" :class="{ 'nav-item--active': activeTab === item.key, 'nav-item--compact': collapsed }"
            @click="$emit('navigate', item.key)"
          >
            <span v-if="activeTab === item.key" class="nav-item__bar" />
            <span :class="[item.icon, 'nav-item__icon', { 'nav-item__icon--active': activeTab === item.key }]" />
            <transition name="nav-fade">
              <span v-if="!collapsed" class="nav-item__label">{{ item.label }}</span>
            </transition>
            <transition name="nav-fade">
              <kbd v-if="!collapsed && item.shortcut" class="nav-item__kbd">{{ item.shortcut }}</kbd>
            </transition>
          </button>
        </template>

        <!-- 有标题的分组 -->
        <template v-else>
          <div class="nav-group" :class="{ 'nav-group--first': group.id === 'commerce' }">
            <button v-if="!collapsed" class="nav-group__header" @click="toggleGroup(group.id)">
              <span class="nav-group__label">{{ group.label }}</span>
              <span class="nav-group__chevron i-lucide-chevron-down" :class="{ 'nav-group__chevron--up': isCollapsed(group.id) }" />
            </button>
            <div v-else class="nav-group__divider" />

            <div v-show="!isCollapsed(group.id)" class="nav-group__items">
              <button
                v-for="item in group.items" :key="item.key"
                class="nav-item" :class="{ 'nav-item--active': activeTab === item.key, 'nav-item--compact': collapsed }"
                @click="$emit('navigate', item.key)"
              >
                <span v-if="activeTab === item.key" class="nav-item__bar" />
                <span :class="[item.icon, 'nav-item__icon', { 'nav-item__icon--active': activeTab === item.key }]" />
                <transition name="nav-fade">
                  <span v-if="!collapsed" class="nav-item__label">{{ item.label }}</span>
                </transition>
                <transition name="nav-fade">
                  <kbd v-if="!collapsed && item.shortcut" class="nav-item__kbd">{{ item.shortcut }}</kbd>
                </transition>
              </button>
            </div>
          </div>
        </template>
      </template>
    </nav>

    <!-- 底部 -->
    <div class="nav-sidebar__footer">
      <div v-if="!collapsed" class="nav-sidebar__search-hint">
        <span class="i-lucide-search text-[13px] text-white/25" />
        <span class="text-[12px] text-white/30 flex-1">Quick search</span>
        <kbd class="nav-sidebar__footer-kbd">⌘K</kbd>
      </div>
      <div v-else class="nav-sidebar__footer-dots">
        <span class="i-lucide-search text-[15px] text-white/20" />
      </div>
    </div>
  </aside>
</template>

<style scoped>
/* ─── 侧栏容器 ─── */
.nav-sidebar {
  position: relative;
  display: none;
  flex-direction: column;
  flex-shrink: 0;
  z-index: 20;
  width: 272px;
  height: 100vh;
  transition: width 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}
.nav-sidebar--collapsed { width: 68px; }
@media (min-width: 1024px) { .nav-sidebar { display: flex; } }

/* 背景层 */
.nav-sidebar__bg {
  position: absolute; inset: 0;
  background: #08080f;
  border-right: 1px solid rgba(255,255,255,0.06);
  box-shadow: 4px 0 24px rgba(0,0,0,0.4);
}

/* ─── Header / Logo ─── */
.nav-sidebar__header {
  position: relative; z-index: 1;
  display: flex; align-items: center; justify-content: space-between;
  height: 60px; padding: 0 16px; flex-shrink: 0;
}
.nav-sidebar__logo-row {
  display: flex; align-items: center; gap: 12px; min-width: 0;
}
.nav-sidebar__logo-row--center { justify-content: center; width: 100%; }

.nav-sidebar__logo {
  position: relative; width: 32px; height: 32px; flex-shrink: 0;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--brand-accent), var(--brand-blue-500));
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 12px rgba(99,102,241,0.3);
}
.nav-sidebar__logo-glow {
  position: absolute; inset: -3px; border-radius: 13px;
  background: linear-gradient(135deg, rgba(99,102,241,0.15), rgba(59,130,246,0.15));
  filter: blur(6px); z-index: -1;
}
.nav-sidebar__logo-letter {
  font-size: 14px; font-weight: 700; color: #fff;
  letter-spacing: -0.02em;
}

.nav-sidebar__brand {
  display: flex; flex-direction: column; min-width: 0;
}
.nav-sidebar__brand-name {
  font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.92);
  letter-spacing: -0.01em; line-height: 1.2;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.nav-sidebar__brand-sub {
  font-size: 10px; color: rgba(255,255,255,0.22);
  font-family: ui-monospace, monospace; margin-top: 1px;
}

.nav-sidebar__collapse-btn {
  width: 28px; height: 28px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  color: rgba(255,255,255,0.2); background: transparent; border: none; cursor: pointer;
  transition: all 0.15s;
}
.nav-sidebar__collapse-btn:hover {
  color: rgba(255,255,255,0.55); background: rgba(255,255,255,0.04);
}

.nav-sidebar__expand {
  position: absolute; top: 20px; right: -13px; z-index: 30;
  width: 26px; height: 26px; border-radius: 50%;
  background: #111114; border: 1px solid rgba(255,255,255,0.08);
  display: flex; align-items: center; justify-content: center;
  color: rgba(255,255,255,0.35); cursor: pointer;
  box-shadow: 0 2px 10px rgba(0,0,0,0.5);
  transition: all 0.2s;
}
.nav-sidebar__expand:hover {
  color: rgba(255,255,255,0.8); border-color: rgba(255,255,255,0.15);
  transform: scale(1.08);
}

/* ─── 导航区 ─── */
.nav-sidebar__nav {
  position: relative; z-index: 1;
  flex: 1; overflow-y: auto; padding: 8px 12px;
}
.nav-sidebar__nav::-webkit-scrollbar { width: 3px; }
.nav-sidebar__nav::-webkit-scrollbar-track { background: transparent; }
.nav-sidebar__nav::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.04); border-radius: 2px; }

/* ─── 菜单项 ─── */
.nav-item {
  position: relative;
  display: flex; align-items: center; gap: 11px;
  width: 100%; padding: 9px 12px;
  border-radius: 9px; border: none; outline: none;
  background: transparent; cursor: pointer;
  text-align: left;
  font-size: 14px; font-weight: 450;
  color: rgba(255,255,255,0.42);
  letter-spacing: -0.008em;
  transition: all 0.15s ease;
  margin-bottom: 2px;
}
.nav-item:hover {
  color: rgba(255,255,255,0.82);
  background: rgba(255,255,255,0.035);
}
.nav-item--active {
  color: #fff !important;
  background: rgba(99,102,241,0.08) !important;
}
.nav-item--active:hover {
  background: rgba(99,102,241,0.12) !important;
}
.nav-item--compact {
  justify-content: center; padding: 10px 0;
}

/* 激活指示条 */
.nav-item__bar {
  position: absolute; left: 0; top: 22%; bottom: 22%;
  width: 3px; border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, var(--brand-accent-light), var(--brand-accent), var(--brand-accent-dark));
  box-shadow: 0 0 10px rgba(99,102,241,0.4), 0 0 3px rgba(99,102,241,0.6);
}

/* 图标 */
.nav-item__icon {
  font-size: 17px; flex-shrink: 0;
  opacity: 0.5;
  transition: opacity 0.15s, color 0.15s, filter 0.15s;
}
.nav-item:hover .nav-item__icon { opacity: 0.85; }
.nav-item__icon--active {
  opacity: 1 !important;
  color: var(--brand-accent-soft);
  filter: drop-shadow(0 0 6px rgba(165,180,252,0.4));
}

/* 标签 */
.nav-item__label {
  flex: 1; min-width: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* 快捷键 */
.nav-item__kbd {
  font-size: 9px; font-family: ui-monospace, monospace;
  padding: 1px 6px; border-radius: 4px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.14);
  margin-left: auto; flex-shrink: 0;
}

/* ─── 分组 ─── */
.nav-group { margin-top: 20px; }
.nav-group--first { margin-top: 16px; }

.nav-group__header {
  display: flex; align-items: center; justify-content: space-between;
  width: 100%; padding: 4px 12px; margin-bottom: 4px;
  background: transparent; border: none; cursor: pointer;
}
.nav-group__label {
  font-size: 11px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.08em;
  color: rgba(255,255,255,0.2);
  transition: color 0.15s;
}
.nav-group__header:hover .nav-group__label { color: rgba(255,255,255,0.38); }

.nav-group__chevron {
  font-size: 12px; color: rgba(255,255,255,0.12);
  transition: transform 0.22s cubic-bezier(0.4,0,0.2,1), color 0.15s;
}
.nav-group__header:hover .nav-group__chevron { color: rgba(255,255,255,0.25); }
.nav-group__chevron--up { transform: rotate(-90deg); }

.nav-group__divider {
  height: 1px; margin: 12px 16px;
  background: rgba(255,255,255,0.04); border-radius: 1px;
}

.nav-group__items {
  overflow: hidden;
  transition: max-height 0.25s ease;
}

/* ─── 底部 ─── */
.nav-sidebar__footer {
  position: relative; z-index: 1;
  flex-shrink: 0;
  padding: 12px;
  border-top: 1px solid rgba(255,255,255,0.04);
}
.nav-sidebar__search-hint {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; border-radius: 8px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.04);
  transition: all 0.15s;
}
.nav-sidebar__search-hint:hover {
  background: rgba(255,255,255,0.035);
  border-color: rgba(255,255,255,0.07);
}
.nav-sidebar__footer-kbd {
  font-size: 9px; font-family: ui-monospace, monospace;
  padding: 2px 6px; border-radius: 4px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.18);
}
.nav-sidebar__footer-dots {
  display: flex; justify-content: center;
}

/* ─── 过渡 ─── */
.nav-fade-enter-active, .nav-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.nav-fade-enter-from, .nav-fade-leave-to {
  opacity: 0; transform: translateX(-6px);
}
</style>
