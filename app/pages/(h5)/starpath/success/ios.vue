<script setup lang="ts">
import { figmaAssets } from '~/components/starpath/_figma-assets'

const { t } = useI18n()
definePageMeta({
  title: '智能问卷 · Premium Activated (iOS)',
  alias: ['/starpath/订阅成功-ios'],
})

const route = useRoute()

// 从 URL query 读取订单详情
const planName = computed(() => (route.query.plan as string) || 'trial-7d')
const amount = computed(() => (route.query.amount as string) || '7.99')
const currency = computed(() => (route.query.currency as string) || 'USD')
const provider = computed(() => (route.query.provider as string) || 'Apple Pay')
const receiptId = computed(() => (route.query.receiptId as string) || '')

const PLAN_LABELS: Record<string, string> = {
  'trial-7d': '7-Day Trial',
  monthly: 'Monthly',
  yearly: 'Yearly',
}
const planLabel = computed(() => PLAN_LABELS[planName.value] || planName.value)
</script>

<template>
  <div class="starpath-page" data-biz="starpath">
    <div class="starpath-bg-gradient" />

    <div class="starpath-frame pt-safe-top flex flex-col items-center justify-center min-h-screen px-4">
      <div class="relative z-10 flex flex-col items-center w-full max-w-[360px]">
        <!-- Checkmark -->
        <div class="size-[80px] rounded-full bg-[#1a1a2e] border border-[#bab3f3] flex items-center justify-center">
          <span class="text-[32px]">✓</span>
        </div>

        <h1 class="mt-[24px] text-center text-xl font-bold text-white">
          Welcome to 智能问卷 Premium!
        </h1>

        <p class="mt-[12px] text-center text-sm text-starpath-text-muted max-w-[320px]">
          Your personalized birth chart is being prepared. Download the app for the best experience.
        </p>

        <!-- 订单详情卡片 -->
        <div class="mt-[24px] w-full rounded-[12px] bg-starpath-option-bg border border-[#bab3f3]/20 p-[16px]">
          <h2 class="text-xs font-semibold text-starpath-text-muted uppercase tracking-wider mb-[12px]">
            Order Summary
          </h2>
          <div class="flex flex-col gap-[8px] text-sm">
            <div class="flex justify-between">
              <span class="text-starpath-text-muted">Plan</span>
              <span class="text-white font-medium">{{ planLabel }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-starpath-text-muted">Amount</span>
              <span class="text-white font-medium">{{ currency === 'USD' ? '$' : '' }}{{ amount }} {{ currency !== 'USD' ? currency : '' }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-starpath-text-muted">Payment Method</span>
              <span class="text-white font-medium">{{ provider }}</span>
            </div>
            <div v-if="receiptId" class="flex justify-between">
              <span class="text-starpath-text-muted">Receipt</span>
              <span class="text-white font-mono text-xs">{{ receiptId }}</span>
            </div>
          </div>
        </div>

        <!-- App Store -->
        <a
          href="https://apps.apple.com"
          target="_blank"
          rel="noopener noreferrer"
          class="mt-[24px] inline-flex items-center gap-[8px] px-[24px] py-[12px] rounded-[10px] bg-[#bab3f3] text-[#0a0a1a] font-semibold text-[14px]"
        >
          <img :src="figmaAssets['app-store-badge']" alt="App Store" class="h-[32px]">
        </a>

        <p class="mt-[16px] text-center text-xs text-starpath-text-muted">
          Your report will also be sent to your email.
        </p>
      </div>
    </div>
  </div>
</template>
