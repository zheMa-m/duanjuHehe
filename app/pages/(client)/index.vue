<script setup lang="ts">
import { onMounted, ref } from 'vue'
import LanguageSwitcher from '~/components/shared/LanguageSwitcher.vue'

const { t } = useI18n()
const { initAuth } = useAuth()

useAppSEO({
  title: () => `ReelShort — ${t('reelshort.tagline')}`,
  description: () => t('reelshort.heroDesc'),
})

const featuredSeries = ref<any[]>([])
const trendingSeries = ref<any[]>([])
const genres = ref<any[]>([])
const loading = ref(true)

async function fetchData() {
  try {
    const [featRes, trendRes, genreRes] = await Promise.all([
      $fetch<any>('/api/v1/discover?type=featured&limit=6'),
      $fetch<any>('/api/v1/discover?type=trending&limit=10'),
      $fetch<any>('/api/v1/genres'),
    ])
    featuredSeries.value = featRes.data?.items || []
    trendingSeries.value = trendRes.data?.items || []
    genres.value = genreRes.data?.items || []
  } catch (_) {} finally { loading.value = false }
}

onMounted(async () => {
  await initAuth()
  fetchData()
})
</script>

<template>
  <div class="home-root">
    <!-- HEADER -->
    <header class="home-header">
      <div class="home-header-inner">
        <NuxtLink to="/" class="logo">
          <span class="logo-icon">🎬</span>
          <span class="logo-text">{{ $t('reelshort.siteName') }}</span>
        </NuxtLink>
        <nav class="nav-links">
          <NuxtLink to="/browse" class="nav-link">{{ $t('reelshort.browse') }}</NuxtLink>
          <a href="/admin" target="_blank" class="nav-link nav-admin">{{ $t('reelshort.admin') }}</a>
          <LanguageSwitcher />
        </nav>
      </div>
    </header>

    <!-- HERO -->
    <section class="hero">
      <div class="hero-bg-pattern" />
      <div class="hero-content">
        <p class="hero-badge">{{ $t('reelshort.tagline') }}</p>
        <h1 class="hero-title">{{ $t('reelshort.heroTitle') }}</h1>
        <p class="hero-desc">{{ $t('reelshort.heroDesc') }}</p>
        <div class="hero-actions">
          <NuxtLink to="/browse" class="hero-cta">
            {{ $t('reelshort.browseSeries') }}
            <span class="cta-arrow">→</span>
          </NuxtLink>
          <NuxtLink
            v-if="featuredSeries[0]"
            :to="`/series/${featuredSeries[0].slug}`"
            class="hero-cta-secondary"
          >
            {{ $t('reelshort.watchFeatured') }}
          </NuxtLink>
        </div>
        <div class="hero-stats">
          <div class="hero-stat">
            <span class="hero-stat-num">{{ trendingSeries.length }}+</span>
            <span class="hero-stat-label">{{ $t('reelshort.trendingNow').replace('🔥 ', '') }}</span>
          </div>
          <div class="hero-stat-divider" />
          <div class="hero-stat">
            <span class="hero-stat-num">{{ genres.length }}+</span>
            <span class="hero-stat-label">{{ $t('reelshort.exploreGenres') }}</span>
          </div>
          <div class="hero-stat-divider" />
          <div class="hero-stat">
            <span class="hero-stat-num">{{ $t('reelshort.tagline') }}</span>
            <span class="hero-stat-label">Free to Start</span>
          </div>
        </div>
      </div>
    </section>

    <!-- GENRE CARDS -->
    <section class="section genres-section">
      <div class="section-inner">
        <div class="section-header">
          <h2 class="section-title">{{ $t('reelshort.exploreGenres') }}</h2>
          <NuxtLink to="/browse" class="see-all">{{ $t('reelshort.seeAll') }}</NuxtLink>
        </div>
        <div class="genres-grid">
          <NuxtLink
            v-for="g in genres.slice(0, 8)"
            :key="g.id"
            :to="`/browse?genre=${g.id}`"
            class="genre-card"
          >
            <span class="genre-card-icon">{{ g.icon || '🎭' }}</span>
            <span class="genre-card-name">{{ g.name }}</span>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- RANKINGS -->
    <section class="section rankings-section">
      <div class="section-inner">
        <div class="section-header">
          <h2 class="section-title">{{ $t('reelshort.topRanked') }}</h2>
          <NuxtLink to="/browse" class="see-all">{{ $t('reelshort.seeAll') }}</NuxtLink>
        </div>
        <div v-if="loading" class="rankings-loading">{{ $t('reelshort.loading') }}</div>
        <div v-else class="rankings-list">
          <NuxtLink
            v-for="(s, i) in trendingSeries"
            :key="s.id"
            :to="`/series/${s.slug}`"
            class="ranking-item"
          >
            <div class="ranking-pos" :class="{ 'ranking-pos-top': i < 3 }">{{ i + 1 }}</div>
            <img :src="s.cover_image" :alt="s.title" class="ranking-cover" loading="lazy" />
            <div class="ranking-info">
              <h3 class="ranking-title">{{ s.title }}</h3>
              <div class="ranking-meta">
                <span class="ranking-rating">⭐ {{ s.rating || '4.5' }}</span>
                <span class="ranking-eps">{{ s.total_episodes }} eps</span>
              </div>
            </div>
            <span class="ranking-arrow">→</span>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- FOOTER -->
    <footer class="footer">
      <div class="footer-inner">
        <div class="footer-brand">
          <span class="footer-logo">🎬 ReelShort</span>
          <span class="footer-tagline">— {{ $t('reelshort.tagline') }}</span>
        </div>
        <span class="footer-copy">{{ $t('reelshort.footerCopy') }}</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* ═══════════════════════════════════════════════
   LIGHT SAAS STYLE HOMEPAGE
   ═══════════════════════════════════════════════ */

