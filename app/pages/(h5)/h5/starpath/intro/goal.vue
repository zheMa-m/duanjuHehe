<script setup lang="ts">
import { figmaAssets } from '~/components/starpath/_figma-assets'
import { getStarpathIntroData } from '~/utils/starpath-intro-data'

const { t, locale } = useI18n()
definePageMeta({
  title: '智能问卷 · Goal Set',
  alias: ['/h5/starpath/question-page-four'],
})
useHead({ title: 'Set your goal · 智能问卷' })

const router = useRouter()
const { progressOf } = useStarpathFlow()

const goalLabels = computed(() => getStarpathIntroData(locale.value as 'zh' | 'en').goalOptions)

const goalGradients = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
]

const goals = computed(() => {
  const labels = goalLabels.value
  return labels.map((label, i) => ({
    gradient: goalGradients[i % goalGradients.length],
    title: label,
  }))
})
</script>

<template>
  <StarpathLayout
    show-back
    show-lock
    :progress="progressOf('/h5/starpath/intro/goal')"
    bg-variant="image"
    :bg-image="figmaAssets['page-4-bg']"
    data-node-id="1:558"
  >
    <h1 class="mx-auto w-[345px] mt-[20px] text-center text-[16px] font-semibold text-white leading-[normal] whitespace-pre-line">
      {{ t('starpath.goal.title') }}
    </h1>

    <div class="mx-auto w-[340px] mt-[46px] flex flex-col gap-[24px]">
      <div
        v-for="g in goals"
        :key="g.title"
        class="relative w-full h-[80px] rounded-[12px] overflow-hidden flex items-center px-[18px]"
        :style="{ background: g.gradient }"
      >
        <p class="text-[16px] font-bold text-white">{{ g.title }}</p>
      </div>
    </div>

    <div class="mx-auto w-[calc(100%-32px)] mt-[36px]">
      <StarpathPrimaryButton @click="router.push('/h5/starpath/intro/relationship')">
        {{ t('starpath.common.continue') }}
      </StarpathPrimaryButton>
    </div>

    <p class="mt-[20px] text-center text-[12px] text-starpath-text-muted leading-[normal]">
      {{ t('starpath.goal.desc') }}
    </p>
  </StarpathLayout>
</template>
