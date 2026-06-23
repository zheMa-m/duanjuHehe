<script setup lang="ts" generic="T extends string | number">
const props = withDefaults(
  defineProps<{
    items: T[]
    modelValue: T
    itemHeight?: number
    visibleCount?: number
    formatter?: (item: T) => string
  }>(),
  {
    itemHeight: 38,
    visibleCount: 5,
  },
)

const emit = defineEmits<{
  'update:modelValue': [T]
}>()

const containerHeight = computed(() => props.itemHeight * props.visibleCount)
const padOffset = computed(() => Math.floor(props.visibleCount / 2) * props.itemHeight)

const scroller = ref<HTMLDivElement | null>(null)

const selectedIdx = computed(() => {
  const idx = props.items.indexOf(props.modelValue)
  return idx < 0 ? 0 : idx
})

let scrollDebounce: number | null = null
let externalLock = false

function onScroll() {
  if (externalLock) return
  if (scrollDebounce !== null) window.clearTimeout(scrollDebounce)
  scrollDebounce = window.setTimeout(() => {
    if (!scroller.value) return
    const idx = Math.round(scroller.value.scrollTop / props.itemHeight)
    const clamped = Math.max(0, Math.min(props.items.length - 1, idx))
    if (props.items[clamped] !== props.modelValue) {
      emit('update:modelValue', props.items[clamped] as T)
    }
  }, 80) as unknown as number
}

function scrollToIdx(idx: number, smooth = true) {
  if (!scroller.value) return
  externalLock = true
  scroller.value.scrollTo({
    top: idx * props.itemHeight,
    behavior: smooth ? 'smooth' : 'auto',
  })
  setTimeout(() => { externalLock = false }, smooth ? 420 : 30)
}

function pickItem(idx: number) {
  scrollToIdx(idx, true)
  if (props.items[idx] !== props.modelValue) {
    emit('update:modelValue', props.items[idx] as T)
  }
}

onMounted(() => {
  nextTick(() => scrollToIdx(selectedIdx.value, false))
})

watch(
  () => props.modelValue,
  () => {
    const idx = props.items.indexOf(props.modelValue)
    if (idx >= 0 && scroller.value) {
      const expected = idx * props.itemHeight
      if (Math.abs(scroller.value.scrollTop - expected) > 1) {
        scrollToIdx(idx, true)
      }
    }
  },
)

watch(
  () => props.items,
  () => {
    nextTick(() => scrollToIdx(selectedIdx.value, false))
  },
  { deep: false },
)
</script>

<template>
  <div class="relative select-none" :style="{ height: `${containerHeight}px` }">
    <div
      class="absolute inset-x-0 pointer-events-none border-y border-white/15 z-10"
      :style="{ top: `${padOffset}px`, height: `${itemHeight}px` }"
    />

    <div
      ref="scroller"
      class="h-full overflow-y-scroll snap-y snap-mandatory overscroll-contain wheel-scroller"
      @scroll="onScroll"
    >
      <div :style="{ height: `${padOffset}px` }" />

      <div
        v-for="(item, i) in items"
        :key="i"
        class="snap-center flex items-center justify-center cursor-pointer leading-none transition-[opacity,font-size] duration-150"
        :class="
          i === selectedIdx
            ? 'text-white text-[18px] font-medium'
            : 'text-white/35 text-[15px]'
        "
        :style="{ height: `${itemHeight}px` }"
        @click="pickItem(i)"
      >
        {{ formatter ? formatter(item) : String(item) }}
      </div>

      <div :style="{ height: `${padOffset}px` }" />
    </div>

    <div
      class="absolute inset-x-0 top-0 pointer-events-none bg-gradient-to-b from-starpath-option-bg to-transparent z-20"
      :style="{ height: `${padOffset}px` }"
    />
    <div
      class="absolute inset-x-0 bottom-0 pointer-events-none bg-gradient-to-t from-starpath-option-bg to-transparent z-20"
      :style="{ height: `${padOffset}px` }"
    />
  </div>
</template>

<style scoped>
.wheel-scroller {
  scrollbar-width: none;
  -ms-overflow-style: none;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
}
.wheel-scroller::-webkit-scrollbar {
  display: none;
}
</style>
