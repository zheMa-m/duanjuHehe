<script setup lang="ts">
import { ref, onMounted } from 'vue'

const { t } = useI18n()
const { isLoggedIn, initAuth } = useAuth()

definePageMeta({ ssr: false })

const balance = ref(0)
const totalEarned = ref(0)
const totalSpent = ref(0)
const packages = ref<any[]>([])
const loading = ref(true)
const claiming = ref<string | null>(null)
const toastMsg = ref('')
const toastType = ref<'success' | 'error'>('success')

const quickAmounts = [50, 100, 200, 500]

function showToast(msg: string, type: 'success' | 'error' = 'success') {
  toastMsg.value = msg
  toastType.value = type
  setTimeout(() => { toastMsg.value = '' }, 3000)
}

async function fetchData() {
  loading.value = true
  try {
    const [balRes, pkgRes] = await Promise.all([
      $fetch<any>('/api/v1/coins/balance').catch(() => ({ data: null })),
      $fetch<any>('/api/v1/coins/packages'),
    ])
    if (balRes?.data) {
      balance.value = balRes.data.balance || 0
      totalEarned.value = balRes.data.total_earned || 0
      totalSpent.value = balRes.data.total_spent || 0
    }
    packages.value = pkgRes?.data?.items || []
  } catch (_) {} finally {
    loading.value = false
  }
}

async function claimPackage(pkg: any) {
  if (claiming.value) return
  claiming.value = pkg.id
  try {
    const res = await $fetch<any>('/api/v1/coins/purchase', {
      method: 'POST',
      body: { package_id: pkg.id, payment_provider: 'demo' },
    })
    if (res?.data) {
      const added = pkg.coins_amount + pkg.bonus_coins
      balance.value = res.data.balance_after || balance.value + added
      showToast(`✅ 成功领取 +${added.toLocaleString()} 🪙`, 'success')
    }
  } catch (e: any) {
    showToast(e.statusMessage || e.message || t('common.error'), 'error')
  } finally {
    claiming.value = null
  }
}

async function claimQuick(amount: number) {
  if (claiming.value) return
  // Find or create a matching package, or just use ad-watch logic via API
  claiming.value = `quick-${amount}`
  try {
    // Ad watch API: each call gives 5 coins, so loop if needed
    const times = Math.ceil(amount / 5)
    for (let i = 0; i < times; i++) {
      const res = await $fetch<any>('/api/v1/ads/watch', {
        method: 'POST',
        body: { episode_id: undefined },
      })
      if (i === times - 1 && res?.data) {
        balance.value = res.data.balance_after || balance.value + 5
      }
    }
    const totalAdded = times * 5
    balance.value = Math.max(balance.value + totalAdded - 5, 0) + 5 // rough correction
    // Fetch accurate balance
    try {
      const balRes = await $fetch<any>('/api/v1/coins/balance')
      if (balRes?.data) balance.value = balRes.data.balance || 0
    } catch (_) {}
    showToast(`✅ 成功领取 +${totalAdded} 🪙`, 'success')
  } catch (e: any) {
    showToast(e.statusMessage || e.message || t('common.error'), 'error')
  } finally {
    claiming.value = null
  }
}

onMounted(async () => {
  await initAuth()
  if (isLoggedIn.value) {
    fetchData()
  } else {
    loading.value = false
  }
})
</script>

<template>
  <div class="coins-root">
    <header class="coins-header">
      <NuxtLink to="/" class="back-link">← {{ $t('reelshort.siteName') }}</NuxtLink>
    </header>

    <!-- Toast -->
    <Teleport to="body">
      <div v-if="toastMsg" class="toast" :class="toastType">{{ toastMsg }}</div>
    </Teleport>

    <!-- Not logged in -->
    <div v-if="!isLoggedIn && !loading" class="not-logged-in">
      <div class="empty-card">
        <span class="empty-icon">🪙</span>
        <h2>{{ $t('reelshort.loginToBuy') }}</h2>
        <NuxtLink to="/login" class="login-btn">{{ $t('reelshort.goLogin') }} →</NuxtLink>
      </div>
    </div>

    <template v-else>
      <!-- Demo Banner -->
      <div class="demo-banner">
        ⚠️ 当前为测试模式，金币免费领取。后续将接入真实支付。
      </div>

      <!-- Balance Card -->
      <div class="balance-card">
        <div class="balance-main">
          <span class="balance-label">{{ $t('reelshort.myCoins') }}</span>
          <span class="balance-amount">🪙 {{ balance.toLocaleString() }}</span>
        </div>
        <div class="balance-stats">
          <span class="stat">累计赚取: {{ totalEarned.toLocaleString() }}</span>
          <span class="stat">累计消费: {{ totalSpent.toLocaleString() }}</span>
        </div>
      </div>

      <div class="content-wrap">
        <!-- Quick Claim -->
        <section class="quick-section">
          <h2 class="section-title">⚡ 快速领取</h2>
          <p class="section-desc">模拟看广告赚金币，每次 +5 🪙</p>
          <div class="quick-grid">
            <button
              v-for="amt in quickAmounts"
              :key="amt"
              class="quick-btn"
              :disabled="!!claiming"
              @click="claimQuick(amt)"
            >
              <span class="quick-coins">+{{ amt }} 🪙</span>
              <span class="quick-sub">≈ {{ amt / 5 }} 次广告</span>
            </button>
          </div>
        </section>

        <!-- Packages -->
        <section class="packages-section">
          <h2 class="section-title">📦 {{ $t('reelshort.coinPackages') }}</h2>
          <p class="section-desc">套餐价格仅供参考，当前免费领取</p>
          <div v-if="loading" class="loading">{{ $t('reelshort.loading') }}</div>
          <div v-else class="package-grid">
            <div v-for="pkg in packages" :key="pkg.id" class="package-card" :class="{ popular: pkg.bonus_coins > 0 }">
              <div v-if="pkg.bonus_coins > 0" class="popular-badge">🔥 {{ $t('reelshort.bonusCoins', { count: pkg.bonus_coins }) }}</div>
              <div class="package-body">
                <h3 class="package-name">{{ pkg.name }}</h3>
                <div class="package-coins">
                  <span class="coins-amount">{{ pkg.coins_amount.toLocaleString() }}</span>
                  <span class="coins-unit">🪙</span>
                </div>
                <div v-if="pkg.bonus_coins" class="package-bonus">+{{ pkg.bonus_coins.toLocaleString() }} 赠送</div>
                <div class="package-price-strikethrough">${{ pkg.price }} {{ pkg.currency }}</div>
                <button
                  class="claim-btn"
                  :disabled="claiming === pkg.id"
                  @click="claimPackage(pkg)"
                >
                  {{ claiming === pkg.id ? '领取中...' : '🎁 免费领取' }}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.coins-root {
  min-height: 100vh;
  background: #f8fafc;
  font-family: var(--font-sans);
  padding-bottom: 60px;
}
.coins-header {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px 24px 0;
}
.back-link {
  color: #6366f1;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
}

