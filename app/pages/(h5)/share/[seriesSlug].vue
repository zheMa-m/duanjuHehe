<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'

const { t } = useI18n()
const route = useRoute()
const slug = computed(() => route.params.seriesSlug as string)

useAppSEO({
  title: () => series.value?.title || 'Series — ReelShort',
  description: () => series.value?.description || '',
})

const series = ref<any>(null)
const loading = ref(true)

async function fetchData() {
  loading.value = true
  try {
    const res = await $fetch<any>(`/api/v1/series/${slug.value}`)
    series.value = res.data
  } catch (_) { series.value = null } finally { loading.value = false }
}

onMounted(fetchData)
</script>

<template>
  <div class="share-root">
    <div v-if="loading" class="share-loading">{{ $t('common.loading') }}</div>
    <div v-else-if="!series" class="share-loading">{{ $t('reelshort.notFound') }}</div>
    <template v-else>
      <!-- Hero -->
      <section class="share-hero">
        <img :src="series.cover_image" :alt="series.title" class="share-cover" />
        <span class="share-badge">{{ $t('reelshort.bingeBadge') }}</span>
        <h1 class="share-title">{{ series.title }}</h1>
        <div class="share-meta">
          <span>⭐ {{ series.rating || '4.5' }}</span>
          <span>{{ series.total_episodes }} {{ $t('reelshort.episodes') }}</span>
          <span>{{ $t('reelshort.freeNote', { count: series.free_episodes || 5 }) }}</span>
        </div>
        <p class="share-desc">{{ series.description || $t('reelshort.heroDesc') }}</p>
        <NuxtLink :to="`/watch/${series.slug}/1`" class="share-cta">
          {{ $t('reelshort.startWatching') }}
        </NuxtLink>
      </section>

      <!-- Episodes Preview -->
      <section class="share-episodes" v-if="series.episodes?.length">
        <h2 class="share-section-title">{{ $t('reelshort.episodes') }}</h2>
        <div class="share-ep-list">
          <div v-for="ep in series.episodes.slice(0, 5)" :key="ep.id" class="share-ep-item">
            <span class="share-ep-num">{{ ep.episode_number }}</span>
            <span class="share-ep-title">{{ ep.title || `Episode ${ep.episode_number}` }}</span>
            <span v-if="ep.is_free" class="share-free-tag">{{ $t('reelshort.free') }}</span>
            <span v-else class="share-coin-tag">🪙 {{ ep.coin_cost || 0 }}</span>
          </div>
        </div>
      </section>

      <!-- Download CTA -->
      <section class="share-cta-section">
        <h2>{{ $t('reelshort.downloadApp') }}</h2>
        <p>{{ $t('reelshort.downloadAppDescription') || 'Get the full experience on the ReelShort app' }}</p>
        <div class="share-store-btns">
          <a href="#" class="share-store-btn">{{ $t('reelshort.appStore') }}</a>
          <a href="#" class="share-store-btn">{{ $t('reelshort.googlePlay') }}</a>
        </div>
      </section>

      <footer class="share-footer">
        <NuxtLink to="/" class="share-back">🎬 {{ $t('reelshort.siteName') }}</NuxtLink>
      </footer>
    </template>
  </div>
</template>

<style scoped>
.share-root { min-height: 100dvh; background: #f8fafc; color: #0f172a; font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; }
.share-loading { text-align: center; padding: 80px 24px; color: #94a3b8; }

.share-hero { text-align: center; padding: 40px 24px; display: flex; flex-direction: column; align-items: center; }
.share-cover { width: 200px; border-radius: 16px; box-shadow: 0 16px 48px rgba(0,0,0,0.1); margin-bottom: 20px; }
.share-badge { display: inline-block; padding: 6px 14px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; background: #fef9c3; color: #a16207; margin-bottom: 12px; }
.share-title { font-size: 1.5rem; font-weight: 800; margin-bottom: 8px; }
.share-meta { display: flex; gap: 12px; font-size: 0.8125rem; color: #475569; margin-bottom: 12px; flex-wrap: wrap; justify-content: center; }
.share-desc { font-size: 0.875rem; color: #475569; line-height: 1.6; max-width: 360px; margin-bottom: 20px; }
.share-cta { display: inline-block; padding: 14px 40px; border-radius: 12px; font-size: 1rem; font-weight: 700; color: #fff; background: linear-gradient(135deg, #6366f1, #4f46e5); text-decoration: none; box-shadow: 0 4px 16px rgba(99,102,241,0.25); }

.share-episodes { padding: 24px; }
.share-section-title { font-size: 1.125rem; font-weight: 700; margin-bottom: 12px; }
.share-ep-list { display: flex; flex-direction: column; gap: 8px; }
.share-ep-item { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; }
.share-ep-num { width: 28px; height: 28px; border-radius: 6px; background: #eef2ff; color: #6366f1; font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.share-ep-title { flex: 1; font-size: 0.875rem; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.share-free-tag { font-size: 0.6875rem; font-weight: 700; padding: 3px 8px; border-radius: 4px; background: #dcfce7; color: #16a34a; }
.share-coin-tag { font-size: 0.6875rem; font-weight: 600; color: #d97706; }

.share-cta-section { text-align: center; padding: 40px 24px; background: #ffffff; border-top: 1px solid #e8ecf1; }
.share-cta-section h2 { font-size: 1.125rem; font-weight: 700; margin-bottom: 8px; }
.share-cta-section p { font-size: 0.875rem; color: #475569; margin-bottom: 20px; }
.share-store-btns { display: flex; gap: 10px; justify-content: center; }
.share-store-btn { padding: 12px 24px; border-radius: 10px; font-size: 0.875rem; font-weight: 600; background: #f1f5f9; border: 1px solid #e2e8f0; color: #0f172a; text-decoration: none; }

.share-footer { text-align: center; padding: 24px; }
.share-back { color: #6366f1; text-decoration: none; font-size: 0.875rem; font-weight: 500; }
</style>
