<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'

const { t } = useI18n()
const route = useRoute()
const slug = computed(() => route.params.seriesSlug as string)
const series = ref<any>(null)
const loading = ref(true)

useAppSEO({
  title: () => series.value?.title || 'Series — ReelShort',
  description: () => series.value?.description || '',
})

async function fetchData() {
  loading.value = true
  try { const res = await $fetch<any>(`/api/v1/series/${slug.value}`); series.value = res.data } catch (_) { series.value = null } finally { loading.value = false }
}

onMounted(fetchData)
</script>

<template>
  <div class="share-root">
    <div v-if="loading" class="loading-wrap"><div class="spinner" />{{ $t('reelshort.loading') }}</div>
    <div v-else-if="!series" class="loading-wrap">{{ $t('reelshort.notFound') }}</div>
    <template v-else>
      <div class="hero">
        <div class="hero-bg">
          <img :src="series.cover_image" :alt="series.title" class="hero-bg-img" />
          <div class="hero-overlay" />
        </div>
        <div class="hero-body">
          <span class="hero-badge">🔥 {{ $t('reelshort.bingeBadge') }}</span>
          <img :src="series.cover_image" :alt="series.title" class="hero-cover" />
          <h1 class="hero-title">{{ series.title }}</h1>
          <div class="hero-meta">
            <span>⭐ {{ series.rating || '4.8' }}</span>
            <span>·</span>
            <span>{{ series.total_episodes }} 集</span>
            <span>·</span>
            <span>全部免费</span>
          </div>
          <div class="hero-tags" v-if="series.tags?.length">
            <span v-for="tag in series.tags" :key="tag" class="hero-tag">{{ tag }}</span>
          </div>
          <p class="hero-desc">{{ series.description?.slice(0, 100) }}{{ series.description?.length > 100 ? '...' : '' }}</p>
          <NuxtLink :to="`/watch/${series.slug}/1`" class="hero-cta">
            ▶ {{ $t('reelshort.startWatching') }}
          </NuxtLink>
        </div>
      </div>

      <div class="eps-section" v-if="series.episodes?.length">
        <div class="eps-header">
          <h2 class="eps-title">📋 {{ $t('reelshort.episodes') }}</h2>
          <span class="eps-count">共 {{ series.total_episodes }} 集</span>
        </div>
        <div class="eps-list">
          <a v-for="ep in series.episodes.slice(0, 5)" :key="ep.id"
            :href="`/watch/${series.slug}/${ep.episode_number}`"
            class="ep-card">
            <span class="ep-num">{{ ep.episode_number }}</span>
            <span class="ep-name">{{ ep.title }}</span>
            <span :class="ep.is_free ? 'ep-badge free' : 'ep-badge paid'">
              {{ ep.is_free ? $t('reelshort.free') : '🪙' + ep.coin_cost }}
            </span>
          </a>
        </div>
      </div>

      <footer class="share-footer">
        <NuxtLink to="/" class="share-brand">🎬 {{ $t('reelshort.siteName') }}</NuxtLink>
        <p class="share-tagline">{{ $t('reelshort.tagline') }}</p>
      </footer>
    </template>
  </div>
</template>

<style scoped>
.share-root { min-height: 100dvh; background: #0a0a14; color: #e2e8f0; font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; }
.loading-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; gap: 12px; color: #64748b; font-size: 14px; }
.spinner { width: 32px; height: 32px; border: 3px solid #1e293b; border-top-color: #6366f1; border-radius: 50%; animation: spin 0.6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.hero { position: relative; overflow: hidden; }
.hero-bg { position: absolute; inset: 0; }
.hero-bg-img { width: 100%; height: 100%; object-fit: cover; filter: blur(40px) brightness(0.25) saturate(0.5); transform: scale(1.1); }
.hero-overlay { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(10,10,20,0.3), rgba(10,10,20,0.95)); }
.hero-body { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; padding: 48px 24px 36px; text-align: center; }
.hero-badge { display: inline-flex; padding: 5px 14px; border-radius: 9999px; font-size: 11px; font-weight: 700; background: rgba(245,158,11,0.15); color: #fbbf24; border: 1px solid rgba(245,158,11,0.25); margin-bottom: 24px; }
.hero-cover { width: 160px; height: 224px; object-fit: cover; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 0 2px rgba(255,255,255,0.06); margin-bottom: 20px; }
.hero-title { font-size: 1.5rem; font-weight: 900; color: #fff; margin-bottom: 10px; line-height: 1.3; }
.hero-meta { display: flex; gap: 6px; font-size: 12px; color: #94a3b8; margin-bottom: 12px; }
.hero-tags { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-bottom: 14px; }
.hero-tag { padding: 4px 10px; border-radius: 6px; font-size: 10px; font-weight: 600; background: rgba(255,255,255,0.06); color: #94a3b8; border: 1px solid rgba(255,255,255,0.06); }
.hero-desc { font-size: 13px; color: #94a3b8; line-height: 1.7; max-width: 360px; margin-bottom: 24px; }
.hero-cta { display: inline-flex; align-items: center; gap: 6px; padding: 14px 48px; border-radius: 14px; font-size: 16px; font-weight: 800; color: #fff; background: linear-gradient(135deg, #6366f1, #8b5cf6); text-decoration: none; box-shadow: 0 8px 32px rgba(99,102,241,0.4); transition: all 0.2s; }
.hero-cta:hover { transform: translateY(-2px); }

.eps-section { padding: 28px 20px; }
.eps-header { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 14px; }
.eps-title { font-size: 1.1rem; font-weight: 800; color: #f1f5f9; }
.eps-count { font-size: 12px; color: #64748b; }
.eps-list { display: flex; flex-direction: column; gap: 8px; }
.ep-card { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); text-decoration: none; color: inherit; transition: all 0.15s; }
.ep-card:hover { background: rgba(255,255,255,0.06); }
.ep-num { width: 28px; height: 28px; border-radius: 8px; background: rgba(99,102,241,0.15); color: #a5b4fc; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ep-name { flex: 1; font-size: 13px; font-weight: 600; color: #e2e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ep-badge { padding: 4px 10px; border-radius: 6px; font-size: 10px; font-weight: 700; flex-shrink: 0; }
.ep-badge.free { background: rgba(34,197,94,0.12); color: #22c55e; }
.ep-badge.paid { background: rgba(245,158,11,0.12); color: #f59e0b; }

.share-footer { text-align: center; padding: 32px 24px; border-top: 1px solid rgba(255,255,255,0.04); }
.share-brand { color: #94a3b8; text-decoration: none; font-size: 15px; font-weight: 700; }
.share-tagline { font-size: 12px; color: #475569; margin-top: 4px; }
</style>
