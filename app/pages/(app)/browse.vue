<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
definePageMeta({ layout: 'app' })

const { t } = useI18n()
useAppSEO({ title: () => `${t('reelshort.browse')} — ReelShort`, description: () => '' })

const series = ref<any[]>([])
const genres = ref<any[]>([])
const loading = ref(true)
const page = ref(1)
const total = ref(0)
const selectedGenre = ref('')
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
  <div class="app-browse">
    <header class="app-header">
      <h1 class="app-header-title">{{ $t('reelshort.browse') }}</h1>
      <input v-model="searchQuery" @keyup.enter="search" :placeholder="$t('reelshort.search')" class="app-search" />
    </header>

    <div class="app-genre-scroll">
      <button :class="['app-chip', !selectedGenre && 'active']" @click="selectedGenre = ''">{{ $t('reelshort.all') }}</button>
      <button v-for="g in genres" :key="g.id" :class="['app-chip', selectedGenre === g.id && 'active']" @click="selectedGenre = g.id">{{ g.name }}</button>
    </div>

    <div v-if="loading" class="app-loading">{{ $t('common.loading') }}</div>
    <div v-else class="app-grid">
      <NuxtLink v-for="s in series" :key="s.id" :to="`/app/series/${s.slug}`" class="app-grid-card">
        <img :src="s.cover_image" :alt="s.title" class="app-grid-cover" />
        <div class="app-grid-info">
          <span class="app-grid-title">{{ s.title }}</span>
          <span class="app-grid-meta">⭐ {{ s.rating || '—' }} · {{ s.total_episodes }} eps</span>
        </div>
      </NuxtLink>
    </div>
    <div v-if="!loading && series.length === 0" class="app-empty">{{ $t('reelshort.notFound') }}</div>

    <div v-if="total > 24" class="app-pagination">
      <button :disabled="page <= 1" @click="page--; fetchData()">{{ $t('reelshort.prev') }}</button>
      <span>{{ $t('reelshort.page', { page }) }}</span>
      <button :disabled="page * 24 >= total" @click="page++; fetchData()">{{ $t('reelshort.next') }}</button>
    </div>
  </div>
</template>

<style scoped>
.app-browse { padding: 0 0 20px; }
.app-header { padding: 16px 20px 8px; }
.app-header-title { font-size: 1.25rem; font-weight: 800; margin-bottom: 8px; }
.app-search { width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid #cbd5e1; background: #ffffff; font-size: 0.875rem; color: #0f172a; outline: none; }
.app-search:focus { border-color: #6366f1; }

.app-genre-scroll { display: flex; gap: 6px; padding: 12px 20px; overflow-x: auto; }
.app-chip { padding: 6px 14px; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; color: #475569; background: #f1f5f9; border: 1px solid #e2e8f0; cursor: pointer; white-space: nowrap; }
.app-chip.active { color: #6366f1; background: #eef2ff; border-color: #c7d2fe; }

.app-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; padding: 0 20px; }
.app-grid-card { text-decoration: none; color: inherit; }
.app-grid-cover { width: 100%; aspect-ratio: 2/3; object-fit: cover; border-radius: 8px; }
.app-grid-info { padding: 4px 0; }
.app-grid-title { font-size: 0.6875rem; font-weight: 600; color: #0f172a; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.app-grid-meta { font-size: 0.625rem; color: #94a3b8; }

.app-loading, .app-empty { text-align: center; padding: 40px; color: #94a3b8; font-size: 0.875rem; }
.app-pagination { display: flex; justify-content: center; gap: 12px; padding: 16px; }
.app-pagination button { padding: 8px 16px; border-radius: 8px; border: 1px solid #cbd5e1; background: #fff; font-size: 0.75rem; cursor: pointer; color: #475569; }
.app-pagination button:disabled { opacity: 0.3; }
.app-pagination span { font-size: 0.75rem; color: #94a3b8; align-self: center; }
</style>
