/**
 * 管理后台主题状态管理
 *
 * 支持四种主题：
 *   - dark         深靛蓝极简（默认，当前主题）
 *   - light        极简亮白（现代后台风格）
 *   - classic-dark 经典纯黑（高对比度）
 *   - system       跟随系统偏好
 *
 * 行业最佳实践：
 *   - CSS 自定义属性（CSS Variables）驱动，浏览器原生响应，零闪烁
 *   - prefers-color-scheme 实时监听，system 模式无需刷新即可响应
 *   - color-scheme 属性同步，使原生控件（滚动条、input、select）正确渲染
 *   - localStorage 持久化，刷新后自动恢复
 */

export type AdminTheme = 'dark' | 'light' | 'classic-dark' | 'system'
export type ResolvedTheme = 'dark' | 'light' | 'classic-dark'

const THEME_KEY = 'admin-theme'
const VALID_THEMES: AdminTheme[] = ['dark', 'light', 'classic-dark', 'system']

export interface AdminThemeOption {
  theme: AdminTheme
  label: string
  icon: string
  desc: string
}

export const adminThemeOptions: AdminThemeOption[] = [
  { theme: 'dark', label: '暗色', icon: 'i-lucide-moon', desc: '深靛蓝极简（默认）' },
  { theme: 'light', label: '亮色', icon: 'i-lucide-sun', desc: '极简亮白现代风格' },
  { theme: 'classic-dark', label: '经典暗色', icon: 'i-lucide-contrast', desc: '纯黑高对比度' },
  { theme: 'system', label: '跟随系统', icon: 'i-lucide-monitor', desc: '跟随 macOS/Windows 设置' },
]

function getStoredTheme(): AdminTheme {
  if (typeof localStorage === 'undefined') return 'dark'
  const stored = localStorage.getItem(THEME_KEY)
  if (stored && VALID_THEMES.includes(stored as AdminTheme)) return stored as AdminTheme
  return 'dark'
}

function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function resolveTheme(theme: AdminTheme): ResolvedTheme {
  if (theme === 'system') {
    return getSystemPrefersDark() ? 'dark' : 'light'
  }
  return theme
}

// 单例响应式状态（跨组件共享）
const theme = ref<AdminTheme>(getStoredTheme())
const resolvedTheme = ref<ResolvedTheme>(resolveTheme(theme.value))

// 持久化
watch(theme, (v) => {
  if (typeof localStorage !== 'undefined') localStorage.setItem(THEME_KEY, v)
  resolvedTheme.value = resolveTheme(v)
})

// 系统级 prefers-color-scheme 实时监听（system 模式下响应 OS 切换）
if (typeof window !== 'undefined') {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  mq.addEventListener('change', () => {
    if (theme.value === 'system') {
      resolvedTheme.value = resolveTheme('system')
    }
  })
}

export function useAdminTheme() {
  const switchTheme = (newTheme: AdminTheme) => {
    if (VALID_THEMES.includes(newTheme)) {
      theme.value = newTheme
    }
  }

  // color-scheme 值：供 style 绑定使用，控制原生 UI 控件渲染
  const colorScheme = computed(() =>
    resolvedTheme.value === 'light' ? 'light' : 'dark'
  )

  return {
    theme: readonly(theme),
    resolvedTheme: readonly(resolvedTheme),
    colorScheme,
    switchTheme,
    adminThemeOptions,
  }
}
