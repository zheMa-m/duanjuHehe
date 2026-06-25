<script setup lang="ts">
interface ConfirmState {
  visible: boolean
  title: string
  message: string
  detail?: string
  confirmText: string
  confirmClass: string
  icon: string
  iconClass: string
}

const state = ref<ConfirmState>({
  visible: false,
  title: '',
  message: '',
  detail: undefined,
  confirmText: '确认',
  confirmClass: 'bg-[#ff453a] hover:bg-[#ff453a]/90 text-white',
  icon: 'i-lucide-alert-triangle',
  iconClass: 'text-[#ff453a] bg-[#ff453a]/10',
})

let resolveFn: ((value: boolean) => void) | null = null

/**
 * Show a custom confirm dialog and return a Promise<boolean>.
 * @param message - Main confirmation message
 * @param options - Configuration options
 */
function show(
  message: string,
  options: {
    title?: string
    detail?: string
    confirmText?: string
    confirmClass?: string
    icon?: string
    iconClass?: string
  } = {},
): Promise<boolean> {
  return new Promise((resolve) => {
    resolveFn = resolve
    state.value = {
      visible: true,
      title: options.title || '操作确认',
      message,
      detail: options.detail,
      confirmText: options.confirmText || '确认',
      confirmClass: options.confirmClass || 'bg-[#ff453a] hover:bg-[#ff453a]/90 text-white',
      icon: options.icon || 'i-lucide-alert-triangle',
      iconClass: options.iconClass || 'text-[#ff453a] bg-[#ff453a]/10',
    }
  })
}

function handleConfirm() {
  state.value.visible = false
  resolveFn?.(true)
  resolveFn = null
}

function handleCancel() {
  state.value.visible = false
  resolveFn?.(false)
  resolveFn = null
}

function handleOverlayClick(e: MouseEvent) {
  if ((e.target as HTMLElement).classList.contains('confirm-overlay')) {
    handleCancel()
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (!state.value.visible) return
  if (e.key === 'Escape') handleCancel()
  if (e.key === 'Enter') handleConfirm()
}

defineExpose({ show })

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <Teleport to="body">
    <Transition name="confirm-modal">
      <div
        v-if="state.visible"
        class="confirm-overlay fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        @click="handleOverlayClick"
      >
        <div class="w-[calc(100%-2rem)] sm:w-full max-w-sm max-w-[95vw] bg-[#1a1a2e] border border-white/[0.08] rounded-xl p-5 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
          <!-- Header: icon + title -->
          <div class="flex items-center gap-3 mb-4">
            <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" :class="state.iconClass">
              <span :class="state.icon" class="text-[13px]" />
            </div>
            <div>
              <h3 class="text-[15px] font-bold text-white leading-snug">{{ state.title }}</h3>
            </div>
          </div>

          <!-- Message body -->
          <p class="text-[13px] text-white/70 leading-relaxed mb-1 pl-12">{{ state.message }}</p>
          <p v-if="state.detail" class="text-[12px] text-white/40 leading-relaxed mb-1 pl-12 whitespace-pre-line">{{ state.detail }}</p>

          <!-- Action buttons -->
          <div class="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-white/[0.06]">
            <button
              @click="handleCancel"
              class="text-[12px] bg-white/5 hover:bg-white/10 text-white/70 font-semibold px-4 py-2 rounded-lg transition-all cursor-pointer active:scale-[0.98]"
            >取消</button>
            <button
              @click="handleConfirm"
              class="text-[12px] font-semibold px-4 py-2 rounded-lg transition-all cursor-pointer active:scale-[0.98]"
              :class="state.confirmClass"
            >{{ state.confirmText }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.confirm-modal-enter-active {
  transition: opacity 0.2s ease, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.confirm-modal-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.confirm-modal-enter-from,
.confirm-modal-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
