/**
 * 管理后台导航模式状态管理
 * 两种模式：grouped（分组折叠）/ tabbed（双栏分区）
 * 偏好存 localStorage，下次登录自动恢复
 */

export type NavMode = 'grouped' | 'tabbed'

const NAV_KEY = 'admin-nav-mode'
const COLLAPSE_KEY = 'admin-sidebar-collapsed'
const RECENT_KEY = 'admin-recent-items'

const VALID_MODES: NavMode[] = ['grouped', 'tabbed']

export interface NavModeOption {
  mode: NavMode
  label: string
  desc: string
}

export const navModeOptions: NavModeOption[] = [
  { mode: 'grouped', label: '分组折叠', desc: '经典侧栏分组' },
  { mode: 'tabbed', label: '双栏分区', desc: 'Tab 域切换' },
]

function getStoredMode(): NavMode {
  if (typeof localStorage === 'undefined') return 'grouped'
  const stored = localStorage.getItem(NAV_KEY)
  if (stored && VALID_MODES.includes(stored as NavMode)) return stored as NavMode
  return 'grouped'
}

function getStoredCollapsed(): boolean {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem(COLLAPSE_KEY) === 'true'
}

function getStoredRecent(): string[] {
  if (typeof localStorage === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
  } catch { return [] }
}

export function useAdminNav() {
  const mode = ref<NavMode>(getStoredMode())
  const sidebarCollapsed = ref(getStoredCollapsed())

  // 持久化
  watch(mode, (v) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(NAV_KEY, v)
  })
  watch(sidebarCollapsed, (v) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(COLLAPSE_KEY, String(v))
  })

  const switchMode = (newMode: NavMode) => {
    if (VALID_MODES.includes(newMode)) mode.value = newMode
  }

  const toggleSidebar = () => {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  // ── 最近使用记录 ──
  const recentItems = ref<string[]>(getStoredRecent())

  const trackRecent = (key: string) => {
    const filtered = recentItems.value.filter(k => k !== key)
    const updated = [key, ...filtered].slice(0, 5)
    recentItems.value = updated
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(RECENT_KEY, JSON.stringify(updated))
    }
  }

  return {
    mode,
    sidebarCollapsed,
    switchMode,
    toggleSidebar,
    recentItems,
    trackRecent,
    navModeOptions,
  }
}
