<script setup lang="ts">
import { figmaAssets } from '~/components/starpath/_figma-assets'
import { useStarpathStore } from '~/stores/starpath'

const { t } = useI18n()
definePageMeta({
  title: '智能问卷 · Welcome',
  alias: ['/h5/starpath/question-page-zero'],
})
useHead({ title: 'Navigate Your Fate · 智能问卷' })

const router = useRouter()
const store = useStarpathStore()

function pickGender(g: 'male' | 'female') {
  store.setAnswer('gender', g)
  router.push('/h5/starpath/intro/familiarity')
}
</script>

<template>
  <div class="starpath-page" data-biz="starpath" data-node-id="1:24">
    <div class="starpath-bg-gradient" />

    <div class="starpath-frame pt-safe-top">
      <main class="relative z-10 flex flex-col items-center">
        <div class="mt-[72px] size-[70px] rounded-[16px] border border-starpath-primary-soft overflow-hidden">
          <NuxtImg :src="figmaAssets['page-0-logo']" alt="智能问卷" class="size-full object-cover" format="webp" loading="eager" fetchpriority="high" />
        </div>

        <h1 class="mt-[42px] mx-auto w-[337px] text-center text-base font-semibold leading-snug">
          {{ t('starpath.welcome.title') }}
        </h1>

        <p class="mt-[26px] w-[326px] text-center text-sm text-starpath-text-muted">
          {{ t('starpath.welcome.subtitle') }}
        </p>

        <p class="mt-[15px] w-[301px] text-center text-lg font-semibold">{{ t('starpath.welcome.prompt') }}</p>

        <div class="mt-[22px] flex gap-[27px]">
          <button
            type="button"
            :aria-label="t('starpath.welcome.male')"
            class="w-[148px] h-[200px] rounded-[20px] overflow-hidden active:opacity-90"
            @click="pickGender('male')"
          >
            <NuxtImg :src="figmaAssets['page-0-male']" :alt="t('starpath.welcome.male')" class="size-full object-cover" format="webp" loading="lazy" />
          </button>

          <button
            type="button"
            :aria-label="t('starpath.welcome.female')"
            class="w-[148px] h-[200px] rounded-[20px] overflow-hidden active:opacity-90"
            @click="pickGender('female')"
          >
            <NuxtImg :src="figmaAssets['page-0-female']" :alt="t('starpath.welcome.female')" class="size-full object-cover" format="webp" loading="lazy" />
          </button>
        </div>

        <p class="mt-[156px] mb-6 w-[329px] text-center text-xs text-starpath-text-muted leading-snug">
          {{ t('starpath.welcome.tos') }}
        </p>
      </main>
    </div>
  </div>
</template>
