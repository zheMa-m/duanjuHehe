/**
 * useAppMode — 桌面 / App 模式切换
 *
 * App 模式：页面限制在 480px 宽度、显示底部导航栏、手机端样式
 * 状态持久化到 localStorage
 */

export const useAppMode = () => {
  const isAppMode = ref(false)

  // 从 localStorage 恢复
  if (import.meta.client) {
    isAppMode.value = localStorage.getItem('app-mode') === 'true'
  }

  function toggle() {
    isAppMode.value = !isAppMode.value
    if (import.meta.client) {
      localStorage.setItem('app-mode', String(isAppMode.value))
    }
  }

  function enable() {
    isAppMode.value = true
    if (import.meta.client) localStorage.setItem('app-mode', 'true')
  }

  function disable() {
    isAppMode.value = false
    if (import.meta.client) localStorage.setItem('app-mode', 'false')
  }

  return { isAppMode, toggle, enable, disable }
}
