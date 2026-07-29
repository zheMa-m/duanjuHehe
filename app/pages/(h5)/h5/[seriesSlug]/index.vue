<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'

const { t } = useI18n()
const route = useRoute()
const slug = computed(() => route.params.seriesSlug as string)
const series = ref<any>(null)
const loading = ref(true)

useAppSEO({
  title: () => series.value?.title ? `${series.value.title} — ${t('reelshort.siteName')}` : 'Series — ReelShort',
  description: () => series.value?.description || '',
})

async function fetchData() {
  try {
    const res = await $fetch<any>(`/api/v1/series/${slug.value}`)
    series.value = res.data
  } catch (_) {} finally { loading.value = false }
}

onMounted(fetchData)
</script>

<template>
  <div class="h5-root">
    <div v-if="loading" class="loading">{{ $t('reelshort.loading') }}</div>
    <div v-else-if="!series" class="loading">{{ $t('reelshort.notFound') }}</div>

    <template v-else>
      <div class="h5-hero">
        <div class="hero-badge">{{ $t('reelshort.bingeBadge') }}</div>
        <img :src="series.cover_image" :alt="series.title" class="h5-cover" />
        <h1 class="h5-title">{{ series.title }}</h1>
        <div class="h5-meta">
          <span>⭐ {{ series.rating || '4.5' }}</span>
          <span>{{ series.total_episodes }} {{ $t('reelshort.episodes') }}</span>
        </div>
        <p class="h5-desc">{{ series.description }}</p>
        <div class="h5-tags" v-if="series.tags?.length">
          <span v-for="tag in series.tags" :key="tag" class="h5-tag">{{ tag }}</span>
        </div>
        <a :href="`/watch/${series.slug}/1`" class="h5-cta">{{ $t('reelshort.startWatching') }}</a>
        <p class="h5-free-note">{{ $t('reelshort.freeNote', { count: series.free_episodes }) }}</p>
      </div>

      <div class="h5-episodes">
        <h2>{{ $t('reelshort.episodes') }}</h2>
        <div class="h5-ep-list">
          <div v-for="ep in series.episodes?.slice(0, 6)" :key="ep.id" class="h5-ep-item">
            <span class="ep-num">Ep {{ ep.episode_number }}</span>
            <span class="ep-title">{{ ep.title }}</span>
            <span v-if="ep.is_free" class="free-tag">{{ $t('reelshort.free') }}</span>
            <span v-else class="paid-tag">{{ $t('reelshort.coins', { count: ep.coin_cost }) }}</span>
          </div>
        </div>
      </div>

      <div class="h5-footer">
        <p>{{ $t('reelshort.downloadApp') }}</p>
        <div class="store-btns">
          <button class="store-btn">{{ $t('reelshort.appStore') }}</button>
          <button class="store-btn">{{ $t('reelshort.googlePlay') }}</button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.h5-root { min-height: 100dvh; background: #020617; color: #f1f5f9; font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; }
.loading { text-align: center; padding: 80px 24px; color: #64748b; }

.h5-hero { text-align: center; padding: 40px 24px 32px; display: flex; flex-direction: column; align-items: center; }
.hero-badge { display: inline-block; padding: 6px 16px; border-radius: 9999px; font-size: 12px; font-weight: 600; background: rgba(245,158,11,0.15); color: #fbbf24; margin-bottom: 20px; }
.h5-cover { width: 180px; border-radius: 16px; box-shadow: 0 16px 48px rgba(0,0,0,0.6); margin-bottom: 20px; }
.h5-title { font-size: 1.5rem; font-weight: 800; margin-bottom: 8px; }
.h5-meta { display: flex; gap: 12px; font-size: 13px; color: #94a3b8; margin-bottom: 12px; }
.h5-desc { color: #94a3b8; font-size: 13px; line-height: 1.6; max-width: 360px; margin-bottom: 12px; }
.h5-tags { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-bottom: 20px; }
.h5-tag { padding: 4px 10px; border-radius: 9999px; font-size: 11px; background: rgba(255,255,255,0.06); color: #94a3b8; border: 1px solid rgba(255,255,255,0.08); }
.h5-cta { display: block; padding: 14px 40px; border-radius: 12px; font-size: 16px; font-weight: 700; color: #fff; background: linear-gradient(135deg, #6366f1, #8b5cf6); text-decoration: none; margin-bottom: 8px; }
.h5-free-note { font-size: 12px; color: #22c55e; }

.h5-episodes { padding: 24px; }
.h5-episodes h2 { font-size: 1.1rem; font-weight: 700; margin-bottom: 12px; }
.h5-ep-list { display: flex; flex-direction: column; gap: 8px; }
.h5-ep-item { display: flex; align-items: center; gap: 10px; padding: 12px; border-radius: 10px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.04); }
.ep-num { font-size: 12px; color: #818cf8; font-weight: 600; }
.ep-title { flex: 1; font-size: 13px; color: #e2e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.free-tag { font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px; background: rgba(34,197,94,0.15); color: #22c55e; }
.paid-tag { font-size: 11px; color: #fbbf24; }

.h5-footer { text-align: center; padding: 32px 24px; border-top: 1px solid rgba(255,255,255,0.04); }
.h5-footer p { font-size: 13px; color: #64748b; margin-bottom: 12px; }
.store-btns { display: flex; gap: 10px; justify-content: center; }
.store-btn { padding: 10px 20px; border-radius: 10px; font-size: 13px; font-weight: 600; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); color: #e2e8f0; cursor: pointer; }
</style>
