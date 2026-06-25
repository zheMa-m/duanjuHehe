<script setup lang="ts">
import { figmaAssets } from '~/components/starpath/_figma-assets'

const { t } = useI18n()
definePageMeta({
  title: '智能问卷 · Report on the Way',
  alias: ['/h5/starpath/报告已发送'],
})

const route = useRoute()
const router = useRouter()

// 从 URL query 读取订单详情
const orderId = computed(() => (route.query.orderId as string) || '')
const amount = computed(() => (route.query.amount as string) || '9.99')
const currency = computed(() => (route.query.currency as string) || 'USD')
const provider = computed(() => (route.query.provider as string) || '')

// 避免 hydration mismatch：SSR 无法访问 navigator.userAgent，始终 false
// 客户端 mounted 后检测真实平台
const isIOS = ref(false)
onMounted(() => {
  isIOS.value = /iphone|ipad|ipod/i.test(navigator.userAgent)
})
</script>

<template>
  <div class="starpath-page" data-biz="starpath">
    <div class="starpath-bg-gradient" />

    <div class="starpath-frame pt-safe-top flex flex-col items-center justify-center min-h-screen px-4">
      <div class="relative z-10 flex flex-col items-center w-full max-w-[360px]">
        <!-- Checkmark -->
        <div class="size-[80px] rounded-full bg-[#1a1a2e] border border-[#bab3f3] flex items-center justify-center">
          <span class="i-lucide-check text-[32px]" />
        </div>

        <h1 class="mt-[24px] text-center text-xl font-bold text-white">
          {{ t('starpath.sent.title') }}
        </h1>

        <p class="mt-[12px] text-center text-sm text-starpath-text-muted max-w-[320px]">
          {{ t('starpath.sent.desc') }}
        </p>

        <!-- 订单详情卡片 -->
        <div v-if="orderId" class="mt-[24px] w-full rounded-[12px] bg-starpath-option-bg border border-[#bab3f3]/20 p-[16px]">
          <h2 class="text-xs font-semibold text-starpath-text-muted uppercase tracking-wider mb-[12px]">
            {{ t('starpath.purchase.orderSummary') }}
          </h2>
          <div class="flex flex-col gap-[8px] text-sm">
            <div class="flex justify-between">
              <span class="text-starpath-text-muted">{{ t('starpath.purchase.product') }}</span>
              <span class="text-white font-medium">{{ t('starpath.purchase.productName') }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-starpath-text-muted">{{ t('starpath.purchase.amountPaid') }}</span>
              <span class="text-white font-medium">{{ currency === 'USD' ? '$' : '' }}{{ amount }} {{ currency !== 'USD' ? currency : '' }}</span>
            </div>
            <div v-if="provider" class="flex justify-between">
              <span class="text-starpath-text-muted">{{ t('starpath.purchase.paymentMethod') }}</span>
              <span class="text-white font-medium">{{ provider }}</span>
            </div>
          </div>
        </div>

        <!-- Email notice -->
        <div class="mt-[24px] w-full rounded-[12px] bg-starpath-option-bg/50 border border-[#bab3f3]/10 p-[16px] flex items-start gap-[12px]">
          <span class="i-lucide-mail text-[20px] text-[#bab3f3] shrink-0 mt-[2px]" />
          <div>
            <p class="text-sm text-white font-medium">
              {{ t('starpath.sent.emailNotice') }}
            </p>
            <p class="mt-[4px] text-xs text-starpath-text-muted">
              {{ t('starpath.sent.checkInbox') }}
            </p>
          </div>
        </div>

        <!-- App Store / Google Play download -->
        <a
          v-if="isIOS"
          href="https://apps.apple.com"
          target="_blank"
          rel="noopener noreferrer"
          class="mt-[24px] inline-flex items-center gap-[8px] px-[24px] py-[12px] rounded-[10px] bg-[#bab3f3] text-[#0a0a1a] font-semibold text-[14px]"
        >
          <img :src="figmaAssets['app-store-badge']" alt="App Store" class="h-[32px]" loading="lazy" />
        </a>
        <a
          v-else
          href="https://play.google.com"
          target="_blank"
          rel="noopener noreferrer"
          class="mt-[24px] inline-flex items-center gap-[8px] px-[24px] py-[12px] rounded-[10px] bg-[#bab3f3] text-[#0a0a1a] font-semibold text-[14px]"
        >
          <img :src="figmaAssets['google-play-badge']" alt="Google Play" class="h-[32px]" loading="lazy" />
        </a>

        <p class="mt-[16px] text-center text-xs text-starpath-text-muted">
          {{ t('starpath.sent.footerNote') }}
        </p>
      </div>
    </div>
  </div>
</template>
