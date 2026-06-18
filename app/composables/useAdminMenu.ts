/**
 * 管理后台统一菜单数据层
 * 三种导航模式（grouped / tabbed / compact）共享此数据源
 */

export interface MenuItem {
  key: string
  label: string
  icon: string       // Lucide icon name (UnoCSS ~icons/lucide/xxx)
  group: string      // 'core' | 'commerce' | 'marketing' | 'content' | 'system'
  component: string  // Vue 组件名
  shortcut?: string  // 键盘快捷键显示文本
  shortcutKey?: string // 实际快捷键 (e.g. '1', '2', ...)
}

export interface MenuGroup {
  id: string
  label: string
}

// ── 分组定义 ──────────────────────────────────────────────
export const menuGroups: MenuGroup[] = [
  { id: 'core', label: '' },           // 核心入口，无分组标题
  { id: 'commerce', label: '业务运营' },
  { id: 'marketing', label: '营销增长' },
  { id: 'content', label: '内容资源' },
  { id: 'system', label: '系统' },
]

// ── 菜单项定义（12 项，任务已迁移至顶栏全局入口） ──────────────
export const menuItems: MenuItem[] = [
  // core
  { key: 'dashboard', label: '工作台', icon: 'i-lucide-layout-dashboard', group: 'core', component: 'AdminOverview', shortcut: '⌘1', shortcutKey: '1' },
  // commerce
  { key: 'products', label: '商品', icon: 'i-lucide-shopping-bag', group: 'commerce', component: 'AdminProducts', shortcut: '⌘2', shortcutKey: '2' },
  { key: 'orders', label: '订单', icon: 'i-lucide-receipt', group: 'commerce', component: 'AdminOrders', shortcut: '⌘3', shortcutKey: '3' },
  { key: 'subscriptions', label: '订阅', icon: 'i-lucide-refresh-cw', group: 'commerce', component: 'AdminSubscriptions' },
  { key: 'revenue', label: '收入', icon: 'i-lucide-trending-up', group: 'commerce', component: 'AdminRevenue', shortcut: '⌘4', shortcutKey: '4' },
  // marketing
  { key: 'campaigns', label: '活动', icon: 'i-lucide-megaphone', group: 'marketing', component: 'AdminCampaigns', shortcut: '⌘5', shortcutKey: '5' },
  { key: 'feedback', label: '反馈', icon: 'i-lucide-message-square', group: 'marketing', component: 'AdminFeedback' },
  { key: 'users', label: '用户', icon: 'i-lucide-users', group: 'marketing', component: 'AdminUsers' },
  // content
  { key: 'media', label: '媒体库', icon: 'i-lucide-image', group: 'content', component: 'AdminMedia' },
  // system
  { key: 'security', label: '安全', icon: 'i-lucide-shield', group: 'system', component: 'AdminApiSecurity' },
  { key: 'health', label: '监控', icon: 'i-lucide-activity', group: 'system', component: 'AdminApm' },
  { key: 'settings', label: '配置', icon: 'i-lucide-settings', group: 'system', component: 'AdminConfig' },
  { key: 'audit', label: '审计', icon: 'i-lucide-file-text', group: 'system', component: 'AdminAudit' },
]

// ── Tabbed 模式的大域 Tab 定义 ─────────────────────────────
export interface TabDomain {
  id: string
  label: string
  groups: string[]   // 包含的 group id
  defaultItem: string // 默认激活菜单项 key
  shortcut?: string
}

export const tabDomains: TabDomain[] = [
  { id: 'ops', label: '运营', groups: ['core', 'commerce'], defaultItem: 'dashboard', shortcut: '⌘1' },
  { id: 'growth', label: '营销', groups: ['marketing', 'content'], defaultItem: 'campaigns', shortcut: '⌘2' },
  { id: 'sys', label: '系统', groups: ['system'], defaultItem: 'security', shortcut: '⌘3' },
]

// ── Composable ────────────────────────────────────────────
export function useAdminMenu() {
  /** 按 group 分组获取菜单项 */
  const getGroupedItems = () => {
    return menuGroups.map(group => ({
      ...group,
      items: menuItems.filter(item => item.group === group.id),
    }))
  }

  /** 获取 Tabbed 模式下某个 Tab 域的子菜单 */
  const getTabItems = (domainId: string) => {
    const domain = tabDomains.find(d => d.id === domainId)
    if (!domain) return []
    return menuItems.filter(item => domain.groups.includes(item.group))
  }

  /** 获取 Compact 模式的高频项（前 5 个） */
  const getCompactItems = () => {
    return menuItems.filter(item =>
      ['dashboard', 'products', 'campaigns', 'orders', 'users'].includes(item.key)
    )
  }

  /** 按 key 查找菜单项 */
  const getItemByKey = (key: string) => {
    return menuItems.find(item => item.key === key)
  }

  /** 获取菜单项所属 Tab 域 */
  const getDomainForItem = (key: string) => {
    const item = getItemByKey(key)
    if (!item) return null
    return tabDomains.find(d => d.groups.includes(item.group)) || null
  }

  /** 获取菜单项所属分组 label（用于面包屑） */
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
