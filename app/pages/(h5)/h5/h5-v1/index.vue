<script setup lang="ts">
/**
 * H5 v1 营销落地页 — 主入口
 *
 * 设计模式（基于 ui-ux-pro-max 搜索结果）:
 * - Landing: App Store Style Landing + Funnel 3-Step 混合
 *   Hero → Form → Success/Ticket → Reviews → CTA 渐进转化
 * - Style: Modern Dark Cinema (Cinema Mobile)
 *   深黑渐变底 + 靛蓝强调 + 玻璃拟态卡片 + 环境光 blob
 * - Color: Luxury Dark + Indigo Accent (#5E6AD2)
 * - Typography: Inter 体系 + 紧凑字距 (tracking-tight)
 * - UX: touch-action:manipulation / overscroll-contain / 底部固定 CTA
 */

// 固定子域名标识（静态路由，无需动态参数）
const subdomain = 'h5-v1'

// ─── Types ──────────────────────────────────────────────
interface Campaign {
  subdomain: string
  title: string
  subtitle: string
  badge: string
  color_from: string
  color_to: string
}

interface CampaignResponse {
  success: boolean
  message: string
  timestamp: string
  data: Campaign
}

// ─── Form State ─────────────────────────────────────────
const email = ref('')
const phone = ref('')
const emailError = ref('')
const phoneError = ref('')
const isSubmitted = ref(false)
const isLoading = ref(false)
const isPurchasing = ref(false)

// ─── Toast ──────────────────────────────────────────────
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref<'success' | 'error'>('success')
const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
  toastMessage.value = msg
  toastType.value = type
  showToast.value = true
  setTimeout(() => { showToast.value = false }, 2500)
}

// ─── Auth & i18n ────────────────────────────────────────
const { user, isLoggedIn, isAnonymous, signInAnonymously } = useAuth()
const { t } = useI18n()
const { trackEvent } = useAnalytics()
const showLoginModal = ref(false)
const loginMode = ref<'login' | 'register' | 'bind'>('login')
const pendingAction = ref<(() => void) | null>(null)

// ─── Payment ────────────────────────────────────────────
const ticketNo = ref(Math.floor(Math.random() * 90000) + 10000)
const { createAndRedirect } = usePayment()

const currentProduct = computed(() => {
  const sub = subdomain.toLowerCase()
  if (sub === 'cloud') {
    return { id: 'p2', name: 'HEHE Enterprise 全套方案', price: 299.00 }
  }
  return { id: 'p1', name: 'HEHE Pro 工具套件', price: 29.99 }
})

// ─── Auth Guard ─────────────────────────────────────────
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
  trackEvent('purchase_initiate', {
    item_id:   currentProduct.value.id,
    item_name: currentProduct.value.name,
    value:     currentProduct.value.price,
    currency:  'USD',
    channel:   subdomain,
  })
  isPurchasing.value = true
  try {
    await createAndRedirect({
      productId: currentProduct.value.id,
      productName: currentProduct.value.name,
      amount: currentProduct.value.price,
      currency: 'USD',
    })
  } catch (e: any) {
    triggerToast(e.data?.statusMessage || 'Payment failed, please try again', 'error')
  } finally {
    isPurchasing.value = false
  }
}

// ─── Ticket Copy ────────────────────────────────────────
const copyTicketNo = async () => {
  try {
    await navigator.clipboard.writeText(ticketNo.value.toString())
    triggerToast(t('h5.copySuccess'), 'success')
  } catch {
    triggerToast(t('h5.copyFailed'), 'error')
  }
}

// ─── Login Callbacks ────────────────────────────────────
const onLoginSuccess = () => {
  showLoginModal.value = false
  if (pendingAction.value) {
    const action = pendingAction.value
    pendingAction.value = null
    action()
  }
}

const showRegisterModal = () => {
  loginMode.value = 'register'
  showLoginModal.value = true
}

const handleLoginRequired = () => {
  loginMode.value = isAnonymous.value ? 'bind' : 'login'
  showLoginModal.value = true
}

// ─── Campaign Data (SWR) ────────────────────────────────
const { data: response, error: fetchError } = await useFetch<CampaignResponse>(`/api/v1/campaigns/${subdomain}`)
const campaign = computed(() => response.value?.data)
const hasError = computed(() => !!fetchError.value || !campaign.value)

// ─── SEO ────────────────────────────────────────────────
useAppSEO({
  title: () => campaign.value?.title || (hasError.value ? `${t('h5.eventEnded')} - HEHE` : subdomain),
  description: () => campaign.value?.subtitle || 'HEHE H5 Marketing Platform',
})

