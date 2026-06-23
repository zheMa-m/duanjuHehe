<script setup lang="ts">
import { useStarpathStore } from '~/stores/starpath'

const { t } = useI18n()
definePageMeta({
  title: '智能问卷 · Name',
  alias: ['/starpath/question-page-nine'],
})
useHead({ title: 'Your name · 智能问卷' })

const router = useRouter()
const store = useStarpathStore()
const { progressOf } = useStarpathFlow()

const name = ref('')

function next() {
  if (name.value.trim()) {
    store.setAnswer('fullName', name.value.trim())
    router.push('/starpath/intro/alignment')
  }
}
</script>

<template>
  <StarpathLayout
    show-back
    show-lock
    :progress="progressOf('/starpath/profile')"
    data-node-id="1:518"
  >
    <h1 class="mx-auto w-[301px] mt-[40px] text-center text-base font-semibold text-white leading-snug">
      {{ t('starpath.name.title') }}
    </h1>

    <p class="mx-auto mt-[14px] w-[280px] text-center text-sm text-starpath-text-muted">
      {{ t('starpath.name.desc') }}
    </p>

    <div class="mx-auto mt-[40px] w-[343px]">
      <input
        v-model="name"
        type="text"
        :placeholder="t('starpath.name.placeholder')"
        class="w-full h-[48px] rounded-[10px] bg-starpath-option-bg px-[16px] text-white text-[14px] placeholder:text-starpath-text-muted outline-none border border-transparent focus:border-[#bab3f3] transition-colors"
        @keyup.enter="next"
      >
    </div>

    <div class="absolute bottom-[44px] inset-x-0 px-4">
      <StarpathPrimaryButton
        :disabled="!name.trim()"
        @click="next"
      >
        {{ t('starpath.common.continue') }}
      </StarpathPrimaryButton>
    </div>
  </StarpathLayout>
</template>
