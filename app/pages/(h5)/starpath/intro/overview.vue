<script setup lang="ts">
import { figmaAssets } from '~/components/starpath/_figma-assets'
import { getStarpathIntroData } from '~/utils/starpath-intro-data'

const { t, locale } = useI18n()
definePageMeta({
  title: '智能问卷 · Intro',
  alias: ['/starpath/question-page-two'],
})
useHead({ title: "That's great · 智能问卷" })

const router = useRouter()
const { progressOf } = useStarpathFlow()

const features = computed(() => {
  const labels = getStarpathIntroData(locale.value as 'zh' | 'en').introFeatures
  const icons = [
    figmaAssets['page-2-icon-two-hearts'],
    figmaAssets['page-2-icon-sparkles'],
    figmaAssets['page-2-icon-briefcase'],
    figmaAssets['page-2-icon-crescent-moon'],
  ]
  return labels.map((label, i) => ({ img: icons[i], label }))
})
</script>

<template>
  <StarpathLayout
    show-back
    show-lock
    :progress="progressOf('/starpath/intro/overview')"
    bg-variant="image"
    :bg-image="figmaAssets['page-2-bg']"
    data-node-id="1:485"
  >
    <h1 class="mt-[20px] mx-auto w-[345px] text-center text-[16px] font-semibold leading-[normal] whitespace-pre-line">
      {{ t('starpath.intro.title') }}
    </h1>

    <p class="mt-[14px] mx-auto w-[345px] text-center text-[14px] text-starpath-text-muted leading-[normal]">
      {{ t('starpath.intro.subtitle') }}
    </p>

    <ul class="mt-[56px] mx-auto w-[180px] flex flex-col gap-[12px]">
      <li
        v-for="f in features"
        :key="f.label"
        class="flex items-center gap-[4px] text-[14px] text-white whitespace-nowrap"
      >
        <img :src="f.img" :alt="f.label" class="size-[14px] object-cover shrink-0">
        <span>{{ f.label }}</span>
      </li>
    </ul>

    <div class="absolute bottom-[44px] inset-x-0 px-4">
      <StarpathPrimaryButton @click="router.push('/starpath/intro/focus')">
        {{ t('starpath.common.continue') }}
      </StarpathPrimaryButton>
    </div>
  </StarpathLayout>
</template>
