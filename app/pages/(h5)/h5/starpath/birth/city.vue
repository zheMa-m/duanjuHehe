<script setup lang="ts">
import { useStarpathStore } from '~/stores/starpath'

const { t } = useI18n()
definePageMeta({
  title: '智能问卷 · Birth City',
  alias: ['/h5/starpath/question-page-eight'],
})
useHead({ title: 'Birth city · 智能问卷' })

const router = useRouter()
const store = useStarpathStore()
const { progressOf } = useStarpathFlow()

const query = ref('')
const suggestions = ref<string[]>([])
const selectedCity = ref('')
const loading = ref(false)

watch(query, async (val) => {
  if (val.length < 2) { suggestions.value = []; return }
  loading.value = true
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=5&featureType=city`)
    const data = await res.json()
    suggestions.value = data.map((d: any) => d.display_name)
  } catch {
    suggestions.value = []
  } finally {
    loading.value = false
  }
})

function pick(city: string) {
  selectedCity.value = city
  query.value = city
  suggestions.value = []
}

function next() {
  if (query.value) {
    store.setAnswer('birthCity', query.value)
    router.push('/h5/starpath/profile')
  }
}
</script>

<template>
  <StarpathLayout
    show-back
    show-lock
    :progress="progressOf('/h5/starpath/birth/city')"
    data-node-id="1:517"
  >
    <h1 class="mx-auto w-[301px] mt-[40px] text-center text-base font-semibold text-white leading-snug">
      {{ t('starpath.birthCity.title') }}
    </h1>

    <p class="mx-auto mt-[14px] w-[280px] text-center text-sm text-starpath-text-muted">
      {{ t('starpath.birthCity.desc') }}
    </p>

    <div class="relative mx-auto mt-[40px] w-[343px]">
      <input
        v-model="query"
        type="text"
        :placeholder="t('starpath.birthCity.placeholder')"
        class="w-full h-[48px] rounded-[10px] bg-starpath-option-bg px-[16px] text-white text-[14px] placeholder:text-starpath-text-muted outline-none border border-transparent focus:border-[#bab3f3] transition-colors"
      >
      <div
        v-if="loading"
        class="mt-2 text-center text-sm text-starpath-text-muted"
      >
        {{ t('starpath.common.loading') }}
      </div>
      <ul
        v-if="suggestions.length > 0"
        class="mt-2 rounded-[10px] bg-starpath-option-bg overflow-hidden"
      >
        <li
          v-for="(s, i) in suggestions"
          :key="i"
          class="px-[16px] py-[12px] text-[14px] text-white cursor-pointer hover:bg-starpath-option-bg-active transition-colors"
          @click="pick(s)"
        >
          {{ s }}
        </li>
      </ul>
    </div>

    <div class="absolute bottom-[44px] inset-x-0 px-4">
      <StarpathPrimaryButton
        :disabled="!query"
        @click="next"
      >
        {{ t('starpath.common.continue') }}
      </StarpathPrimaryButton>
    </div>
  </StarpathLayout>
</template>
