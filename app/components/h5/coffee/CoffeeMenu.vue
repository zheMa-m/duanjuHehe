<script setup lang="ts">
import { ref, computed } from 'vue'
import type { CoffeeMenuItem, CartItem, SugarLevel, IceLevel, SizeOption } from '~/composables/useCoffeeOrder'

const props = defineProps<{
  items: CoffeeMenuItem[]
  loading: boolean
  error: string | null
}>()

const emit = defineEmits<{
  back: []
  goToCart: []
  addToCart: [item: CoffeeMenuItem, sugar: SugarLevel, ice: IceLevel, size: SizeOption]
}>()

const categories = [
  { key: 'classic', label: '经典咖啡' },
  { key: 'specialty', label: '特色饮品' },
  { key: 'tea', label: '茶饮' },
  { key: 'pastry', label: '烘焙糕点' },
  { key: 'seasonal', label: '季节限定' },
] as const

const activeCategory = ref<string>('classic')

const groupedItems = computed(() => {
  const catMap: Record<string, CoffeeMenuItem[]> = {}
  for (const cat of categories) {
    catMap[cat.key] = props.items.filter(i => i.category === cat.key)
  }
  return catMap
})

const currentItems = computed(() => groupedItems.value[activeCategory.value] || [])

// Item detail sheet
const showSheet = ref(false)
const selectedItem = ref<CoffeeMenuItem | null>(null)
const itemSugar = ref<SugarLevel>('full')
const itemIce = ref<IceLevel>('normal')
const itemSize = ref<SizeOption>('medium')

function openItemDetail(item: CoffeeMenuItem) {
  selectedItem.value = item
  itemSugar.value = 'full'
  itemIce.value = 'normal'
  itemSize.value = 'medium'
  showSheet.value = true
}

function confirmAdd() {
  if (selectedItem.value) {
    emit('addToCart', selectedItem.value, itemSugar.value, itemIce.value, itemSize.value)
  }
  showSheet.value = false
}

const sugarOptions: { value: SugarLevel; label: string }[] = [
  { value: 'full', label: '全糖' },
  { value: 'half', label: '半糖' },
  { value: 'none', label: '无糖' },
]

const iceOptions: { value: IceLevel; label: string }[] = [
  { value: 'normal', label: '正常冰' },
  { value: 'less', label: '少冰' },
  { value: 'none', label: '去冰' },
]

const sizeOptions: { value: SizeOption; label: string }[] = [
  { value: 'small', label: 'S' },
  { value: 'medium', label: 'M' },
  { value: 'large', label: 'L' },
]

function priceLabel(price: number): string {
  return '\u00a5' + price.toFixed(0)
}
</script>

<template>
  <div class="coffee-menu">
    <!-- Header -->
    <div class="menu-header">
      <button class="header-back" @click="emit('back')">
        <span class="i-lucide-arrow-left" />
      </button>
      <h2 class="header-title">菜单</h2>
      <button class="header-cart" @click="emit('goToCart')">
        <span class="i-lucide-shopping-cart" />
      </button>
    </div>

    <!-- Category tabs -->
    <div class="category-tabs">
      <button
        v-for="cat in categories"
        :key="cat.key"
        class="cat-tab"
        :class="{ active: activeCategory === cat.key }"
        :style="groupedItems[cat.key]?.length === 0 ? { opacity: 0.35 } : {}"
        @click="activeCategory = cat.key"
      >
        {{ cat.label }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="menu-loading">
      <div class="spinner" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="menu-error">
      <p>{{ error }}</p>
    </div>

    <!-- Items -->
    <div v-else class="items-grid">
      <button
        v-for="item in currentItems"
        :key="item.id"
        class="item-card"
        @click="openItemDetail(item)"
      >
        <div class="item-body">
          <h3 class="item-name">{{ item.name }}</h3>
          <p class="item-desc">{{ item.description }}</p>
          <span class="item-price">{{ priceLabel(item.price) }}</span>
        </div>
        <div class="item-add">
          <span class="add-icon">+</span>
        </div>
      </button>
    </div>

    <!-- Detail sheet overlay -->
    <Transition name="sheet">
      <div v-if="showSheet && selectedItem" class="sheet-overlay" @click.self="showSheet = false">
        <div class="sheet">
          <div class="sheet-handle" />
          <h3 class="sheet-title">{{ selectedItem.name }}</h3>
          <p class="sheet-price">{{ priceLabel(selectedItem.price) }}</p>
          <p class="sheet-desc">{{ selectedItem.description }}</p>

          <div class="sheet-section">
            <label class="section-label">规格</label>
            <div class="option-row">
              <button
                v-for="opt in sizeOptions"
                :key="opt.value"
                class="opt-btn"
                :class="{ active: itemSize === opt.value }"
                @click="itemSize = opt.value"
              >{{ opt.label }}</button>
            </div>
          </div>

          <div class="sheet-section">
            <label class="section-label">甜度</label>
            <div class="option-row">
              <button
                v-for="opt in sugarOptions"
                :key="opt.value"
                class="opt-btn"
                :class="{ active: itemSugar === opt.value }"
                @click="itemSugar = opt.value"
              >{{ opt.label }}</button>
            </div>
          </div>

          <div class="sheet-section">
            <label class="section-label">冰量</label>
            <div class="option-row">
              <button
                v-for="opt in iceOptions"
                :key="opt.value"
                class="opt-btn"
                :class="{ active: itemIce === opt.value }"
                @click="itemIce = opt.value"
              >{{ opt.label }}</button>
            </div>
          </div>

          <button class="confirm-btn" @click="confirmAdd">
            加入购物车
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.coffee-menu {
  display: flex;
  flex-direction: column;
  gap: 0;
  min-height: 60vh;
}

.menu-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0 12px;
  border-bottom: 1px solid var(--h5-border);
}

