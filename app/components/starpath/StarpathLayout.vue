<script setup lang="ts">
const { t } = useI18n()
defineProps<{
  showBack?: boolean
  showLock?: boolean
  progress?: number
  /** default: 顶 →中 →底 三段紫渐变；plain: 纯黑底；image: 全屏背景图（需配 bgImage） */
  bgVariant?: 'default' | 'plain' | 'image'
  /** 当 bgVariant='image' 时使用的背景图 URL（一般来自 figmaAssets） */
  bgImage?: string
}>()

const emit = defineEmits<{ back: [] }>()

const router = useRouter()
function onBack() {
  emit('back')
  if (router.currentRoute.value.path !== '/') router.back()
}
</script>

<template>
  <div class="starpath-page" data-biz="starpath">
    <div v-if="bgVariant !== 'plain'" class="starpath-bg-gradient" />

    <div class="starpath-frame flex flex-col pt-safe-top pb-safe-bottom">
      <img
        v-if="bgVariant === 'image' && bgImage"
        :src="bgImage"
        alt=""
        aria-hidden="true"
        class="absolute inset-0 size-full object-cover pointer-events-none select-none"
      >

      <header class="relative z-10 h-[88px] shrink-0">
        <div class="absolute top-[44px] inset-x-0 h-[44px] flex items-center px-4">
          <button
            v-if="showBack"
            type="button"
            aria-label="返回"
            class="size-[18px] flex items-center justify-center text-white"
            @click="onBack"
          >
            <span class="i-heroicons-chevron-left-20-solid text-[18px]" />
          </button>
          <div
            v-if="showLock"
            class="flex-1 flex items-center justify-center gap-1 -ml-[18px]"
          >
            <span class="i-heroicons-lock-closed-solid text-[14px] text-white" />
            <span class="text-sm tracking-[-0.165px] text-starpath-text-main">
              {{ t('starpath.common.confidential') }}
            </span>
          </div>
        </div>
      </header>

      <StarpathProgressBar
        v-if="progress !== undefined"
        :progress="progress"
        class="relative z-10 mx-auto shrink-0"
      />

      <main class="relative z-10 px-4 flex-1">
        <slot />
      </main>
    </div>
  </div>
</template>
