<script setup lang="ts">
const { t } = useI18n()
definePageMeta({
  title: '智能问卷 · Birthday',
  alias: ['/h5/starpath/question-page-six'],
})
useHead({ title: 'Birthday · 智能问卷' })

const router = useRouter()
const { progressOf } = useStarpathFlow()

const months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]
const days = Array.from({ length: 31 }, (_, i) => String(i + 1))
const years = Array.from({ length: 80 }, (_, i) => String(new Date().getFullYear() - i))

const month = ref(months[0])
const day = ref(days[0])
const year = ref(years[0])

function next() {
  const birthDate = `${month.value} ${day.value}, ${year.value}`
  router.push('/h5/starpath/birth/time')
}
</script>

<template>
  <StarpathLayout
    show-back
    show-lock
    :progress="progressOf('/h5/starpath/birth/date')"
    data-node-id="1:496"
  >
    <h1 class="mx-auto w-[301px] mt-[40px] text-center text-base font-semibold text-white leading-snug">
      {{ t('starpath.birthday.title') }}
    </h1>

    <p class="mx-auto mt-[14px] w-[280px] text-center text-sm text-starpath-text-muted">
      {{ t('starpath.birthday.desc') }}
    </p>

    <div class="flex justify-center gap-4 mt-[40px]">
      <StarpathWheelPicker
        :items="months"
        v-model="month"
        class="w-[100px]"
        data-node-id="1:506"
      />
      <StarpathWheelPicker
        :items="days"
        v-model="day"
        class="w-[70px]"
        data-node-id="1:507"
      />
      <StarpathWheelPicker
        :items="years"
        v-model="year"
        class="w-[100px]"
        data-node-id="1:508"
      />
    </div>

    <div class="absolute bottom-[44px] inset-x-0 px-4">
      <StarpathPrimaryButton @click="next">
        {{ t('starpath.common.continue') }}
      </StarpathPrimaryButton>
    </div>
  </StarpathLayout>
</template>
