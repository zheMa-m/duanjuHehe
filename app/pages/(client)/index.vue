<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'

const { t } = useI18n()
const { localeLabel, toggleLocale } = useLocaleDetect()
const baseUrl = useRuntimeConfig().public.baseUrl

useAppSEO({
  title: () => t('home.title'),
  description: () => t('home.description'),
  url: baseUrl,
})

const features = computed(() => [
  {
    icon: '🏗️',
    title: t('home.featureArch'),
    desc: t('home.featureArchDesc'),
    link: '/architecture',
    tag: 'SSR',
    tagColor: 'cyan',
  },
  {
    icon: '📋',
    title: t('home.featureTasks'),
    desc: t('home.featureTasksDesc'),
    link: '/tasks',
    tag: 'ISR',
    tagColor: 'purple',
  },
  {
    icon: '📱',
    title: t('home.featureH5'),
    desc: t('home.featureH5Desc'),
    link: `${baseUrl}/h5/promo`,
    external: true,
    tag: 'SWR',
    tagColor: 'orange',
  },
  {
    icon: '⚙️',
    title: t('home.featureAdmin'),
    desc: t('home.featureAdminDesc'),
    link: `${baseUrl}/admin`,
    external: true,
    tag: 'SPA',
    tagColor: 'green',
  },
])

const tools = computed(() => [
  {
    icon: '📡',
    title: t('home.toolApi'),
    desc: t('home.toolApiDesc'),
    link: '/_scalar',
  },
  {
    icon: '🔧',
    title: t('home.toolSwagger'),
    desc: t('home.toolSwaggerDesc'),
    link: '/_swagger',
  },
  {
    icon: '📊',
    title: t('home.toolOpenapi'),
    desc: t('home.toolOpenapiDesc'),
    link: '/_openapi.json',
  },
])

let revealObserver: IntersectionObserver | null = null

onMounted(() => {
  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible')
        revealObserver!.unobserve(entry.target)
      }
    })
  }, { threshold: 0.15 })
  document.querySelectorAll('.reveal').forEach(el => revealObserver!.observe(el))
})

onBeforeUnmount(() => {
  revealObserver?.disconnect()
  revealObserver = null
})
</script>

