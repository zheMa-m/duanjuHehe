<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useCoffeeOrder } from '~/composables/useCoffeeOrder'
import type { CoffeeShop, CoffeeMenuItem, SugarLevel, IceLevel, SizeOption } from '~/composables/useCoffeeOrder'
import CoffeeShopSelector from '~/components/h5/coffee/CoffeeShopSelector.vue'
import CoffeeMenu from '~/components/h5/coffee/CoffeeMenu.vue'
import CoffeeCart from '~/components/h5/coffee/CoffeeCart.vue'
import CoffeeOrderSuccess from '~/components/h5/coffee/CoffeeOrderSuccess.vue'

useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover' },
    { name: 'theme-color', content: '#0A0A0F' },
    { name: 'color-scheme', content: 'dark' },
  ],
  bodyAttrs: {
    style: 'background: #0A0A0F; overscroll-behavior: none; -webkit-tap-highlight-color: transparent;',
  },
})

useAppSEO({
  title: () => 'HEHE Coffee - Order Online',
  description: () => 'Order your favorite coffee for pickup or dine-in',
})

const {
  currentStep, selectedShop, cartItems, orderType, currentOrder,
  isPlacingOrder, cartCount, cartTotal,
  selectShop, backToShops, addToCart, removeCartItem, setOrderType,
  goToCart, backToMenu, placeOrder, resetOrder,
} = useCoffeeOrder()

const { user, isLoggedIn, isAnonymous, signInAnonymously, initAuth, authReady } = useAuth()

// Data fetching
const shops = ref<CoffeeShop[]>([])
const menuItems = ref<CoffeeMenuItem[]>([])
const loadingShops = ref(true)
const loadingMenu = ref(true)
const menuError = ref<string | null>(null)
const error = ref<string | null>(null)

async function fetchShops() {
  loadingShops.value = true
  try {
    const res = await $fetch<{ data: CoffeeShop[] }>('/api/v1/shops')
    shops.value = res.data || []
  } catch (e: any) {
    error.value = e.data?.statusMessage || 'Failed to load shops'
  } finally {
    loadingShops.value = false
  }
}

async function fetchMenu(shopId: string) {
  loadingMenu.value = true
  menuError.value = null
  try {
    const res = await $fetch<{ data: CoffeeMenuItem[] }>('/api/v1/menu?shop_id=' + shopId)
    menuItems.value = res.data || []
  } catch (e: any) {
    menuError.value = e.data?.statusMessage || 'Failed to load menu'
  } finally {
    loadingMenu.value = false
  }
}

// Flow handlers
async function handleSelectShop(shop: CoffeeShop) {
  selectShop(shop)
  await fetchMenu(shop.id)
}

function handleBackToShops() {
  backToShops()
  menuItems.value = []
}

function handleAddToCart(item: CoffeeMenuItem, sugar: SugarLevel, ice: IceLevel, size: SizeOption) {
  addToCart(item, sugar, ice, size)
}

async function handlePlaceOrder() {
  if (!isLoggedIn.value) {
    await signInAnonymously()
  }
  await placeOrder()
}

function handleReset() {
  resetOrder()
  menuItems.value = []
  fetchShops()
}

// Auth init
watch(authReady, (ready) => {
  if (!ready) return
  if (!user.value) {
    signInAnonymously().catch(() => {})
  }
})

onMounted(async () => {
  await initAuth()
  if (!user.value) {
    try { await signInAnonymously() } catch {}
  }
  fetchShops()
})
</script>

<template>
  <div class="coffee-page">
    <!-- Background -->
    <div class="bg-layer" aria-hidden="true">
      <div class="glow glow--primary" />
      <div class="glow glow--secondary" />
    </div>

    <!-- Top bar with shop name -->
    <header class="top-bar">
      <div class="bar-left">
        <button v-if="currentStep !== 'shops'" class="bar-btn" @click="handleBackToShops">
          <span class="i-lucide-chevron-left" />
        </button>
        <h1 class="bar-brand">
          <span v-if="currentStep === 'shops'">HEHE Coffee</span>
          <span v-else-if="selectedShop" class="bar-shop">{{ selectedShop.name }}</span>
        </h1>
      </div>
      <div class="bar-right">
        <button v-if="currentStep === 'menu'" class="bar-btn cart-badge" @click="goToCart">
          <span class="i-lucide-shopping-cart" />
          <span v-if="cartCount > 0" class="badge-count">{{ cartCount }}</span>
        </button>
      </div>
    </header>

    <main class="main-area">
      <!-- Step: Shop Selection -->
      <section v-if="currentStep === 'shops'" class="step-view">
        <CoffeeShopSelector
          :shops="shops"
          :loading="loadingShops"
          @select="handleSelectShop"
        />
      </section>

      <!-- Step: Menu -->
      <section v-else-if="currentStep === 'menu' && selectedShop" class="step-view">
        <CoffeeMenu
          :items="menuItems"
          :loading="loadingMenu"
          :error="menuError"
          @back="handleBackToShops"
          @go-to-cart="goToCart"
          @add-to-cart="handleAddToCart"
        />
      </section>

      <!-- Step: Cart -->
      <section v-else-if="currentStep === 'cart'" class="step-view">
        <CoffeeCart
          :items="cartItems"
          :order-type="orderType"
          @back="backToMenu"
          @place="handlePlaceOrder"
          @remove="removeCartItem"
          @set-order-type="setOrderType"
        />

        <!-- Placing overlay -->
        <Transition name="fade">
          <div v-if="isPlacingOrder" class="placing-overlay">
            <div class="placing-card">
              <div class="placing-spinner" />
              <p class="placing-text">Placing your order...</p>
            </div>
          </div>
        </Transition>
      </section>

      <!-- Step: Success -->
      <section v-else-if="currentStep === 'success' && currentOrder" class="step-view">
        <CoffeeOrderSuccess
          :order="currentOrder"
          @reset="handleReset"
        />
      </section>
    </main>
  </div>