// ─── Theme Glow (ambient blob color per subdomain) ─────
const themeGlow = computed(() => {
  const sub = subdomain.toLowerCase()
  if (sub === 'ai') return 'rgba(139, 92, 246, 0.12)'
  if (sub === 'cloud') return 'rgba(59, 130, 246, 0.12)'
  return 'rgba(94, 106, 210, 0.12)'
})

// ─── Form Validation ────────────────────────────────────
watch(phone, () => { phoneError.value = '' })
watch(email, () => { emailError.value = '' })

const validateForm = (): boolean => {
  let valid = true
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const phoneRegex = /^1[3-9]\d{9}$/

  if (!phone.value) {
    phoneError.value = t('h5.phoneRequired')
    valid = false
  } else if (!phoneRegex.test(phone.value)) {
    phoneError.value = t('h5.phoneInvalid')
    valid = false
  }

  if (!email.value) {
    emailError.value = t('h5.emailRequired')
    valid = false
  } else if (!emailRegex.test(email.value)) {
    emailError.value = t('h5.emailInvalid')
    valid = false
  }

  return valid
}

const handleRegister = async () => {
  if (!validateForm()) return
  isLoading.value = true
  try {
    await $fetch<any>('/api/v1/campaigns/register', {
      method: 'POST',
      body: { phone: phone.value, email: email.value, subdomain: subdomain }
    })
    isSubmitted.value = true
    trackEvent('campaign_register', { channel: subdomain })
  } catch (e: any) {
    triggerToast(e.data?.statusMessage || t('h5.registerFailed'), 'error')
  } finally {
    isLoading.value = false
  }
}

