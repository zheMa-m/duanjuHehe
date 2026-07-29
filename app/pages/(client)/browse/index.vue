<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const { t } = useI18n()
const route = useRoute()
useAppSEO({ title: () => `${t('reelshort.browse')} — ReelShort`, description: () => t('reelshort.heroDesc') })

const series = ref<any[]>([])
const genres = ref<any[]>([])
const loading = ref(true)
const page = ref(1)
const total = ref(0)
const selectedGenre = ref((route.query.genre as string) || '')
const searchQuery = ref('')

async function fetchData() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    params.set('page', String(page.value))
    params.set('pageSize', '24')
    if (selectedGenre.value) params.set('genre', selectedGenre.value)
    if (searchQuery.value) params.set('search', searchQuery.value)
    const [sRes, gRes] = await Promise.all([
      $fetch<any>(`/api/v1/series?${params}`),
      $fetch<any>('/api/v1/genres'),
    ])
    series.value = sRes.data?.items || []
    total.value = sRes.data?.pagination?.total || 0
    genres.value = gRes.data?.items || []
  } catch (_) {} finally { loading.value = false }
}

watch(selectedGenre, () => { page.value = 1; fetchData() })
onMounted(fetchData)
function search() { page.value = 1; fetchData() }
</script>

<template>
  <div class="browse-root">
    <header class="browse-header">
      <div class="header-inner">
        <NuxtLink to="/" class="back-link">← {{ $t('reelshort.siteName') }}</NuxtLink>
        <h1 class="page-title">{{ $t('reelshort.browse') }}</h1>
        <div class="header-right">
          <input v-model="searchQuery" @keyup.enter="search" :placeholder="$t('reelshort.search')" class="search-input" />
        </div>
      </div>
    </header>

    <div class="genre-bar">
      <div class="genre-inner">
        <button :class="['genre-chip', !selectedGenre && 'active']" @click="selectedGenre = ''">{{ $t('reelshort.all') }}</button>
        <button v-for="g in genres" :key="g.id" :class="['genre-chip', selectedGenre === g.id && 'active']" @click="selectedGenre = g.id">{{ g.name }}</button>
      </div>
    </div>

    <div class="grid-section">
      <div v-if="loading" class="loading-text">{{ $t('reelshort.loading') }}</div>
      <div v-else class="series-grid">
        <NuxtLink v-for="s in series" :key="s.id" :to="`/series/${s.slug}`" class="series-card">
          <img :src="s.cover_image" :alt="s.title" class="card-cover" loading="lazy" />
          <div class="card-info">
            <h3 class="card-title">{{ s.title }}</h3>
            <div class="card-meta">
              <span>⭐ {{ s.rating || '—' }}</span>
              <span>{{ s.total_episodes }} eps</span>
            </div>
            <span v-if="s.is_featured" class="featured-badge">Featured</span>
          </div>
        </NuxtLink>
        <div v-if="series.length === 0 && !loading" class="empty-text">{{ $t('reelshort.notFound') }}</div>
      </div>

      <div v-if="total > 24" class="pagination">
        <button :disabled="page <= 1" @click="page--; fetchData()">{{ $t('reelshort.prev') }}</button>
        <span>{{ $t('reelshort.page', { page }) }}</span>
        <button :disabled="page * 24 >= total" @click="page++; fetchData()">{{ $t('reelshort.next') }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.browse-root { min-height: 100vh; background: #050510; color: #f1f5f9; }
.browse-header { position: sticky; top: 0; z-index: 50; background: rgba(5,5,16,0.9); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(255,255,255,0.05); }
.header-inner { max-width: 1200px; margin: 0 auto; padding: 0 24px; height: 56px; display: flex; align-items: center; gap: 16px; }
.back-link { color: #818cf8; text-decoration: none; font-size: 14px; font-weight: 500; }
.page-title { font-size: 18px; font-weight: 700; flex-shrink: 0; }
.header-right { margin-left: auto; }
.search-input { padding: 8px 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04); color: #e2e8f0; font-size: 13px; outline: none; width: 200px; }
.search-input:focus { border-color: rgba(99,102,241,0.4); }

.genre-bar { padding: 12px 24px; border-bottom: 1px solid rgba(255,255,255,0.04); overflow-x: auto; }
.genre-inner { max-width: 1200px; margin: 0 auto; display: flex; gap: 8px; }
.genre-chip { padding: 6px 16px; border-radius: 9999px; font-size: 13px; font-weight: 500; color: #94a3b8; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); cursor: pointer; white-space: nowrap; transition: all 0.2s; }
.genre-chip:hover { color: #e2e8f0; background: rgba(255,255,255,0.06); }
.genre-chip.active { color: #a5b4fc; background: rgba(99,102,241,0.15); border-color: rgba(99,102,241,0.3); }

.grid-section { max-width: 1200px; margin: 0 auto; padding: 24px; }
.loading-text, .empty-text { text-align: center; padding: 60px; color: #64748b; }
.series-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 16px; }
.series-card { display: block; text-decoration: none; color: inherit; border-radius: 10px; overflow: hidden; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); transition: all 0.2s; }
.series-card:hover { transform: translateY(-3px); border-color: rgba(99,102,241,0.3); }
.card-cover { width: 100%; aspect-ratio: 2/3; object-fit: cover; }
.card-info { padding: 10px; }
.card-title { font-size: 12px; font-weight: 600; color: #e2e8f0; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.card-meta { display: flex; gap: 8px; font-size: 11px; color: #64748b; margin-top: 4px; }
.featured-badge { display: inline-block; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: rgba(250,204,21,0.15); color: #facc15; margin-top: 4px; }

.pagination { display: flex; justify-content: center; align-items: center; gap: 16px; margin-top: 32px; padding-bottom: 40px; }
.pagination button { padding: 8px 20px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04); color: #94a3b8; cursor: pointer; font-size: 13px; }
.pagination button:hover:not(:disabled) { color: #e2e8f0; background: rgba(255,255,255,0.08); }
.pagination button:disabled { opacity: 0.3; cursor: default; }
.pagination span { font-size: 13px; color: #64748b; }
</style>