/* Demo Banner */
.demo-banner {
  max-width: 900px;
  margin: 16px auto 0;
  padding: 10px 20px;
  background: #fef3c7;
  border: 1px solid #fcd34d;
  border-radius: 10px;
  text-align: center;
  font-size: 13px;
  color: #92400e;
  font-weight: 500;
}

/* Not logged in */
.not-logged-in {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}
.empty-card {
  text-align: center;
  padding: 48px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.04);
}
.empty-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 12px;
}
.empty-card h2 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #475569;
  margin-bottom: 20px;
}
.login-btn {
  display: inline-block;
  padding: 12px 28px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  text-decoration: none;
  box-shadow: 0 4px 16px rgba(99,102,241,0.25);
  transition: all 0.2s;
}
.login-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 24px rgba(99,102,241,0.35);
}

/* Balance */
.balance-card {
  max-width: 900px;
  margin: 20px auto 0;
  padding: 24px 32px;
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  border: 1px solid #fcd34d;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}
.balance-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.balance-label {
  font-size: 12px;
  font-weight: 600;
  color: #92400e;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.balance-amount {
  font-size: 28px;
  font-weight: 900;
  color: #78350f;
  font-family: var(--font-mono);
}
.balance-stats {
  display: flex;
  gap: 20px;
}
.stat {
  font-size: 12px;
  color: #a16207;
  font-weight: 500;
}

/* Content */
.content-wrap {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 24px;
}
.section-desc {
  font-size: 12px;
  color: #94a3b8;
  margin-top: -12px;
  margin-bottom: 16px;
}

/* Quick Claim */
.quick-section {
  margin-top: 32px;
}
.section-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 6px;
}
.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.quick-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px 12px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}
.quick-btn:hover:not(:disabled) {
  border-color: #22c55e;
  background: #f0fdf4;
  box-shadow: 0 4px 16px rgba(34,197,94,0.1);
  transform: translateY(-2px);
}
.quick-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.quick-coins {
  font-size: 16px;
  font-weight: 700;
  color: #16a34a;
}
.quick-sub {
  font-size: 10px;
  color: #94a3b8;
}

/* Packages */
.packages-section {
  margin-top: 32px;
}
.loading {
  text-align: center;
  padding: 60px 0;
  color: #94a3b8;
}
.package-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  margin-top: 16px;
}
.package-card {
  position: relative;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  overflow: hidden;
  transition: all 0.2s;
}
.package-card:hover {
  border-color: #6366f1;
  box-shadow: 0 8px 32px rgba(99,102,241,0.1);
  transform: translateY(-2px);
}
.package-card.popular {
  border-color: #fbbf24;
}
.popular-badge {
  text-align: center;
  padding: 6px;
  font-size: 11px;
  font-weight: 700;
  color: #92400e;
  background: #fef3c7;
  letter-spacing: 0.02em;
}
.package-body {
  padding: 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.package-name {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 4px;
}
.package-coins {
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.coins-amount {
  font-size: 32px;
  font-weight: 900;
  color: #b45309;
  font-family: var(--font-mono);
  line-height: 1;
}
.coins-unit {
  font-size: 18px;
}
.package-bonus {
  font-size: 12px;
  font-weight: 600;
  color: #16a34a;
}
.package-price-strikethrough {
  font-size: 14px;
  color: #94a3b8;
  text-decoration: line-through;
  margin: 6px 0;
}
.claim-btn {
  width: 100%;
  padding: 11px;
  border-radius: 10px;
  border: none;
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  cursor: pointer;
  box-shadow: 0 3px 12px rgba(34,197,94,0.25);
  transition: all 0.2s;
  font-family: inherit;
}
.claim-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 5px 20px rgba(34,197,94,0.4);
}
.claim-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Toast */
.toast {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  padding: 12px 24px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 8px 32px rgba(0,0,0,0.15);
  animation: toast-in 0.3s ease;
}
.toast.success {
  background: #16a34a;
  color: #fff;
}
.toast.error {
  background: #dc2626;
  color: #fff;
}
@keyframes toast-in {
  from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

@media (max-width: 640px) {
  .balance-card {
    margin: 16px 16px 0;
    padding: 20px;
  }
  .balance-amount {
    font-size: 24px;
  }
  .quick-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
  .package-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  .demo-banner {
    margin: 12px 16px 0;
  }
}
</style>
