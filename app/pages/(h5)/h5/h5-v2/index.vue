<script setup lang="ts">
import { onMounted, computed, ref, watch } from 'vue'

/**
 * H5 V2 营销落地页 — Huashu Design 重构
 * Design: Glassmorphism refined × Swiss Grid × restrained Memphis
 * Accent: Warm amber #D4A853
 */

const subdomain = ref('h5-v2')

interface Campaign { subdomain: string; title: string; subtitle: string; badge: string; color_from: string; color_to: string }
interface CampaignResponse { success: boolean; message: string; timestamp: string; data: Campaign }

const email = ref('')
const phone = ref('')
const emailError = ref('')
const phoneError = ref('')
const isSubmitted = ref(false)
const isLoading = ref(false)
const isPurchasing = ref(false)

const showToast = ref(false)
const toastMessage = ref('')
const triggerToast = (msg: string) => {
  toastMessage.value = msg
  showToast.value = true
  setTimeout(() => { showToast.value = false }, 2500)
}

const { user, isLoggedIn, isAnonymous, signInAnonymously } = useAuth()
const { t } = useI18n()
const showLoginModal = ref(false)
const loginMode = ref<'login' | 'register' | 'bind'>('login')
const pendingAction = ref<(() => void) | null>(null)

const ticketNo = ref(Math.floor(Math.random() * 90000) + 10000)
const { createAndRedirect } = usePayment()

const currentProduct = computed(() => {
  return { id: 'p1', name: 'HEHE Pro 工具套件', price: 29.99 }
})

const ensureLoggedInForAction = (action: () => void): boolean => {
  if (!isLoggedIn.value) {
    loginMode.value = isAnonymous.value ? 'bind' : 'login'
    pendingAction.value = action
    showLoginModal.value = true
    return false
  }
  return true
}

const handlePurchase = async () => {
  if (!ensureLoggedInForAction(() => handlePurchase())) return
  isPurchasing.value = true
  try {
    await createAndRedirect({
      productId: currentProduct.value.id,
      productName: currentProduct.value.name,
      amount: currentProduct.value.price,
      currency: 'USD',
    })
  } catch (e: any) {
    triggerToast(e.data?.statusMessage || 'Payment failed, please try again')
  } finally {
    isPurchasing.value = false
  }
}

const copyTicketNo = async () => {
  try {
    await navigator.clipboard.writeText(ticketNo.value.toString())
    triggerToast(t('h5.ticketCopied'))
  } catch {
    triggerToast(t('h5.copyFailed'))
  }
}

const onLoginSuccess = () => {
  showLoginModal.value = false
  if (pendingAction.value) {
    const action = pendingAction.value
    pendingAction.value = null
    action()
  }
}

const showRegisterModal = () => { loginMode.value = 'register'; showLoginModal.value = true }
const handleLoginRequired = () => { loginMode.value = isAnonymous.value ? 'bind' : 'login'; showLoginModal.value = true }

const { data: response, error: fetchError } = await useFetch<CampaignResponse>(`/api/v1/campaigns/${subdomain.value}`)
const campaign = computed(() => response.value?.data)
const hasError = computed(() => !!fetchError.value || !campaign.value)

useAppSEO({
  title: () => campaign.value?.title || (hasError.value ? '活动未找到 - HEHE V2' : `${subdomain.value} - V2`),
  description: () => campaign.value?.subtitle || 'HEHE H5 V2',
})

watch(phone, () => { phoneError.value = '' })
watch(email, () => { emailError.value = '' })

const validateForm = (): boolean => {
  let valid = true
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const phoneRegex = /^1[3-9]\d{9}$/
  if (!phone.value) { phoneError.value = t('h5.phoneRequired'); valid = false }
  else if (!phoneRegex.test(phone.value)) { phoneError.value = t('h5.phoneInvalid'); valid = false }
  if (!email.value) { emailError.value = t('h5.emailRequired'); valid = false }
  else if (!emailRegex.test(email.value)) { emailError.value = t('h5.emailInvalid'); valid = false }
  return valid
}

