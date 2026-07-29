<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import LanguageSwitcher from '~/components/shared/LanguageSwitcher.vue'

const { t, locale } = useI18n()
const { initAuth } = useAuth()

useAppSEO({
  title: () => `ReelShort — ${t('reelshort.tagline')}`,
  description: () => t('reelshort.heroDesc'),
})

const featuredSeries = ref<any[]>([])
const trendingSeries = ref<any[]>([])
const genres = ref<any[]>([])
const loading = ref(true)

// 轮播状态
const currentSlide = ref(0)
let carouselTimer: ReturnType<typeof setInterval> | null = null

const carouselSlides = computed(() => {
  return featuredSeries.value.slice(0, 4).map(s => ({
    ...s,
    genreName: t(`reelshort.genre_${s.genre_slug || s.genre_id || ''}`) || s.genre || '',
  }))
})

function nextSlide() {
  currentSlide.value = (currentSlide.value + 1) % Math.max(carouselSlides.value.length, 1)
}
function prevSlide() {
  const len = Math.max(carouselSlides.value.length, 1)
  currentSlide.value = (currentSlide.value - 1 + len) % len
}
function goSlide(i: number) {
  currentSlide.value = i
}

// 翻译分类名
function genreName(g: any) {
  const key = `reelshort.genre_${g.slug}`
  const translated = t(key)
  return translated !== key ? translated : g.name
}

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
  carouselTimer = setInterval(nextSlide, 5000)
})

