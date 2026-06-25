<script setup lang="ts">
import { useStarpathStore } from '~/stores/starpath'
import { getStarpathIntroData } from '~/utils/starpath-data'

const { t, locale } = useI18n()
definePageMeta({
  title: '智能问卷 · Purchase Report',
  alias: ['/h5/starpath/购买报告'],
})

const store = useStarpathStore()
const router = useRouter()
const { progressOf } = useStarpathFlow()

const loading = ref(false)
const errorMsg = ref('')
// 避免 hydration mismatch：SSR 无 localStorage，sessionId 为空；客户端恢复后可能非空
// 用 ref(false) 保证 SSR 与客户端首次渲染一致，onMounted 后再更新
const hasSession = ref(false)

// 页面加载时检查会话状态 — 无 session 说明未完成问卷，显示提示
onMounted(() => {
  hasSession.value = !!store.sessionId?.trim()
  if (!hasSession.value) {
    errorMsg.value = t('starpath.purchase.sessionError')
  }
})

const featureLabels = computed(() => getStarpathIntroData(locale.value as 'zh' | 'en')?.subscribeFeatures || [
  'AI Birth Chart Analysis', 'Personality Traits Decoded',
  'Relationship Compatibility Insights', 'Key Opportunity Windows'
])

const featureEmojis = ['🌟', '✨', '💕', '🔮']

const features = computed(() => featureLabels.value.map((label, i) => ({
  emoji: featureEmojis[i % featureEmojis.length],
  label,
})))

// 价格配置：限时优惠价
const ORIGINAL_PRICE = '$19.99'
const DISCOUNT_PRICE = '$9.99'

// 平台检测（延迟到 mounted 后设置，避免 hydration mismatch）
const isIOS = ref(false)
const mounted = ref(false)
const platform = computed<'ios' | 'android'>(() => isIOS.value ? 'ios' : 'android')

onMounted(() => {
  mounted.value = true
  isIOS.value = /iphone|ipad|ipod/i.test(navigator.userAgent)
})

/**
 * 创建一次性购买订单
 */
async function createPurchaseOrder(paymentMethod: string): Promise<{ orderId: string; amount: number; currency: string; reportId: string } | null> {
  if (!store.sessionId) {
    errorMsg.value = t('starpath.purchase.sessionError')
    return null
  }

  try {
    const res = await $fetch<any>('/api/starpath/purchase/one-time', {
      method: 'POST',
      body: {
        bizCode: 'starpath',
        sessionId: store.sessionId,
        platform: platform.value,
        paymentMethod,
      },
    })
    const data = res?.data
    if (!data?.orderId) {
      errorMsg.value = t('starpath.purchase.error')
      return null
    }
    return {
      orderId: data.orderId,
      amount: data.amount || 9.99,
      currency: data.currency || 'USD',
      reportId: data.reportId || '',
    }
  } catch (e: any) {
    // 解析 API 返回的具体错误
    const status = e?.response?.status || e?.statusCode || e?.status
    const msg = e?.response?._data?.statusMessage || e?.data?.statusMessage || e?.message || ''
    if (status === 404 || msg.includes('Session not found')) {
      errorMsg.value = t('starpath.purchase.sessionError')
    } else if (status === 400 && msg.includes('not yet completed')) {
      errorMsg.value = t('starpath.purchase.sessionError')
    } else {
      errorMsg.value = msg || t('starpath.purchase.error')
    }
    return null
  }
}

/**
 * 支付完成后跳转到邮箱收集页
 */
function onPurchaseSuccess(order: { orderId: string; amount: number; currency: string }, provider: string, receiptId: string = '') {
  store.setPurchase({ purchased: true, orderId: order.orderId, plan: 'one-time-report' })
  const qs = new URLSearchParams({
    orderId: order.orderId,
    amount: order.amount.toFixed(2),
    currency: order.currency,
    provider,
    receiptId,
  }).toString()
  router.push(`/h5/starpath/email?${qs}`)
}

/** Apple Pay 直接支付 */
async function payWithApple() {
  loading.value = true
  errorMsg.value = ''
  try {
    const order = await createPurchaseOrder('apple-pay')
    if (!order) return
    onPurchaseSuccess(
      { orderId: order.orderId, amount: order.amount, currency: order.currency },
      'Apple Pay',
      `rcpt_${Date.now()}`
    )
  } catch (e) {
    errorMsg.value = t('starpath.purchase.error')
  } finally {
    loading.value = false
  }
}

