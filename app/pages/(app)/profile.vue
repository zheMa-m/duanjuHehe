<script setup lang="ts">
import { onMounted, ref } from 'vue'
definePageMeta({ layout: 'app' })

const { t } = useI18n()
const { user, isLoggedIn, signOut } = useAuth()
useAppSEO({ title: () => 'Profile — ReelShort', description: () => '' })

const coinBalance = ref(0)
const coinPackages = ref<any[]>([])
const transactions = ref<any[]>([])
const loading = ref(true)

async function fetchData() {
  if (!isLoggedIn.value) { loading.value = false; return }
  try {
    const [balRes, pkgRes, txRes] = await Promise.all([
      $fetch<any>('/api/v1/coins/balance'),
      $fetch<any>('/api/v1/coins/packages'),
      $fetch<any>('/api/v1/coins/transactions?pageSize=10'),
    ])
    coinBalance.value = balRes.data?.balance || 0
    coinPackages.value = pkgRes.data?.items || []
    transactions.value = txRes.data?.items || []
  } catch (_) {} finally { loading.value = false }
}

async function handleSignOut() { await signOut(); navigateTo('/app') }

onMounted(fetchData)
</script>

<template>
  <div class="app-profile">
    <header class="app-header">
      <h1 class="app-header-title">👤 Profile</h1>
    </header>

    <!-- Not Logged In -->
    <div v-if="!isLoggedIn" class="profile-guest">
      <span class="guest-icon">👤</span>
      <h2>{{ $t('userBar.notSignedIn') }}</h2>
      <p>{{ $t('userBar.signUpForMore') }}</p>
      <div class="guest-actions">
        <NuxtLink to="/app" class="guest-btn primary">Sign In / Register</NuxtLink>
      </div>
    </div>

    <!-- Logged In -->
    <template v-else>
      <div class="profile-card">
        <div class="profile-avatar">{{ user?.displayName?.[0] || user?.email?.[0] || '?' }}</div>
        <div class="profile-info">
          <h2>{{ user?.displayName || user?.email || 'User' }}</h2>
          <span class="profile-email">{{ user?.email }}</span>
        </div>
      </div>

      <div class="coin-card">
        <div class="coin-balance">
          <span class="coin-label">🪙 Balance</span>
          <span class="coin-amount">{{ coinBalance.toLocaleString() }}</span>
        </div>
      </div>

      <!-- Coin Packages -->
      <section class="profile-section" v-if="coinPackages.length">
        <h3>Buy Coins</h3>
        <div class="package-grid">
          <button v-for="pkg in coinPackages" :key="pkg.id" class="package-card">
            <span class="package-coins">🪙 {{ pkg.coin_amount?.toLocaleString() }}</span>
            <span class="package-price">${{ pkg.price }}</span>
          </button>
        </div>
      </section>

      <!-- Recent Transactions -->
      <section class="profile-section" v-if="transactions.length">
        <h3>Recent Activity</h3>
        <div class="tx-list">
          <div v-for="tx in transactions.slice(0, 5)" :key="tx.id" class="tx-item">
            <span class="tx-type">{{ tx.type === 'earn' ? '🎁' : tx.type === 'spend' ? '💸' : tx.type === 'purchase' ? '💳' : '🔄' }}</span>
            <span class="tx-desc">{{ tx.description || tx.type }}</span>
            <span :class="['tx-amount', tx.amount > 0 ? 'positive' : 'negative']">{{ tx.amount > 0 ? '+' : '' }}{{ tx.amount }}</span>
          </div>
        </div>
      </section>

      <button class="signout-btn" @click="handleSignOut">{{ $t('userBar.signOut') }}</button>
    </template>
  </div>
</template>

<style scoped>
.app-profile { padding: 0 0 20px; }
.app-header { padding: 16px 20px 8px; }
.app-header-title { font-size: 1.25rem; font-weight: 800; }

/* Guest */
.profile-guest { text-align: center; padding: 60px 20px; }
.guest-icon { font-size: 3rem; display: block; margin-bottom: 12px; }
.profile-guest h2 { font-size: 1.25rem; font-weight: 700; margin-bottom: 4px; }
.profile-guest p { font-size: 0.875rem; color: #64748b; margin-bottom: 20px; }
.guest-btn { display: inline-block; padding: 12px 32px; border-radius: 10px; background: #6366f1; color: #fff; font-weight: 700; text-decoration: none; }

/* Profile Card */
.profile-card { display: flex; align-items: center; gap: 14px; padding: 20px; margin: 8px 20px; background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; }
.profile-avatar { width: 52px; height: 52px; border-radius: 50%; background: #6366f1; color: #fff; font-size: 1.25rem; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.profile-info h2 { font-size: 1rem; font-weight: 700; }
.profile-email { font-size: 0.75rem; color: #94a3b8; }

/* Coins */
.coin-card { padding: 16px 20px; margin: 0 20px; background: linear-gradient(135deg, #6366f1, #4f46e5); border-radius: 14px; }
.coin-balance { display: flex; justify-content: space-between; align-items: center; }
.coin-label { color: rgba(255,255,255,0.8); font-size: 0.8125rem; }
.coin-amount { color: #fff; font-size: 1.5rem; font-weight: 900; }

/* Packages */
.profile-section { padding: 20px; }
.profile-section h3 { font-size: 0.9375rem; font-weight: 700; margin-bottom: 12px; }
.package-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.package-card { padding: 16px; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.package-coins { font-size: 0.875rem; font-weight: 700; }
.package-price { font-size: 1.125rem; font-weight: 800; color: #6366f1; }

/* Transactions */
.tx-list { display: flex; flex-direction: column; gap: 6px; }
.tx-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; }
.tx-type { font-size: 0.875rem; }
.tx-desc { flex: 1; font-size: 0.75rem; color: #475569; }
.tx-amount { font-size: 0.75rem; font-weight: 700; }
.tx-amount.positive { color: #16a34a; }
.tx-amount.negative { color: #dc2626; }

.signout-btn { display: block; width: calc(100% - 40px); margin: 24px 20px; padding: 14px; border-radius: 12px; border: 1px solid #fecaca; background: #fef2f2; color: #dc2626; font-size: 0.9375rem; font-weight: 600; cursor: pointer; }
</style>