.header-back, .header-cart {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 1px solid var(--h5-border);
  border-radius: 10px;
  color: var(--h5-text-2);
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
}

.header-back:hover, .header-cart:hover {
  border-color: var(--coffee-accent);
  color: var(--coffee-accent);
  background: var(--coffee-surface-hover);
}

.header-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--h5-text-1);
}

/* Category tabs */
.category-tabs {
  display: flex;
  gap: 6px;
  padding: 12px 0;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.category-tabs::-webkit-scrollbar { display: none; }

.cat-tab {
  flex-shrink: 0;
  padding: 6px 14px;
  border-radius: 100px;
  border: 1px solid var(--h5-border);
  background: transparent;
  color: var(--h5-text-2);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s var(--h5-ease);
  white-space: nowrap;
  font-family: inherit;
}

.cat-tab:hover {
  border-color: var(--h5-border-strong);
  color: var(--h5-text-1);
}

.cat-tab.active {
  background: var(--coffee-accent);
  border-color: var(--coffee-accent);
  color: var(--coffee-base);
  font-weight: 600;
}

.menu-loading, .menu-error {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: var(--h5-text-3);
  font-size: 0.8125rem;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--h5-border-strong);
  border-top-color: var(--coffee-accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

/* Items grid - single column card list */
.items-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 4px;
}

.item-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  background: var(--h5-surface);
  border: 1px solid var(--h5-border);
  border-radius: var(--h5-radius-sm);
  cursor: pointer;
  transition: all 0.2s var(--h5-ease);
  text-align: left;
  width: 100%;
  font-family: inherit;
  color: inherit;
}

.item-card:hover {
  border-color: var(--coffee-accent);
  background: var(--coffee-surface-hover);
}

.item-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--h5-text-1);
}

.item-desc {
  font-size: 0.6875rem;
  color: var(--h5-text-3);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item-price {
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--coffee-accent);
  margin-top: 4px;
}

.item-add {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--coffee-accent);
  color: var(--coffee-base);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.125rem;
  font-weight: 600;
  flex-shrink: 0;
  transition: transform 0.2s var(--h5-ease-spring);
}

.item-card:hover .item-add {
  transform: scale(1.1);
}

/* Bottom sheet */
.sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  z-index: 100;
  display: flex;
  align-items: flex-end;
  backdrop-filter: blur(4px);
}

.sheet {
  width: 100%;
  max-width: 448px;
  margin: 0 auto;
  background: var(--coffee-base);
  border-radius: var(--h5-radius) var(--h5-radius) 0 0;
  padding: 12px 20px 32px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 85vh;
  overflow-y: auto;
}

.sheet-handle {
  width: 36px;
  height: 4px;
  border-radius: 4px;
  background: var(--h5-border-strong);
  margin: 0 auto 8px;
}

.sheet-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--h5-text-1);
}

.sheet-price {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--coffee-accent);
}

.sheet-desc {
  font-size: 0.75rem;
  color: var(--h5-text-2);
  line-height: 1.5;
}

.sheet-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-label {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--h5-text-3);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.option-row {
  display: flex;
  gap: 8px;
}

.opt-btn {
  flex: 1;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid var(--h5-border);
  background: transparent;
  color: var(--h5-text-2);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s var(--h5-ease);
  text-align: center;
  font-family: inherit;
}

.opt-btn:hover {
  border-color: var(--h5-border-strong);
  color: var(--h5-text-1);
}

.opt-btn.active {
  background: var(--coffee-accent);
  border-color: var(--coffee-accent);
  color: var(--coffee-base);
  font-weight: 600;
}

.confirm-btn {
  width: 100%;
  padding: 14px;
  background: var(--coffee-accent);
  color: var(--coffee-base);
  border: none;
  border-radius: var(--h5-radius-sm);
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s var(--h5-ease);
  font-family: inherit;
  margin-top: 4px;
}

.confirm-btn:hover {
  background: var(--coffee-accent-hover);
  transform: translateY(-1px);
}

.confirm-btn:active {
  transform: scale(0.98);
}

/* Sheet transition */
.sheet-enter-active { transition: all 0.35s var(--h5-ease); }
.sheet-leave-active { transition: all 0.25s var(--h5-ease); }
.sheet-enter-from .sheet,
.sheet-leave-to .sheet { transform: translateY(100%); }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }

@keyframes spin { to { transform: rotate(360deg); } }
</style>
