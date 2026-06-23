<script setup lang="ts">
const { t } = useI18n()
definePageMeta({
  title: '智能问卷 · Payment Confirmation',
  alias: ['/h5/starpath/信用卡支付-2'],
})
</script>

<template>
  <div class="starpath-page" data-biz="starpath">
    <div class="starpath-bg-gradient" />

    <div class="starpath-frame pt-safe-top flex flex-col items-center justify-center min-h-screen px-4">
      <div class="relative z-10 flex flex-col items-center">
        <div class="size-[80px] rounded-full bg-[#1a1a2e] border border-[#bab3f3] flex items-center justify-center">
          <span class="text-[32px]">✓</span>
        </div>

        <h1 class="mt-[24px] text-center text-xl font-bold text-white">
          Report Sent!
        </h1>

        <p class="mt-[12px] text-center text-sm text-starpath-text-muted max-w-[320px]">
          Your personalized birth chart reading has been sent to your email.
          Check your inbox (and spam folder) for the full report.
        </p>

        <p class="mt-[24px] text-center text-xs text-starpath-text-muted">
          Download our app for the best experience
        </p>
      </div>
    </div>
  </div>
</template>
