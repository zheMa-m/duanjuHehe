<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import H5UserBar from '~/components/h5/H5UserBar.vue'
import H5LoginModal from '~/components/h5/H5LoginModal.vue'

const route = useRoute()
const subdomain = computed(() => route.params.subdomain as string)

const { t } = useI18n()
const { user, isLoggedIn } = useAuth()

useAppSEO({
  title: () => campaign.value?.title || 'Campaign — ReelShort',
  description: () => campaign.value?.subtitle || '',
})

const campaign = ref<any>(null)
const loading = ref(true)
const formPhone = ref('')
const formEmail = ref('')
const submitting = ref(false)
const registered = ref(false)
const formError = ref('')
const showLoginModal = ref(false)
const loginMode = ref<'login' | 'register'>('register')

async function fetchCampaign() {
  loading.value = true
  try {
    const res = await $fetch<any>(`/api/v1/campaigns/${subdomain.value}`)
    campaign.value = res.data
  } catch (_) { campaign.value = null } finally { loading.value = false }
}

function validateForm(): boolean {
  if (!formPhone.value.trim() && !formEmail.value.trim()) {
    formError.value = t('h5.fillInfo')
    return false
  }
  const phoneRegex = /^1[3-9]\d{9}$/
  if (formPhone.value.trim() && !phoneRegex.test(formPhone.value.trim())) {
    formError.value = t('h5.phoneInvalid')
    return false
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (formEmail.value.trim() && !emailRegex.test(formEmail.value.trim())) {
    formError.value = t('h5.emailInvalid')
    return false
  }
  return true
}

async function handleSubmit() {
  formError.value = ''
  if (!validateForm()) return
  submitting.value = true
  try {
    await $fetch('/api/v1/campaigns/register', {
      method: 'POST',
      body: {
        subdomain: subdomain.value,
        phone: formPhone.value.trim() || undefined,
        email: formEmail.value.trim() || undefined,
        campaign_id: campaign.value?.id,
      },
    })
    registered.value = true
  } catch (_) {
    formError.value = t('h5.registerFailed')
  } finally { submitting.value = false }
}

function handleLoginRequired(mode: 'login' | 'register') {
  loginMode.value = mode
  showLoginModal.value = true
}

const features = computed(() => {
  if (Array.isArray(campaign.value?.features)) return campaign.value.features
  return []
})

const heroStyle = computed(() => {
  if (!campaign.value) return {}
  const c = campaign.value
  return {
    background: `linear-gradient(135deg, ${c.color_from || '#6366f1'}, ${c.color_to || '#4f46e5'})`,
  }
})

onMounted(fetchCampaign)
</script>

<template>
  <div class="campaign-root">
    <H5UserBar @login="handleLoginRequired('login')" @register="handleLoginRequired('register')" />

    <!-- Loading -->
    <div v-if="loading" class="campaign-loading">{{ $t('common.loading') }}</div>

    <!-- Not Found -->
    <div v-else-if="!campaign" class="campaign-empty">
      <p>{{ $t('h5.eventEndedDesc', { sub: subdomain }) }}</p>
    </div>

    <!-- Campaign Content -->
    <template v-else>
      <!-- Hero -->
      <section class="campaign-hero" :style="heroStyle">
        <img v-if="campaign.cover_image" :src="campaign.cover_image" :alt="campaign.title" class="campaign-cover" />
        <span v-if="campaign.badge" class="campaign-badge">{{ campaign.badge }}</span>
        <h1 class="campaign-title">{{ campaign.title }}</h1>
        <p class="campaign-subtitle">{{ campaign.subtitle }}</p>
      </section>

      <!-- Form Section -->
      <section class="campaign-form-section" v-if="!registered">
        <div class="campaign-card">
          <h2 class="form-title">{{ $t('h5.formTitle') }}</h2>
          <p class="form-desc">{{ $t('h5.formDesc') }}</p>
          <div class="form-fields">
            <div class="form-field">
              <label class="field-label">{{ $t('h5.phone') }}</label>
              <input v-model="formPhone" type="tel" :placeholder="$t('h5.phonePlaceholder')" class="field-input" />
            </div>
            <div class="form-field">
              <label class="field-label">{{ $t('h5.email') }}</label>
              <input v-model="formEmail" type="email" :placeholder="$t('h5.emailPlaceholder')" class="field-input" />
            </div>
          </div>
          <div v-if="formError" class="form-error">{{ formError }}</div>
          <button class="form-submit" :disabled="submitting" @click="handleSubmit">
            {{ submitting ? $t('h5.submitting') : (campaign.cta_text || $t('h5.reserveNow')) }}
          </button>
          <p class="form-secure">{{ $t('h5.secureRegistration') }}</p>
        </div>
      </section>

      <!-- Success -->
      <section class="campaign-form-section" v-else>
        <div class="campaign-card success-card">
          <span class="success-icon">✅</span>
          <h2>{{ $t('h5.registerSuccess') }}</h2>
          <p>{{ $t('h5.ticketTitle') }}: {{ subdomain }}</p>
        </div>
      </section>

      <!-- Features -->
      <section class="campaign-section" v-if="features.length">
        <h2 class="section-heading">{{ $t('h5.liveNow') }}</h2>
        <div class="features-list">
          <div v-for="(f, i) in features" :key="i" class="feature-item">
            <span class="feature-icon">{{ f.icon || '✨' }}</span>
            <div>
              <h3 class="feature-title">{{ f.title || f }}</h3>
              <p v-if="f.desc" class="feature-desc">{{ f.desc }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Description -->
      <section class="campaign-section" v-if="campaign.description">
        <h2 class="section-heading">{{ $t('h5.liveNow') }}</h2>
        <p class="campaign-desc">{{ campaign.description }}</p>
      </section>

      <!-- Footer -->
      <footer class="campaign-footer">
        <p>{{ $t('h5.footerNote') }}</p>
      </footer>
    </template>

    <H5LoginModal
      v-if="showLoginModal"
      :visible="showLoginModal"
      @close="showLoginModal = false"
    />
  </div>
</template>

<style scoped>
.campaign-root { min-height: 100dvh; background: #f8fafc; color: #0f172a; font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; }
.campaign-loading, .campaign-empty { text-align: center; padding: 80px 24px; color: #94a3b8; }

/* Hero */
.campaign-hero { text-align: center; padding: 48px 24px 40px; display: flex; flex-direction: column; align-items: center; }
.campaign-cover { width: 140px; height: 140px; border-radius: 20px; object-fit: cover; margin-bottom: 20px; box-shadow: 0 8px 32px rgba(0,0,0,0.15); }
.campaign-badge { display: inline-block; padding: 6px 16px; border-radius: 9999px; font-size: 12px; font-weight: 600; background: rgba(255,255,255,0.2); color: #fff; margin-bottom: 16px; }
.campaign-title { font-size: 1.75rem; font-weight: 900; color: #fff; margin-bottom: 8px; line-height: 1.2; }
.campaign-subtitle { font-size: 0.9375rem; color: rgba(255,255,255,0.8); line-height: 1.5; max-width: 360px; }

/* Form */
.campaign-form-section { padding: 24px; }
.campaign-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 28px 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.form-title { font-size: 1.125rem; font-weight: 700; margin-bottom: 4px; }
.form-desc { font-size: 0.8125rem; color: #64748b; margin-bottom: 20px; }
.form-fields { display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; }
.field-label { font-size: 0.75rem; font-weight: 600; color: #475569; margin-bottom: 4px; display: block; }
.field-input { width: 100%; padding: 12px 14px; border-radius: 10px; border: 1px solid #cbd5e1; background: #ffffff; font-size: 0.9375rem; color: #0f172a; outline: none; }
.field-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
.form-error { padding: 8px 12px; border-radius: 8px; background: #fef2f2; color: #dc2626; font-size: 0.8125rem; margin-bottom: 12px; }
.form-submit { width: 100%; padding: 14px; border-radius: 12px; border: none; background: linear-gradient(135deg, #6366f1, #4f46e5); color: #fff; font-size: 1rem; font-weight: 700; cursor: pointer; }
.form-submit:disabled { opacity: 0.6; cursor: not-allowed; }
.form-secure { text-align: center; font-size: 0.75rem; color: #94a3b8; margin-top: 12px; }
.success-card { text-align: center; }
.success-icon { font-size: 2.5rem; display: block; margin-bottom: 12px; }

/* Features */
.campaign-section { padding: 32px 24px; }
.section-heading { font-size: 1.125rem; font-weight: 700; margin-bottom: 16px; }
.features-list { display: flex; flex-direction: column; gap: 12px; }
.feature-item { display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; }
.feature-icon { font-size: 1.25rem; flex-shrink: 0; }
.feature-title { font-size: 0.9375rem; font-weight: 600; color: #0f172a; margin-bottom: 2px; }
.feature-desc { font-size: 0.8125rem; color: #64748b; line-height: 1.5; }
.campaign-desc { font-size: 0.9375rem; color: #475569; line-height: 1.7; }

.campaign-footer { text-align: center; padding: 32px 24px; border-top: 1px solid #e8ecf1; }
.campaign-footer p { font-size: 0.75rem; color: #94a3b8; }
</style>
