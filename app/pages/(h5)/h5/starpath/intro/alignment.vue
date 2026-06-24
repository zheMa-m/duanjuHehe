<script setup lang="ts">
import { useStarpathStore } from '~/stores/starpath'
import { figmaAssets } from '~/components/starpath/_figma-assets'

const { t } = useI18n()
definePageMeta({
  title: '智能问卷 · Alignment Complete',
  alias: ['/h5/starpath/question-page-ten'],
})
useHead({ title: 'Alignment Complete · 智能问卷' })

const router = useRouter()
const store = useStarpathStore()
const { progressOf } = useStarpathFlow()

const name = computed(() => store.answers.fullName || 'Seeker')

function confirm() {
  router.push('/h5/starpath/questions/1')
}
</script>

<template>
  <StarpathLayout
    show-back
    show-lock
    :progress="progressOf('/h5/starpath/intro/alignment')"
    bg-variant="image"
    :bg-image="figmaAssets['page-10-bg']"
    data-node-id="1:4568"
  >
    <div class="flex flex-col items-center mt-[60px]">
      <img
        :src="figmaAssets['page-10-badge']"
        alt="stars"
        class="w-[200px] h-[56px] object-contain"
        loading="lazy"
      />
      <h1 class="mx-auto mt-[28px] w-[280px] text-center text-[20px] font-bold text-white leading-[normal] whitespace-pre-line">
        {{ t('starpath.alignment.title') }}
      </h1>
      <p class="mx-auto mt-[12px] w-[280px] text-center text-[14px] text-starpath-text-muted leading-[18px]">
        {{ t('starpath.alignment.desc') }}
      </p>
      <p class="mx-auto mt-[24px] w-[280px] text-center text-[14px] text-starpath-text-muted leading-[18px]">
        {{ t('starpath.alignment.badge') }}
      </p>

      <StarpathPrimaryButton class="mt-[40px]" @click="confirm">
        {{ t('starpath.common.continue') }}
      </StarpathPrimaryButton>
    </div>
  </StarpathLayout>
</template>
