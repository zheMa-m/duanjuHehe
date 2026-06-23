<script setup lang="ts">
import { useStarpathStore } from '~/stores/starpath'
import { getStarpathIntroData } from '~/utils/starpath-intro-data'

const { t, locale } = useI18n()
definePageMeta({
  title: '智能问卷 · Familiarity',
  alias: ['/h5/starpath/question-page-one'],
})
useHead({ title: 'How familiar are you with astrology · 智能问卷' })

const router = useRouter()
const store = useStarpathStore()
const { progressOf } = useStarpathFlow()

const options = computed(() => getStarpathIntroData(locale.value as 'zh' | 'en').familiarityOptions)

const selected = ref<string | null>(null)

function pick(opt: string) {
  selected.value = opt
  store.setAnswer('familiarity', opt)
  setTimeout(() => router.push('/h5/starpath/intro/overview'), 200)
}
</script>

<template>
  <StarpathLayout
    show-back
    show-lock
    :progress="progressOf('/h5/starpath/intro/familiarity')"
    data-node-id="1:74"
  >
    <h1 class="mt-[60px] w-[301px] mx-auto text-center text-base font-semibold">
      {{ t('starpath.familiarity.question') }}
    </h1>

    <div class="mt-[60px] flex flex-col gap-[22px] items-center">
      <StarpathOptionCard
        v-for="opt in options"
        :key="opt"
        :selected="selected === opt"
        @click="pick(opt)"
      >
        {{ opt }}
      </StarpathOptionCard>
    </div>
  </StarpathLayout>
</template>
