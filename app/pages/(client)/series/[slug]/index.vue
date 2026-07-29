<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'

const { t } = useI18n()
const route = useRoute()
const slug = computed(() => route.params.slug as string)
const series = ref<any>(null)
const loading = ref(true)

useAppSEO({
  title: () => series.value?.title || 'Series — ReelShort',
  description: () => series.value?.description || '',
})

const { user, isLoggedIn } = useAuth()
const isFavorited = ref(false)

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
  <div class="detail-root">
    <header class="detail-header">
      <NuxtLink to="/browse" class="back-link">{{ $t('reelshort.backToBrowse') }}</NuxtLink>
    </header>

    <div v-if="loading" class="loading">{{ $t('reelshort.loading') }}</div>
    <div v-else-if="!series" class="loading">{{ $t('reelshort.notFound') }}</div>

    <template v-else>
      <div class="hero" :style="series.poster_image ? { backgroundImage: `url(${series.poster_image})` } : {}">
        <div class="hero-overlay" />
        <div class="hero-content">
          <img :src="series.cover_image" :alt="series.title" class="hero-cover" />
          <div class="hero-info">
            <h1 class="hero-title">{{ series.title }}</h1>
            <div class="hero-meta">
              <span>⭐ {{ series.rating || '4.5' }}</span>
              <span>{{ series.total_episodes }} {{ $t('reelshort.episodes') }}</span>
              <span>{{ $t('reelshort.freeEpisodes', { count: series.free_episodes }) }}</span>
            </div>
            <p class="hero-desc">{{ series.description }}</p>
            <div v-if="series.tags?.length" class="tags">
              <span v-for="tag in series.tags" :key="tag" class="tag">{{ tag }}</span>
            </div>
            <div class="hero-actions">
              <NuxtLink v-if="series.episodes?.length" :to="`/watch/${series.slug}/${series.episodes[0].episode_number}`" class="watch-btn">{{ $t('reelshort.watchNow') }}</NuxtLink>
              <button @click="toggleFavorite" class="fav-btn" :class="{ active: isFavorited }">{{ isFavorited ? $t('reelshort.favorited') : $t('reelshort.favorite') }}</button>
            </div>
          </div>
        </div>
      </div>

      <div class="episodes-section">
        <h2 class="section-title">{{ $t('reelshort.episodes') }}</h2>
        <div class="episode-list">
          <NuxtLink v-for="ep in series.episodes" :key="ep.id" :to="`/watch/${series.slug}/${ep.episode_number}`" class="episode-item">
            <img v-if="ep.thumbnail_url" :src="ep.thumbnail_url" :alt="ep.title" class="ep-thumb" />
            <div class="ep-info">
              <span class="ep-num">Ep {{ ep.episode_number }}</span>
              <span class="ep-title">{{ ep.title }}</span>
            </div>
            <div class="ep-right">
              <span v-if="ep.is_free" class="free-badge">{{ $t('reelshort.free') }}</span>
              <span v-else class="coin-badge">{{ $t('reelshort.coins', { count: ep.coin_cost }) }}</span>
              <span class="ep-dur">{{ Math.floor(ep.duration_seconds / 60) }}:{{ String(ep.duration_seconds % 60).padStart(2, '0') }}</span>
            </div>
          </NuxtLink>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.detail-root { min-height: 100vh; background: #f8fafc; color: #0f172a; }
.detail-header { padding: 16px 24px; }
.back-link { color: #6366f1; text-decoration: none; font-size: 14px; }
.loading { text-align: center; padding: 100px; color: #94a3b8; }

.hero { position: relative; padding: 40px 24px; background-size: cover; background-position: center; }
.hero-overlay { position: absolute; inset: 0; background: linear-gradient(to top, #f8fafc 0%, rgba(248,250,252,0.6) 50%, rgba(248,250,252,0.3) 100%); }
.hero-content { position: relative; z-index: 1; max-width: 900px; margin: 0 auto; display: flex; gap: 32px; align-items: flex-start; }
.hero-cover { width: 180px; border-radius: 12px; box-shadow: 0 12px 40px rgba(0,0,0,0.08); flex-shrink: 0; }
.hero-info { flex: 1; }
.hero-title { font-size: 1.75rem; font-weight: 800; margin-bottom: 8px; }
.hero-meta { display: flex; gap: 16px; font-size: 13px; color: #475569; margin-bottom: 12px; }
.hero-desc { color: #475569; line-height: 1.6; font-size: 14px; margin-bottom: 12px; }
.tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px; }
.tag { padding: 4px 10px; border-radius: 9999px; font-size: 11px; background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
.hero-actions { display: flex; gap: 12px; }
.watch-btn { padding: 12px 28px; border-radius: 10px; font-size: 15px; font-weight: 700; color: #fff; background: linear-gradient(135deg, #6366f1, #4f46e5); text-decoration: none; box-shadow: 0 4px 20px rgba(99,102,241,0.25); }
.fav-btn { padding: 12px 20px; border-radius: 10px; font-size: 14px; background: #ffffff; border: 1px solid #e2e8f0; color: #475569; cursor: pointer; }
.fav-btn.active { color: #dc2626; border-color: #fecaca; background: #fef2f2; }

.episodes-section { max-width: 900px; margin: 0 auto; padding: 32px 24px; }
.section-title { font-size: 1.25rem; font-weight: 700; margin-bottom: 16px; }
.episode-list { display: flex; flex-direction: column; gap: 8px; }
.episode-item { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 10px; background: #ffffff; border: 1px solid #e2e8f0; text-decoration: none; color: inherit; transition: all 0.15s; }
.episode-item:hover { background: #f1f5f9; border-color: #cbd5e1; }
.ep-thumb { width: 80px; height: 45px; object-fit: cover; border-radius: 6px; flex-shrink: 0; }
.ep-info { flex: 1; min-width: 0; }
.ep-num { font-size: 12px; color: #6366f1; font-weight: 600; display: block; }
.ep-title { font-size: 13px; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
.ep-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.free-badge { font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px; background: #dcfce7; color: #16a34a; }
.coin-badge { font-size: 11px; color: #d97706; }
.ep-dur { font-size: 11px; color: #94a3b8; font-family: monospace; }
@media (max-width: 640px) { .hero-content { flex-direction: column; align-items: center; text-align: center; } .hero-cover { width: 140px; } }
</style>