/** 信用卡支付：创建订单后跳转填卡页 */
async function handleCardPayment() {
  loading.value = true
  errorMsg.value = ''
  try {
    const order = await createPurchaseOrder('card')
    if (!order) return
    store.setPurchase({ purchased: false, orderId: order.orderId, plan: 'one-time-report' })
    router.push(`/h5/starpath/payment/card?orderId=${order.orderId}&purchase=1`)
  } catch (e) {
    errorMsg.value = t('starpath.purchase.error')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="starpath-page" data-biz="starpath">
    <div class="starpath-bg-gradient" />

    <div class="starpath-frame pt-safe-top">
      <div class="relative z-10 flex flex-col items-center px-5 pb-10">
        <!-- Badge -->
        <div class="mt-[20px] flex items-center gap-2">
          <span class="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full bg-gradient-to-r from-[#321cff]/20 to-[#9a2dff]/20 border border-[#9a2dff]/30 text-[#d0c7ff]">
            <span class="i-lucide-sparkles text-[12px]" />
            {{ t('starpath.purchase.badge') }}
          </span>
        </div>

        <!-- Stars -->
        <div class="mt-[20px] flex gap-1">
          <span v-for="i in 5" :key="i" class="text-[18px] text-[#ffc43a]">★</span>
        </div>

        <!-- Title -->
        <h1 class="mt-[14px] text-center text-xl font-bold leading-snug tracking-tight text-white">
          {{ t('starpath.purchase.title') }}
        </h1>

        <p class="mt-[6px] text-center text-[13px] text-starpath-text-muted max-w-[280px] leading-relaxed">
          {{ t('starpath.purchase.subtitle') }}
        </p>

        <!-- ─── Glass Price Card ─── -->
        <div class="mt-[24px] w-full max-w-[340px] rounded-2xl bg-white/[0.05] backdrop-blur-md border border-white/[0.08] p-5 relative overflow-hidden">
          <!-- Glow accent -->
          <div class="absolute -top-8 -right-8 w-28 h-28 bg-[#9a2dff]/15 rounded-full blur-[50px] pointer-events-none" />

          <!-- Features list -->
          <div class="flex flex-col gap-3 mb-5">
            <div
              v-for="f in features"
              :key="f.label"
              class="flex items-center gap-3"
            >
              <span class="flex-shrink-0 w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-[16px]">
                {{ f.emoji }}
              </span>
              <span class="text-[13px] text-white/90 font-medium">{{ f.label }}</span>
            </div>
          </div>

          <!-- Divider -->
          <div class="border-t border-dashed border-white/[0.08] my-4" />

          <!-- Price row -->
          <div class="flex items-end justify-between">
            <div>
              <p class="text-[11px] text-starpath-text-muted uppercase tracking-wider font-semibold mb-1">
                {{ t('starpath.purchase.todayOnly') }}
              </p>
              <div class="flex items-baseline gap-2">
                <span class="text-sm text-starpath-text-disabled line-through">{{ ORIGINAL_PRICE }}</span>
                <span class="text-[28px] font-extrabold text-white leading-none tracking-tight">{{ DISCOUNT_PRICE }}</span>
              </div>
            </div>
            <span class="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
              -50%
            </span>
          </div>

          <!-- One-time notice -->
          <div class="mt-3 flex items-center gap-1.5">
            <span class="i-lucide-check-circle-2 text-[12px] text-emerald-400/70" />
            <span class="text-[11px] text-starpath-text-muted">{{ t('starpath.purchase.oneTimeNotice') }}</span>
          </div>
        </div>

        <!-- ─── Apple Pay (iOS only, client-rendered) ─── -->
        <ClientOnly>
          <button
            v-if="isIOS && hasSession"
            type="button"
            class="mt-[20px] w-full max-w-[340px] h-[52px] rounded-2xl bg-black text-white text-[15px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50"
            :disabled="loading"
            @click="payWithApple"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4c-1.09-.5-2.08-.48-3.24 0c-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8c1.18-.24 2.31-.93 3.57-.84c1.51.12 2.65.72 3.4 1.8c-3.12 1.87-2.38 5.98.48 7.13c-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25c.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            <span v-if="loading" class="i-lucide-loader-circle animate-spin text-[16px]" />
            <span v-else>{{ t('starpath.purchase.payWithApple') }}</span>
          </button>
        </ClientOnly>

        <!-- ─── PayPal / Google Pay / Card (仅在有 session 时渲染) ─── -->
        <div class="mt-[14px] w-full max-w-[340px]">
          <StarpathPaymentButtons
            v-if="hasSession"
            :platform="platform"
            plan="trial-7d"
            order-url="/api/starpath/purchase/one-time"
            success-url="/h5/starpath/email"
            @card="handleCardPayment"
          />
          <!-- 无 session 时的引导提示 -->
          <div v-else class="flex flex-col items-center gap-3 py-6">
            <span class="i-lucide-arrow-left-circle text-[28px] text-starpath-text-disabled" />
            <p class="text-[13px] text-starpath-text-muted text-center leading-relaxed">
              {{ t('starpath.purchase.sessionError') }}
            </p>
            <NuxtLink
              to="/h5/starpath"
              class="mt-1 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#321cff] to-[#9a2dff] text-[12px] font-bold text-white active:scale-95 transition-all"
            >
              <span class="i-lucide-sparkles text-[12px]" />
              {{ t('starpath.purchase.startQuestionnaire') }}
            </NuxtLink>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="mt-4 flex items-center justify-center gap-2">
          <span class="i-lucide-loader-circle animate-spin text-[14px] text-starpath-text-muted" />
          <span class="text-[13px] text-starpath-text-muted">{{ t('starpath.subscribe.processing') }}</span>
        </div>

        <!-- Error -->
        <div v-if="errorMsg" class="mt-4 w-full max-w-[340px] px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2">
          <span class="i-lucide-alert-circle text-[16px] text-red-400 flex-shrink-0 mt-0.5" />
          <span class="text-[13px] text-red-400 leading-snug">{{ errorMsg }}</span>
        </div>

        <!-- ─── Trust Section ─── -->
        <div class="mt-[28px] flex flex-col items-center gap-2">
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-1.5">
              <span class="i-lucide-shield-check text-[14px] text-emerald-400/60" />
              <span class="text-[11px] text-starpath-text-disabled">{{ t('starpath.purchase.securePayment') }}</span>
            </div>
            <span class="text-white/10">·</span>
            <div class="flex items-center gap-1.5">
              <span class="i-lucide-undo-2 text-[14px] text-starpath-text-disabled" />
              <span class="text-[11px] text-starpath-text-disabled">{{ t('starpath.purchase.refundGuarantee') }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