const handleRegister = async () => {
  if (!validateForm()) return
  isLoading.value = true
  try {
    await $fetch<any>('/api/v1/campaigns/register', {
      method: 'POST',
      body: { phone: phone.value, email: email.value, subdomain: subdomain.value }
    })
    isSubmitted.value = true
  } catch (e: any) {
    triggerToast(e.data?.statusMessage || t('h5.registerFailed'))
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  if (!user.value) {
    try { await signInAnonymously() } catch (e) { console.error('H5 V2 anonymous login failed:', e) }
  }
})
</script>

<template>
  <div class="page-root">
    <H5LoginModal :visible="showLoginModal" :mode="loginMode" @close="showLoginModal = false" @success="onLoginSuccess" />

    <!-- 背景层：环境光晕 + Bauhaus 几何装饰 -->
    <div class="bg-layer" aria-hidden="true">
      <div class="glow glow--primary" /><div class="glow glow--secondary" />
      <div class="geo geo--ring" /><div class="geo geo--dot" /><div class="geo geo--line" />
    </div>

    <header class="header-bar">
      <H5UserBar @login="loginMode = 'login'; showLoginModal = true" @register="showRegisterModal" @logout="showLoginModal = false" />
    </header>

    <!-- 品牌跑马灯 -->
    <div class="marquee-bar" aria-hidden="true">
      <div class="marquee-track">
        <span class="marquee-content"><span class="marquee-sep">◆</span> HEHE H5 V2 <span class="marquee-sep">◆</span> GLASSMORPHISM <span class="marquee-sep">◆</span> STALE-WHILE-REVALIDATE <span class="marquee-sep">◆</span> CAMPAIGN ENGINE <span class="marquee-sep">◆</span> DYNAMIC PRODUCTS <span class="marquee-sep">◆</span> HEHE H5 V2 <span class="marquee-sep">◆</span> GLASSMORPHISM <span class="marquee-sep">◆</span> STALE-WHILE-REVALIDATE <span class="marquee-sep">◆</span> CAMPAIGN ENGINE <span class="marquee-sep">◆</span> DYNAMIC PRODUCTS </span>
        <span class="marquee-content"><span class="marquee-sep">◆</span> HEHE H5 V2 <span class="marquee-sep">◆</span> GLASSMORPHISM <span class="marquee-sep">◆</span> STALE-WHILE-REVALIDATE <span class="marquee-sep">◆</span> CAMPAIGN ENGINE <span class="marquee-sep">◆</span> DYNAMIC PRODUCTS <span class="marquee-sep">◆</span> HEHE H5 V2 <span class="marquee-sep">◆</span> GLASSMORPHISM <span class="marquee-sep">◆</span> STALE-WHILE-REVALIDATE <span class="marquee-sep">◆</span> CAMPAIGN ENGINE <span class="marquee-sep">◆</span> DYNAMIC PRODUCTS </span>
      </div>
    </div>

    <main class="main-content">
      <template v-if="!hasError">
        <!-- 营销主卡片（毛玻璃） -->
        <section class="glass-card anim-stagger" style="--i:0">
          <div v-if="!isSubmitted && campaign" class="card-body">
            <div class="hero-section">
              <span class="badge-pill"><span class="badge-diamond">◆</span> {{ campaign.badge }}</span>
              <h1 class="hero-title">{{ campaign.title }}</h1>
              <p class="hero-subtitle">{{ campaign.subtitle }}</p>
            </div>
            <form @submit.prevent="handleRegister" class="reg-form">
              <div class="field-group">
                <label class="field-label">{{ t('h5.phone') }}</label>
                <input v-model="phone" type="tel" :placeholder="t('h5.phonePlaceholder')" required class="field-input" />
                <span v-if="phoneError" class="field-error">{{ phoneError }}</span>
              </div>
              <div class="field-group">
                <label class="field-label">{{ t('h5.email') }}</label>
                <input v-model="email" type="email" :placeholder="t('h5.emailPlaceholder')" required class="field-input" />
                <span v-if="emailError" class="field-error">{{ emailError }}</span>
              </div>
              <button type="submit" :disabled="isLoading || !!phoneError || !!emailError" class="cta-btn">
                <span v-if="isLoading" class="cta-spinner" />
                {{ isLoading ? t('h5.submitting') : t('h5.reserveNow') }}
              </button>
            </form>
          </div>

          <!-- 成功态：电子票券 -->
          <div v-else-if="isSubmitted" class="success-state">
            <div class="success-icon-wrap"><div class="success-icon"><span class="i-lucide-check" /></div></div>
            <h2 class="success-title">{{ t('h5.registered') }}</h2>
            <div class="ticket-card">
              <div class="ticket-shimmer" aria-hidden="true" />
              <div class="ticket-inner">
                <div class="ticket-label">{{ t('h5.ticketTitle') }}</div>
                <div class="ticket-product">{{ currentProduct.name }}</div>
                <div class="ticket-row">
                  <span class="ticket-no">NO. {{ ticketNo }}</span>
                  <button @click="copyTicketNo" class="ticket-copy-btn">COPY</button>
                </div>
                <div class="ticket-divider" />
                <div class="ticket-meta">
                  <div class="ticket-meta-item"><span class="meta-key">CHANNEL</span><span class="meta-val">{{ subdomain }}</span></div>
                  <div class="ticket-meta-item"><span class="meta-key">STATUS</span><span class="meta-val meta-val--active">READY</span></div>
                </div>
              </div>
            </div>
            <button @click="isSubmitted = false; phone = ''; email = '';" class="link-btn">{{ t('h5.reRegister') }}</button>
            <button @click="handlePurchase" :disabled="isPurchasing" class="purchase-btn">
              {{ isPurchasing ? t('h5.processing') : t('h5.purchase', { name: currentProduct.name, price: currentProduct.price }) }}
            </button>
            <div class="share-section">
              <p class="share-label">{{ t('h5.shareTicket') }}</p>
              <div class="share-wrap">
                <SharedSocialShare :title="campaign?.title || currentProduct.name" :description="campaign?.subtitle || ''" :subdomain="subdomain" size="sm" />
              </div>
            </div>
          </div>
        </section>

        <!-- 用户评价区 -->
        <section class="glass-card anim-stagger" style="--i:1">
          <H5ReviewSection :subdomain="subdomain" @login-required="handleLoginRequired" />
        </section>
      </template>

      <!-- 404 / 异常态 -->
      <template v-else>
        <section class="glass-card glass-card--error anim-stagger" style="--i:0">
          <div class="error-state">
            <div class="error-icon-wrap"><div class="error-icon"><span class="i-lucide-power-off" /></div></div>
            <div class="error-text">
              <h2 class="error-title">{{ t('h5.campaignOffline') }}</h2>
              <p class="error-desc">{{ t('h5.campaignOfflineDesc') }} <code class="error-code">{{ subdomain }}</code></p>
            </div>
            <NuxtLink to="/" class="home-btn">{{ t('h5.goHome') }}</NuxtLink>
          </div>
        </section>
      </template>
    </main>

    <footer class="page-footer"><p class="footer-text">{{ t('h5.footerNote') }}</p></footer>

    <Transition name="toast">
      <div v-if="showToast" class="toast">{{ toastMessage }}</div>
    </Transition>
  </div>
