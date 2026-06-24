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
    <!-- 将 Toast 放在页面顶层，采用更高级的布局 -->
    <div class="fixed bottom-8 right-8 z-[9999] flex flex-col gap-3.5 pointer-events-none max-w-sm w-full px-4 sm:px-0">
      <TransitionGroup name="toast">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="pointer-events-auto px-4.5 py-3.5 rounded-2xl text-xs font-semibold shadow-[0_15px_30px_rgba(0,0,0,0.6)] backdrop-blur-xl border flex items-center gap-3 transition-all duration-300 w-full"
          :class="{
            'bg-[#30d158]/10 text-[#30d158] border-[#30d158]/25 shadow-[0_0_15px_rgba(48,209,88,0.1)]': t.type === 'success',
            'bg-[#ff453a]/10 text-[#ff453a] border-[#ff453a]/25 shadow-[0_0_15px_rgba(255,69,58,0.1)]': t.type === 'error',
            'bg-[#12121a]/90 text-white/80 border-white/[0.08]': t.type === 'info',
          }"
        >
          <!-- 状态视觉修饰前缀图标 -->
          <span v-if="t.type === 'success'" class="text-xs">✔</span>
          <span v-else-if="t.type === 'error'" class="i-lucide-alert-triangle text-xs" />
          <span v-else class="text-xs">ℹ</span>
          
          <span class="tracking-wide font-light flex-1 leading-relaxed text-white/90">{{ t.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
/* 优雅的浮动和缩放进入退出动画 */
.toast-enter-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(15px) scale(0.95);
  filter: blur(2px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.97);
  filter: blur(1px);
}
</style>
