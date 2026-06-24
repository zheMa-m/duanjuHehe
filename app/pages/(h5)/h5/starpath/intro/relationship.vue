<script setup lang="ts">
import { useStarpathStore } from '~/stores/starpath'
import { figmaAssets } from '~/components/starpath/_figma-assets'
import { getStarpathIntroData } from '~/utils/starpath-data'

const { t, locale } = useI18n()
definePageMeta({
  title: '智能问卷 · Relationship',
  alias: ['/h5/starpath/question-page-five'],
})
useHead({ title: 'Relationship status · 智能问卷' })

const router = useRouter()
const store = useStarpathStore()
const { progressOf } = useStarpathFlow()

const labels = computed(() => getStarpathIntroData(locale.value as 'zh' | 'en').relationshipOptions)

const options = computed(() => [
  { value: 'single', label: labels.value[0], sprite: { col: 0, row: 0 } },
  { value: 'dating', label: labels.value[1], sprite: { col: 1, row: 0 } },
  { value: 'committed', label: labels.value[2], sprite: { col: 0, row: 1 } },
  { value: 'complicated', label: labels.value[3], sprite: { col: 1, row: 1 } },
])

const spriteW = 149
const spriteH = 149

function pick(val: string) {
  store.setAnswer('relationship', val)
  router.push('/h5/starpath/birth/date')
}
</script>

<template>
  <StarpathLayout
    show-back
    show-lock
    :progress="progressOf('/h5/starpath/intro/relationship')"
    data-node-id="1:347"
  >
    <h1 class="mx-auto w-[301px] mt-[40px] text-center text-base font-semibold text-white leading-snug">
      {{ t('starpath.relationship.title') }}
    </h1>

    <div class="mx-auto mt-[40px] grid grid-cols-2 gap-x-[20px] gap-y-[17px] w-[318px]">
      <button
        v-for="opt in options"
        :key="opt.value"
        type="button"
        class="w-[149px] h-[149px] rounded-[16px] bg-starpath-option-bg active:bg-starpath-option-bg-active overflow-hidden"
        @click="pick(opt.value)"
      >
        <div
          class="sprite-bg"
          :style="{
            backgroundImage: `url(${figmaAssets['page-5-relationship-sprite']})`,
            width: spriteW + 'px',
            height: spriteH + 'px',
            backgroundPosition: `-${opt.sprite.col * spriteW}px -${opt.sprite.row * spriteH}px`,
            backgroundSize: `${spriteW * 2}px ${spriteH * 2}px`,
          }"
        />
      </button>
    </div>

    <div class="mx-auto mt-[38px] w-[318px] grid grid-cols-2 gap-x-[20px]">
      <p
        v-for="opt in options"
        :key="'label-' + opt.value"
        class="text-center text-[14px] font-semibold text-white"
      >
        {{ opt.label }}
      </p>
    </div>
  </StarpathLayout>
</template>
