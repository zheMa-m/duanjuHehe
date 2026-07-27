<script setup lang="ts">
import type { OrderResult } from '~/composables/useCoffeeOrder'

const props = defineProps<{
  order: OrderResult
}>()

const emit = defineEmits<{
  reset: []
}>()

function priceLabel(price: number): string {
  return '\u00a5' + price.toFixed(0)
}

function sugarLabel(s: string): string {
  const map: Record<string, string> = { full: 'Full', half: 'Half', none: 'None' }
  return map[s] || s
}

function iceLabel(s: string): string {
  const map: Record<string, string> = { normal: 'Normal', less: 'Less', none: 'None' }
  return map[s] || s
}

function sizeLabel(s: string): string {
  const map: Record<string, string> = { small: 'S', medium: 'M', large: 'L' }
  return map[s] || s
}

const orderTypeLabel = computed(() => props.order.order_type === 'dine_in' ? 'Dine In' : 'Takeout')

function copyPickupCode() {
  navigator.clipboard.writeText(props.order.pickup_code)
}
</script>

<template>
  <div class="order-success">
    <div class="success-content">
      <div class="success-icon-wrap">
        <span class="success-icon">&#9749;</span>
      </div>
      <h2 class="success-title">Order Placed!</h2>
      <p class="success-sub">Show this code when picking up</p>

      <div class="pickup-card">
        <div class="pickup-code">{{ order.pickup_code }}</div>
        <button class="copy-btn" @click="copyPickupCode">
          <span class="i-lucide-copy" /> Copy
        </button>
      </div>

      <div class="order-details">
        <div class="detail-row">
          <span class="detail-label">Order Type</span>
          <span class="detail-value">{{ orderTypeLabel }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Status</span>
          <span class="detail-value detail-status">{{ order.status }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Items</span>
          <span class="detail-value">{{ order.items.length }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Total</span>
          <span class="detail-value detail-total">{{ priceLabel(order.total_amount) }}</span>
        </div>
      </div>

      <div class="order-items">
        <div v-for="item in order.items" :key="item.menu_item_id" class="order-item">
          <span class="oi-name">{{ item.name }} <span class="oi-qty">x{{ item.quantity }}</span></span>
          <span class="oi-options">{{ sizeLabel(item.size) }} &middot; {{ sugarLabel(item.sugar) }} &middot; {{ iceLabel(item.ice) }}</span>
        </div>
      </div>

      <button class="new-order-btn" @click="emit('reset')">
        Place New Order
      </button>
    </div>
  </div>
</template>

<style scoped>
.order-success {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 60vh;
  padding: 24px 0;
}

.success-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
  max-width: 360px;
  animation: success-enter 0.5s var(--h5-ease) both;
}

.success-icon-wrap {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--coffee-surface-hover);
  border: 2px solid rgba(180, 120, 70, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: icon-pop 0.5s var(--h5-ease-spring) 0.1s both;
}

.success-icon {
  font-size: 2rem;
  color: var(--coffee-accent);
}

.success-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--h5-text-1);
  letter-spacing: -0.02em;
}

.success-sub {
  font-size: 0.8125rem;
  color: var(--h5-text-3);
}

/* Pickup code card */
.pickup-card {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px;
  background: var(--coffee-base);
  border: 1px solid var(--coffee-accent);
  border-radius: var(--h5-radius);
  position: relative;
  overflow: hidden;
}

.pickup-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 16px;
  right: 16px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(180, 120, 70, 0.15), transparent);
}

.pickup-code {
  font-size: 2.25rem;
  font-weight: 800;
  letter-spacing: 0.15em;
  color: var(--coffee-accent);
  font-family: 'JetBrains Mono', monospace;
}

.copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  background: transparent;
  border: 1px solid var(--coffee-accent);
  border-radius: 100px;
  color: var(--coffee-accent);
  font-size: 0.6875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s var(--h5-ease);
  font-family: inherit;
}

.copy-btn:hover {
  background: var(--coffee-accent);
  color: var(--coffee-base);
}

/* Details */
.order-details {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background: var(--h5-surface);
  border: 1px solid var(--h5-border);
  border-radius: var(--h5-radius-sm);
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
}

.detail-label {
  color: var(--h5-text-3);
}

.detail-value {
  color: var(--h5-text-1);
  font-weight: 600;
}

.detail-status {
  text-transform: capitalize;
  color: var(--coffee-accent);
}

.detail-total {
  font-size: 0.9375rem;
  color: var(--coffee-accent);
}

/* Items summary */
.order-items {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  background: var(--h5-surface);
  border: 1px solid var(--h5-border);
  border-radius: var(--h5-radius-sm);
}

.order-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.oi-name {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--h5-text-1);
}

.oi-qty {
  color: var(--h5-text-3);
  font-weight: 500;
}

.oi-options {
  font-size: 0.625rem;
  color: var(--h5-text-3);
}

.new-order-btn {
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
  margin-top: 8px;
}

.new-order-btn:hover {
  background: var(--coffee-accent-hover);
  transform: translateY(-1px);
}

.new-order-btn:active {
  transform: scale(0.98);
}

@keyframes success-enter {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes icon-pop {
  from { opacity: 0; transform: scale(0.5); }
  to { opacity: 1; transform: scale(1); }
}
</style>

