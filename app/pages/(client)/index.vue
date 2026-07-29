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
      $fetch<any>('/api/v1/discover?type=trending&limit=8'),
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
        <NuxtLink to="/" class="logo">🎬 <span class="logo-text">{{ $t('reelshort.siteName') }}</span></NuxtLink>
        <nav class="nav-links">
          <NuxtLink to="/browse" class="nav-link">{{ $t('reelshort.browse') }}</NuxtLink>
          <a href="/admin" target="_blank" class="nav-link nav-admin">{{ $t('reelshort.admin') }}</a>
          <LanguageSwitcher />
        </nav>
      </div>
    </header>

    <!-- HERO -->
    <section class="hero">
      <div class="hero-bg-gradient" />
      <div class="hero-content">
        <h1 class="hero-title">{{ $t('reelshort.heroTitle') }}</h1>
        <p class="hero-desc">{{ $t('reelshort.heroDesc') }}</p>
        <div class="hero-actions">
          <NuxtLink to="/browse" class="hero-cta">{{ $t('reelshort.browseSeries') }}</NuxtLink>
          <NuxtLink v-if="featuredSeries[0]" :to="`/series/${featuredSeries[0].slug}`" class="hero-cta-secondary">{{ $t('reelshort.watchFeatured') }}</NuxtLink>
        </div>
      </div>
      <div v-if="featuredSeries.length" class="hero-posters">
        <img v-for="(s, i) in featuredSeries.slice(0, 3)" :key="s.id" :src="s.cover_image" :alt="s.title" class="hero-poster" :style="{ transform: `rotate(${(i-1)*6}deg)`, zIndex: 3 - i }" />
      </div>
    </section>

    <!-- GENRE PILLS -->
    <section class="section">
      <div class="section-inner">
        <h2 class="section-title">{{ $t('reelshort.browseByGenre') }}</h2>
        <div class="genre-pills">
          <NuxtLink v-for="g in genres" :key="g.id" :to="`/browse?genre=${g.id}`" class="genre-pill">
            <span v-if="g.icon" :class="g.icon" class="text-sm" />
            {{ g.name }}
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- TRENDING -->
    <section class="section">
      <div class="section-inner">
        <div class="section-header">
          <h2 class="section-title">{{ $t('reelshort.trendingNow') }}</h2>
          <NuxtLink to="/browse" class="see-all">{{ $t('reelshort.seeAll') }}</NuxtLink>
        </div>
        <div class="series-grid">
          <NuxtLink v-for="s in trendingSeries" :key="s.id" :to="`/series/${s.slug}`" class="series-card">
            <img :src="s.cover_image" :alt="s.title" class="series-cover" loading="lazy" />
            <div class="series-info">
              <h3 class="series-title">{{ s.title }}</h3>
              <div class="series-meta">
                <span>⭐ {{ s.rating || '4.5' }}</span>
                <span>{{ s.total_episodes }} eps</span>
              </div>
            </div>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- HOW IT WORKS -->
    <section class="section how-section">
      <div class="section-inner">
        <h2 class="section-title text-center">{{ $t('reelshort.howItWorks') }}</h2>
        <div class="steps-grid">
          <div class="step-card">
            <div class="step-icon">🎬</div>
            <h3>{{ $t('reelshort.step1Title') }}</h3>
            <p>{{ $t('reelshort.step1Desc') }}</p>
          </div>
          <div class="step-card">
            <div class="step-icon">🪙</div>
            <h3>{{ $t('reelshort.step2Title') }}</h3>
            <p>{{ $t('reelshort.step2Desc') }}</p>
          </div>
          <div class="step-card">
            <div class="step-icon">🔓</div>
            <h3>{{ $t('reelshort.step3Title') }}</h3>
            <p>{{ $t('reelshort.step3Desc') }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- FOOTER -->
    <footer class="footer">
      <div class="footer-inner">
        <span>{{ $t('reelshort.footer') }}</span>
        <span class="footer-copy">{{ $t('reelshort.footerCopy') }}</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.home-root { min-height: 100vh; background: #050510; color: #f1f5f9; font-family: var(--font-sans); overflow-x: hidden; }

.home-header { position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: rgba(5,5,16,0.85); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(255,255,255,0.05); }
.home-header-inner { max-width: 1200px; margin: 0 auto; padding: 0 24px; height: 56px; display: flex; align-items: center; justify-content: space-between; }
.logo { display: flex; align-items: center; gap: 8px; text-decoration: none; font-size: 18px; }
.logo-text { font-weight: 800; color: #f1f5f9; letter-spacing: -0.02em; }
.nav-links { display: flex; gap: 6px; align-items: center; }
.nav-link { padding: 8px 16px; border-radius: 8px; font-size: 14px; font-weight: 500; color: #94a3b8; text-decoration: none; transition: all 0.2s; }
.nav-link:hover { color: #f1f5f9; background: rgba(255,255,255,0.05); }
.nav-admin { background: rgba(99,102,241,0.15); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.25); }
.nav-admin:hover { background: rgba(99,102,241,0.25); color: #c7d2fe; }

.hero { position: relative; min-height: 85vh; display: flex; align-items: center; justify-content: center; padding: 100px 24px 60px; overflow: hidden; }
.hero-bg-gradient { position: absolute; inset: 0; background: radial-gradient(ellipse 80% 60% at 50% 30%, rgba(99,102,241,0.15) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 60%, rgba(236,72,153,0.08) 0%, transparent 50%); pointer-events: none; }
.hero-content { max-width: 600px; text-align: center; position: relative; z-index: 2; }
.hero-title { font-size: clamp(2.5rem, 6vw, 4rem); font-weight: 900; line-height: 1.05; letter-spacing: -0.04em; color: #ffffff; margin-bottom: 20px; }
.hero-desc { font-size: 1.125rem; color: #94a3b8; line-height: 1.7; margin-bottom: 32px; max-width: 480px; margin-left: auto; margin-right: auto; }
.hero-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
.hero-cta { padding: 14px 32px; border-radius: 12px; font-size: 15px; font-weight: 700; color: #fff; background: linear-gradient(135deg, #6366f1, #8b5cf6); text-decoration: none; box-shadow: 0 8px 32px rgba(99,102,241,0.35); transition: all 0.2s; }
.hero-cta:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(99,102,241,0.5); }
.hero-cta-secondary { padding: 14px 32px; border-radius: 12px; font-size: 15px; font-weight: 600; color: #e2e8f0; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); text-decoration: none; transition: all 0.2s; }
.hero-cta-secondary:hover { background: rgba(255,255,255,0.1); }
.hero-posters { position: absolute; right: 5%; top: 50%; transform: translateY(-50%); display: flex; gap: 0; }
.hero-poster { width: 140px; height: 210px; object-fit: cover; border-radius: 12px; box-shadow: 0 12px 40px rgba(0,0,0,0.5); border: 2px solid rgba(255,255,255,0.1); }
@media (max-width: 900px) { .hero-posters { display: none; } }

.section { padding: 60px 24px; }
.section-inner { max-width: 1200px; margin: 0 auto; }
.section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
.section-title { font-size: 1.5rem; font-weight: 800; color: #f1f5f9; margin-bottom: 20px; }
.see-all { font-size: 14px; color: #818cf8; text-decoration: none; font-weight: 500; }
.see-all:hover { color: #a5b4fc; }

.genre-pills { display: flex; flex-wrap: wrap; gap: 10px; }
.genre-pill { display: inline-flex; align-items: center; gap: 6px; padding: 10px 20px; border-radius: 9999px; font-size: 14px; font-weight: 500; color: #cbd5e1; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); text-decoration: none; transition: all 0.2s; }
.genre-pill:hover { background: rgba(99,102,241,0.1); border-color: rgba(99,102,241,0.3); color: #a5b4fc; }

.series-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 16px; }
.series-card { display: block; text-decoration: none; color: inherit; border-radius: 12px; overflow: hidden; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); transition: all 0.25s; }
.series-card:hover { transform: translateY(-4px); border-color: rgba(99,102,241,0.3); box-shadow: 0 12px 32px rgba(0,0,0,0.4); }
.series-cover { width: 100%; aspect-ratio: 2/3; object-fit: cover; display: block; }
.series-info { padding: 12px; }
.series-title { font-size: 13px; font-weight: 600; color: #e2e8f0; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 6px; }
.series-meta { display: flex; gap: 12px; font-size: 11px; color: #64748b; }

.how-section { background: rgba(255,255,255,0.015); border-top: 1px solid rgba(255,255,255,0.04); border-bottom: 1px solid rgba(255,255,255,0.04); }
.text-center { text-align: center; margin-bottom: 32px; }
.steps-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 24px; }
.step-card { padding: 32px 24px; border-radius: 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); text-align: center; }
.step-icon { font-size: 2.5rem; margin-bottom: 16px; }
.step-card h3 { font-size: 1rem; font-weight: 700; color: #e2e8f0; margin-bottom: 8px; }
.step-card p { font-size: 0.875rem; color: #64748b; line-height: 1.6; }

.footer { padding: 40px 24px; border-top: 1px solid rgba(255,255,255,0.04); }
.footer-inner { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; font-size: 13px; color: #475569; }
.footer-copy { color: #334155; }
@media (max-width: 640px) { .hero-title { font-size: 2rem; } .series-grid { grid-template-columns: repeat(2, 1fr); } }
</style>
