<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
definePageMeta({ layout: 'app' })

const { t } = useI18n()
const { user, isLoggedIn } = useAuth()
useAppSEO({ title: () => 'My Library — ReelShort', description: () => '' })

const activeTab = ref<'favorites' | 'history'>('favorites')
const favorites = ref<any[]>([])
const history = ref<any[]>([])
const continueWatching = ref<any[]>([])
const loading = ref(true)

async function fetchData() {
  if (!isLoggedIn.value) { loading.value = false; return }
  loading.value = true
  try {
    const [favRes, histRes, contRes] = await Promise.all([
      $fetch<any>('/api/v1/favorites'),
      $fetch<any>('/api/v1/watch/history?pageSize=20'),
      $fetch<any>('/api/v1/watch/continue'),
    ])
    favorites.value = favRes.data?.items || []
    history.value = histRes.data?.items || []
    continueWatching.value = contRes.data?.items || []
  } catch (_) {} finally { loading.value = false }
}

onMounted(fetchData)
</script>

<template>
  <div class="app-library">
    <header class="app-header">
      <h1 class="app-header-title">📚 My Library</h1>
    </header>

    <div v-if="!isLoggedIn" class="app-login-hint">
      <p>Sign in to see your library</p>
      <NuxtLink to="/app/profile" class="app-login-link">Sign In →</NuxtLink>
    </div>

    <template v-else>
      <!-- Continue Watching -->
      <section v-if="continueWatching.length" class="lib-section">
        <h2 class="lib-section-title">Continue Watching</h2>
        <div class="lib-continue-row">
          <NuxtLink v-for="item in continueWatching.slice(0, 6)" :key="item.id"
            :to="`/app/watch/${item.series?.slug || ''}/${item.episode_number || 1}`" class="lib-continue-card">
            <img :src="item.series?.cover_image || ''" class="lib-continue-cover" />
            <div class="lib-progress"><div class="lib-progress-fill" :style="{ width: ((item.progress_seconds / (item.duration_seconds || 1)) * 100) + '%' }" /></div>
          </NuxtLink>
        </div>
      </section>

      <!-- Tabs -->
      <div class="lib-tabs">
        <button :class="['lib-tab', activeTab === 'favorites' && 'active']" @click="activeTab = 'favorites'">❤️ Favorites</button>
        <button :class="['lib-tab', activeTab === 'history' && 'active']" @click="activeTab = 'history'">🕐 History</button>
      </div>

      <div v-if="loading" class="app-loading">{{ $t('common.loading') }}</div>
      <div v-else-if="activeTab === 'favorites'" class="lib-list">
        <div v-if="favorites.length === 0" class="lib-empty">No favorites yet. Start exploring!</div>
        <NuxtLink v-for="f in favorites" :key="f.id" :to="`/app/series/${f.series?.slug || f.series_id}`" class="lib-item">
          <img :src="f.series?.cover_image || ''" class="lib-item-cover" />
          <div class="lib-item-info">
            <span class="lib-item-title">{{ f.series?.title || '' }}</span>
            <span class="lib-item-meta">⭐ {{ f.series?.rating || '—' }}</span>
          </div>
          <span>→</span>
        </NuxtLink>
      </div>
      <div v-else class="lib-list">
        <div v-if="history.length === 0" class="lib-empty">No watch history yet.</div>
        <NuxtLink v-for="h in history" :key="h.id" :to="`/app/watch/${h.series?.slug || ''}/${h.episode?.episode_number || 1}`" class="lib-item">
          <img :src="h.series?.cover_image || ''" class="lib-item-cover" />
          <div class="lib-item-info">
            <span class="lib-item-title">{{ h.series?.title || '' }}</span>
            <span class="lib-item-meta">Ep {{ h.episode?.episode_number || '—' }}</span>
          </div>
          <span>→</span>
        </NuxtLink>
      </div>
    </template>
  </div>
</template>

<style scoped>
.app-library { padding: 0 0 20px; }
.app-header { padding: 16px 20px 8px; }
.app-header-title { font-size: 1.25rem; font-weight: 800; }
.app-login-hint { text-align: center; padding: 60px 20px; }
.app-login-hint p { font-size: 0.9375rem; color: #64748b; margin-bottom: 12px; }
.app-login-link { color: #6366f1; font-weight: 600; text-decoration: none; }

.lib-section { padding: 16px 20px; }
.lib-section-title { font-size: 0.9375rem; font-weight: 700; margin-bottom: 10px; }
.lib-continue-row { display: flex; gap: 10px; overflow-x: auto; }
.lib-continue-card { width: 100px; text-decoration: none; flex-shrink: 0; }
.lib-continue-cover { width: 100%; aspect-ratio: 2/3; object-fit: cover; border-radius: 8px; }
.lib-progress { height: 3px; background: #e2e8f0; border-radius: 2px; margin-top: 4px; }
.lib-progress-fill { height: 100%; background: #6366f1; border-radius: 2px; }

.lib-tabs { display: flex; gap: 8px; padding: 0 20px 12px; }
.lib-tab { flex: 1; padding: 10px; border-radius: 10px; border: 1px solid #e2e8f0; background: #fff; font-size: 0.8125rem; font-weight: 600; color: #475569; cursor: pointer; }
.lib-tab.active { background: #eef2ff; border-color: #c7d2fe; color: #6366f1; }

.lib-list { padding: 0 20px; display: flex; flex-direction: column; gap: 8px; }
.lib-item { display: flex; align-items: center; gap: 12px; padding: 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; text-decoration: none; color: inherit; }
.lib-item-cover { width: 48px; height: 68px; object-fit: cover; border-radius: 6px; flex-shrink: 0; }
.lib-item-info { flex: 1; min-width: 0; }
.lib-item-title { font-size: 0.8125rem; font-weight: 600; color: #0f172a; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lib-item-meta { font-size: 0.6875rem; color: #94a3b8; }

.lib-empty { text-align: center; padding: 40px; color: #94a3b8; font-size: 0.8125rem; }
.app-loading { text-align: center; padding: 40px; color: #94a3b8; }
</style>
