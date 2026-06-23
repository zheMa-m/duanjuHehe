<script setup lang="ts">
const { t } = useI18n()
definePageMeta({
  title: '智能问卷 · Birth Time',
  alias: ['/starpath/question-page-seven'],
})
useHead({ title: 'Birth time · 智能问卷' })

const router = useRouter()
const { progressOf } = useStarpathFlow()

const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

const hour = ref(hours[12])
const minute = ref(minutes[0])
const unknown = ref(false)

function next() {
  const birthTime = unknown.value ? 'unknown' : `${hour.value}:${minute.value}`
  router.push('/starpath/birth/city')
}
</script>

<template>
  <StarpathLayout
    show-back
    show-lock
    :progress="progressOf('/starpath/birth/time')"
    data-node-id="1:509"
  >
    <h1 class="mx-auto w-[301px] mt-[40px] text-center text-base font-semibold text-white leading-snug">
      {{ t('starpath.birthTime.title') }}
    </h1>

    <p class="mx-auto mt-[14px] w-[280px] text-center text-sm text-starpath-text-muted">
      {{ t('starpath.birthTime.desc') }}
    </p>

    <div class="flex justify-center gap-4 mt-[40px]">
      <StarpathWheelPicker
        :items="hours"
        v-model="hour"
        class="w-[80px]"
        data-node-id="1:515"
      />
      <span class="text-white text-xl self-center">:</span>
      <StarpathWheelPicker
        :items="minutes"
        v-model="minute"
        class="w-[80px]"
        data-node-id="1:516"
      />
    </div>

    <label class="flex items-center justify-center gap-2 mt-[24px] cursor-pointer">
      <input
        type="checkbox"
        v-model="unknown"
        class="accent-[#bab3f3] size-4"
      >
      <span class="text-sm text-starpath-text-muted">{{ t('starpath.birthTime.unknown') }}</span>
    </label>

    <div class="absolute bottom-[44px] inset-x-0 px-4">
      <StarpathPrimaryButton @click="next">
        {{ t('starpath.common.continue') }}
      </StarpathPrimaryButton>
    </div>
  </StarpathLayout>
</template>
