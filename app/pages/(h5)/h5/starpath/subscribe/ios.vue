<script setup lang="ts">
import { figmaAssets } from '~/components/starpath/_figma-assets'
import { useStarpathStore } from '~/stores/starpath'
import { getStarpathIntroData } from '~/utils/starpath-data'

const { t, locale } = useI18n()
definePageMeta({
  title: '智能问卷 · Subscribe (iOS)',
  alias: ['/h5/starpath/订阅-ios'],
})

const store = useStarpathStore()
const router = useRouter()

const loading = ref(false)

const featureLabels = computed(() => getStarpathIntroData(locale.value as 'zh' | 'en')?.subscribeFeatures || [
  'AI Birth Chart Analysis', 'Personality Traits Decoded',
  'Relationship Compatibility Insights', 'Key Opportunity Windows'
])

const featureEmojis = ['🌟', '✨', '💕', '🔮']

const features = computed(() => featureLabels.value.map((label, i) => ({
  emoji: featureEmojis[i % featureEmojis.length],
  label,
})))

async function payWithApple() {
  loading.value = true
  try {
    const res = await $fetch<any>('/api/h5/starpath/subscribe/ios', {
      method: 'POST',
      body: {
        bizCode: 'starpath',
        platform: 'ios',
        plan: 'trial-7d',
        paymentMethod: 'apple-pay',
      },
    })
    const order = res?.data
    if (!order?.orderId) throw new Error('Order creation failed')
    store.setSubscription({ platform: 'ios', paid: true, plan: 'trial-7d' })
    const qs = new URLSearchParams({
      plan: 'trial-7d',
      amount: (order.amount || 7.99).toFixed(2),
      currency: order.currency || 'USD',
      provider: 'Apple Pay',
      receiptId: `rcpt_${Date.now()}`,
    }).toString()
    router.push(`/h5/starpath/success/ios?${qs}`)
  } catch (e) {
    console.error('Apple Pay failed', e)
  } finally {
    loading.value = false
  }
}

// 信用卡支付：先创建订单再跳转填写页
async function handleCardPayment() {
  loading.value = true
  try {
    const res = await $fetch<any>('/api/h5/starpath/subscribe/ios', {
      method: 'POST',
      body: {
        bizCode: 'starpath',
        platform: 'ios',
        plan: 'trial-7d',
        paymentMethod: 'card',
      },
    })
    if (res?.data?.orderId) {
      router.push(`/h5/starpath/payment/card?orderId=${res.data.orderId}`)
    } else {
      router.push('/h5/starpath/payment/card')
    }
  } catch (e) {
    console.error('Create order failed', e)
    router.push('/h5/starpath/payment/card')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="starpath-page" data-biz="starpath">
    <div class="starpath-bg-gradient" />

    <div class="starpath-frame pt-safe-top">
      <div class="relative z-10 flex flex-col items-center px-4 pb-8">
        <!-- Badge -->
        <p class="absolute top-[16px] inset-x-0 text-center text-xl font-extrabold tracking-tight">
          {{ t('starpath.subscribe.badge') }}
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
        <h1 class="mt-[24px] text-center text-lg font-semibold leading-tight tracking-tight">
          {{ t('starpath.subscribe.title') }}
        </h1>

        <!-- Features -->
        <div class="mt-[32px] flex flex-col gap-[16px] w-full max-w-[336px]">
          <div
            v-for="f in features"
            :key="f.label"
            class="flex items-center gap-[10px]"
          >
            <span class="text-[24px]">{{ f.emoji }}</span>
            <span class="text-[14px] text-white">{{ f.label }}</span>
          </div>
        </div>

        <!-- Price -->
        <div class="mt-[32px] flex items-center gap-[8px]">
          <span>{{ t('starpath.subscribe.todayPrice') }}</span>
          <span class="line-through text-starpath-text-disabled">{{ t('starpath.subscribe.originalPrice') }}</span>
          <span class="text-base font-semibold">{{ t('starpath.subscribe.currentPrice') }}</span>
        </div>

        <!-- Trial desc -->
        <p class="mt-[12px] mx-auto w-[336px] text-center text-xs text-starpath-text-muted leading-[18px] tracking-tight">
          {{ t('starpath.subscribe.trialDesc') }}
        </p>

        <!-- Apple Pay button -->
        <StarpathPrimaryButton
          class="mt-[24px] w-full max-w-[336px]"
          :loading="loading"
          @click="payWithApple"
        >
          Continue with Apple Pay
        </StarpathPrimaryButton>

        <!-- PayPal & Card buttons -->
        <div class="mt-[16px] w-full max-w-[336px]">
          <StarpathPaymentButtons
            platform="ios"
            plan="trial-7d"
            @card="handleCardPayment"
          />
        </div>

        <p v-if="loading" class="mt-3 text-center text-sm text-starpath-text-muted">
          {{ t('starpath.subscribe.processing') }}
        </p>
      </div>
    </div>
  </div>
</template>
