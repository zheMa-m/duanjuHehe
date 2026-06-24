<script setup lang="ts">
import { useStarpathStore } from '~/stores/starpath'
import { figmaAssets } from '~/components/starpath/_figma-assets'
import { getStarpathIntroData } from '~/utils/starpath-intro-data'

const { t, locale } = useI18n()
definePageMeta({
  title: '智能问卷 · Focus',
  alias: ['/h5/starpath/question-page-three'],
})
useHead({ title: 'Main focus for today · 智能问卷' })

const router = useRouter()
const store = useStarpathStore()
const { progressOf } = useStarpathFlow()

const focusLabels = computed(() => getStarpathIntroData(locale.value as 'zh' | 'en').focusOptions)

const icons = [
  figmaAssets['page-4-icon-heart-with-arrow'], figmaAssets['page-4-icon-money-bag'],
  figmaAssets['page-4-icon-rainbow'], figmaAssets['page-3-icon-lotus'],
  figmaAssets['page-3-icon-fencing'], figmaAssets['page-3-icon-crystal-ball'],
]

const options = computed(() => focusLabels.value.map((label, i) => ({ icon: icons[i], label })))

const selected = ref<Set<string>>(new Set())

function toggle(label: string) {
  if (selected.value.has(label)) selected.value.delete(label)
  else selected.value.add(label)
  selected.value = new Set(selected.value)
}

function next() {
  store.setAnswer('focus', [...selected.value])
  router.push('/h5/starpath/intro/goal')
}
</script>

<template>
  <StarpathLayout
    show-back
    show-lock
    :progress="progressOf('/h5/starpath/intro/focus')"
    data-node-id="1:123"
  >
    <h1 class="mt-[40px] mx-auto w-[301px] text-center text-[16px] font-semibold text-white leading-[normal]">
      {{ t('starpath.focus.title') }}
    </h1>

    <div class="mt-[44px] flex flex-col gap-[22px] items-center">
      <button
        v-for="opt in options"
        :key="opt.label"
        type="button"
        class="relative w-[343px] h-[53px] rounded-[10px] bg-starpath-option-bg px-[14px] flex items-center gap-[4px] active:bg-starpath-option-bg-active transition-colors"
        :class="selected.has(opt.label) ? 'border border-[#bab3f3]' : ''"
        @click="toggle(opt.label)"
      >
        <img :src="opt.icon" alt="" class="size-[24px] object-cover shrink-0" loading="lazy" />
        <span class="text-[14px] text-white leading-[normal]">{{ opt.label }}</span>
      </button>
    </div>

    <div class="mt-[52px] flex justify-center">
      <StarpathPrimaryButton
        :disabled="selected.size === 0"
        @click="next"
      >
        {{ t('starpath.common.continue') }}
      </StarpathPrimaryButton>
    </div>
  </StarpathLayout>
</template>
