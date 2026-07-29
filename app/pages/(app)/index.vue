<script setup lang="ts">
import { onMounted, ref } from 'vue'

definePageMeta({ layout: 'app' })

const { t } = useI18n()
const { user, isLoggedIn } = useAuth()

useAppSEO({ title: () => 'ReelShort App', description: () => 'Bite-sized vertical series. Watch free, unlock with coins.' })

const trendingSeries = ref<any[]>([])
const featuredSeries = ref<any[]>([])
const genres = ref<any[]>([])
const continueWatching = ref<any[]>([])
const loading = ref(true)

async function fetchData() {
  try {
    const [trendRes, featRes, genreRes] = await Promise.all([
      $fetch<any>('/api/v1/discover?type=trending&limit=10'),
      $fetch<any>('/api/v1/discover?type=featured&limit=6'),
      $fetch<any>('/api/v1/genres'),
    ])
    trendingSeries.value = trendRes.data?.items || []
    featuredSeries.value = featRes.data?.items || []
    genres.value = genreRes.data?.items || []

    if (isLoggedIn.value) {
      try {
        const cRes = await $fetch<any>('/api/v1/watch/continue')
        continueWatching.value = cRes.data?.items || []
      } catch (_) {}
    }
  } catch (_) {} finally { loading.value = false }
}

onMounted(fetchData)
</script>

<template>
  <div class="app-home">
    <!-- Header -->
    <header class="app-header">
      <h1 class="app-header-title">🎬 ReelShort</h1>
    </header>

    <div v-if="loading" class="app-loading">{{ $t('common.loading') }}</div>
    <template v-else>
      <!-- Continue Watching -->
      <section v-if="continueWatching.length" class="app-section">
        <h2 class="app-section-title">Continue Watching</h2>
        <div class="app-scroll-row">
          <NuxtLink v-for="item in continueWatching" :key="item.id"
            :to="`/app/watch/${item.series?.slug || ''}/${item.episode_number || 1}`"
            class="app-continue-card">
            <img :src="item.series?.cover_image || ''" :alt="item.series?.title" class="app-continue-cover" />
            <div class="app-progress-bar"><div class="app-progress-fill" :style="{ width: ((item.progress_seconds / (item.duration_seconds || 1)) * 100) + '%' }" /></div>
            <span class="app-continue-title">{{ item.series?.title || '' }}</span>
          </NuxtLink>
        </div>
      </section>

      <!-- Featured -->
      <section class="app-section">
        <h2 class="app-section-title">⭐ Featured</h2>
        <div class="app-scroll-row">
          <NuxtLink v-for="s in featuredSeries" :key="s.id" :to="`/app/series/${s.slug}`" class="app-featured-card">
            <img :src="s.cover_image" :alt="s.title" class="app-featured-cover" />
            <span class="app-featured-title">{{ s.title }}</span>
          </NuxtLink>
        </div>
      </section>

      <!-- Genres -->
      <section class="app-section">
        <h2 class="app-section-title">{{ $t('reelshort.exploreGenres') }}</h2>
        <div class="app-genres-row">
          <NuxtLink v-for="g in genres.slice(0, 6)" :key="g.id" :to="`/app/browse?genre=${g.id}`" class="app-genre-pill">
            <span>{{ g.icon || '🎭' }}</span>
            <span>{{ g.name }}</span>
          </NuxtLink>
        </div>
      </section>

      <!-- Trending Grid -->
      <section class="app-section">
        <h2 class="app-section-title">{{ $t('reelshort.trendingNow') }}</h2>
        <div class="app-grid">
          <NuxtLink v-for="s in trendingSeries" :key="s.id" :to="`/app/series/${s.slug}`" class="app-grid-card">
            <img :src="s.cover_image" :alt="s.title" class="app-grid-cover" />
            <div class="app-grid-info">
              <span class="app-grid-title">{{ s.title }}</span>
              <span class="app-grid-meta">⭐ {{ s.rating || '4.5' }}</span>
            </div>
          </NuxtLink>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.app-home { padding: 0 0 20px; }
.app-header { padding: 16px 20px 8px; }
.app-header-title { font-size: 1.25rem; font-weight: 800; }
.app-loading { text-align: center; padding: 80px 20px; color: #94a3b8; }

.app-section { padding: 16px 20px; }
.app-section-title { font-size: 1rem; font-weight: 700; margin-bottom: 12px; }

/* Scroll rows */
.app-scroll-row { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 4px; scroll-snap-type: x mandatory; }
.app-scroll-row > * { scroll-snap-align: start; flex-shrink: 0; }

/* Continue Watching */
.app-continue-card { width: 140px; text-decoration: none; color: inherit; }
.app-continue-cover { width: 100%; aspect-ratio: 2/3; object-fit: cover; border-radius: 10px; }
.app-progress-bar { height: 3px; background: #e2e8f0; border-radius: 2px; margin-top: 6px; }
.app-progress-fill { height: 100%; background: #6366f1; border-radius: 2px; }
.app-continue-title { font-size: 0.75rem; color: #475569; margin-top: 4px; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* Featured */
.app-featured-card { width: 120px; text-decoration: none; color: inherit; }
.app-featured-cover { width: 100%; aspect-ratio: 2/3; object-fit: cover; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
.app-featured-title { font-size: 0.75rem; color: #0f172a; font-weight: 600; margin-top: 4px; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* Genres */
.app-genres-row { display: flex; gap: 8px; flex-wrap: wrap; }
.app-genre-pill { display: flex; align-items: center; gap: 4px; padding: 8px 14px; border-radius: 9999px; background: #f1f5f9; border: 1px solid #e2e8f0; text-decoration: none; font-size: 0.75rem; font-weight: 500; color: #475569; }

/* Grid */
.app-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.app-grid-card { text-decoration: none; color: inherit; }
.app-grid-cover { width: 100%; aspect-ratio: 2/3; object-fit: cover; border-radius: 8px; }
.app-grid-info { padding: 4px 0; }
.app-grid-title { font-size: 0.6875rem; font-weight: 600; color: #0f172a; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.app-grid-meta { font-size: 0.625rem; color: #94a3b8; }
</style>
