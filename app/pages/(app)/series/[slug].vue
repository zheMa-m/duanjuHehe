<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
definePageMeta({ layout: 'app' })

const { t } = useI18n()
const route = useRoute()
const slug = computed(() => route.params.slug as string)

const { user, isLoggedIn } = useAuth()
const series = ref<any>(null)
const loading = ref(true)
const isFavorited = ref(false)

useAppSEO({ title: () => series.value?.title || 'Series', description: () => series.value?.description || '' })

async function fetchData() {
  loading.value = true
  try {
    const res = await $fetch<any>(`/api/v1/series/${slug.value}`)
    series.value = res.data
    if (isLoggedIn.value) {
      try {
        const favRes = await $fetch<any>('/api/v1/favorites')
        isFavorited.value = (favRes.data?.items || []).some((f: any) => f.series_id === series.value?.id)
      } catch (_) {}
    }
  } catch (_) { series.value = null } finally { loading.value = false }
}

async function toggleFavorite() {
  if (!series.value) return
  try {
    const res = await $fetch<any>(`/api/v1/favorites/${series.value.id}/toggle`, { method: 'POST' })
    isFavorited.value = res.data?.favorited || false
  } catch (_) {}
}

onMounted(fetchData)
</script>

<template>
  <div class="app-detail">
    <header class="app-detail-header">
      <NuxtLink to="/app" class="app-back">← Back</NuxtLink>
      <h1 class="app-detail-title">{{ series?.title || '' }}</h1>
    </header>

    <div v-if="loading" class="app-loading">{{ $t('common.loading') }}</div>
    <template v-else-if="series">
      <div class="app-hero" :style="{ backgroundImage: `url(${series.poster_image || series.cover_image})` }">
        <div class="app-hero-overlay" />
        <div class="app-hero-content">
          <img :src="series.cover_image" :alt="series.title" class="app-hero-cover" />
          <div class="app-hero-info">
            <h2 class="app-hero-title">{{ series.title }}</h2>
            <div class="app-hero-meta">
              <span>⭐ {{ series.rating || '4.5' }}</span>
              <span>{{ series.total_episodes }} eps</span>
              <span>{{ series.free_episodes || 5 }} free</span>
            </div>
            <div class="app-hero-actions">
              <NuxtLink :to="`/app/watch/${series.slug}/1`" class="app-watch-btn">▶ Watch</NuxtLink>
              <button :class="['app-fav-btn', { active: isFavorited }]" @click="toggleFavorite">{{ isFavorited ? '❤️' : '🤍' }}</button>
            </div>
          </div>
        </div>
      </div>

      <div class="app-episodes">
        <h3>{{ $t('reelshort.episodes') }} ({{ series.episodes?.length || 0 }})</h3>
        <div class="app-ep-list">
          <NuxtLink v-for="ep in series.episodes" :key="ep.id" :to="`/app/watch/${series.slug}/${ep.episode_number}`" class="app-ep-item">
            <span class="app-ep-num">{{ ep.episode_number }}</span>
            <div class="app-ep-info">
              <span class="app-ep-title">{{ ep.title || `Episode ${ep.episode_number}` }}</span>
              <span class="app-ep-dur">{{ ep.duration_seconds ? `${Math.floor(ep.duration_seconds/60)}m` : '' }}</span>
            </div>
            <span v-if="ep.is_free" class="app-free-tag">FREE</span>
            <span v-else class="app-coin-tag">🪙 {{ ep.coin_cost }}</span>
          </NuxtLink>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.app-detail { padding-bottom: 20px; }
.app-detail-header { display: flex; align-items: center; gap: 12px; padding: 16px 20px; }
.app-back { color: #6366f1; text-decoration: none; font-size: 0.875rem; font-weight: 500; }
.app-detail-title { font-size: 1rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.app-hero { position: relative; padding: 32px 20px; background-size: cover; background-position: center; }
.app-hero-overlay { position: absolute; inset: 0; background: linear-gradient(to top, #f8fafc 0%, rgba(248,250,252,0.5) 100%); }
.app-hero-content { position: relative; display: flex; gap: 16px; align-items: flex-start; }
.app-hero-cover { width: 120px; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); flex-shrink: 0; }
.app-hero-info { flex: 1; }
.app-hero-title { font-size: 1.25rem; font-weight: 800; margin-bottom: 6px; }
.app-hero-meta { display: flex; gap: 12px; font-size: 0.75rem; color: #475569; margin-bottom: 12px; }
.app-hero-actions { display: flex; gap: 10px; }
.app-watch-btn { padding: 10px 24px; border-radius: 10px; background: #6366f1; color: #fff; font-size: 0.875rem; font-weight: 700; text-decoration: none; }
.app-fav-btn { padding: 10px 16px; border-radius: 10px; border: 1px solid #e2e8f0; background: #fff; cursor: pointer; font-size: 1rem; }
.app-fav-btn.active { color: #ef4444; }

.app-episodes { padding: 20px; }
.app-episodes h3 { font-size: 1rem; font-weight: 700; margin-bottom: 12px; }
.app-ep-list { display: flex; flex-direction: column; gap: 8px; }
.app-ep-item { display: flex; align-items: center; gap: 10px; padding: 12px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; text-decoration: none; color: inherit; }
.app-ep-num { width: 24px; height: 24px; border-radius: 6px; background: #eef2ff; color: #6366f1; font-size: 0.6875rem; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.app-ep-info { flex: 1; min-width: 0; }
.app-ep-title { font-size: 0.8125rem; color: #0f172a; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.app-ep-dur { font-size: 0.6875rem; color: #94a3b8; }
.app-free-tag { font-size: 0.625rem; font-weight: 700; padding: 3px 6px; border-radius: 4px; background: #dcfce7; color: #16a34a; }
.app-coin-tag { font-size: 0.6875rem; color: #d97706; font-weight: 600; }

.app-loading { text-align: center; padding: 80px; color: #94a3b8; }
</style>
