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

const formattedViews = computed(() => {
  const v = series.value?.view_count || 0
  if (v >= 10000) return (v / 10000).toFixed(1) + '万'
  return v.toLocaleString()
})

onMounted(fetchData)
</script>

<template>
  <div class="h5-root">
    <div v-if="loading" class="loading-wrap"><div class="spinner" />加载中...</div>
    <div v-else-if="!series" class="loading-wrap">未找到该剧集</div>

    <template v-else>
      <!-- ═══════════ HERO ═══════════ -->
      <div class="hero">
        <div class="hero-bg">
          <img :src="series.cover_image" :alt="series.title" class="hero-bg-img" />
          <div class="hero-overlay" />
        </div>
        <div class="hero-body">
          <span class="hero-badge">🔥 {{ $t('reelshort.bingeBadge') }}</span>
          <img :src="series.cover_image" :alt="series.title" class="hero-cover" />
          <h1 class="hero-title">{{ series.title }}</h1>
          <div class="hero-stats">
            <span class="stat">⭐ {{ series.rating || '4.8' }}</span>
            <span class="stat-dot">·</span>
            <span class="stat">📺 {{ formattedViews }} 观看</span>
            <span class="stat-dot">·</span>
            <span class="stat">🎬 {{ series.total_episodes }} 集</span>
          </div>
          <div class="hero-tags" v-if="series.tags?.length">
            <span v-for="tag in series.tags" :key="tag" class="hero-tag">{{ tag }}</span>
          </div>
          <p class="hero-desc">{{ series.description?.slice(0, 120) }}{{ series.description?.length > 120 ? '...' : '' }}</p>
          <a :href="`/watch/${series.slug}/1`" class="hero-cta">
            <span class="cta-icon">▶</span>
            {{ $t('reelshort.startWatching') }}
          </a>
          <p class="hero-free">🎉 {{ $t('reelshort.freeNote', { count: series.free_episodes || 999 }) }}</p>
        </div>
      </div>

      <!-- ═══════════ EPISODES ═══════════ -->
      <div class="eps-section">
        <div class="eps-header">
          <h2 class="eps-title">📋 {{ $t('reelshort.episodes') }}</h2>
          <span class="eps-count">共 {{ series.total_episodes }} 集</span>
        </div>
        <div class="eps-list">
          <a v-for="ep in series.episodes?.slice(0, 10)" :key="ep.id"
            :href="`/watch/${series.slug}/${ep.episode_number}`"
            class="ep-card">
            <div class="ep-thumb-wrap">
              <img v-if="ep.thumbnail_url" :src="ep.thumbnail_url" class="ep-thumb" />
              <div v-else class="ep-thumb-placeholder">🎬</div>
              <div class="ep-play">▶</div>
              <span class="ep-num-badge">EP {{ ep.episode_number }}</span>
            </div>
            <div class="ep-info">
              <span class="ep-name">{{ ep.title }}</span>
              <span class="ep-duration">{{ Math.floor(ep.duration_seconds / 60) }}:{{ String(ep.duration_seconds % 60).padStart(2, '0') }}</span>
            </div>
            <span :class="ep.is_free ? 'ep-badge free' : 'ep-badge paid'">
              {{ ep.is_free ? $t('reelshort.free') : '🪙 ' + ep.coin_cost }}
            </span>
          </a>
        </div>
      </div>

      <!-- ═══════════ FOOTER ═══════════ -->
      <div class="h5-footer">
        <p class="footer-brand">🎬 {{ $t('reelshort.siteName') }}</p>
        <p class="footer-text">{{ $t('reelshort.tagline') }}</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.h5-root { min-height: 100dvh; background: #0a0a14; color: #e2e8f0; font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; }
.loading-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; gap: 12px; color: #64748b; font-size: 14px; }
.spinner { width: 32px; height: 32px; border: 3px solid #1e293b; border-top-color: #6366f1; border-radius: 50%; animation: spin 0.6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ─── HERO ─── */
.hero { position: relative; overflow: hidden; }
.hero-bg { position: absolute; inset: 0; }
.hero-bg-img { width: 100%; height: 100%; object-fit: cover; filter: blur(40px) brightness(0.25) saturate(0.5); transform: scale(1.1); }
.hero-overlay { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(10,10,20,0.3), rgba(10,10,20,0.95)); }
.hero-body { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; padding: 48px 24px 36px; text-align: center; }
.hero-badge { display: inline-flex; align-items: center; gap: 4px; padding: 5px 14px; border-radius: 9999px; font-size: 11px; font-weight: 700; background: rgba(245,158,11,0.15); color: #fbbf24; border: 1px solid rgba(245,158,11,0.25); margin-bottom: 24px; letter-spacing: 0.02em; }
.hero-cover { width: 160px; height: 224px; object-fit: cover; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 0 2px rgba(255,255,255,0.06); margin-bottom: 20px; }
.hero-title { font-size: 1.5rem; font-weight: 900; letter-spacing: -0.02em; margin-bottom: 12px; line-height: 1.3; color: #fff; }
.hero-stats { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #94a3b8; margin-bottom: 12px; }
.stat { color: #cbd5e1; }
.stat-dot { color: #475569; }
.hero-tags { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-bottom: 14px; }
.hero-tag { padding: 4px 10px; border-radius: 6px; font-size: 10px; font-weight: 600; background: rgba(255,255,255,0.06); color: #94a3b8; border: 1px solid rgba(255,255,255,0.06); }
.hero-desc { font-size: 13px; color: #94a3b8; line-height: 1.7; max-width: 360px; margin-bottom: 24px; }
.hero-cta { display: inline-flex; align-items: center; gap: 8px; padding: 14px 48px; border-radius: 14px; font-size: 16px; font-weight: 800; color: #fff; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%); text-decoration: none; box-shadow: 0 8px 32px rgba(99,102,241,0.4); transition: all 0.2s; animation: pulse 2s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { box-shadow: 0 8px 32px rgba(99,102,241,0.4); } 50% { box-shadow: 0 12px 48px rgba(139,92,246,0.6); } }
.hero-cta:hover { transform: translateY(-2px); }
.cta-icon { font-size: 14px; }
.hero-free { font-size: 12px; color: #22c55e; margin-top: 12px; font-weight: 500; }

/* ─── EPISODES ─── */
.eps-section { padding: 28px 20px; }
.eps-header { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 16px; }
.eps-title { font-size: 1.1rem; font-weight: 800; color: #f1f5f9; }
.eps-count { font-size: 12px; color: #64748b; }
.eps-list { display: flex; flex-direction: column; gap: 10px; }
.ep-card { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); text-decoration: none; color: inherit; transition: all 0.15s; }
.ep-card:hover { background: rgba(255,255,255,0.06); border-color: rgba(99,102,241,0.2); }
.ep-thumb-wrap { position: relative; width: 72px; height: 48px; border-radius: 8px; overflow: hidden; flex-shrink: 0; background: #1a1a2e; }
.ep-thumb { width: 100%; height: 100%; object-fit: cover; }
.ep-thumb-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 20px; background: rgba(99,102,241,0.15); }
.ep-play { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.4); opacity: 0; transition: opacity 0.2s; font-size: 14px; color: #fff; }
.ep-card:hover .ep-play { opacity: 1; }
.ep-num-badge { position: absolute; top: 4px; left: 4px; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; color: #fff; background: rgba(0,0,0,0.7); }
.ep-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.ep-name { font-size: 13px; font-weight: 600; color: #e2e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ep-duration { font-size: 11px; color: #64748b; font-family: monospace; }
.ep-badge { padding: 4px 10px; border-radius: 6px; font-size: 10px; font-weight: 700; flex-shrink: 0; }
.ep-badge.free { background: rgba(34,197,94,0.12); color: #22c55e; }
.ep-badge.paid { background: rgba(245,158,11,0.12); color: #f59e0b; }

/* ─── FOOTER ─── */
.h5-footer { text-align: center; padding: 32px 24px; border-top: 1px solid rgba(255,255,255,0.04); }
.footer-brand { font-size: 15px; font-weight: 700; color: #94a3b8; margin-bottom: 4px; }
.footer-text { font-size: 12px; color: #475569; }
</style>
