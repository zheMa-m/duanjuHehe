<script setup lang="ts">
const { t } = useI18n()
definePageMeta({
  title: '智能问卷 · Report',
  alias: ['/h5/starpath/邮箱收到的报告'],
})

import http from '#shell/http'

interface ReportUser {
  name: string
  bornAt: string
  bornCity: string
}

interface Section {
  title: string
  body: string
}

interface ProfessionalData {
  planetPositions: string
  houseStarts: string
  fullAspectList: string
  technicalParams: string
}

interface ReportData {
  user: ReportUser
  sections: Section[]
  professional?: ProfessionalData
}

const route = useRoute()
const reportId = computed(() => route.query.id as string)

const { data, pending, error } = useFetch<ReportData>(`/api/h5/starpath/report?id=${reportId.value}`, {
  immediate: !!reportId.value,
})

const fallback: ReportData = {
  user: { name: 'Seeker', bornAt: 'Jan 1, 1990', bornCity: 'New York, USA' },
  sections: [
    { title: 'Sun in Pisces', body: 'Your Sun sign reflects your core identity and life purpose.' },
    { title: 'Moon in Cancer', body: 'Your Moon sign reveals your emotional landscape and inner needs.' },
    { title: 'Rising in Leo', body: 'Your Rising sign influences how others perceive you.' },
    { title: 'Mercury in Aquarius', body: 'Your Mercury placement shapes your communication style.' },
  ],
}

const report = computed<ReportData>(() => data.value ?? fallback)
const coreSections = computed(() => report.value.sections.slice(0, 4))
const personalitySections = computed(() => report.value.sections.slice(4, 7))

const professionalItems = computed(() => [
  { title: t('starpath.report.planetPositions'), body: report.value.professional?.planetPositions },
  { title: t('starpath.report.houseStarts'), body: report.value.professional?.houseStarts },
  { title: t('starpath.report.aspectList'), body: report.value.professional?.fullAspectList },
  { title: t('starpath.report.technicalParams'), body: report.value.professional?.technicalParams },
])
</script>

<template>
  <div class="starpath-page" data-biz="starpath">
    <div class="starpath-bg-gradient" />

    <div class="starpath-frame pt-safe-top">
      <div class="relative z-10 px-4 pb-12">
        <p v-if="pending" class="text-center mt-10 text-starpath-text-sub">
          {{ t('starpath.report.loading') }}
        </p>
        <p v-if="error" class="text-center mt-10 text-red-400">
          {{ t('starpath.report.error') }}
        </p>

        <template v-if="!pending">
          <h1 class="text-base font-semibold text-white mt-[24px]">
            {{ t('starpath.report.title') }}
          </h1>

          <!-- User Info -->
          <div class="mt-[20px] p-[16px] rounded-[12px] bg-starpath-option-bg">
            <p class="text-base font-semibold text-white">
              {{ t('starpath.report.hello', { name: report.user.name }) }}
            </p>
            <p class="mt-1 text-sm text-starpath-text-sub">
              {{ t('starpath.report.bornAt', { date: report.user.bornAt }) }}
            </p>
            <p class="text-sm text-starpath-text-sub">
              {{ t('starpath.report.inCity', { city: report.user.bornCity }) }}
            </p>
          </div>

          <!-- Birth Chart Visualization -->
          <div class="mt-[20px] p-[16px] rounded-[12px] bg-starpath-option-bg flex items-center">
            <div class="size-[48px] rounded-full bg-gradient-to-br from-[#bab3f3] to-[#7c6fdf] flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="white" stroke-width="1.5"/>
                <circle cx="12" cy="12" r="4" stroke="white" stroke-width="1.5"/>
                <line x1="12" y1="2" x2="12" y2="6" stroke="white" stroke-width="1.5"/>
                <line x1="12" y1="18" x2="12" y2="22" stroke="white" stroke-width="1.5"/>
                <line x1="2" y1="12" x2="6" y2="12" stroke="white" stroke-width="1.5"/>
                <line x1="18" y1="12" x2="22" y2="12" stroke="white" stroke-width="1.5"/>
              </svg>
            </div>
            <span class="ml-2 text-sm text-starpath-text-sub">
              {{ t('starpath.report.birthChart') }}
            </span>
          </div>

          <!-- Core Interpretations -->
          <h2 class="mt-[28px] text-lg font-semibold text-white">
            {{ t('starpath.report.coreInterpretations') }}
          </h2>
          <div class="mt-[16px] flex flex-col gap-[12px]">
            <div
              v-for="section in coreSections"
              :key="section.title"
              class="p-[16px] rounded-[12px] bg-starpath-option-bg"
            >
              <h3 class="text-sm font-semibold text-white">{{ section.title }}</h3>
              <p class="mt-[8px] text-sm text-starpath-text-sub leading-[20px]">{{ section.body }}</p>
            </div>
          </div>

          <button type="button" class="mt-[12px] w-full py-[12px] text-center text-sm text-[#bab3f3]">
            View All
          </button>

          <!-- Personality Insights -->
          <div v-if="personalitySections.length" class="mt-[28px] flex flex-col gap-[12px]">
            <div
              v-for="section in personalitySections"
              :key="section.title"
              class="p-[16px] rounded-[12px] bg-starpath-option-bg"
            >
              <h3 class="text-sm font-semibold text-white">{{ section.title }}</h3>
              <p class="mt-[8px] text-sm text-starpath-text-sub leading-[20px]">{{ section.body }}</p>
            </div>
          </div>

          <!-- Aspect -->
          <h2 class="mt-[36px] text-lg font-semibold text-white">
            {{ t('starpath.report.aspect') }}
          </h2>
          <div class="mt-[16px] flex flex-col gap-[12px]">
            <div
              v-for="section in report.sections.slice(7, 12)"
              :key="section.title"
              class="p-[16px] rounded-[12px] bg-starpath-option-bg"
            >
              <h3 class="text-sm font-semibold text-white">{{ section.title }}</h3>
              <p class="mt-[8px] text-sm text-starpath-text-sub leading-[20px]">{{ section.body }}</p>
            </div>
          </div>

          <button type="button" class="mt-[12px] w-full py-[12px] text-center text-sm text-[#bab3f3]">
            View All
          </button>

          <!-- Professional Data -->
          <div v-if="report.professional">
            <h2 class="mt-[36px] text-lg font-semibold text-white">
              {{ t('starpath.report.professionalData') }}
            </h2>
            <div class="mt-[16px] flex flex-col gap-[12px]">
              <div
                v-for="(item, idx) in professionalItems"
                :key="idx"
                class="p-[16px] rounded-[12px] bg-starpath-option-bg"
              >
                <h3 class="text-sm font-semibold text-white">{{ item.title }}</h3>
                <p class="mt-[8px] text-sm text-starpath-text-sub leading-[20px] font-mono whitespace-pre-wrap">
                  {{ item.body }}
                </p>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
