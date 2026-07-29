/**
 * 管理后台主题状态管理
 *
 * 双主题：light（浅色） + classic-dark（经典暗色）
 *
 * CSS 自定义属性（CSS Variables）驱动，浏览器原生响应，零闪烁。
 */

export type AdminTheme = 'light' | 'classic-dark'
export type ResolvedTheme = 'light' | 'classic-dark'

const THEME_KEY = 'admin-theme'
const VALID_THEMES: AdminTheme[] = ['light', 'classic-dark']

export interface AdminThemeOption {
  theme: AdminTheme
  label: string
  icon: string
  desc: string
}

export const adminThemeOptions: AdminThemeOption[] = [
  { theme: 'light', label: '浅色', icon: 'i-lucide-sun', desc: '明亮清爽' },
  { theme: 'classic-dark', label: '经典暗色', icon: 'i-lucide-contrast', desc: '纯黑高对比度' },
]

function getStoredTheme(): AdminTheme {
  if (typeof localStorage === 'undefined') return 'light'
  const stored = localStorage.getItem(THEME_KEY)
  if (stored && VALID_THEMES.includes(stored as AdminTheme)) return stored as AdminTheme
  return 'light'
}

// 单例响应式状态（跨组件共享）
const theme = ref<AdminTheme>(getStoredTheme())
const resolvedTheme = ref<ResolvedTheme>(getStoredTheme())

// 持久化
watch(theme, (v) => {
  if (typeof localStorage !== 'undefined') localStorage.setItem(THEME_KEY, v)
})

export function useAdminTheme() {
  const switchTheme = (newTheme: AdminTheme) => {
    if (VALID_THEMES.includes(newTheme)) {
      theme.value = newTheme
      resolvedTheme.value = newTheme
    }
  }

  const colorScheme = computed(() => resolvedTheme.value === 'light' ? 'light' as const : 'dark' as const)

  return {
    theme: readonly(theme),
    resolvedTheme: readonly(resolvedTheme),
    colorScheme,
    switchTheme,
    adminThemeOptions,
  }
}