.home-root {
  min-height: 100vh;
  background: linear-gradient(180deg, #fafbfc 0%, #ffffff 100%);
  color: #0f172a;
  font-family: var(--font-sans);
  overflow-x: hidden;
}

/* ─── HEADER ─── */
.home-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid #e8ecf1;
}
.home-header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  flex-shrink: 0;
}
.logo-icon { font-size: 1.25rem; }
.logo-text {
  font-weight: 800;
  font-size: 1.125rem;
  color: #0f172a;
  letter-spacing: -0.02em;
}
.nav-links { display: flex; gap: 4px; align-items: center; }
.nav-link {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #475569;
  text-decoration: none;
  transition: all 0.15s;
}
.nav-link:hover { color: #0f172a; background: #f1f5f9; }
.nav-admin {
  background: #eef2ff;
  color: #6366f1;
  border: 1px solid #e0e7ff;
}
.nav-admin:hover { background: #e0e7ff; color: #4f46e5; }

/* ─── HERO ─── */
.hero {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 140px 24px 80px;
  overflow: hidden;
  text-align: center;
}
.hero-bg-pattern {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 50% at 50% 0%, rgba(99, 102, 241, 0.06) 0%, transparent 60%),
    radial-gradient(ellipse 40% 30% at 80% 100%, rgba(139, 92, 246, 0.04) 0%, transparent 50%);
  pointer-events: none;
}
.hero-content {
  max-width: 680px;
  position: relative;
  z-index: 2;
}
.hero-badge {
  display: inline-block;
  padding: 6px 16px;
  border-radius: 9999px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #6366f1;
  background: #eef2ff;
  border: 1px solid #e0e7ff;
  margin-bottom: 24px;
}
.hero-title {
  font-size: clamp(2.5rem, 5.5vw, 3.75rem);
  font-weight: 900;
  line-height: 1.08;
  letter-spacing: -0.04em;
  color: #0f172a;
  margin-bottom: 20px;
}
.hero-desc {
  font-size: 1.125rem;
  color: #64748b;
  line-height: 1.7;
  margin-bottom: 36px;
  max-width: 480px;
  margin-left: auto;
  margin-right: auto;
}
.hero-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 48px;
}
.hero-cta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 14px 32px;
  border-radius: 12px;
  font-size: 0.9375rem;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  text-decoration: none;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.3), 0 1px 3px rgba(0, 0, 0, 0.08);
  transition: all 0.2s;
}
.hero-cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(99, 102, 241, 0.4), 0 2px 6px rgba(0, 0, 0, 0.1);
}
.cta-arrow { font-size: 1rem; transition: transform 0.2s; }
.hero-cta:hover .cta-arrow { transform: translateX(3px); }

.hero-cta-secondary {
  display: inline-flex;
  align-items: center;
  padding: 14px 32px;
  border-radius: 12px;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #334155;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  text-decoration: none;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: all 0.2s;
}
.hero-cta-secondary:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