</template>

<style scoped>
/* ═══════════════════════════════════════════════════════════
   Huashu Design — H5 V2 Glassmorphism Redesign
   Primary  → Glassmorphism refined (Digital Native)
   Secondary → Swiss Grid (Modernist Functionalism)
   Accent   → Memphis geometry (Emotional Expressionism)
   Accent: #D4A853 (warm amber — premium, non-AI-slop)
   Anti-AI-Slop: No purple gradients, no emoji icons,
   no left-border cards, text-wrap:pretty, real whitespace
   ═══════════════════════════════════════════════════════════ */

:root {
  --h5-base: #08080F;
  --h5-surface: rgba(255,255,255,0.04);
  --h5-surface-hover: rgba(255,255,255,0.06);
  --h5-border: rgba(255,255,255,0.08);
  --h5-border-strong: rgba(255,255,255,0.14);
  --h5-accent: #D4A853;
  --h5-accent-soft: rgba(212,168,83,0.12);
  --h5-accent-glow: rgba(212,168,83,0.25);
  --h5-text-1: #F1F5F9;
  --h5-text-2: #94A3B8;
  --h5-text-3: #64748B;
  --h5-error: #EF4444;
  --h5-success: #10B981;
  --h5-radius: 16px;
  --h5-radius-sm: 10px;
  --h5-ease: cubic-bezier(0.16,1,0.3,1);
  --h5-ease-spring: cubic-bezier(0.34,1.56,0.64,1);
}

