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

// 平台检测
const isIOS = computed(() => process.client && /iphone|ipad|ipod/i.test(navigator.userAgent))
const platform = computed<'ios' | 'android'>(() => isIOS.value ? 'ios' : 'android')

/**
 * 创建一次性购买订单
 * @returns orderId 或 null（失败时）
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
    errorMsg.value = e?.message || t('starpath.purchase.error')
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

/** PayPal / Google Pay 通过 StarpathPaymentButtons 处理 */
</script>

<template>
  <div class="starpath-page" data-biz="starpath">
    <div class="starpath-bg-gradient" />

    <div class="starpath-frame pt-safe-top">
      <div class="relative z-10 flex flex-col items-center px-4 pb-8">
        <!-- Badge -->
        <p class="absolute top-[16px] inset-x-0 text-center text-xl font-extrabold tracking-tight text-[#bab3f3]">
          {{ t('starpath.purchase.badge') }}
        </p>

        <!-- Stars -->
        <div class="mt-[60px] flex gap-1">
          <span
            v-for="i in 5"
            :key="i"
            class="text-[20px] text-[#bab3f3]"
          >★</span>
        </div>

        <!-- Title -->
        <h1 class="mt-[20px] text-center text-lg font-semibold leading-tight tracking-tight text-white">
          {{ t('starpath.purchase.title') }}
        </h1>

        <p class="mt-[8px] text-center text-sm text-starpath-text-muted max-w-[300px]">
          {{ t('starpath.purchase.subtitle') }}
        </p>

        <!-- Features -->
        <div class="mt-[28px] flex flex-col gap-[14px] w-full max-w-[336px]">
          <div
            v-for="f in features"
            :key="f.label"
            class="flex items-center gap-[10px]"
          >
            <span class="text-[22px]">{{ f.emoji }}</span>
            <span class="text-[14px] text-white">{{ f.label }}</span>
          </div>
        </div>

        <!-- Price: strikethrough original + discount -->
        <div class="mt-[28px] flex flex-col items-center gap-[6px]">
          <div class="flex items-center gap-[10px]">
            <span class="text-sm text-starpath-text-muted line-through">{{ ORIGINAL_PRICE }}</span>
            <span class="text-2xl font-bold text-white">{{ DISCOUNT_PRICE }}</span>
          </div>
          <span class="text-xs font-semibold text-[#bab3f3] uppercase tracking-wider">
            {{ t('starpath.purchase.todayOnly') }}
          </span>
        </div>

        <!-- One-time purchase notice -->
        <p class="mt-[8px] text-center text-xs text-starpath-text-muted max-w-[280px]">
          {{ t('starpath.purchase.oneTimeNotice') }}
        </p>

        <!-- Apple Pay button (iOS only) -->
        <StarpathPrimaryButton
          v-if="isIOS"
          class="mt-[24px] w-full max-w-[336px]"
          :loading="loading"
          @click="payWithApple"
        >
          {{ t('starpath.purchase.payWithApple') }}
        </StarpathPrimaryButton>

        <!-- PayPal & Card buttons -->
        <div class="mt-[14px] w-full max-w-[336px]">
          <StarpathPaymentButtons
            :platform="platform"
            plan="trial-7d"
            order-url="/api/starpath/purchase/one-time"
            success-url="/h5/starpath/email"
            @card="handleCardPayment"
          />
        </div>

        <!-- Loading -->
        <p v-if="loading" class="mt-3 text-center text-sm text-starpath-text-muted">
          {{ t('starpath.subscribe.processing') }}
        </p>

        <!-- Error -->
        <p v-if="errorMsg" class="mt-3 text-center text-sm text-red-400">
          {{ errorMsg }}
        </p>

        <!-- Security badges -->
        <div class="mt-[24px] flex items-center gap-[12px] opacity-60">
          <span class="i-lucide-shield-check text-[16px] text-starpath-text-muted" />
          <span class="text-xs text-starpath-text-muted">{{ t('starpath.purchase.securePayment') }}</span>
        </div>

        <p class="mt-[8px] text-center text-xs text-starpath-text-muted">
          {{ t('starpath.purchase.refundGuarantee') }}
        </p>
      </div>
    </div>
  </div>
</template>
