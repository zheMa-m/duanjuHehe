<script setup lang="ts">
const props = withDefaults(defineProps<{ progress: number }>(), { progress: 0 })

const clampedWidth = computed(() => {
  const v = Math.max(0, Math.min(100, props.progress))
  return `${v}%`
})
</script>

<template>
  <div class="w-[343px] h-[5px] rounded-full bg-white/40 overflow-hidden">
    <div
      class="h-full rounded-full bg-white transition-[width] duration-300"
      :style="{ width: clampedWidth }"
    />
  </div>
</template>
