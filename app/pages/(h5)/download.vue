<script setup lang="ts">
import { ref } from 'vue'

const { t } = useI18n()
useAppSEO({
  title: () => `ReelShort — ${t('reelshort.downloadApp')}`,
  description: () => t('reelshort.heroDesc'),
})

const features = [
  { icon: '🎬', title: t('reelshort.step1Title'), desc: t('reelshort.step1Desc') },
  { icon: '🪙', title: t('reelshort.step2Title'), desc: t('reelshort.step2Desc') },
  { icon: '🔓', title: t('reelshort.step3Title'), desc: t('reelshort.step3Desc') },
  { icon: '📱', title: 'Watch Anywhere', desc: 'Stream on your phone, tablet, or desktop. Pick up where you left off.' },
]

const reviews = [
  { name: 'Sarah M.', rating: 5, text: 'Finally a drama app that gets me! The stories are so addictive.' },
  { name: 'Jason L.', rating: 5, text: 'Perfect for my commute. 2-minute episodes that keep me hooked.' },
  { name: 'Emily C.', rating: 4, text: 'Great selection of genres. The coin system is fair and easy to use.' },
]
</script>

<template>
  <div class="download-root">
    <!-- Hero -->
    <section class="dl-hero">
      <span class="dl-badge">{{ $t('reelshort.tagline') }}</span>
      <h1 class="dl-title">ReelShort</h1>
      <p class="dl-desc">{{ $t('reelshort.heroDesc') }}</p>
      <div class="dl-phone-mockup">
        <div class="mockup-screen">
          <span class="mockup-icon">🎬</span>
          <span class="mockup-text">ReelShort</span>
        </div>
      </div>
      <div class="dl-buttons">
        <a href="#" class="dl-btn dl-btn-ios">
          <span class="dl-btn-icon">📱</span>
          <div>
            <span class="dl-btn-label">Download on the</span>
            <span class="dl-btn-name">App Store</span>
          </div>
        </a>
        <a href="#" class="dl-btn dl-btn-android">
          <span class="dl-btn-icon">🤖</span>
          <div>
            <span class="dl-btn-label">Get it on</span>
            <span class="dl-btn-name">Google Play</span>
          </div>
        </a>
      </div>
      <p class="dl-qr-hint">Scan QR code to download ↓</p>
      <div class="dl-qr">[QR]</div>
    </section>

    <!-- Features -->
    <section class="dl-section">
      <h2 class="dl-section-title">Why ReelShort?</h2>
      <div class="dl-features">
        <div v-for="f in features" :key="f.title" class="dl-feature-card">
          <span class="dl-feature-icon">{{ f.icon }}</span>
          <h3 class="dl-feature-title">{{ f.title }}</h3>
          <p class="dl-feature-desc">{{ f.desc }}</p>
        </div>
      </div>
    </section>

    <!-- Screenshots -->
    <section class="dl-section dl-screenshots">
      <h2 class="dl-section-title">Screenshots</h2>
      <div class="screenshot-scroll">
        <div v-for="i in 4" :key="i" class="screenshot-card">
          <div class="screenshot-placeholder">{{ i }}</div>
        </div>
      </div>
    </section>

    <!-- Reviews -->
    <section class="dl-section">
      <h2 class="dl-section-title">{{ $t('review.title') }}</h2>
      <div class="dl-reviews">
        <div v-for="r in reviews" :key="r.name" class="dl-review-card">
          <div class="review-stars">{{ '⭐'.repeat(r.rating) }}</div>
          <p class="review-text">"{{ r.text }}"</p>
          <span class="review-author">— {{ r.name }}</span>
        </div>
      </div>
    </section>

    <!-- Bottom CTA -->
    <section class="dl-bottom-cta">
      <h2>Ready to start watching?</h2>
      <p>Download ReelShort and get 5 free episodes on every series.</p>
      <div class="dl-buttons">
        <a href="#" class="dl-btn dl-btn-ios">
          <span class="dl-btn-icon">📱</span>
          <div>
            <span class="dl-btn-label">Download on the</span>
            <span class="dl-btn-name">App Store</span>
          </div>
        </a>
        <a href="#" class="dl-btn dl-btn-android">
          <span class="dl-btn-icon">🤖</span>
          <div>
            <span class="dl-btn-label">Get it on</span>
            <span class="dl-btn-name">Google Play</span>
          </div>
        </a>
      </div>
    </section>

    <footer class="dl-footer">
      <NuxtLink to="/" class="dl-back">← {{ $t('reelshort.siteName') }}</NuxtLink>
    </footer>
  </div>