</template>

<style scoped>
/* ==========================================================================
   HEHE Coffee - Mobile Ordering
   Design: Warm dark tones, coffee-shop atmosphere
   Accent: #B47846 (warm brown amber)
   Base: #0A0A0F
   ========================================================================== */

:root {
  --coffee-base: #0A0A0F;
  --coffee-accent: #B47846;
  --coffee-accent-hover: #C48956;
  --coffee-accent-glow: rgba(180, 120, 70, 0.25);
  --coffee-surface-hover: rgba(180, 120, 70, 0.06);
}

.coffee-page {
  min-height: 100vh; min-height: 100dvh;
  background: var(--coffee-base);
  color: #F1F5F9;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  font-family: Inter, -apple-system, BlinkMacSystemFont, 'Noto Sans SC', sans-serif;
  -webkit-font-smoothing: antialiased;
}

::selection {
  background: var(--coffee-accent);
  color: var(--coffee-base);
}

/* Background */
.bg-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
}

.glow--primary {
  width: 60vw;
  max-width: 380px;
  aspect-ratio: 1;
  background: radial-gradient(circle, var(--coffee-accent-glow), transparent 70%);
  top: -10%;
  right: -20%;
  opacity: 0.3;
  animation: glow-drift 14s ease-in-out infinite alternate;
}

.glow--secondary {
  width: 40vw;
  max-width: 260px;
  aspect-ratio: 1;
  background: radial-gradient(circle, rgba(100, 116, 139, 0.08), transparent 70%);
  bottom: 5%;
  left: -15%;
  opacity: 0.4;
  animation: glow-drift 18s ease-in-out infinite alternate-reverse;
}

/* Top bar */
.top-bar {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(10, 10, 15, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.bar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bar-btn {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  color: #94A3B8;
  cursor: pointer;
  font-size: 0.9375rem;
  transition: all 0.2s;
}

.bar-btn:hover {
  border-color: var(--coffee-accent);
  color: var(--coffee-accent);
}

.bar-brand {
  font-size: 0.9375rem;
  font-weight: 700;
  color: #F1F5F9;
  letter-spacing: -0.02em;
}

.bar-shop {
  display: block;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bar-right {
  display: flex;
  gap: 8px;
}

.cart-badge {
  position: relative;
}

.badge-count {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 18px;
  height: 18px;
  background: var(--coffee-accent);
  color: var(--coffee-base);
  border-radius: 50%;
  font-size: 0.5625rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Main area */
.main-area {
  flex: 1;
  position: relative;
  z-index: 10;
  padding: 0 16px;
  max-width: 448px;
  width: 100%;
  margin: 0 auto;
}

.step-view {
  animation: step-enter 0.35s var(--h5-ease) both;
  padding: 8px 0 40px;
}

/* Placing overlay */
.placing-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

.placing-card {
  background: var(--coffee-base);
  border: 1px solid var(--coffee-accent);
  border-radius: 16px;
  padding: 32px 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.placing-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(180, 120, 70, 0.15);
  border-top-color: var(--coffee-accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.placing-text {
  font-size: 0.8125rem;
  color: #94A3B8;
}

/* Animations */
@keyframes glow-drift {
  from { opacity: 0.2; transform: scale(1) translate(0, 0); }
  to { opacity: 0.35; transform: scale(1.08) translate(8px, 12px); }
}

@keyframes step-enter {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s var(--h5-ease);
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  .glow { animation: none !important; opacity: 0.25; }
  .step-view { animation: none; opacity: 1; }
}
</style>

<!-- Global H5 design system variables -->
<style>
:root {
  --h5-base: #0A0A0F;
  --h5-surface: rgba(255,255,255,0.04);
  --h5-surface-hover: rgba(255,255,255,0.06);
  --h5-border: rgba(255,255,255,0.08);
  --h5-border-strong: rgba(255,255,255,0.14);
  --h5-accent: #B47846;
  --h5-accent-soft: rgba(180,120,70,0.12);
  --h5-accent-glow: rgba(180,120,70,0.25);
  --h5-text-1: #F1F5F9;
  --h5-text-2: #94A3B8;
  --h5-text-3: #64748B;
  --h5-error: #EF4444;
  --h5-success: #10B981;
  --h5-radius: 16px;
  --h5-radius-sm: 10px;
  --h5-ease: cubic-bezier(0.16,1,0.3,1);
  --h5-ease-spring: cubic-bezier(0.34,1.56,0.64,1);
}

::selection {
  background: var(--h5-accent);
  color: var(--h5-base);
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>



