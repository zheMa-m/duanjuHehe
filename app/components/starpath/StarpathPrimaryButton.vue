<script setup lang="ts">
const { t } = useI18n()
defineProps<{
  disabled?: boolean
  loading?: boolean
}>()
defineEmits<{ click: [] }>()
</script>

<template>
  <button
    type="button"
    class="starpath-btn-primary"
    :disabled="disabled || loading"
    @click="$emit('click')"
  >
    <span v-if="loading" class="i-heroicons-arrow-path animate-spin mr-2" />
    <slot>{{ t('starpath.common.continue') }}</slot>
  </button>
</template>
