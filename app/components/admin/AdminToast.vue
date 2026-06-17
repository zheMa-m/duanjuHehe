<script setup lang="ts">
interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

const toasts = ref<Toast[]>([])
let nextId = 0

function show(message: string, type: Toast['type'] = 'info', duration = 3500) {
  const id = nextId++
  toasts.value.push({ id, message, type })
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, duration)
}

defineExpose({ show })
</script>

<template>
  <Teleport to="body">
    <div class="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      <TransitionGroup name="toast">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="pointer-events-auto px-4 py-2.5 rounded-xl text-xs font-medium shadow-lg backdrop-blur-md border transition-all max-w-xs"
          :class="{
            'bg-[#30d158]/10 text-[#30d158] border-[#30d158]/20': t.type === 'success',
            'bg-[#ff453a]/10 text-[#ff453a] border-[#ff453a]/20': t.type === 'error',
            'bg-white/10 text-white/80 border-white/10': t.type === 'info',
          }"
        >
          {{ t.message }}
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active { transition: all 0.3s ease-out; }
.toast-leave-active { transition: all 0.2s ease-in; }
.toast-enter-from { opacity: 0; transform: translateX(20px); }
.toast-leave-to { opacity: 0; transform: translateX(20px); }
</style>
