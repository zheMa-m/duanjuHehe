<script setup lang="ts">
import type { CartItem, OrderType } from '~/composables/useCoffeeOrder'

const props = defineProps<{
  items: CartItem[]
  orderType: OrderType
}>()

const emit = defineEmits<{
  back: []
  place: []
  remove: [index: number]
  update: [index: number, updates: Partial<CartItem>]
  setOrderType: [type: OrderType]
}>()

function priceLabel(price: number): string {
  return '\u00a5' + price.toFixed(0)
}

function sizeLabel(s: string): string {
  const map: Record<string, string> = { small: 'S', medium: 'M', large: 'L' }
  return map[s] || s
}

function sugarLabel(s: string): string {
  const map: Record<string, string> = { full: '全糖', half: '半糖', none: '无糖' }
  return map[s] || s
}

function iceLabel(s: string): string {
  const map: Record<string, string> = { normal: '正常冰', less: '少冰', none: '去冰' }
  return map[s] || s
}

const subtotal = computed(() => props.items.reduce((sum, i) => sum + i.price * i.quantity, 0))
</script>

<template>
  <div class="coffee-cart">
    <!-- Header -->
    <div class="cart-header">
      <button class="header-back" @click="emit('back')">
        <span class="i-lucide-arrow-left" />
      </button>
      <h2 class="header-title">我的订单</h2>
      <div class="header-spacer" />
    </div>

    <div v-if="items.length === 0" class="cart-empty">
      <span class="empty-icon">&#9749;</span>
      <p>购物车是空的</p>
      <button class="back-menu-btn" @click="emit('back')">返回菜单</button>
    </div>

    <template v-else>
      <!-- Items -->
      <div class="cart-items">
        <div v-for="(item, idx) in items" :key="idx" class="cart-item">
          <div class="item-info">
            <div class="item-top">
              <span class="item-name">{{ item.name }}</span>
              <span class="item-qty">x{{ item.quantity }}</span>
            </div>
            <div class="item-options">
              <span class="option-tag">{{ sizeLabel(item.size) }}</span>
              <span class="option-tag">{{ sugarLabel(item.sugar) }}</span>
              <span class="option-tag">{{ iceLabel(item.ice) }}</span>
            </div>
            <span class="item-price">{{ priceLabel(item.price * item.quantity) }}</span>
          </div>
          <button class="remove-btn" @click="emit('remove', idx)">
            <span class="i-lucide-x" />
          </button>
        </div>
      </div>

      <!-- Order type -->
      <div class="order-type-section">
        <label class="section-label">取餐方式</label>
        <div class="type-row">
          <button
            class="type-btn"
            :class="{ active: orderType === 'takeout' }"
            @click="emit('setOrderType', 'takeout')"
          >
            <span class="type-icon">&#128717;</span>
            外带
          </button>
          <button
            class="type-btn"
            :class="{ active: orderType === 'dine_in' }"
            @click="emit('setOrderType', 'dine_in')"
          >
            <span class="type-icon">&#127860;</span>
            堂食
          </button>
        </div>
      </div>

      <!-- Summary -->
      <div class="cart-summary">
        <div class="summary-row">
          <span>小计</span>
          <span class="summary-total">{{ priceLabel(subtotal) }}</span>
        </div>
      </div>

      <button class="place-btn" @click="emit('place')">
        提交订单 &mdash; {{ priceLabel(subtotal) }}
      </button>
    </template>
  </div>
</template>

<style scoped>
.coffee-cart {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 60vh;
}

.cart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0 12px;
  border-bottom: 1px solid var(--h5-border);
}

.header-back {
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

.header-back:hover {
  border-color: var(--coffee-accent);
  color: var(--coffee-accent);
}

.header-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--h5-text-1);
}

.header-spacer {
  width: 36px;
}

.cart-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px 0;
  color: var(--h5-text-3);
  font-size: 0.875rem;
}

.empty-icon {
  font-size: 2.5rem;
  opacity: 0.35;
}

.back-menu-btn {
  padding: 8px 20px;
  background: var(--coffee-accent);
  color: var(--coffee-base);
  border: none;
  border-radius: 100px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}

/* Items */
.cart-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cart-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 12px;
  background: var(--h5-surface);
  border: 1px solid var(--h5-border);
  border-radius: var(--h5-radius-sm);
}

.item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.item-top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.item-name {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--h5-text-1);
}

.item-qty {
  font-size: 0.6875rem;
  color: var(--h5-text-3);
  font-weight: 500;
}

.item-options {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.option-tag {
  padding: 2px 8px;
  background: rgba(180, 120, 70, 0.08);
  border-radius: 100px;
  font-size: 0.625rem;
  color: var(--coffee-accent);
  font-weight: 500;
}

.item-price {
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--coffee-accent);
}

.remove-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 1px solid var(--h5-border);
  border-radius: 8px;
  color: var(--h5-text-3);
  cursor: pointer;
  font-size: 0.75rem;
  transition: all 0.2s;
  flex-shrink: 0;
}

.remove-btn:hover {
  border-color: #EF4444;
  color: #EF4444;
  background: rgba(239,68,68,0.06);
}

/* Order type */
.order-type-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 0;
  border-top: 1px solid var(--h5-border);
}

.section-label {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--h5-text-3);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.type-row {
  display: flex;
  gap: 10px;
}

.type-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border-radius: var(--h5-radius-sm);
  border: 1px solid var(--h5-border);
  background: transparent;
  color: var(--h5-text-2);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s var(--h5-ease);
  font-family: inherit;
}

.type-btn:hover {
  border-color: var(--h5-border-strong);
  color: var(--h5-text-1);
}

.type-btn.active {
  background: var(--coffee-surface-hover);
  border-color: var(--coffee-accent);
  color: var(--coffee-accent);
  font-weight: 600;
}

.type-icon {
  font-size: 1rem;
}

/* Summary */
.cart-summary {
  padding: 12px;
  background: var(--h5-surface);
  border: 1px solid var(--h5-border);
  border-radius: var(--h5-radius-sm);
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8125rem;
  color: var(--h5-text-2);
}

.summary-total {
  font-size: 1rem;
  font-weight: 700;
  color: var(--coffee-accent);
}

.place-btn {
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
}

.place-btn:hover {
  background: var(--coffee-accent-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 16px var(--coffee-accent-glow);
}

.place-btn:active {
  transform: scale(0.98);
}
</style>

