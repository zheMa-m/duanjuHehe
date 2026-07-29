<script setup lang="ts">
import { useAdminMenu, menuGroups } from '~/composables/useAdminMenu'
import { useAdminNav } from '~/composables/useAdminNav'

const props = defineProps<{ activeTab: string }>()
const emit = defineEmits<{ navigate: [key: string] }>()

const { menuItems } = useAdminMenu()
const { recentItems, trackRecent } = useAdminNav()

const isOpen = ref(false)
const query = ref('')
const selectedIdx = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)

// 全局快捷键
const onKeydown = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    isOpen.value ? close() : open()
  }
  if (e.key === 'Escape' && isOpen.value) close()
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

// 搜索
const filtered = computed(() => {
  if (!query.value.trim()) return menuItems
  const q = query.value.toLowerCase()
  return menuItems.filter(i =>
    i.label.toLowerCase().includes(q) ||
    i.key.toLowerCase().includes(q) ||
    i.group.toLowerCase().includes(q)
  )
})

const grouped = computed(() =>
  menuGroups
    .map(g => ({ ...g, items: filtered.value.filter(i => i.group === g.id) }))
    .filter(g => g.items.length > 0)
)

const recentValid = computed(() =>
  recentItems.value.map(k => menuItems.find(i => i.key === k)).filter(Boolean)
)

const flat = computed(() => filtered.value)

const navigate = (key: string) => {
  trackRecent(key)
  emit('navigate', key)
  close()
}

const onInputKey = (e: KeyboardEvent) => {
  if (e.key === 'ArrowDown') { e.preventDefault(); selectedIdx.value = Math.min(selectedIdx.value + 1, flat.value.length - 1) }
  else if (e.key === 'ArrowUp') { e.preventDefault(); selectedIdx.value = Math.max(selectedIdx.value - 1, 0) }
  else if (e.key === 'Enter') { e.preventDefault(); const item = flat.value[selectedIdx.value]; if (item) navigate(item.key) }
}

watch(query, () => { selectedIdx.value = 0 })

const open = () => {
  isOpen.value = true; query.value = ''; selectedIdx.value = 0
  nextTick(() => inputRef.value?.focus())
}
const close = () => { isOpen.value = false }
defineExpose({ open })
</script>

<template>
  <Teleport to="body">
    <Transition name="palette-bg">
      <div v-if="isOpen" class="palette-overlay" @click.self="close">
        <Transition name="palette-panel" appear>
          <div v-if="isOpen" class="palette">
            <!-- 顶部光晕装饰 -->
            <div class="palette__glow" />

            <!-- 搜索栏 -->
            <div class="palette__search">
              <span class="i-lucide-search palette__search-icon" />
              <input
                ref="inputRef"
                v-model="query"
                @keydown="onInputKey"
                type="text"
                placeholder="搜索功能、页面或操作..."
                class="palette__input"
              />
              <kbd class="palette__esc">ESC</kbd>
            </div>

            <!-- 结果区 -->
            <div class="palette__results">
              <!-- 最近使用 -->
              <template v-if="!query.trim() && recentValid.length">
                <div class="palette__section-label">最近使用</div>
                <div class="palette__recent-row">
                  <button
                    v-for="item in recentValid.slice(0, 3)"
                    :key="'r-' + item!.key"
                    @click="navigate(item!.key)"
                    @mouseenter="selectedIdx = menuItems.indexOf(item!)"
                    class="palette__recent-chip"
                    :class="{ 'palette__recent-chip--selected': menuItems.indexOf(item!) === selectedIdx }"
                  >
                    <span :class="[item!.icon, 'text-[15px]']" />
                    <span>{{ item!.label }}</span>
                  </button>
                </div>
                <div class="palette__divider" />
              </template>

              <!-- 分组结果 -->
              <template v-for="g in grouped" :key="g.id">
                <div v-if="g.label" class="palette__section-label">{{ g.label }}</div>
                <button
                  v-for="item in g.items" :key="item.key"
                  @click="navigate(item.key)"
                  @mouseenter="selectedIdx = menuItems.indexOf(item)"
                  class="palette-item"
                  :class="{ 'palette-item--selected': menuItems.indexOf(item) === selectedIdx }"
                >
                  <span :class="[item.icon, 'palette-item__icon']" />
                  <span class="palette-item__label">{{ item.label }}</span>
                  <kbd v-if="item.shortcut" class="palette-item__kbd">{{ item.shortcut }}</kbd>
                  <span class="palette-item__enter">
                    <span class="i-lucide-corner-down-left text-[11px]" />
                  </span>
                </button>
              </template>

              <!-- 空态 -->
              <div v-if="!grouped.length" class="palette__empty">
                <span class="i-lucide-search-x text-[30px] text-white/10" />
                <span class="text-[13px] text-white/20 mt-2">未找到匹配的功能</span>
              </div>
            </div>

            <!-- 底部 -->
            <div class="palette__footer">
              <span class="palette__footer-hint"><kbd>↑</kbd><kbd>↓</kbd> 导航</span>
              <span class="palette__footer-hint"><kbd>↵</kbd> 打开</span>
              <span class="palette__footer-hint"><kbd>esc</kbd> 关闭</span>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ─── Overlay ─── */
.palette-overlay {
  position: fixed; inset: 0; z-index: 9999;
  display: flex; align-items: flex-start; justify-content: center;
  padding-top: 18vh;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(4px);
}

