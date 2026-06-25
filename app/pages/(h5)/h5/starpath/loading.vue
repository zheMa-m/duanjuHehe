<script setup lang="ts">
import { getStarpathIntroData } from '~/utils/starpath-data'
import { useStarpathStore } from '~/stores/starpath'

const { t, locale } = useI18n()
definePageMeta({
  title: '智能问卷 · Calculating',
  alias: ['/h5/starpath/question-page-twelve'],
})
useHead({ title: `${t('starpath.calculating.desc')} · 智能问卷` })

const router = useRouter()
const { progressOf } = useStarpathFlow()
const store = useStarpathStore()

const steps = computed(() => getStarpathIntroData(locale.value as 'zh' | 'en').calculatingSteps)

const currentStep = ref(0)

onMounted(() => {
  // 异步触发问卷完成（不阻塞动画）
  if (store.sessionId) {
    $fetch('/api/starpath/questionnaire/complete', {
      method: 'POST',
      body: { sessionId: store.sessionId },
    }).catch((e: any) => console.warn('[Starpath] Complete failed', e))
  }

  const timer = setInterval(() => {
    if (currentStep.value < steps.value.length - 1) {
      currentStep.value++
    } else {
      clearInterval(timer)
      setTimeout(() => router.push('/h5/starpath/purchase'), 800)
    }
  }, 1200)
})
</script>

<template>
  <div class="starpath-page" data-biz="starpath">
    <div class="starpath-bg-gradient" />

    <div class="starpath-frame pt-safe-top flex flex-col items-center justify-center min-h-screen">
      <div class="relative z-10 flex flex-col items-center">
        <!-- Spinning animation -->
        <div class="size-[80px] rounded-full border-2 border-starpath-primary-soft border-t-[#bab3f3] animate-spin" />

        <h1 class="mt-[40px] text-center text-lg font-semibold text-white">
          {{ t('starpath.calculating.desc') }}
        </h1>

        <div class="mt-[36px] flex flex-col gap-[16px] w-[280px]">
          <div
            v-for="(step, i) in steps"
            :key="step"
            class="flex items-center gap-[10px]"
            :class="i <= currentStep ? 'opacity-100' : 'opacity-40'"
          >
            <div
              class="size-[20px] rounded-full flex items-center justify-center"
              :class="i < currentStep ? 'bg-[#bab3f3]' : i === currentStep ? 'border-2 border-[#bab3f3]' : 'border border-starpath-text-muted'"
            >
              <span v-if="i < currentStep" class="i-lucide-check text-[10px] text-white" />
            </div>
            <span class="text-sm text-white">{{ step }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