.page-root {
  min-height: 100vh; min-height: 100dvh;
  background: var(--h5-base); color: var(--h5-text-1);
  display: flex; flex-direction: column; align-items: center;
  position: relative; overflow: hidden;
  font-family: Inter,-apple-system,BlinkMacSystemFont,'Noto Sans SC',sans-serif;
  -webkit-font-smoothing: antialiased;
}
::selection { background: var(--h5-accent); color: var(--h5-base); }

/* ── Background Layer ── */
.bg-layer { position: absolute; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
.glow { position: absolute; border-radius: 50%; filter: blur(100px); }
.glow--primary {
  width: 65vw; max-width: 420px; aspect-ratio: 1;
  background: radial-gradient(circle, var(--h5-accent-glow), transparent 70%);
  top: -15%; right: -25%; opacity: 0.35;
  animation: glow-drift 14s ease-in-out infinite alternate;
}
.glow--secondary {
  width: 45vw; max-width: 300px; aspect-ratio: 1;
  background: radial-gradient(circle, rgba(100,116,139,0.12), transparent 70%);
  bottom: 5%; left: -20%; opacity: 0.5;
  animation: glow-drift 18s ease-in-out infinite alternate-reverse;
}
.geo { position: absolute; pointer-events: none; }
.geo--ring {
  width: 140px; height: 140px;
  border: 1.5px solid rgba(212,168,83,0.06); border-radius: 50%;
  top: 18%; left: -30px; animation: geo-float 22s ease-in-out infinite;
}
.geo--dot {
  width: 6px; height: 6px; background: var(--h5-accent);
  border-radius: 50%; opacity: 0.12; top: 42%; right: 24px;
  animation: geo-float 16s ease-in-out infinite reverse;
}
.geo--line {
  width: 50px; height: 1.5px;
  background: linear-gradient(90deg,transparent,rgba(212,168,83,0.08),transparent);
  bottom: 28%; right: 12%; transform: rotate(-35deg);
  animation: geo-float 20s ease-in-out infinite;
}

.header-bar { width: 100%; max-width: 672px; z-index: 20; position: sticky; top: 0; }

/* ── Marquee ── */
.marquee-bar {
  width: 100%; overflow: hidden; z-index: 10; margin-top: 12px;
  padding: 7px 0; border-top: 1px solid var(--h5-border);
  border-bottom: 1px solid var(--h5-border);
  background: var(--h5-surface); user-select: none;
}
.marquee-track { display: flex; width: max-content; animation: marquee-slide 40s linear infinite; }
.marquee-content {
  white-space: nowrap; font-size: 9px; font-weight: 700;
  letter-spacing: 0.18em; color: var(--h5-accent); opacity: 0.5;
  padding-right: 2em; font-family: 'JetBrains Mono',monospace;
}
.marquee-sep { opacity: 0.35; font-size: 6px; vertical-align: middle; }

.main-content {
  width: 100%; max-width: 448px; padding: 28px 16px 40px;
  z-index: 10; display: flex; flex-direction: column; gap: 20px;
  flex: 1; justify-content: center;
}

/* ── Glass Card ── */
.glass-card {
  background: var(--h5-surface);
  backdrop-filter: blur(28px) saturate(130%);
  -webkit-backdrop-filter: blur(28px) saturate(130%);
  border: 1px solid var(--h5-border); border-radius: var(--h5-radius);
  padding: 24px; position: relative; overflow: hidden;
  transition: border-color 0.4s var(--h5-ease), box-shadow 0.4s var(--h5-ease);
}
.glass-card::before {
  content: ''; position: absolute; top: 0; left: 16px; right: 16px; height: 1px;
  background: linear-gradient(90deg,transparent,rgba(255,255,255,0.08) 30%,rgba(255,255,255,0.12) 50%,rgba(255,255,255,0.08) 70%,transparent);
  pointer-events: none;
}
.glass-card--error { border-color: rgba(239,68,68,0.15); }
.glass-card--error::before { background: linear-gradient(90deg,transparent,rgba(239,68,68,0.12) 50%,transparent); }
.card-body { display: flex; flex-direction: column; gap: 24px; }

/* ── Hero ── */
.hero-section { display: flex; flex-direction: column; gap: 10px; }
.badge-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 14px; background: var(--h5-accent-soft);
  border: 1px solid rgba(212,168,83,0.18); border-radius: 100px;
  font-size: 9px; font-weight: 700; color: var(--h5-accent);
  letter-spacing: 0.1em; text-transform: uppercase; width: fit-content;
  font-family: 'JetBrains Mono',monospace;
}
.badge-diamond { font-size: 6px; opacity: 0.6; }
.hero-title { font-size: 1.5rem; font-weight: 800; line-height: 1.2; letter-spacing: -0.025em; color: var(--h5-text-1); text-wrap: pretty; }
.hero-subtitle { font-size: 0.8125rem; line-height: 1.65; color: var(--h5-text-2); text-wrap: pretty; }