</template>

<style scoped>
.download-root { min-height: 100dvh; background: #f8fafc; color: #0f172a; font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; }

/* Hero */
.dl-hero { text-align: center; padding: 60px 24px 40px; background: linear-gradient(180deg, #eef2ff 0%, #f8fafc 100%); }
.dl-badge { display: inline-block; padding: 6px 16px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; color: #6366f1; background: #ffffff; border: 1px solid #e0e7ff; margin-bottom: 16px; }
.dl-title { font-size: 2.5rem; font-weight: 900; letter-spacing: -0.03em; color: #0f172a; margin-bottom: 8px; }
.dl-desc { font-size: 0.9375rem; color: #475569; line-height: 1.6; max-width: 320px; margin: 0 auto 28px; }

.dl-phone-mockup { width: 160px; height: 320px; background: #0f172a; border-radius: 24px; margin: 0 auto 28px; display: flex; align-items: center; justify-content: center; box-shadow: 0 20px 48px rgba(0,0,0,0.12); }
.mockup-screen { text-align: center; }
.mockup-icon { font-size: 2rem; display: block; }
.mockup-text { font-size: 0.875rem; color: #e2e8f0; font-weight: 700; }

.dl-buttons { display: flex; flex-direction: column; gap: 10px; max-width: 280px; margin: 0 auto; }
.dl-btn { display: flex; align-items: center; gap: 10px; padding: 12px 20px; border-radius: 12px; text-decoration: none; transition: all 0.15s; }
.dl-btn-ios { background: #0f172a; color: #fff; }
.dl-btn-ios:hover { background: #1e293b; }
.dl-btn-android { background: #ffffff; color: #0f172a; border: 1px solid #cbd5e1; }
.dl-btn-android:hover { background: #f1f5f9; }
.dl-btn-icon { font-size: 1.5rem; flex-shrink: 0; }
.dl-btn-label { display: block; font-size: 0.625rem; opacity: 0.7; line-height: 1.3; }
.dl-btn-name { display: block; font-size: 1rem; font-weight: 700; line-height: 1.3; }

.dl-qr-hint { font-size: 0.75rem; color: #94a3b8; margin-top: 20px; }
.dl-qr { width: 100px; height: 100px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 12px; margin: 8px auto 0; display: flex; align-items: center; justify-content: center; color: #cbd5e1; font-size: 0.75rem; }

/* Sections */
.dl-section { padding: 48px 24px; }
.dl-section-title { font-size: 1.25rem; font-weight: 800; text-align: center; margin-bottom: 24px; }

/* Features */
.dl-features { display: flex; flex-direction: column; gap: 12px; }
.dl-feature-card { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 24px 20px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; }
.dl-feature-icon { font-size: 2rem; margin-bottom: 12px; }
.dl-feature-title { font-size: 1rem; font-weight: 700; margin-bottom: 4px; }
.dl-feature-desc { font-size: 0.8125rem; color: #64748b; line-height: 1.5; }

/* Screenshots */
.dl-screenshots { background: #ffffff; border-top: 1px solid #e8ecf1; border-bottom: 1px solid #e8ecf1; }
.screenshot-scroll { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 8px; }
.screenshot-card { min-width: 160px; height: 320px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 16px; display: flex; align-items: center; justify-content: center; color: #cbd5e1; font-size: 1.5rem; }

/* Reviews */
.dl-reviews { display: flex; flex-direction: column; gap: 12px; }
.dl-review-card { padding: 20px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; }
.review-stars { font-size: 0.75rem; margin-bottom: 8px; }
.review-text { font-size: 0.875rem; color: #334155; line-height: 1.6; margin-bottom: 8px; }
.review-author { font-size: 0.75rem; color: #94a3b8; font-weight: 500; }

/* Bottom CTA */
.dl-bottom-cta { text-align: center; padding: 48px 24px; background: #eef2ff; }
.dl-bottom-cta h2 { font-size: 1.25rem; font-weight: 800; margin-bottom: 8px; }
.dl-bottom-cta p { font-size: 0.875rem; color: #475569; margin-bottom: 24px; }

.dl-footer { text-align: center; padding: 24px; }
.dl-back { color: #6366f1; text-decoration: none; font-size: 0.875rem; font-weight: 500; }
</style>
