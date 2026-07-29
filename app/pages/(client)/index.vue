<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import LanguageSwitcher from '~/components/shared/LanguageSwitcher.vue'
import { resolveAdminHref, resolveApiDocHref } from '~/utils/subdomain'

const { t } = useI18n()
const { user, isLoggedIn, signOut, initAuth } = useAuth()
const coinBalance = ref(0)
const userMenuOpen = ref(false)

useAppSEO({
  title: () => `ReelShort — ${t('reelshort.tagline')}`,
  description: () => t('reelshort.heroDesc'),
})

const featuredSeries = ref<any[]>([])
const trendingSeries = ref<any[]>([])
const loading = ref(true)

// 轮播
const currentSlide = ref(0)
let carouselTimer: ReturnType<typeof setInterval> | null = null

const carouselSlides = computed(() =>
  featuredSeries.value.slice(0, 5).map(s => ({
    ...s,
    genreName: t(`reelshort.genre_${s.genre_slug || ''}`) || s.genre || '',
  }))
)

function nextSlide() { currentSlide.value = (currentSlide.value + 1) % Math.max(carouselSlides.value.length, 1) }
function prevSlide() { const len = Math.max(carouselSlides.value.length, 1); currentSlide.value = (currentSlide.value - 1 + len) % len }
function goSlide(i: number) { currentSlide.value = i }

// 下拉菜单
const openDropdown = ref('')
const adminHref = computed(() => import.meta.client ? resolveAdminHref(window.location.origin) : '/admin')
const apiDocHref = computed(() => import.meta.client ? resolveApiDocHref(window.location.origin, '/_scalar') : '/_scalar')

// 落地页列表（从数据库动态获取，不再硬编码）
const landingPages = computed(() => {
  const allSeries = [...trendingSeries.value, ...featuredSeries.value]
  const unique = allSeries.filter((s: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.slug === s.slug) === i)
  const src = unique.slice(0, 8)
  return src.map((lp: any) => ({
    slug: lp.slug,
    title: lp.title || lp.slug.replace(/-/g, ' '),
    href: `/h5/${lp.slug}`,
  }))
})

async function fetchData() {
  try {
    const [featRes, trendRes] = await Promise.all([
      $fetch<any>('/api/v1/discover?type=featured&limit=6'),
      $fetch<any>('/api/v1/discover?type=trending&limit=10'),
    ])
    featuredSeries.value = featRes.data?.items || []
    trendingSeries.value = trendRes.data?.items || []
  } catch (_) {} finally { loading.value = false }
}

onMounted(async () => {
  await initAuth()
  if (isLoggedIn.value) {
    try {
      const coinRes = await $fetch<any>('/api/v1/coins/balance')
      coinBalance.value = coinRes.data?.balance || 0
    } catch (_) {}
  }
  fetchData()
  carouselTimer = setInterval(nextSlide, 5000)
})
function pauseCarousel() { if (carouselTimer) { clearInterval(carouselTimer); carouselTimer = null } }
function resumeCarousel() { if (!carouselTimer) carouselTimer = setInterval(nextSlide, 5000) }
async function handleSignOut() { await signOut(); coinBalance.value = 0; userMenuOpen.value = false; navigateTo('/') }
function toggleUserMenu() { userMenuOpen.value = !userMenuOpen.value }
function closeUserMenu() { userMenuOpen.value = false }
onUnmounted(() => { if (carouselTimer) clearInterval(carouselTimer) })
</script>