/* ── Form ── */
.reg-form { display: flex; flex-direction: column; gap: 16px; }
.field-group { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: 10px; font-weight: 600; color: var(--h5-text-3); letter-spacing: 0.1em; text-transform: uppercase; }
.field-input {
  width: 100%; background: rgba(0,0,0,0.35);
  border: 1px solid var(--h5-border-strong); border-radius: var(--h5-radius-sm);
  padding: 11px 16px; font-size: 0.8125rem; color: var(--h5-text-1); outline: none;
  transition: border-color 0.25s var(--h5-ease), box-shadow 0.25s var(--h5-ease), background-color 0.25s var(--h5-ease);
  font-family: inherit;
}
.field-input::placeholder { color: var(--h5-text-3); opacity: 0.6; }
.field-input:hover { border-color: rgba(255,255,255,0.2); background: rgba(0,0,0,0.45); }
.field-input:focus { border-color: var(--h5-accent); box-shadow: 0 0 0 3px var(--h5-accent-soft); background: rgba(0,0,0,0.5); }
.field-error { font-size: 10px; color: var(--h5-error); font-weight: 500; animation: field-shake 0.35s var(--h5-ease); }

/* ── CTA Button ── */
.cta-btn {
  width: 100%; padding: 13px 20px; background: var(--h5-accent); color: var(--h5-base);
  border: none; border-radius: var(--h5-radius-sm); font-size: 0.8125rem; font-weight: 700;
  letter-spacing: 0.03em; cursor: pointer;
  transition: transform 0.2s var(--h5-ease-spring), box-shadow 0.3s var(--h5-ease), opacity 0.2s;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  position: relative; overflow: hidden; margin-top: 4px;
}
.cta-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 16px var(--h5-accent-glow), 0 8px 32px rgba(212,168,83,0.12); }
.cta-btn:active:not(:disabled) { transform: translateY(0) scale(0.98); box-shadow: none; }
.cta-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.cta-btn::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.2) 50%,transparent 60%);
  transform: translateX(-100%); transition: transform 0.6s var(--h5-ease); pointer-events: none;
}
.cta-btn:hover:not(:disabled)::after { transform: translateX(100%); }
.cta-spinner { width: 14px; height: 14px; border: 2px solid rgba(8,8,15,0.2); border-top-color: var(--h5-base); border-radius: 50%; animation: spin 0.7s linear infinite; }