onUnmounted(() => {
  if (carouselTimer) clearInterval(carouselTimer)
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

    <!-- HERO CAROUSEL -->
    <section class="hero-carousel">
      <div class="carousel-track" :style="{ transform: `translateX(-${currentSlide * 100}%)` }">
        <div
          v-for="(slide, i) in carouselSlides"
          :key="slide.id"
          class="carousel-slide"
        >
          <img :src="slide.poster_image || slide.cover_image" :alt="slide.title" class="slide-bg" />
          <div class="slide-overlay" />
          <div class="slide-content">
            <span class="slide-genre">{{ slide.genreName }}</span>
            <h2 class="slide-title">{{ slide.title }}</h2>
            <p class="slide-desc">{{ slide.description?.slice(0, 120) }}...</p>
            <div class="slide-meta">
              <span>⭐ {{ slide.rating || '4.5' }}</span>
              <span>{{ slide.total_episodes }} {{ $t('reelshort.episodes') }}</span>
              <span>{{ slide.free_episodes }} {{ $t('reelshort.free').toLowerCase() }}</span>
            </div>
            <NuxtLink :to="`/series/${slide.slug}`" class="slide-cta">
              {{ $t('reelshort.watchNow') }}
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- 左右箭头 -->
      <button v-if="carouselSlides.length > 1" class="carousel-arrow left" @click="prevSlide">‹</button>
      <button v-if="carouselSlides.length > 1" class="carousel-arrow right" @click="nextSlide">›</button>

      <!-- 指示点 -->
      <div v-if="carouselSlides.length > 1" class="carousel-dots">
        <button
          v-for="(_, i) in carouselSlides"
          :key="i"
          class="carousel-dot"
          :class="{ active: currentSlide === i }"
          @click="goSlide(i)"
        />
      </div>
    </section>

    <!-- EXPLORE GENRES -->
    <section class="section genres-section">
      <div class="section-inner">
        <div class="section-header">
          <h2 class="section-title">{{ $t('reelshort.exploreGenres') }}</h2>
          <NuxtLink to="/browse" class="see-all">{{ $t('reelshort.seeAll') }}</NuxtLink>
        </div>
        <div class="genres-grid">
          <NuxtLink
            v-for="g in genres"
            :key="g.id"
            :to="`/browse?genre=${g.id}`"
            class="genre-card"
          >
            <span class="genre-card-icon">{{ g.icon || '🎭' }}</span>
            <span class="genre-card-name">{{ genreName(g) }}</span>
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
   REELSHORT HOMEPAGE — Video Carousel + Genres
   ═══════════════════════════════════════════════ */

.home-root {
  min-height: 100vh;
  background: #050510;
  color: #f1f5f9;
  font-family: var(--font-sans);
  overflow-x: hidden;
}

/* ─── HEADER ─── */
.home-header {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  background: rgba(5,5,16,0.88); backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.home-header-inner {
  max-width: 1300px; margin: 0 auto; padding: 0 24px;
  height: 60px; display: flex; align-items: center; justify-content: space-between;
}
.logo { display: flex; align-items: center; gap: 8px; text-decoration: none; }
.logo-icon { font-size: 1.25rem; }
.logo-text { font-weight: 800; font-size: 1.125rem; color: #f1f5f9; letter-spacing: -0.02em; }
.nav-links { display: flex; gap: 6px; align-items: center; }
.nav-link {
  padding: 8px 16px; border-radius: 8px; font-size: 0.875rem; font-weight: 500;
  color: #94a3b8; text-decoration: none; transition: all 0.15s;
}
.nav-link:hover { color: #f1f5f9; background: rgba(255,255,255,0.06); }
.nav-admin {
  background: rgba(99,102,241,0.15); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.25);
}
.nav-admin:hover { background: rgba(99,102,241,0.25); color: #c7d2fe; }

/* ─── HERO CAROUSEL ─── */
.hero-carousel {
  position: relative; width: 100%; height: 85vh; overflow: hidden;
  margin-top: 0;
}
.carousel-track {
  display: flex; height: 100%; transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
.carousel-slide {
  min-width: 100%; height: 100%; position: relative;
  display: flex; align-items: flex-end; justify-content: flex-start;
}
.slide-bg {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: cover; filter: brightness(0.4);
}
.slide-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(to top, rgba(5,5,16,1) 0%, rgba(5,5,16,0.4) 40%, rgba(5,5,16,0.1) 100%);
}
.slide-content {
  position: relative; z-index: 2; max-width: 600px;
  padding: 0 64px 80px;
}
.slide-genre {
  display: inline-block; padding: 5px 14px; border-radius: 9999px;
  font-size: 0.75rem; font-weight: 600; color: #fbbf24;
  background: rgba(245,158,11,0.15); border: 1px solid rgba(245,158,11,0.25);
  margin-bottom: 16px;
}
.slide-title {
  font-size: clamp(1.75rem, 3.5vw, 2.5rem); font-weight: 900; line-height: 1.15;
  color: #ffffff; margin-bottom: 10px; letter-spacing: -0.03em;
}
.slide-desc {
  font-size: 0.9375rem; color: #94a3b8; line-height: 1.6; margin-bottom: 12px;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.slide-meta {
  display: flex; gap: 16px; font-size: 0.8125rem; color: #64748b; margin-bottom: 20px;
}
.slide-cta {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 14px 32px; border-radius: 12px; font-size: 0.9375rem; font-weight: 700;
  color: #fff; background: linear-gradient(135deg, #6366f1, #8b5cf6);
  text-decoration: none; box-shadow: 0 4px 20px rgba(99,102,241,0.4);
  transition: all 0.2s;
}
.slide-cta:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(99,102,241,0.55); }

/* 轮播箭头 */
.carousel-arrow {
  position: absolute; top: 50%; transform: translateY(-50%); z-index: 10;
  width: 48px; height: 48px; border-radius: 50%; border: none; cursor: pointer;
  background: rgba(255,255,255,0.08); color: #fff; font-size: 1.75rem;
  display: flex; align-items: center; justify-content: center;
  backdrop-filter: blur(8px); transition: all 0.2s; line-height: 1;
}
.carousel-arrow:hover { background: rgba(255,255,255,0.18); }
.carousel-arrow.left { left: 20px; }
.carousel-arrow.right { right: 20px; }

/* 指示点 */
.carousel-dots {
  position: absolute; bottom: 28px; left: 50%; transform: translateX(-50%);
  display: flex; gap: 8px; z-index: 10;
}
.carousel-dot {
  width: 8px; height: 8px; border-radius: 50%; border: none; cursor: pointer;
  background: rgba(255,255,255,0.25); transition: all 0.2s;
}
.carousel-dot.active { background: #818cf8; box-shadow: 0 0 8px rgba(129,140,248,0.5); }

/* ─── SECTIONS ─── */
.section { padding: 64px 24px; }
.section-inner { max-width: 1300px; margin: 0 auto; }
.section-header {
  display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 28px;
}
.section-title { font-size: 1.5rem; font-weight: 800; color: #f1f5f9; letter-spacing: -0.02em; }
.see-all { font-size: 0.875rem; color: #818cf8; text-decoration: none; font-weight: 600; }
.see-all:hover { color: #a5b4fc; }

/* ─── GENRES GRID ─── */
.genres-section { background: rgba(255,255,255,0.01); border-top: 1px solid rgba(255,255,255,0.04); }
.genres-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 12px;
}
.genre-card {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 24px 16px 20px; border-radius: 14px;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
  text-decoration: none; color: inherit; transition: all 0.2s;
}
.genre-card:hover {
  transform: translateY(-3px); border-color: rgba(99,102,241,0.35);
  box-shadow: 0 8px 24px rgba(99,102,241,0.08); background: rgba(255,255,255,0.05);
}
.genre-card-icon { font-size: 1.75rem; }
.genre-card-name { font-size: 0.8125rem; font-weight: 600; color: #cbd5e1; text-align: center; }

/* ─── RANKINGS ─── */
.rankings-section { background: rgba(255,255,255,0.01); border-top: 1px solid rgba(255,255,255,0.04); }
.rankings-loading { text-align: center; padding: 60px 0; color: #64748b; }
.rankings-list {
  display: flex; flex-direction: column; gap: 0;
  border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; overflow: hidden;
  background: rgba(255,255,255,0.02);
}
.ranking-item {
  display: flex; align-items: center; gap: 16px; padding: 16px 20px;
  text-decoration: none; color: inherit; transition: background 0.15s;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.ranking-item:last-child { border-bottom: none; }
.ranking-item:hover { background: rgba(255,255,255,0.04); }
.ranking-item:hover .ranking-arrow { opacity: 1; transform: translateX(0); }

.ranking-pos {
  width: 32px; height: 32px; border-radius: 8px; display: flex;
  align-items: center; justify-content: center; font-size: 0.875rem;
  font-weight: 700; color: #64748b; background: rgba(255,255,255,0.06); flex-shrink: 0;
}
.ranking-pos-top {
  background: linear-gradient(135deg, #6366f1, #4f46e5); color: #ffffff;
  box-shadow: 0 2px 8px rgba(99,102,241,0.3);
}
.ranking-cover {
  width: 56px; height: 80px; object-fit: cover; border-radius: 8px;
  flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}
.ranking-info { flex: 1; min-width: 0; }
.ranking-title {
  font-size: 0.9375rem; font-weight: 600; color: #e2e8f0; line-height: 1.4;
  display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 4px;
}
.ranking-meta { display: flex; gap: 16px; align-items: center; }
.ranking-rating { font-size: 0.8125rem; color: #94a3b8; font-weight: 500; }
.ranking-eps { font-size: 0.8125rem; color: #64748b; }
.ranking-arrow {
  font-size: 1rem; color: #94a3b8; opacity: 0; transform: translateX(-6px);
  transition: all 0.2s; flex-shrink: 0;
}

/* ─── FOOTER ─── */
.footer { padding: 40px 24px; border-top: 1px solid rgba(255,255,255,0.04); }
.footer-inner {
  max-width: 1300px; margin: 0 auto; display: flex; justify-content: space-between;
  align-items: center; flex-wrap: wrap; gap: 16px; font-size: 0.8125rem; color: #475569;
}
.footer-brand { display: flex; align-items: center; gap: 6px; }
.footer-logo { font-weight: 700; color: #94a3b8; }
.footer-tagline { color: #64748b; }
.footer-copy { color: #334155; }

/* ─── RESPONSIVE ─── */
@media (max-width: 768px) {
  .hero-carousel { height: 70vh; }
  .slide-content { padding: 0 24px 60px; }
  .slide-title { font-size: 1.5rem; }
  .carousel-arrow { width: 36px; height: 36px; font-size: 1.25rem; }
  .carousel-arrow.left { left: 8px; }
  .carousel-arrow.right { right: 8px; }
  .genres-grid { grid-template-columns: repeat(4, 1fr); }
  .section { padding: 48px 20px; }
  .footer-inner { flex-direction: column; text-align: center; }
}
@media (max-width: 480px) {
  .hero-carousel { height: 60vh; }
  .slide-content { padding: 0 16px 48px; }
  .slide-title { font-size: 1.25rem; }
  .slide-desc { display: none; }
  .genres-grid { grid-template-columns: repeat(3, 1fr); }
  .ranking-item { padding: 14px 16px; gap: 12px; }
  .ranking-cover { width: 44px; height: 64px; }
}
</style>