<template>
  <div class="home-root">
    <!-- ═══════════ HEADER ═══════════ -->
    <header class="home-header">
      <div class="header-inner">
        <NuxtLink to="/" class="logo">
          <span class="logo-icon">🎬</span>
          <span class="logo-text">{{ $t('reelshort.siteName') }}</span>
        </NuxtLink>

        <nav class="nav-links">
          <NuxtLink to="/browse" class="nav-link">{{ $t('reelshort.browse') }}</NuxtLink>

          <!-- 落地页下拉 -->
          <div class="nav-drop" @mouseenter="openDropdown = 'landing'" @mouseleave="openDropdown = ''">
            <button class="nav-link nav-trigger">
              {{ $t('reelshort.landingPages') }}
              <span class="nav-arrow" :class="{ open: openDropdown === 'landing' }">▾</span>
            </button>
            <div v-if="openDropdown === 'landing'" class="dropdown">
              <a v-for="lp in landingPages" :key="lp.slug" :href="lp.href" target="_blank" class="dropdown-item">
                <span class="drop-icon">📄</span>
                <span class="drop-text">{{ lp.title }}</span>
                <span class="drop-badge">H5</span>
              </a>
              <div v-if="!landingPages.length" class="dropdown-empty">暂无落地页</div>
            </div>
          </div>

          <!-- API / App 下拉 -->
          <div class="nav-drop" @mouseenter="openDropdown = 'more'" @mouseleave="openDropdown = ''">
            <button class="nav-link nav-trigger">
              {{ $t('reelshort.restApi') }}
              <span class="nav-arrow" :class="{ open: openDropdown === 'more' }">▾</span>
            </button>
            <div v-if="openDropdown === 'more'" class="dropdown dropdown-wide">
              <a :href="apiDocHref" target="_blank" class="dropdown-item">
                <span class="drop-icon">📖</span>
                <span class="drop-text">Scalar API Reference</span>
              </a>
              <a :href="apiDocHref.replace('_scalar','_swagger')" target="_blank" class="dropdown-item">
                <span class="drop-icon">📋</span>
                <span class="drop-text">Swagger UI</span>
              </a>
              <div class="dropdown-divider" />
              <span class="dropdown-label">{{ $t('reelshort.downloadApp') }}</span>
              <a href="#" class="dropdown-item">
                <span class="drop-icon">📱</span>
                <span class="drop-text">{{ $t('reelshort.appStore') }}</span>
              </a>
              <a href="#" class="dropdown-item">
                <span class="drop-icon">🤖</span>
                <span class="drop-text">{{ $t('reelshort.googlePlay') }}</span>
              </a>
            </div>
          </div>

          <!-- User / Login -->
          <template v-if="isLoggedIn">
            <div class="nav-drop" @mouseenter="userMenuOpen = true" @mouseleave="closeUserMenu">
              <button class="nav-link nav-trigger" @click="toggleUserMenu">
                🪙 {{ coinBalance.toLocaleString() }}
                <span class="nav-arrow" :class="{ open: userMenuOpen }">▾</span>
              </button>
              <div v-if="userMenuOpen" class="dropdown dropdown-sm">
                <NuxtLink to="/coins" class="dropdown-item" @click="closeUserMenu">
                  <span class="drop-icon">🪙</span>
                  <span class="drop-text">{{ $t('reelshort.myCoins') }}</span>
                </NuxtLink>
                <div class="dropdown-divider" />
                <button class="dropdown-item w-full" @click="handleSignOut">
                  <span class="drop-icon">🚪</span>
                  <span class="drop-text">{{ $t('reelshort.signOut') }}</span>
                </button>
              </div>
            </div>
          </template>
          <NuxtLink v-else to="/login" class="nav-link nav-login">{{ $t('reelshort.login') }}</NuxtLink>

          <a :href="adminHref" target="_blank" class="nav-link nav-admin">{{ $t('reelshort.admin') }}</a>
          <NuxtLink to="/app" class="nav-link app-toggle" title="切换到 App 版">
            📱
          </NuxtLink>
          <LanguageSwitcher />
        </nav>
      </div>
    </header>

    <!-- ═══════════ HERO CAROUSEL ═══════════ -->
    <section class="carousel" @mouseenter="pauseCarousel" @mouseleave="resumeCarousel">
      <div class="carousel-track" :style="{ transform: `translateX(-${currentSlide * 100}%)` }">
        <div v-for="slide in carouselSlides" :key="slide.id" class="carousel-slide">
          <img :src="slide.poster_image || slide.cover_image" :alt="slide.title" class="slide-img" />
          <div class="slide-shade" />
          <div class="slide-body">
            <div class="slide-body-inner">
              <span class="slide-genre">{{ slide.genreName }}</span>
              <h2 class="slide-title">{{ slide.title }}</h2>
              <p class="slide-desc">{{ slide.description?.slice(0, 150) }}...</p>
              <div class="slide-stats">
                <span>⭐ {{ slide.rating || '4.5' }}</span>
                <span>·</span>
                <span>{{ slide.total_episodes }} {{ $t('reelshort.episodes') }}</span>
                <span>·</span>
                <span>{{ slide.free_episodes }} {{ $t('reelshort.free').toLowerCase() }}</span>
              </div>
              <NuxtLink :to="`/series/${slide.slug}`" class="slide-btn">
                {{ $t('reelshort.watchNow') }}
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <button v-if="carouselSlides.length > 1" class="carousel-arr arr-left" @click="prevSlide">‹</button>
      <button v-if="carouselSlides.length > 1" class="carousel-arr arr-right" @click="nextSlide">›</button>

      <div v-if="carouselSlides.length > 1" class="carousel-dots">
        <button v-for="(_, i) in carouselSlides" :key="i" class="carousel-dot" :class="{ on: currentSlide === i }" @click="goSlide(i)" />
      </div>
    </section>

    <!-- ═══════════ TRENDING RANKINGS ═══════════ -->
    <section class="sec sec-alt">
      <div class="sec-inner">
        <div class="sec-head">
          <h2 class="sec-title">{{ $t('reelshort.topRanked') }}</h2>
          <NuxtLink to="/browse" class="sec-more">{{ $t('reelshort.seeAll') }}</NuxtLink>
        </div>
        <div v-if="loading" class="empty">{{ $t('reelshort.loading') }}</div>
        <div v-else class="rank-list">
          <NuxtLink v-for="(s, i) in trendingSeries" :key="s.id" :to="`/series/${s.slug}`" class="rank-row">
            <span class="rank-num" :class="{ hot: i < 3 }">{{ i + 1 }}</span>
            <img :src="s.cover_image" :alt="s.title" class="rank-img" loading="lazy" />
            <div class="rank-info">
              <h3 class="rank-title">{{ s.title }}</h3>
              <div class="rank-meta">
                <span>⭐ {{ s.rating || '4.5' }}</span>
                <span>{{ s.total_episodes }} eps</span>
              </div>
            </div>
            <span class="rank-arrow">→</span>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- ═══════════ NEW RELEASES ═══════════ -->
    <section class="sec">
      <div class="sec-inner">
        <div class="sec-head">
          <h2 class="sec-title">🆕 {{ $t('reelshort.newReleases') }}</h2>
          <NuxtLink to="/browse" class="sec-more">{{ $t('reelshort.seeAll') }}</NuxtLink>
        </div>
        <div class="video-grid">
          <NuxtLink v-for="s in featuredSeries.slice(0, 6)" :key="'new-'+s.id" :to="`/series/${s.slug}`" class="video-card">
            <div class="video-card-img-wrap">
              <img :src="s.cover_image" :alt="s.title" class="video-card-img" loading="lazy" />
              <div class="video-card-play">▶</div>
              <div class="video-card-badge new-badge">NEW</div>
            </div>
            <div class="video-card-body">
              <h3 class="video-card-title">{{ s.title }}</h3>
              <div class="video-card-meta">
                <span class="video-card-rating">⭐ {{ s.rating || '4.5' }}</span>
                <span>{{ s.total_episodes }} eps</span>
              </div>
            </div>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- ═══════════ FREE HOT ═══════════ -->
    <section class="sec sec-alt">
      <div class="sec-inner">
        <div class="sec-head">
          <h2 class="sec-title">🆓 {{ $t('reelshort.freeHot') }}</h2>
          <NuxtLink to="/browse" class="sec-more">{{ $t('reelshort.seeAll') }}</NuxtLink>
        </div>
        <div class="video-grid">
          <NuxtLink v-for="s in trendingSeries.slice(0, 6)" :key="'free-'+s.id" :to="`/series/${s.slug}`" class="video-card">
            <div class="video-card-img-wrap">
              <img :src="s.cover_image" :alt="s.title" class="video-card-img" loading="lazy" />
              <div class="video-card-play">▶</div>
              <div class="video-card-badge free-badge">FREE {{ s.free_episodes }}</div>
            </div>
            <div class="video-card-body">
              <h3 class="video-card-title">{{ s.title }}</h3>
              <div class="video-card-meta">
                <span class="video-card-rating">⭐ {{ s.rating || '4.5' }}</span>
                <span>{{ s.free_episodes }}/{{ s.total_episodes }} 免费</span>
              </div>
            </div>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- ═══════════ BINGE WORTHY ═══════════ -->
    <section class="sec">
      <div class="sec-inner">
        <div class="sec-head">
          <h2 class="sec-title">🎬 {{ $t('reelshort.bingeBadge') }}</h2>
          <NuxtLink to="/browse" class="sec-more">{{ $t('reelshort.seeAll') }}</NuxtLink>
        </div>
        <div class="video-grid">
          <NuxtLink v-for="s in trendingSeries.slice(3, 9)" :key="'binge-'+s.id" :to="`/series/${s.slug}`" class="video-card">
            <div class="video-card-img-wrap">
              <img :src="s.cover_image" :alt="s.title" class="video-card-img" loading="lazy" />
              <div class="video-card-play">▶</div>
              <div class="video-card-dur">{{ s.total_episodes }} eps</div>
            </div>
            <div class="video-card-body">
              <h3 class="video-card-title">{{ s.title }}</h3>
              <div class="video-card-meta">
                <span class="video-card-rating">⭐ {{ s.rating || '4.5' }}</span>
                <span class="video-card-views">{{ ((s.view_count || 0) / 10000).toFixed(0) }}万 views</span>
              </div>
            </div>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- ═══════════ FOOTER ═══════════ -->
    <footer class="ftr">
      <div class="ftr-inner">
        <div class="ftr-left">
          <span class="ftr-logo">🎬 ReelShort</span>
          <span class="ftr-tag">— {{ $t('reelshort.tagline') }}</span>
        </div>
        <div class="ftr-links">
          <NuxtLink to="/browse">Browse</NuxtLink>
          <a :href="adminHref" target="_blank">Admin</a>
          <a :href="apiDocHref" target="_blank">API</a>
        </div>
        <span class="ftr-copy">{{ $t('reelshort.footerCopy') }}</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* ═══════════════════════════════════════════════
   REELSHORT HOMEPAGE — Dark theme, carousel, all links
   ═══════════════════════════════════════════════ */