/* ── Success State ── */
.success-state { display: flex; flex-direction: column; align-items: center; gap: 18px; padding: 8px 0; animation: content-enter 0.5s var(--h5-ease) both; }
.success-icon-wrap { animation: icon-pop 0.5s var(--h5-ease-spring) 0.1s both; }
.success-icon {
  width: 52px; height: 52px; border-radius: 50%;
  background: var(--h5-accent-soft); border: 1.5px solid rgba(212,168,83,0.2);
  display: flex; align-items: center; justify-content: center;
  color: var(--h5-accent); font-size: 24px; transition: box-shadow 0.3s;
}
.success-icon:hover { box-shadow: 0 0 24px var(--h5-accent-soft); }
.success-title { font-size: 1.125rem; font-weight: 700; letter-spacing: -0.02em; color: var(--h5-text-1); }

/* ── Ticket Card ── */
.ticket-card {
  width: 100%; background: rgba(0,0,0,0.4);
  border: 1px solid rgba(212,168,83,0.15); border-radius: var(--h5-radius);
  overflow: hidden; position: relative;
  transition: transform 0.35s var(--h5-ease), border-color 0.35s var(--h5-ease), box-shadow 0.35s var(--h5-ease);
}
.ticket-card:hover { transform: translateY(-2px); border-color: rgba(212,168,83,0.28); box-shadow: 0 12px 40px rgba(0,0,0,0.3); }
.ticket-shimmer {
  position: absolute; inset: 0;
  background: linear-gradient(105deg,transparent 30%,rgba(212,168,83,0.06) 45%,rgba(212,168,83,0.12) 50%,rgba(212,168,83,0.06) 55%,transparent 70%);
  transform: translateX(-100%); animation: shimmer-sweep 5s ease-in-out infinite; pointer-events: none;
}
.ticket-inner { padding: 20px; position: relative; z-index: 1; }
.ticket-label { font-size: 9px; font-weight: 600; color: var(--h5-accent); letter-spacing: 0.12em; text-transform: uppercase; font-family: 'JetBrains Mono',monospace; }
.ticket-product { font-size: 1.125rem; font-weight: 700; color: var(--h5-text-1); margin-top: 4px; letter-spacing: -0.02em; }
.ticket-row { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; }
.ticket-no { font-size: 10px; font-family: 'JetBrains Mono',monospace; color: var(--h5-text-2); }
.ticket-copy-btn {
  font-size: 9px; font-weight: 700; padding: 4px 14px;
  border: 1px solid var(--h5-accent); border-radius: 100px;
  color: var(--h5-accent); background: transparent; cursor: pointer;
  transition: all 0.2s var(--h5-ease); letter-spacing: 0.08em;
  font-family: 'JetBrains Mono',monospace;
}
.ticket-copy-btn:hover { background: var(--h5-accent); color: var(--h5-base); }
.ticket-divider { height: 1px; background: linear-gradient(90deg,transparent,var(--h5-border-strong) 20%,var(--h5-border-strong) 80%,transparent); margin: 16px 0; }
.ticket-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.ticket-meta-item { display: flex; flex-direction: column; gap: 3px; }
.meta-key { font-size: 8px; font-weight: 600; color: var(--h5-text-3); letter-spacing: 0.12em; text-transform: uppercase; font-family: 'JetBrains Mono',monospace; }
.meta-val { font-size: 11px; font-weight: 600; color: var(--h5-text-2); font-family: 'JetBrains Mono',monospace; }
.meta-val--active { color: var(--h5-accent); }

.link-btn {
  font-size: 11px; color: var(--h5-text-3); background: none; border: none;
  cursor: pointer; font-weight: 500; transition: color 0.2s;
  text-decoration: underline; text-decoration-color: rgba(100,116,139,0.3); text-underline-offset: 3px;
}
.link-btn:hover { color: var(--h5-text-1); text-decoration-color: var(--h5-text-1); }

