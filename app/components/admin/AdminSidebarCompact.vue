<script setup lang="ts">
import { useAdminMenu } from '~/composables/useAdminMenu'

const props = defineProps<{ activeTab: string }>()
const emit = defineEmits<{ navigate: [key: string] }>()

const { getCompactItems } = useAdminMenu()
const compactItems = getCompactItems()
const hovered = ref(false)
</script>

<template>
  <aside
    class="nav-compact"
    :class="{ 'nav-compact--expanded': hovered }"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
  >
    <div class="nav-compact__bg" />

    <!-- Logo -->
    <div class="nav-compact__header" :class="{ 'nav-compact__header--expanded': hovered }">
      <div class="nav-compact__logo">
        <span class="nav-compact__logo-glow" />
        <span class="nav-compact__logo-letter">H</span>
      </div>
      <transition name="compact-fade">
        <span v-if="hovered" class="nav-compact__brand">Hehe Admin</span>
      </transition>
    </div>

    <!-- 高频项 -->
    <nav class="nav-compact__nav">
      <button
        v-for="item in compactItems" :key="item.key"
        class="nav-compact-item"
        :class="{
          'nav-compact-item--active': activeTab === item.key,
          'nav-compact-item--expanded': hovered,
        }"
        @click="$emit('navigate', item.key)"
        :title="!hovered ? item.label : undefined"
      >
        <span v-if="activeTab === item.key" class="nav-compact-item__bar" />
        <span :class="[item.icon, 'nav-compact-item__icon', { 'nav-compact-item__icon--active': activeTab === item.key }]" />
        <transition name="compact-fade">
          <span v-if="hovered" class="nav-compact-item__label">{{ item.label }}</span>
        </transition>
      </button>
    </nav>

    <!-- 分隔 -->
    <div class="nav-compact__spacer" />
  </aside>
</template>

<style scoped>
.nav-compact {
  position: relative; display: none; flex-direction: column;
  flex-shrink: 0; z-index: 20;
  width: 68px; height: 100vh;
  transition: width 0.24s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}
.nav-compact--expanded { width: 212px; }
@media (min-width: 1280px) { .nav-compact { display: flex; } }

.nav-compact__bg {
  position: absolute; inset: 0;
  background: linear-gradient(180deg, #f8fafc 0%, #0a0a14 100%);
  border-right: 1px solid rgba(0,0,0,0.05);
  box-shadow: 2px 0 20px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.1);
}

/* Header */
.nav-compact__header {
  position: relative; z-index: 1;
  display: flex; align-items: center; justify-content: center;
  height: 60px; padding: 0 16px; flex-shrink: 0; gap: 10px;
}
.nav-compact__header--expanded { justify-content: flex-start; }

.nav-compact__logo {
  position: relative; width: 30px; height: 30px; flex-shrink: 0;
  border-radius: 9px;
  background: linear-gradient(135deg, var(--brand-accent), var(--brand-blue-500));
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 10px rgba(99,102,241,0.3);
}
.nav-compact__logo-glow {
  position: absolute; inset: -2px; border-radius: 11px;
  background: linear-gradient(135deg, rgba(99,102,241,0.18), rgba(59,130,246,0.18));
  filter: blur(5px); z-index: -1;
}
.nav-compact__logo-letter {
  font-size: 13px; font-weight: 700; color: #fff;
}
.nav-compact__brand {
  font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.88);
  letter-spacing: -0.01em; white-space: nowrap;
}

/* Nav */
.nav-compact__nav {
  position: relative; z-index: 1;
  flex: 1; padding: 8px 12px;
  display: flex; flex-direction: column; gap: 2px;
}

.nav-compact-item {
  position: relative;
  display: flex; align-items: center; gap: 11px;
  width: 100%; padding: 11px 0;
  justify-content: center;
  border-radius: 9px; border: none; outline: none;
  background: transparent; cursor: pointer;
  color: rgba(0,0,0,0.35);
  transition: all 0.15s ease;
}
.nav-compact-item--expanded {
  justify-content: flex-start; padding: 9px 12px;
}
.nav-compact-item:hover {
  color: rgba(0,0,0,0.78);
  background: rgba(0,0,0,0.04);
}
.nav-compact-item--active {
  color: #fff !important;
  background: rgba(99,102,241,0.08) !important;
}
.nav-compact-item--active:hover {
  background: rgba(99,102,241,0.10) !important;
}

.nav-compact-item__bar {
  position: absolute; left: 0; top: 22%; bottom: 22%;
  width: 3px; border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, var(--brand-accent-light), var(--brand-accent), var(--brand-accent-dark));
  box-shadow: 0 0 10px rgba(99,102,241,0.4);
}

.nav-compact-item__icon {
  font-size: 19px; flex-shrink: 0;
  opacity: 0.45; transition: opacity 0.15s, color 0.15s;
}
.nav-compact-item:hover .nav-compact-item__icon { opacity: 0.85; }
.nav-compact-item__icon--active {
  opacity: 1 !important; color: var(--brand-accent-soft);
  filter: drop-shadow(0 0 6px rgba(165,180,252,0.35));
}

.nav-compact-item__label {
  font-size: 14px; font-weight: 450;
  letter-spacing: -0.008em; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis;
}

/* Spacer */
.nav-compact__spacer { flex: 1; }

/* Transition */
.compact-fade-enter-active, .compact-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.compact-fade-enter-from, .compact-fade-leave-to {
  opacity: 0; transform: translateX(-5px);
}
</style>
