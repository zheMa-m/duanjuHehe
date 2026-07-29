/**
 * 管理后台统一菜单数据层 — ReelShort 视频平台
 * 两种导航模式（grouped / tabbed）共享此数据源
 */

export interface MenuItem {
  key: string
  label: string
  icon: string
  group: string
  component: string
  shortcut?: string
  shortcutKey?: string
}

export interface MenuGroup {
  id: string
  label: string
}

export const menuGroups: MenuGroup[] = [
  { id: 'core', label: '' },
  { id: 'commerce', label: '金币运营' },
  { id: 'content', label: '内容管理' },
  { id: 'system', label: '系统' },
]

export const menuItems: MenuItem[] = [
  // core
  { key: 'dashboard', label: '工作台', icon: 'i-lucide-layout-dashboard', group: 'core', component: 'AdminOverview', shortcut: '⌘1', shortcutKey: '1' },
  // commerce
  { key: 'coin-packages', label: '金币套餐', icon: 'i-lucide-coins', group: 'commerce', component: 'AdminCoinPackages', shortcut: '⌘2', shortcutKey: '2' },
  { key: 'transactions', label: '交易流水', icon: 'i-lucide-receipt', group: 'commerce', component: 'AdminTransactions' },
  { key: 'revenue', label: '收入分析', icon: 'i-lucide-trending-up', group: 'commerce', component: 'AdminRevenue', shortcut: '⌘3', shortcutKey: '3' },
  { key: 'payments', label: '支付配置', icon: 'i-lucide-credit-card', group: 'commerce', component: 'AdminPayments' },
  // content
  { key: 'series', label: '剧集管理', icon: 'i-lucide-film', group: 'content', component: 'AdminSeries', shortcut: '⌘4', shortcutKey: '4' },
  { key: 'episodes', label: '分集管理', icon: 'i-lucide-clapperboard', group: 'content', component: 'AdminEpisodes' },
  { key: 'genres', label: '分类标签', icon: 'i-lucide-tags', group: 'content', component: 'AdminGenres' },
  { key: 'media', label: '媒体库', icon: 'i-lucide-image', group: 'content', component: 'AdminMedia' },
  // system
  { key: 'users', label: '用户管理', icon: 'i-lucide-users', group: 'system', component: 'AdminUsers' },
  { key: 'security', label: '安全', icon: 'i-lucide-shield', group: 'system', component: 'AdminApiSecurity' },
  { key: 'health', label: '监控', icon: 'i-lucide-activity', group: 'system', component: 'AdminApm' },
  { key: 'settings', label: '配置', icon: 'i-lucide-settings', group: 'system', component: 'AdminConfig' },
  { key: 'audit', label: '审计', icon: 'i-lucide-file-text', group: 'system', component: 'AdminAudit' },
]

export interface TabDomain {
  id: string
  label: string
  groups: string[]
  defaultItem: string
  shortcut?: string
}

export const tabDomains: TabDomain[] = [
  { id: 'ops', label: '运营', groups: ['core', 'commerce'], defaultItem: 'dashboard', shortcut: '⌘1' },
  { id: 'content', label: '内容', groups: ['content'], defaultItem: 'series', shortcut: '⌘2' },
  { id: 'sys', label: '系统', groups: ['system'], defaultItem: 'users', shortcut: '⌘3' },
]

export function useAdminMenu() {
  const getGroupedItems = () => {
    return menuGroups.map(group => ({
      ...group,
      items: menuItems.filter(item => item.group === group.id),
    }))
  }

  const getTabItems = (domainId: string) => {
    const domain = tabDomains.find(d => d.id === domainId)
    if (!domain) return []
    return menuItems.filter(item => domain.groups.includes(item.group))
  }

  const getCompactItems = () => {
    return menuItems.filter(item =>
      ['dashboard', 'coin-packages', 'series', 'transactions', 'users'].includes(item.key)
    )
  }

  const getItemByKey = (key: string) => {
    return menuItems.find(item => item.key === key)
  }

  const getDomainForItem = (key: string) => {
    const item = getItemByKey(key)
    if (!item) return null
    return tabDomains.find(d => d.groups.includes(item.group)) || null
  }

  const getGroupLabel = (key: string): string => {
    const item = getItemByKey(key)
    if (!item) return ''
    const group = menuGroups.find(g => g.id === item.group)
    return group?.label || ''
  }

  return {
    menuItems,
    menuGroups,
    tabDomains,
    getGroupedItems,
    getTabItems,
    getCompactItems,
    getItemByKey,
    getDomainForItem,
    getGroupLabel,
  }
}