.purchase-btn {
  width: 100%; padding: 14px 20px;
  background: linear-gradient(135deg, var(--h5-accent), #C49040);
  color: var(--h5-base); border: none; border-radius: var(--h5-radius-sm);
  font-size: 0.8125rem; font-weight: 700; cursor: pointer;
  transition: transform 0.2s var(--h5-ease-spring), box-shadow 0.3s var(--h5-ease);
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.purchase-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 24px var(--h5-accent-glow); }
.purchase-btn:active:not(:disabled) { transform: translateY(0) scale(0.98); }
.purchase-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.share-section { width: 100%; padding-top: 16px; border-top: 1px solid var(--h5-border); }
.share-label { font-size: 9px; color: var(--h5-text-3); text-align: center; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 10px; }
.share-wrap { display: flex; justify-content: center; padding: 8px 12px; background: rgba(0,0,0,0.25); border-radius: var(--h5-radius-sm); border: 1px solid var(--h5-border); }

/* ── Error State ── */
.error-state { display: flex; flex-direction: column; align-items: center; gap: 20px; padding: 28px 0; text-align: center; animation: content-enter 0.5s var(--h5-ease) both; }
.error-icon-wrap { animation: icon-pop 0.5s var(--h5-ease-spring) 0.1s both; }
.error-icon { width: 56px; height: 56px; border-radius: 50%; background: rgba(239,68,68,0.08); border: 1.5px solid rgba(239,68,68,0.18); display: flex; align-items: center; justify-content: center; color: var(--h5-error); font-size: 22px; }
.error-text { display: flex; flex-direction: column; gap: 8px; }
.error-title { font-size: 1rem; font-weight: 700; color: var(--h5-text-1); letter-spacing: -0.01em; }
.error-desc { font-size: 11px; color: var(--h5-text-3); max-width: 260px; line-height: 1.6; text-wrap: pretty; }
.error-code { color: var(--h5-error); font-family: 'JetBrains Mono',monospace; font-size: 10px; padding: 1px 6px; background: rgba(239,68,68,0.08); border-radius: 4px; }
.home-btn {
  display: inline-flex; align-items: center; padding: 10px 28px;
  background: var(--h5-surface-hover); color: var(--h5-text-1);
  border: 1px solid var(--h5-border-strong); border-radius: var(--h5-radius-sm);
  font-size: 11px; font-weight: 600; text-decoration: none;
  transition: all 0.2s var(--h5-ease); letter-spacing: 0.03em;
}
.home-btn:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.22); transform: translateY(-1px); }

.page-footer { width: 100%; padding: 20px 16px; text-align: center; border-top: 1px solid var(--h5-border); background: rgba(0,0,0,0.3); z-index: 10; }
.footer-text { font-size: 9px; color: var(--h5-text-3); font-family: 'JetBrains Mono',monospace; letter-spacing: 0.06em; }

/* ── Toast ── */
.toast {
  position: fixed; top: 28px; left: 50%; transform: translateX(-50%);
  padding: 10px 22px; background: rgba(8,8,15,0.88);
  backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--h5-border-strong); border-radius: 100px;
  color: var(--h5-text-1); z-index: 9999; font-size: 11px; font-weight: 500;
  white-space: nowrap; box-shadow: 0 8px 32px rgba(0,0,0,0.4);
}
.toast-enter-active, .toast-leave-active { transition: all 0.35s var(--h5-ease); }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%,-14px); filter: blur(4px); }

/* ══════════════════════════════════════
   Keyframe Animations — Motion Design Engine
   ══════════════════════════════════════ */
@keyframes marquee-slide { from { transform: translate3d(0,0,0); } to { transform: translate3d(-50%,0,0); } }
@keyframes glow-drift { from { opacity: 0.25; transform: scale(1) translate(0,0); } to { opacity: 0.42; transform: scale(1.08) translate(8px,12px); } }
@keyframes geo-float { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-12px) rotate(3deg); } }
@keyframes shimmer-sweep { 0% { transform: translateX(-100%); } 55% { transform: translateX(100%); } 100% { transform: translateX(100%); } }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes content-enter { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes icon-pop { from { opacity: 0; transform: scale(0.6); } to { opacity: 1; transform: scale(1); } }
@keyframes field-shake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-4px); } 40% { transform: translateX(4px); } 60% { transform: translateX(-2px); } 80% { transform: translateX(2px); } }