.home-root { min-height: 100vh; background: #050510; color: #e2e8f0; font-family: var(--font-sans); overflow-x: hidden; }

/* ─── HEADER ─── */
.home-header { position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: rgba(5,5,16,0.9); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255,255,255,0.05); }
.header-inner { max-width: 1300px; margin: 0 auto; padding: 0 24px; height: 60px; display: flex; align-items: center; justify-content: space-between; }
.logo { display: flex; align-items: center; gap: 8px; text-decoration: none; flex-shrink: 0; }
.logo-icon { font-size: 1.25rem; }
.logo-text { font-weight: 800; font-size: 1.15rem; color: #f1f5f9; letter-spacing: -0.02em; }
.nav-links { display: flex; gap: 2px; align-items: center; height: 36px; }
.nav-link { display: inline-flex; align-items: center; gap: 4px; padding: 6px 14px; border-radius: 8px; font-size: 0.8125rem; font-weight: 500; line-height: 1.5; color: #94a3b8; text-decoration: none; transition: all 0.15s; white-space: nowrap; background: none; border: none; cursor: pointer; font-family: inherit; height: 32px; }
.nav-link:hover { color: #f1f5f9; background: rgba(255,255,255,0.06); }
.nav-trigger { padding-right: 10px; }
.nav-arrow { font-size: 0.55rem; transition: transform 0.15s; opacity: 0.4; margin-left: 1px; }
.nav-arrow.open { transform: rotate(180deg); opacity: 1; }
.nav-login { background: rgba(245,158,11,0.1); color: #f59e0b; border: 1px solid rgba(245,158,11,0.2); font-weight: 600; }
.nav-login:hover { background: rgba(245,158,11,0.18); color: #fbbf24; }
.nav-admin { background: rgba(99,102,241,0.1); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.18); }
.nav-admin:hover { background: rgba(99,102,241,0.2); color: #c7d2fe; }
.app-toggle { font-size: 1rem; padding: 6px 10px; width: 36px; justify-content: center; }

/* 统一 LanguageSwitcher 样式 */
:deep(.lang-switch-btn) {
  display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; border-radius: 8px;
  font-size: 0.8125rem; font-weight: 500; line-height: 1.5; color: #94a3b8;
  background: none; border: none; cursor: pointer; font-family: inherit; height: 32px;
  transition: all 0.15s;
}
:deep(.lang-switch-btn:hover) { color: #f1f5f9; background: rgba(255,255,255,0.06); }
:deep(.lang-icon) { font-size: 0.9rem; }
:deep(.lang-label) { font-size: 0.8125rem; }

/* ─── DROPDOWNS ─── */
.nav-drop { position: relative; }
.nav-drop::after { content: ''; position: absolute; top: 100%; left: 0; right: 0; height: 8px; }
.dropdown { position: absolute; top: calc(100% + 8px); left: 0; min-width: 240px; background: #0f0f1a; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; box-shadow: 0 16px 40px rgba(0,0,0,0.6); padding: 6px; z-index: 200; }
.dropdown-wide { min-width: 220px; }
.dropdown-sm { min-width: 180px; right: 0; left: auto; }
.dropdown-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px; font-size: 0.8rem; color: #94a3b8; text-decoration: none; transition: all 0.1s; background: none; border: none; cursor: pointer; font-family: inherit; width: 100%; text-align: left; }
.dropdown-item:hover { background: rgba(255,255,255,0.05); color: #e2e8f0; }
.w-full { width: 100%; }
.drop-icon { font-size: 0.9rem; flex-shrink: 0; }
.drop-text { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.drop-badge { font-size: 0.6rem; padding: 2px 6px; border-radius: 4px; background: rgba(99,102,241,0.2); color: #a5b4fc; font-weight: 700; }
.dropdown-empty { padding: 12px; text-align: center; color: #64748b; font-size: 0.75rem; }
.dropdown-divider { height: 1px; background: rgba(255,255,255,0.06); margin: 4px 8px; }
.dropdown-label { display: block; padding: 6px 12px 2px; font-size: 0.65rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; }

/* ─── CAROUSEL ─── */
.carousel { position: relative; width: 100%; height: 88vh; overflow: hidden; }
.carousel-track { display: flex; height: 100%; transition: transform 0.7s cubic-bezier(0.16, 1, 0.3, 1); }
.carousel-slide { min-width: 100%; height: 100%; position: relative; display: flex; align-items: flex-end; justify-content: center; }
.slide-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: brightness(0.35); }
.slide-shade { position: absolute; inset: 0; background: linear-gradient(to top, #050510 0%, rgba(5,5,16,0.5) 35%, rgba(5,5,16,0.05) 100%); }
.slide-body { position: relative; z-index: 2; width: 100%; max-width: 1300px; padding: 0 24px 90px; }
.slide-body-inner { max-width: 600px; }
.slide-genre { display: inline-block; padding: 5px 14px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; color: #fbbf24; background: rgba(245,158,11,0.12); border: 1px solid rgba(245,158,11,0.2); margin-bottom: 14px; }
.slide-title { font-size: clamp(1.8rem, 4vw, 2.8rem); font-weight: 900; line-height: 1.1; color: #fff; margin-bottom: 10px; letter-spacing: -0.03em; }
.slide-desc { font-size: 0.9rem; color: #94a3b8; line-height: 1.6; margin-bottom: 10px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.slide-stats { display: flex; gap: 8px; font-size: 0.8rem; color: #64748b; margin-bottom: 18px; }
.slide-btn { display: inline-flex; padding: 13px 30px; border-radius: 10px; font-size: 0.9rem; font-weight: 700; color: #fff; background: linear-gradient(135deg, #6366f1, #8b5cf6); text-decoration: none; box-shadow: 0 4px 20px rgba(99,102,241,0.35); transition: all 0.2s; }
.slide-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(99,102,241,0.5); }

.carousel-arr { position: absolute; top: 50%; transform: translateY(-50%); z-index: 10; width: 44px; height: 44px; border-radius: 50%; border: none; cursor: pointer; background: rgba(255,255,255,0.08); color: #fff; font-size: 1.6rem; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(8px); transition: all 0.2s; line-height: 1; }
.carousel-arr:hover { background: rgba(255,255,255,0.18); }
.arr-left { left: 20px; }
.arr-right { right: 20px; }

.carousel-dots { position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); display: flex; gap: 8px; z-index: 10; }
.carousel-dot { width: 8px; height: 8px; border-radius: 50%; border: none; cursor: pointer; background: rgba(255,255,255,0.2); transition: all 0.2s; padding: 0; }
.carousel-dot.on { background: #818cf8; box-shadow: 0 0 10px rgba(129,140,248,0.5); transform: scale(1.2); }

/* ─── SECTIONS ─── */
.sec { padding: 60px 24px; }
.sec-alt { background: rgba(255,255,255,0.01); border-top: 1px solid rgba(255,255,255,0.03); }
.sec-inner { max-width: 1300px; margin: 0 auto; }
.sec-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 24px; }
.sec-title { font-size: 1.4rem; font-weight: 800; color: #f1f5f9; letter-spacing: -0.02em; }
.sec-more { font-size: 0.85rem; color: #818cf8; text-decoration: none; font-weight: 600; }
.sec-more:hover { color: #a5b4fc; }
.empty { text-align: center; padding: 60px 0; color: #64748b; }

/* ─── RANKINGS ─── */
.rank-list { border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; overflow: hidden; background: rgba(255,255,255,0.015); }
.rank-row { display: flex; align-items: center; gap: 16px; padding: 15px 20px; text-decoration: none; color: inherit; transition: background 0.12s; border-bottom: 1px solid rgba(255,255,255,0.03); }
.rank-row:last-child { border-bottom: none; }
.rank-row:hover { background: rgba(255,255,255,0.03); }
.rank-row:hover .rank-arrow { opacity: 1; transform: translateX(0); }
.rank-num { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 700; color: #64748b; background: rgba(255,255,255,0.05); flex-shrink: 0; }
.rank-num.hot { background: linear-gradient(135deg, #6366f1, #4f46e5); color: #fff; box-shadow: 0 2px 8px rgba(99,102,241,0.3); }
.rank-img { width: 54px; height: 76px; object-fit: cover; border-radius: 8px; flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.4); }
.rank-info { flex: 1; min-width: 0; }
.rank-title { font-size: 0.9rem; font-weight: 600; color: #e2e8f0; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 4px; }
.rank-meta { display: flex; gap: 14px; font-size: 0.78rem; color: #94a3b8; }
.rank-arrow { font-size: 1rem; color: #64748b; opacity: 0; transform: translateX(-6px); transition: all 0.2s; flex-shrink: 0; }

/* ─── VIDEO GRID ─── */
.video-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 18px; }
.video-card { text-decoration: none; color: inherit; border-radius: 14px; overflow: hidden; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); transition: all 0.25s; }
.video-card:hover { transform: translateY(-4px); border-color: rgba(99,102,241,0.3); box-shadow: 0 12px 32px rgba(0,0,0,0.4); }
.video-card-img-wrap { position: relative; aspect-ratio: 2/3; overflow: hidden; }
.video-card-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s; }
.video-card:hover .video-card-img { transform: scale(1.05); }
.video-card-play {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.35); opacity: 0; transition: opacity 0.3s;
  font-size: 2.2rem; color: #fff;
}
.video-card:hover .video-card-play { opacity: 1; }
.video-card-dur {
  position: absolute; bottom: 8px; right: 8px; padding: 3px 8px; border-radius: 6px;
  font-size: 0.7rem; font-weight: 600; color: #fff; background: rgba(0,0,0,0.7);
}
.video-card-badge {
  position: absolute; top: 8px; left: 8px; padding: 3px 8px; border-radius: 6px;
  font-size: 0.65rem; font-weight: 700; color: #fff;
}
.new-badge { background: linear-gradient(135deg, #f59e0b, #d97706); }
.free-badge { background: linear-gradient(135deg, #22c55e, #16a34a); }
.video-card-body { padding: 12px 14px; }
.video-card-title { font-size: 0.85rem; font-weight: 600; color: #e2e8f0; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 6px; }
.video-card-meta { display: flex; justify-content: space-between; font-size: 0.72rem; color: #64748b; }
.video-card-rating { color: #fbbf24; }

/* ─── FOOTER ─── */
.ftr { padding: 32px 24px; border-top: 1px solid rgba(255,255,255,0.04); background: rgba(0,0,0,0.2); }
.ftr-inner { max-width: 1300px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; font-size: 0.8rem; color: #475569; }
.ftr-left { display: flex; align-items: center; gap: 6px; }
.ftr-logo { font-weight: 700; color: #94a3b8; }
.ftr-tag { color: #64748b; }
.ftr-links { display: flex; gap: 16px; }
.ftr-links a { color: #475569; text-decoration: none; }
.ftr-links a:hover { color: #94a3b8; }
.ftr-copy { color: #334155; }

/* ─── RESPONSIVE ─── */
@media (max-width: 768px) {
  .carousel { height: 65vh; }
  .slide-body { padding: 0 24px 60px; }
  .slide-title { font-size: 1.5rem; }
  .slide-desc { font-size: 0.8rem; }
  .carousel-arr { width: 36px; height: 36px; font-size: 1.2rem; }
  .arr-left { left: 8px; } .arr-right { right: 8px; }
  .genres-grid { grid-template-columns: repeat(3, 1fr); }
  .video-grid { grid-template-columns: repeat(3, 1fr); }
  .ftr-inner { flex-direction: column; text-align: center; }
}
@media (max-width: 480px) {
  .carousel { height: 55vh; }
  .slide-body { padding: 0 16px 48px; }
  .slide-title { font-size: 1.2rem; }
  .slide-desc { display: none; }
  .slide-stats { font-size: 0.7rem; }
  .genres-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .genre-card { padding: 20px 10px 16px; min-height: 100px; }
  .video-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
}
</style>