// ─── Scroll to form (for sticky CTA) ───────────────────
const formSectionRef = ref<HTMLElement | null>(null)
const scrollToForm = () => {
  formSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

// ─── Lifecycle: silent anonymous login ──────────────────
onMounted(async () => {
  if (!user.value) {
    try {
      await signInAnonymously()
    } catch (e) {
      console.error('H5 自动静默匿名登录失败:', e)
    }
  }
})
</script>

<template>
  <div class="min-h-dvh bg-[#020203] relative overflow-x-hidden overscroll-none" style="touch-action: manipulation">

    <!-- ═══ 环境光 Blob (Cinema Mobile: ambient glow) ═══ -->
    <div
      class="fixed top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[120vw] max-w-[600px] max-h-[600px] rounded-full pointer-events-none blur-[120px]"
      :style="{ background: themeGlow }"
    />
    <div
      class="fixed bottom-0 left-1/2 -translate-x-1/2 w-[80vw] h-[40vw] max-w-[400px] rounded-full pointer-events-none blur-[100px] opacity-40"
      :style="{ background: themeGlow }"
    />

    <!-- ═══ 登录弹窗 ═══ -->
    <H5LoginModal
      :visible="showLoginModal"
      :mode="loginMode"
      @close="showLoginModal = false"
      @success="onLoginSuccess"
    />

    <!-- ═══ 顶部用户栏 (Glassmorphic header) ═══ -->
    <header class="sticky top-0 z-40 backdrop-blur-xl bg-[#020203]/60 border-b border-white/[0.06]">
      <H5UserBar
        @login="loginMode = 'login'; showLoginModal = true"
        @register="showRegisterModal"
        @logout="showLoginModal = false"
      />
    </header>

    <!-- ═══ 主内容流 ═══ -->
    <main class="relative z-10 px-5 pb-36 max-w-md mx-auto">

      <template v-if="!hasError && campaign">
        <!-- ──── Hero 区 ──── -->
        <section class="pt-10 pb-6">
          <div class="flex items-center justify-between mb-6">
            <span class="text-[11px] text-white/20 font-medium tracking-wide">HEHE H5</span>
            <span class="text-[10px] font-mono text-[#5E6AD2]/70 bg-[#5E6AD2]/8 px-2.5 py-1 rounded-full border border-[#5E6AD2]/15">
              {{ t('h5.swrRender') }}
            </span>
          </div>

          <span
            class="inline-block text-[11px] font-bold px-3 py-1 rounded-full text-white mb-4"
            :style="{
              background: `linear-gradient(135deg, ${campaign.color_from || '#5E6AD2'}, ${campaign.color_to || '#818cf8'})`
            }"
          >
            {{ campaign.badge }}
          </span>

          <h1 class="text-[28px] font-extrabold text-white tracking-[-0.03em] leading-[1.15] mb-3">
            {{ campaign.title }}
          </h1>
          <p class="text-[14px] text-white/45 leading-relaxed">
            {{ campaign.subtitle }}
          </p>
        </section>

        <!-- ──── 表单区 / 成功态 ──── -->
        <section ref="formSectionRef" class="pb-8">
          <Transition name="fade-slide" mode="out-in">

            <!-- 未提交：注册表单 -->
            <div v-if="!isSubmitted" key="form">
              <div class="mb-5">
                <h2 class="text-[16px] font-bold text-white mb-1">{{ t('h5.formTitle') }}</h2>
                <p class="text-[12px] text-white/35">{{ t('h5.formDesc') }}</p>
              </div>

              <form @submit.prevent="handleRegister" class="space-y-3">
                <div>
                  <input
                    v-model="phone"
                    type="tel"
                    :placeholder="t('h5.phonePlaceholder')"
                    inputmode="numeric"
                    required
                    class="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl px-4 py-3.5 text-[13px] text-white placeholder-white/25 focus:outline-none focus:border-[#5E6AD2]/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-[#5E6AD2]/15 transition-all duration-200"
                  />
                  <span v-if="phoneError" class="text-[11px] text-rose-400 mt-1.5 block pl-1">{{ phoneError }}</span>
                </div>
                <div>
                  <input
                    v-model="email"
                    type="email"
                    :placeholder="t('h5.emailPlaceholder')"
                    required
                    class="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl px-4 py-3.5 text-[13px] text-white placeholder-white/25 focus:outline-none focus:border-[#5E6AD2]/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-[#5E6AD2]/15 transition-all duration-200"
                  />
                  <span v-if="emailError" class="text-[11px] text-rose-400 mt-1.5 block pl-1">{{ emailError }}</span>
                </div>
                <button
                  type="submit"
                  :disabled="isLoading || !!phoneError || !!emailError"
                  class="w-full font-bold text-[13px] py-3.5 rounded-2xl transition-all duration-200 active:scale-[0.97] text-white flex items-center justify-center gap-2"
                  :class="[
                    isLoading || !!phoneError || !!emailError
                      ? 'opacity-35 cursor-not-allowed bg-white/10 text-white/40'
                      : 'bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:brightness-110'
                  ]"
                >
                  <span v-if="isLoading" class="i-lucide-loader-circle animate-spin text-[14px]" />
                  {{ isLoading ? t('h5.submitting') : t('h5.submitRegister') }}
                </button>
              </form>

              <div class="flex items-center justify-center gap-1.5 mt-4">
                <span class="i-lucide-lock text-[11px] text-white/15" />
                <span class="text-[11px] text-white/15">{{ t('h5.secureRegistration') }}</span>
              </div>
            </div>

            <!-- 已提交：成功态 + 电子票券 -->
            <div v-else key="success" class="space-y-6">
              <div class="text-center pt-2">
                <div class="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                  <span class="i-lucide-check text-[24px]" />
                </div>
                <h2 class="text-[18px] font-bold text-white">{{ t('h5.registerSuccess') }}</h2>
              </div>

              <!-- 发光电子票券 -->
              <div class="ticket-shimmer relative p-5 rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-md border border-white/[0.08] overflow-hidden">
                <div class="absolute -top-10 -right-10 w-32 h-32 bg-[#5E6AD2]/10 rounded-full blur-3xl pointer-events-none" />

                <div class="relative">
                  <div class="text-[10px] text-white/30 uppercase tracking-[0.2em]">{{ t('h5.ticketTitle') }}</div>
                  <div class="text-[17px] font-extrabold text-white mt-2 tracking-tight">{{ currentProduct.name }}</div>

                  <div class="flex items-center justify-between mt-2">
                    <span class="text-[11px] font-mono text-[#5E6AD2]/80">NO. {{ ticketNo }}</span>
                    <button
                      @click="copyTicketNo"
                      class="text-[10px] px-2.5 py-1 rounded-lg bg-[#5E6AD2]/10 border border-[#5E6AD2]/15 text-[#5E6AD2] hover:bg-[#5E6AD2]/20 active:scale-95 transition-all cursor-pointer"
                    >
                      {{ t('h5.copyTicket') }}
                    </button>
                  </div>

                  <div class="border-t border-dashed border-white/[0.08] my-4" />

                  <div class="grid grid-cols-2 gap-3 text-[11px]">
                    <div>
                      <span class="block text-white/25 mb-0.5">{{ t('h5.ticketChannel') }}</span>
                      <span class="text-white/70 font-semibold">{{ subdomain }}</span>
                    </div>
                    <div>
                      <span class="block text-white/25 mb-0.5">{{ t('h5.ticketTime') }}</span>
                      <span class="text-white/70 font-semibold">{{ t('h5.liveNow') }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="space-y-3">
                <button
                  @click="handlePurchase"
                  :disabled="isPurchasing"
                  class="w-full font-bold text-[13px] py-3.5 rounded-2xl transition-all duration-200 active:scale-[0.97] text-white flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 shadow-lg shadow-orange-500/15 hover:shadow-orange-500/25 hover:brightness-110 cursor-pointer"
                  :class="[isPurchasing ? 'opacity-40 cursor-wait' : '']"
                >
                  <span v-if="isPurchasing" class="i-lucide-loader-circle animate-spin text-[14px]" />
                  {{ isPurchasing ? t('h5.processing') : t('h5.upgradeProduct', { name: currentProduct.name, price: currentProduct.price }) }}
                </button>

                <button
                  @click="isSubmitted = false; phone = ''; email = '';"
                  class="w-full text-[12px] text-white/30 hover:text-white/50 font-medium transition-colors cursor-pointer py-1"
                >
                  {{ t('h5.reRegister') }}
                </button>
              </div>

              <div class="pt-4 border-t border-white/[0.06]">
                <p class="text-[11px] text-white/20 text-center mb-3">{{ t('h5.shareTitle') }}</p>
                <div class="flex justify-center">
                  <SharedSocialShare
                    :title="campaign?.title || currentProduct.name"
                    :description="campaign?.subtitle || ''"
                    :subdomain="subdomain"
                    size="sm"
                  />
                </div>
              </div>
            </div>

          </Transition>
        </section>

        <!-- ──── 评价区 ──── -->
        <section class="py-6 border-t border-white/[0.06]">
          <H5ReviewSection
            :subdomain="subdomain"
            @login-required="handleLoginRequired"
            @toast="(msg: string, type: 'success' | 'error') => triggerToast(msg, type)"
          />
        </section>
      </template>

      <!-- ═══ 错误态 ═══ -->
      <template v-else>
        <div class="flex flex-col items-center justify-center text-center py-24 my-auto">
          <div class="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-5">
            <span class="i-lucide-power-off text-[24px] text-white/25" />
          </div>
          <h2 class="text-[16px] font-bold text-white/70 mb-2">{{ t('h5.eventEnded') }}</h2>
          <p class="text-[13px] text-white/30 max-w-[260px] leading-relaxed">
            {{ t('h5.eventEndedDesc', { sub: subdomain }) }}
          </p>
          <NuxtLink
            to="/"
            class="mt-6 inline-flex items-center gap-1.5 px-6 py-2.5 rounded-2xl bg-[#5E6AD2] hover:bg-[#5E6AD2]/90 text-[12px] font-bold text-white active:scale-95 transition-all shadow-md shadow-indigo-500/20"
          >
            {{ t('h5.backHome') }}
          </NuxtLink>
        </div>
      </template>

      <!-- ──── 底部声明 ──── -->
      <footer class="pt-8 pb-4 text-center">
        <p class="text-[10px] text-white/15 leading-normal">
          {{ t('h5.footerNote') }}
        </p>
      </footer>
    </main>

    <!-- ═══ 底部固定 CTA (Funnel: 始终可见的转化入口) ═══ -->
    <div
      v-if="!hasError && !isSubmitted"
      class="fixed bottom-0 left-0 right-0 z-50 p-4 pb-5 backdrop-blur-xl bg-[#020203]/80 border-t border-white/[0.06]"
    >
      <button
        @click="scrollToForm"
        class="w-full max-w-md mx-auto font-bold text-[14px] py-3.5 rounded-2xl text-white bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] shadow-lg shadow-indigo-500/25 active:scale-[0.97] transition-all duration-200 flex items-center justify-center gap-2"
      >
        <span class="i-lucide-ticket text-[16px]" />
        {{ t('h5.registerNow') }}
      </button>
    </div>

    <!-- ═══ 浮动 Toast 通知 ═══ -->
    <Transition name="toast-fade">
      <div
        v-if="showToast"
        class="fixed top-6 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-2xl shadow-2xl z-[9999] text-[12px] font-semibold backdrop-blur-md border"
        :class="[
          toastType === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
        ]"
      >
        {{ toastMessage }}
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.ticket-shimmer {
  position: relative;
  overflow: hidden;
}
.ticket-shimmer::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(
    105deg,
    transparent 30%,
    rgba(255, 255, 255, 0.04) 45%,
    rgba(255, 255, 255, 0.08) 50%,
    rgba(255, 255, 255, 0.04) 55%,
    transparent 70%
  );
  animation: shimmer 4s ease-in-out infinite;
  pointer-events: none;
}
@keyframes shimmer {
  0%   { transform: translateX(-100%); }
  60%  { transform: translateX(100%); }
  100% { transform: translateX(100%); }
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -16px);
}

@media (prefers-reduced-motion: reduce) {
  .ticket-shimmer::after {
    animation: none;
    display: none;
  }
}
</style>