/* hero stats row */
.hero-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 32px;
}
.hero-stat { text-align: center; }
.hero-stat-num {
  display: block;
  font-size: 1.25rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.3;
}
.hero-stat-label {
  font-size: 0.8125rem;
  color: #64748b;
  font-weight: 500;
}
.hero-stat-divider {
  width: 1px;
  height: 28px;
  background: #e2e8f0;
}

/* ─── SECTIONS ─── */
.section { padding: 64px 24px; }
.section-inner { max-width: 1200px; margin: 0 auto; }
.section-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 28px;
}
.section-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.02em;
}
.see-all {
  font-size: 0.875rem;
  color: #6366f1;
  text-decoration: none;
  font-weight: 600;
  white-space: nowrap;
}
.see-all:hover { color: #4f46e5; }

/* ─── GENRES GRID ─── */
.genres-section {
  background: #ffffff;
  border-top: 1px solid #f1f5f9;
}
.genres-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 12px;
}
.genre-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 24px 16px 20px;
  border-radius: 14px;
  background: #ffffff;
  border: 1px solid #e8ecf1;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}
.genre-card:hover {
  transform: translateY(-3px);
  border-color: #c7d2fe;
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.08);
}
.genre-card-icon { font-size: 1.75rem; }
.genre-card-name {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #334155;
  text-align: center;
}

/* ─── RANKINGS ─── */
.rankings-section {
  background: #fafbfc;
  border-top: 1px solid #f1f5f9;
}
.rankings-loading {
  text-align: center;
  padding: 60px 0;
  color: #94a3b8;
  font-size: 0.9375rem;
}
.rankings-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 1px solid #e8ecf1;
  border-radius: 16px;
  overflow: hidden;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}
.ranking-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  text-decoration: none;
  color: inherit;
  transition: background 0.15s;
  border-bottom: 1px solid #f1f5f9;
}
.ranking-item:last-child { border-bottom: none; }
.ranking-item:hover { background: #fafbfc; }
.ranking-item:hover .ranking-arrow { opacity: 1; transform: translateX(0); }

.ranking-pos {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 700;
  color: #64748b;
  background: #f1f5f9;
  flex-shrink: 0;
}
.ranking-pos-top {
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.25);
}

.ranking-cover {
  width: 56px;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
.ranking-info { flex: 1; min-width: 0; }
.ranking-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 4px;
}
.ranking-meta { display: flex; gap: 16px; align-items: center; }
.ranking-rating { font-size: 0.8125rem; color: #64748b; font-weight: 500; }
.ranking-eps { font-size: 0.8125rem; color: #94a3b8; }

.ranking-arrow {
  font-size: 1rem;
  color: #94a3b8;
  opacity: 0;
  transform: translateX(-6px);
  transition: all 0.2s;
  flex-shrink: 0;
}

/* ─── FOOTER ─── */
.footer {
  padding: 40px 24px;
  border-top: 1px solid #e8ecf1;
  background: #ffffff;
}
.footer-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 0.8125rem;
  color: #94a3b8;
}
.footer-brand { display: flex; align-items: center; gap: 6px; }
.footer-logo { font-weight: 700; color: #475569; }
.footer-tagline { color: #94a3b8; }
.footer-copy { color: #cbd5e1; }

/* ─── RESPONSIVE ─── */
@media (max-width: 768px) {
  .hero { padding: 120px 20px 60px; }
  .hero-title { font-size: 2.25rem; }
  .hero-desc { font-size: 1rem; }
  .hero-stats { gap: 20px; }
  .hero-stat-num { font-size: 1.0625rem; }
  .hero-cta, .hero-cta-secondary { width: 100%; justify-content: center; }
  .hero-actions { flex-direction: column; width: 100%; }
  .genres-grid { grid-template-columns: repeat(4, 1fr); }
  .section { padding: 48px 20px; }
  .footer-inner { flex-direction: column; text-align: center; }
}

@media (max-width: 480px) {
  .hero-title { font-size: 1.75rem; }
  .genres-grid { grid-template-columns: repeat(2, 1fr); }
  .ranking-item { padding: 14px 16px; gap: 12px; }
  .ranking-cover { width: 44px; height: 64px; }
  .hero-stats { flex-direction: column; gap: 12px; }
  .hero-stat-divider { width: 24px; height: 1px; }
}
</style>
