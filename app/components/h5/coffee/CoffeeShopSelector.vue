<script setup lang="ts">
import type { CoffeeShop } from '~/composables/useCoffeeOrder'

const props = defineProps<{
  shops: CoffeeShop[]
  loading: boolean
}>()

const emit = defineEmits<{
  select: [shop: CoffeeShop]
}>()

function formatHours(hours: Record<string, string>): string {
  const key = 'mon-fri'
  return hours[key] || ''
}
</script>

<template>
  <div class="shop-selector">
    <div class="selector-header">
      <h2 class="selector-title">附近 {{ shops.length }} 家门店</h2>
      <p class="selector-sub">选择门店开始点单</p>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner" />
      <span>正在查找门店...</span>
    </div>

    <div v-else-if="shops.length === 0" class="empty-state">
      <div class="empty-icon">&#9749;</div>
      <p class="empty-text">暂无可用门店</p>
    </div>

    <div v-else class="shop-list">
      <button
        v-for="shop in shops"
        :key="shop.id"
        class="shop-card"
        @click="emit('select', shop)"
      >
        <div class="shop-info">
          <h3 class="shop-name">{{ shop.name }}</h3>
          <p class="shop-address">{{ shop.address }}</p>
          <div class="shop-meta">
            <span class="meta-item">
              <span class="meta-icon i-lucide-clock" />
              {{ formatHours(shop.opening_hours) }}
            </span>
            <span v-if="shop.phone" class="meta-item">
              <span class="meta-icon i-lucide-phone" />
              {{ shop.phone }}
            </span>
          </div>
        </div>
        <span class="shop-arrow">&#8594;</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.shop-selector {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 0 0 24px;
}

.selector-header {
  text-align: center;
  padding: 8px 0 4px;
}

.selector-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--h5-text-1);
  letter-spacing: -0.02em;
}

.selector-sub {
  font-size: 0.8125rem;
  color: var(--h5-text-3);
  margin-top: 4px;
}

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 0;
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

.empty-icon {
  font-size: 2.5rem;
  opacity: 0.4;
}

.shop-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.shop-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  background: var(--h5-surface);
  border: 1px solid var(--h5-border);
  border-radius: var(--h5-radius);
  cursor: pointer;
  transition: all 0.25s var(--h5-ease);
  text-align: left;
  width: 100%;
  font-family: inherit;
  color: inherit;
}

.shop-card:hover {
  border-color: var(--coffee-accent);
  background: var(--coffee-surface-hover);
  transform: translateY(-1px);
}

.shop-card:active {
  transform: scale(0.99);
}

.shop-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.shop-name {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--h5-text-1);
  letter-spacing: -0.01em;
}

.shop-address {
  font-size: 0.75rem;
  color: var(--h5-text-2);
  line-height: 1.4;
}

.shop-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 4px;
}

.meta-item {
  font-size: 0.6875rem;
  color: var(--h5-text-3);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.meta-icon {
  font-size: 11px;
  opacity: 0.6;
}

.shop-arrow {
  font-size: 1.125rem;
  color: var(--h5-text-3);
  flex-shrink: 0;
  transition: transform 0.2s var(--h5-ease);
}

.shop-card:hover .shop-arrow {
  transform: translateX(4px);
  color: var(--coffee-accent);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
