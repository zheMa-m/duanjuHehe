<script setup lang="ts">
defineProps<{
  selected?: boolean
  disabled?: boolean
  /** 可选前缀图标（emoji 或 unocss icon class） */
  icon?: string
}>()
defineEmits<{ click: [] }>()
</script>

<template>
  <button
    type="button"
    class="starpath-card w-full transition-colors"
    :class="[selected && 'starpath-card-active', disabled && 'opacity-50 pointer-events-none']"
    @click="$emit('click')"
  >
    <span v-if="icon" class="mr-2 inline-block size-4" :class="icon" />
    <span class="flex-1 text-left">
      <slot />
    </span>
  </button>
</template>