<template>
  <div class="home-root">
    <!-- TOP NAV -->
    <header class="home-header">
      <div class="home-header-left">
        <span class="logo-dot"></span>
        <span class="logo-label">HEHE</span>
      </div>
      <nav class="home-header-nav">
        <NuxtLink to="/architecture" class="nav-link">{{ t('home.navArch') }}</NuxtLink>
        <NuxtLink to="/tasks" class="nav-link">{{ t('home.navTasks') }}</NuxtLink>
        <a :href="`${baseUrl}/h5/promo`" class="nav-link" target="_blank">{{ t('home.navH5') }}</a>
        <a :href="`${baseUrl}/admin`" class="nav-link nav-link-primary" target="_blank">{{ t('home.navAdmin') }}</a>
        <a href="https://github.com/astrayon/hehe-app" class="nav-link github-btn" target="_blank" rel="noopener">
          <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
          {{ t('home.navGitHub') }}
        </a>
        <button @click="toggleLocale" class="nav-link locale-btn">
          🌐 {{ localeLabel === '中文' ? 'EN' : '中' }}
        </button>
      </nav>
    </header>

    <!-- HERO -->
    <section class="home-hero">
      <div class="hero-glow"></div>
      <div class="hero-grid-bg"></div>
      <div class="hero-content">
        <div class="hero-badge">
          <span class="badge-dot"></span>
          {{ t('home.badge') }}
        </div>
        <h1 class="hero-title">{{ t('home.heroTitle') }}</h1>
        <p class="hero-desc">{{ t('home.heroDesc') }}</p>
        <div class="hero-actions">
          <NuxtLink to="/architecture" class="btn btn-primary">
            {{ t('home.ctaArch') }}
          </NuxtLink>
          <a :href="`${baseUrl}/h5/promo`" target="_blank" class="btn btn-secondary">
            {{ t('home.ctaH5') }}
            <span class="btn-arrow">↗</span>
          </a>
        </div>
      </div>
    </section>

    <!-- TECH STACK -->
    <section class="home-stack">
      <div class="stack-inner reveal">
        <h2 class="section-title">{{ t('home.stackTitle') }}</h2>
        <div class="stack-pills">
          <span class="pill" v-for="tech in ['Nuxt 4', 'Vue 3', 'Supabase', 'Vercel', 'TypeScript', 'UnoCSS', 'Stripe', 'i18n']" :key="tech">
            {{ tech }}
          </span>
        </div>
      </div>
    </section>

    <!-- FEATURES -->
    <section class="home-features">
      <div class="features-inner">
        <h2 class="section-title reveal">{{ t('home.featuresTitle') }}</h2>
        <p class="section-desc reveal">{{ t('home.featuresDesc') }}</p>
        <div class="features-grid">
          <NuxtLink
            v-for="f in features"
            :key="f.link"
            :to="f.link"
            :external="f.external"
            :target="f.external ? '_blank' : undefined"
            class="feature-card reveal"
          >
            <div class="feature-icon">{{ f.icon }}</div>
            <div class="feature-body">
              <div class="feature-header">
                <h3>{{ f.title }}</h3>
                <span class="feature-tag" :class="`tag-${f.tagColor}`">{{ f.tag }}</span>
              </div>
              <p>{{ f.desc }}</p>
            </div>
            <span class="feature-arrow">→</span>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- DEV TOOLS -->
    <section class="home-tools">
      <div class="tools-inner">
        <h2 class="section-title reveal">{{ t('home.toolsTitle') }}</h2>
        <p class="section-desc reveal">{{ t('home.toolsDesc') }}</p>
        <div class="tools-grid">
          <a
            v-for="tool in tools"
            :key="tool.link"
            :href="tool.link"
            target="_blank"
            class="tool-card reveal"
          >
            <span class="tool-icon">{{ tool.icon }}</span>
            <h3>{{ tool.title }}</h3>
            <p>{{ tool.desc }}</p>
          </a>
        </div>
      </div>
    </section>

    <!-- FOOTER -->
    <footer class="home-footer">
      <div class="footer-inner">
        <div class="footer-left">
          <span class="logo-dot"></span>
          <span class="logo-label">HEHE</span>
          <span class="footer-copy">© 2026 · Solo Full-Stack Harness</span>
        </div>
        <div class="footer-links">
          <a href="https://github.com" target="_blank" class="footer-link">GitHub</a>
          <NuxtLink to="/architecture" class="footer-link">{{ t('home.navArch') }}</NuxtLink>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* ── ROOT ── */
.home-root {
  min-height: 100vh;
  background: #0a0e1a;
  color: #e2e8f0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Noto Sans SC', sans-serif;
}

/* ── HEADER ── */
.home-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  height: 56px;
  background: rgba(10, 14, 26, 0.8);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(30, 45, 77, 0.5);
}

.home-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22d3ee;
  box-shadow: 0 0 8px rgba(34, 211, 238, 0.6);
}

.logo-label {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #e2e8f0;
}

.home-header-nav {
  display: flex;
  align-items: center;
  gap: 4px;
}

.nav-link {
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  font-size: 13px;
  color: #94a3b8;
  text-decoration: none;
  border-radius: 6px;
  transition: all 0.2s;
  border: none;
  background: none;
  cursor: pointer;
  font-family: inherit;
}

.nav-link:hover {
  color: #e2e8f0;
  background: rgba(255, 255, 255, 0.05);
}

.nav-link-primary {
  background: #4f8ef7;
  color: #ffffff;
  font-weight: 600;
}

.nav-link-primary:hover {
  background: #3b7ae0;
  color: #ffffff;
}

.locale-btn {
  font-size: 12px !important;
  padding: 4px 10px !important;
}

.github-btn {
  display: flex !important;
  align-items: center;
  gap: 6px;
}
.github-btn svg {
  flex-shrink: 0;
}

/* ── HERO ── */
.home-hero {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 85vh;
  padding: 120px 32px 80px;
  overflow: hidden;
  text-align: center;
}

.hero-glow {
  position: absolute;
  top: -20%;
  left: 50%;
  transform: translateX(-50%);
  width: 600px;
  height: 600px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(79, 142, 247, 0.12) 0%, rgba(139, 92, 246, 0.06) 50%, transparent 70%);
  pointer-events: none;
}