/* ─── 面板 ─── */
.palette {
  position: relative;
  width: 540px; max-height: 440px;
  border-radius: 16px; overflow: hidden;
  background: #ffffff;
  border: 1px solid rgba(0,0,0,0.06);
  box-shadow:
    0 32px 64px rgba(0,0,0,0.7),
    0 0 0 1px rgba(0,0,0,0.03),
    inset 0 1px rgba(0,0,0,0.04);
  display: flex; flex-direction: column;
}

/* 顶部光晕 */
.palette__glow {
  position: absolute; top: -40px; left: 50%; transform: translateX(-50%);
  width: 300px; height: 90px;
  background: radial-gradient(ellipse, rgba(99,102,241,0.15), transparent 70%);
  pointer-events: none;
}

/* ─── 搜索栏 ─── */
.palette__search {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(0,0,0,0.05);
  position: relative;
}
.palette__search-icon {
  font-size: 18px; color: rgba(0,0,0,0.22); flex-shrink: 0;
}
.palette__input {
  flex: 1; background: transparent; border: none; outline: none;
  font-size: 15px; color: #fff;
  font-weight: 400; letter-spacing: -0.01em;
}
.palette__input::placeholder { color: rgba(0,0,0,0.18); }
.palette__esc {
  font-size: 10px; font-family: ui-monospace, monospace;
  padding: 2px 7px; border-radius: 5px;
  background: rgba(0,0,0,0.04);
  border: 1px solid rgba(0,0,0,0.06);
  color: rgba(255,255,255,0.2);
}

/* ─── 结果区 ─── */
.palette__results {
  flex: 1; overflow-y: auto; padding: 8px;
}
.palette__results::-webkit-scrollbar { width: 4px; }
.palette__results::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.04); border-radius: 2px; }

.palette__section-label {
  padding: 6px 12px 4px;
  font-size: 11px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.06em;
  color: rgba(0,0,0,0.18);
}

.palette__divider {
  height: 1px; margin: 6px 12px;
  background: rgba(0,0,0,0.04);
}

/* ─── 最近使用 Chips ─── */
.palette__recent-row {
  display: flex; gap: 6px; padding: 4px 8px 6px;
  flex-wrap: wrap;
}
.palette__recent-chip {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 12px; border-radius: 20px;
  background: rgba(0,0,0,0.03);
  border: 1px solid rgba(0,0,0,0.05);
  font-size: 12px; font-weight: 450;
  color: rgba(0,0,0,0.45);
  cursor: pointer; transition: all 0.12s;
}
.palette__recent-chip:hover,
.palette__recent-chip--selected {
  background: rgba(99,102,241,0.08);
  border-color: rgba(99,102,241,0.15);
  color: rgba(0,0,0,0.85);
}

/* ─── 结果项 ─── */
.palette-item {
  display: flex; align-items: center; gap: 12px;
  width: 100%; padding: 10px 14px;
  border-radius: 10px; border: none; outline: none;
  background: transparent; cursor: pointer; text-align: left;
  transition: all 0.1s;
  margin-bottom: 1px;
}
.palette-item:hover,
.palette-item--selected {
  background: rgba(99,102,241,0.07);
}
.palette-item__icon {
  font-size: 17px; color: rgba(255,255,255,0.3); flex-shrink: 0;
}
.palette-item--selected .palette-item__icon,
.palette-item:hover .palette-item__icon {
  color: #4f46e5;
}
.palette-item__label {
  flex: 1; font-size: 14px; font-weight: 450;
  color: rgba(255,255,255,0.6);
  letter-spacing: -0.008em;
}
.palette-item--selected .palette-item__label,
.palette-item:hover .palette-item__label {
  color: #fff;
}
.palette-item__kbd {
  font-size: 10px; font-family: ui-monospace, monospace;
  padding: 2px 6px; border-radius: 4px;
  background: rgba(0,0,0,0.03);
  border: 1px solid rgba(0,0,0,0.05);
  color: rgba(0,0,0,0.14);
  flex-shrink: 0;
}
.palette-item__enter {
  color: rgba(255,255,255,0); flex-shrink: 0;
  transition: color 0.1s;
}
.palette-item--selected .palette-item__enter {
  color: rgba(0,0,0,0.25);
}

/* ─── 空态 ─── */
.palette__empty {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 40px 0;
}

/* ─── 底部 ─── */
.palette__footer {
  display: flex; align-items: center; gap: 16px;
  padding: 10px 18px;
  border-top: 1px solid rgba(0,0,0,0.04);
  background: rgba(0,0,0,0.01);
}
.palette__footer-hint {
  display: flex; align-items: center; gap: 4px;
  font-size: 11px; color: rgba(0,0,0,0.15);
  font-family: ui-monospace, monospace;
}
.palette__footer-hint kbd {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 18px; padding: 1px 5px;
  border-radius: 4px;
  background: rgba(0,0,0,0.04);
  border: 1px solid rgba(0,0,0,0.06);
  font-size: 10px;
}

/* ─── 过渡动画 ─── */
.palette-bg-enter-active { transition: opacity 0.15s ease; }
.palette-bg-leave-active { transition: opacity 0.12s ease; }
.palette-bg-enter-from, .palette-bg-leave-to { opacity: 0; }

.palette-panel-enter-active {
  transition: opacity 0.18s ease, transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}
.palette-panel-leave-active {
  transition: opacity 0.1s ease, transform 0.1s ease;
}
.palette-panel-enter-from {
  opacity: 0; transform: scale(0.96) translateY(-10px);
}
.palette-panel-leave-to {
  opacity: 0; transform: scale(0.98) translateY(-4px);
}
</style>