.anim-stagger { animation: card-entrance 0.6s var(--h5-ease) both; animation-delay: calc(var(--i, 0) * 120ms); }
@keyframes card-entrance { from { opacity: 0; transform: translateY(20px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }

/* ══════════════════════════════════════
   Reduced Motion — Accessibility
   ══════════════════════════════════════ */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  .marquee-track { animation: none !important; }
  .ticket-shimmer { display: none; }
  .glow { animation: none !important; opacity: 0.3; }
  .geo { animation: none !important; }
  .anim-stagger { opacity: 1; transform: none; }
  .success-state, .error-state { animation: none; opacity: 1; }
}

/* ══════════════════════════════════════
   Deep Overrides — H5ReviewSection
   Aligned to glassmorphism design tokens
   ══════════════════════════════════════ */
:deep(.review-root) { display: flex; flex-direction: column; gap: 16px; }
:deep(.review-title) { font-size: 0.875rem; font-weight: 700; color: #F1F5F9; }
:deep(.review-count) { font-size: 10px; color: #64748B; font-family: 'JetBrains Mono',monospace; }

:deep(.rating-fill) { background: var(--h5-accent) !important; border-radius: 100px !important; }
:deep(.rating-track) { background: rgba(255,255,255,0.06) !important; border-radius: 100px !important; }
:deep(.rating-star), :deep(.text-amber-400) { color: var(--h5-accent) !important; }
:deep(.bg-amber-400) { background-color: var(--h5-accent) !important; border-radius: 100px !important; }
:deep(.bg-slate-800) { background-color: rgba(255,255,255,0.06) !important; border: none !important; border-radius: 100px !important; }

:deep(.feedback-card) { background: rgba(0,0,0,0.25) !important; border: 1px solid var(--h5-border) !important; border-radius: var(--h5-radius-sm) !important; box-shadow: none !important; transition: border-color 0.2s var(--h5-ease); }
:deep(.feedback-card:hover) { border-color: var(--h5-border-strong) !important; }

:deep(.write-trigger) { border: 1px dashed var(--h5-border-strong) !important; border-radius: var(--h5-radius-sm) !important; color: var(--h5-text-2) !important; font-family: inherit; }
:deep(.write-trigger:hover) { border-color: var(--h5-accent) !important; color: var(--h5-accent) !important; background: var(--h5-accent-soft); }

:deep(.comment-input), :deep(textarea) { background-color: rgba(0,0,0,0.35) !important; border: 1px solid var(--h5-border-strong) !important; border-radius: var(--h5-radius-sm) !important; font-family: inherit; color: var(--h5-text-1) !important; }
:deep(.comment-input:focus), :deep(textarea:focus) { border-color: var(--h5-accent) !important; box-shadow: 0 0 0 3px var(--h5-accent-soft); }

:deep(.form-actions button), :deep(.flex.gap-2 button) { border-radius: var(--h5-radius-sm) !important; font-family: inherit; }
:deep(.form-actions button:first-child), :deep(.flex.gap-2 button:first-child) { border: 1px solid var(--h5-border-strong) !important; background: transparent !important; color: var(--h5-text-2) !important; }
:deep(.form-actions button:last-child), :deep(.flex.gap-2 button:last-child) { border: none !important; background: var(--h5-accent) !important; color: var(--h5-base) !important; }

:deep(.admin-reply), :deep(.border-indigo-500\/30) { border-color: var(--h5-accent-soft) !important; }
:deep(.text-indigo-400) { color: var(--h5-accent) !important; }
:deep(.bg-emerald-500\/10) { background-color: rgba(16,185,129,0.08) !important; border-color: rgba(16,185,129,0.15) !important; border-radius: var(--h5-radius-sm) !important; }
:deep(.text-emerald-400) { color: var(--h5-success) !important; }
</style>