.hero-grid-bg {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(30, 45, 77, 0.15) 1px, transparent 1px),
    linear-gradient(90deg, rgba(30, 45, 77, 0.15) 1px, transparent 1px);
  background-size: 60px 60px;
  mask-image: radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 70%);
  pointer-events: none;
}

.hero-content {
  position: relative;
  max-width: 720px;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  font-size: 12px;
  font-weight: 600;
  color: #22d3ee;
  background: rgba(34, 211, 238, 0.08);
  border: 1px solid rgba(34, 211, 238, 0.2);
  border-radius: 9999px;
  margin-bottom: 24px;
}

.badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22d3ee;
}

.hero-title {
  font-size: 3rem;
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.03em;
  margin: 0 0 20px;
  background: linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-desc {
  font-size: 1.125rem;
  line-height: 1.7;
  color: #94a3b8;
  margin: 0 0 40px;
}

.hero-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 12px 28px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 10px;
  text-decoration: none;
  transition: all 0.2s;
  border: none;
  cursor: pointer;
  font-family: inherit;
}

.btn-primary {
  background: linear-gradient(135deg, #4f8ef7, #8b5cf6);
  color: #ffffff;
  box-shadow: 0 4px 20px rgba(79, 142, 247, 0.3);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(79, 142, 247, 0.4);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.06);
  color: #e2e8f0;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

.btn-arrow {
  font-size: 12px;
  opacity: 0.6;
}

/* ── STACK ── */
.home-stack {
  padding: 0 32px 60px;
}

.stack-inner, .features-inner, .tools-inner {
  max-width: 960px;
  margin: 0 auto;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 12px;
  color: #e2e8f0;
}

.section-desc {
  font-size: 0.9375rem;
  color: #94a3b8;
  margin: 0 0 32px;
  line-height: 1.6;
}

.stack-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.pill {
  padding: 8px 20px;
  font-size: 13px;
  font-weight: 500;
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(30, 45, 77, 0.6);
  border-radius: 9999px;
  transition: all 0.2s;
}

.pill:hover {
  color: #e2e8f0;
  border-color: rgba(79, 142, 247, 0.4);
  background: rgba(79, 142, 247, 0.06);
}

/* ── FEATURES ── */
.home-features {
  padding: 60px 32px 80px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.feature-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 24px;
  background: #131d35;
  border: 1px solid #1e2d4d;
  border-radius: 12px;
  text-decoration: none;
  color: inherit;
  transition: all 0.25s;
  position: relative;
}

.feature-card:hover {
  background: #1a2540;
  border-color: #243558;
  transform: translateY(-2px);
}

.feature-icon {
  font-size: 28px;
  flex-shrink: 0;
  margin-top: 2px;
}

.feature-body {
  flex: 1;
  min-width: 0;
}

.feature-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.feature-header h3 {
  font-size: 15px;
  font-weight: 600;
  margin: 0;
  color: #e2e8f0;
}

.feature-tag {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 9999px;
  letter-spacing: 0.05em;
}

.tag-cyan { background: rgba(34,211,238,0.15); color: #67e8f9; }
.tag-purple { background: rgba(139,92,246,0.15); color: #a78bfa; }
.tag-orange { background: rgba(245,158,11,0.15); color: #fbbf24; }
.tag-green { background: rgba(16,185,129,0.15); color: #34d399; }

.feature-body p {
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.6;
  margin: 0;
}

.feature-arrow {
  position: absolute;
  top: 24px;
  right: 20px;
  font-size: 16px;
  color: #64748b;
  opacity: 0;
  transform: translateX(-4px);
  transition: all 0.2s;
}

.feature-card:hover .feature-arrow {
  opacity: 1;
  transform: translateX(0);
}

/* ── TOOLS ── */
.home-tools {
  padding: 0 32px 80px;
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.tool-card {
  display: block;
  padding: 24px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(30, 45, 77, 0.4);
  border-radius: 12px;
  text-decoration: none;
  color: inherit;
  transition: all 0.25s;
}

.tool-card:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(79, 142, 247, 0.3);
}

.tool-icon {
  font-size: 24px;
  display: block;
  margin-bottom: 12px;
}

.tool-card h3 {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 6px;
  color: #e2e8f0;
}

.tool-card p {
  font-size: 12px;
  color: #64748b;
  margin: 0;
  line-height: 1.5;
}

/* ── FOOTER ── */
.home-footer {
  border-top: 1px solid rgba(30, 45, 77, 0.4);
  padding: 24px 32px;
}

.footer-inner {
  max-width: 960px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.footer-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.footer-copy {
  font-size: 12px;
  color: #64748b;
  margin-left: 12px;
}

.footer-links {
  display: flex;
  gap: 20px;
}

.footer-link {
  font-size: 13px;
  color: #64748b;
  text-decoration: none;
  transition: color 0.2s;
}

.footer-link:hover {
  color: #94a3b8;
}

/* ── LIGHT THEME (respects system preference) ── */
@media (prefers-color-scheme: light) {
  .home-root {
    background: #f8fafc;
    color: #1e293b;
  }
  .home-header {
    background: rgba(248, 250, 252, 0.85);
    border-bottom-color: rgba(0, 0, 0, 0.06);
  }
  .logo-label { color: #1e293b; }
  .nav-link {
    color: #475569;
    background: rgba(0, 0, 0, 0.04);
  }
  .nav-link:hover { color: #1e293b; }
  .locale-btn { color: #475569; border-color: rgba(0, 0, 0, 0.1); }
  .hero-title { color: #0f172a; }
  .hero-desc { color: #64748b; }
  .section-title { color: #0f172a; }
  .section-desc { color: #64748b; }
  .pill {
    background: rgba(0, 0, 0, 0.04);
    color: #475569;
    border-color: rgba(0, 0, 0, 0.08);
  }
  .btn-primary { box-shadow: 0 2px 8px rgba(79, 142, 247, 0.25); }
  .btn-secondary {
    color: #334155;
    border-color: rgba(0, 0, 0, 0.12);
    background: rgba(0, 0, 0, 0.03);
  }
  .btn-secondary:hover {
    background: rgba(0, 0, 0, 0.06);
    border-color: rgba(0, 0, 0, 0.18);
  }
  .feature-card {
    background: #ffffff;
    border-color: rgba(0, 0, 0, 0.08);
  }
  .feature-card:hover {
    border-color: rgba(79, 142, 247, 0.3);
    background: #f0f6ff;
  }
  .feature-card h3 { color: #1e293b; }
  .feature-card p { color: #64748b; }
  .feature-arrow { color: #94a3b8; }
  .tool-card {
    background: #ffffff;
    border-color: rgba(0, 0, 0, 0.08);
  }
  .tool-card:hover {
    border-color: rgba(79, 142, 247, 0.3);
    background: #f0f6ff;
  }
  .tool-card h3 { color: #1e293b; }
  .tool-card p { color: #64748b; }
  .home-footer {
    border-top-color: rgba(0, 0, 0, 0.06);
  }
  .footer-copy { color: #94a3b8; }
  .footer-link { color: #64748b; }
  .footer-link:hover { color: #475569; }
}

/* ── RESPONSIVE ── */
@media (max-width: 768px) {
  .home-header {
    padding: 0 16px;
  }
  .home-header-nav {
    gap: 2px;
  }
  .nav-link {
    padding: 6px 10px;
    font-size: 12px;
  }
  .hero-title {
    font-size: 2rem;
  }
  .hero-desc {
    font-size: 1rem;
  }
  .hero-actions {
    flex-direction: column;
    align-items: center;
  }
  .features-grid {
    grid-template-columns: 1fr;
  }
  .tools-grid {
    grid-template-columns: 1fr;
  }
  .footer-inner {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }
}

/* ===== SCROLL REVEAL ANIMATION ===== */
.reveal {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}
.reveal.visible {
  opacity: 1;
  transform: translateY(0);
}
/* Staggered delay for grid children */
.features-grid .reveal:nth-child(2) { transition-delay: 0.1s; }
.features-grid .reveal:nth-child(3) { transition-delay: 0.2s; }
.features-grid .reveal:nth-child(4) { transition-delay: 0.3s; }
.tools-grid .reveal:nth-child(2) { transition-delay: 0.1s; }
.tools-grid .reveal:nth-child(3) { transition-delay: 0.2s; }
</style>
