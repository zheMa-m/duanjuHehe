<script setup lang="ts">
import AdminLoginCard from '~/components/admin/AdminLoginCard.vue'
import AdminCampaigns from '~/components/admin/AdminCampaigns.vue'
import AdminOrders from '~/components/admin/AdminOrders.vue'
import AdminSubscriptions from '~/components/admin/AdminSubscriptions.vue'
import AdminRevenue from '~/components/admin/AdminRevenue.vue'
import AdminPayments from '~/components/admin/AdminPayments.vue'
import AdminToast from '~/components/admin/AdminToast.vue'
import AdminOverview from '~/components/admin/AdminOverview.vue'
import AdminTasks from '~/components/admin/AdminTasks.vue'
import AdminApm from '~/components/admin/AdminApm.vue'
import AdminConfig from '~/components/admin/AdminConfig.vue'
import AdminProfileModal from '~/components/admin/AdminProfileModal.vue'
import AdminUsers from '~/components/admin/AdminUsers.vue'
import AdminMedia from '~/components/admin/AdminMedia.vue'
import AdminApiSecurity from '~/components/admin/AdminApiSecurity.vue'
import AdminProducts from '~/components/admin/AdminProducts.vue'
import AdminFeedback from '~/components/admin/AdminFeedback.vue'
import AdminStarpath from '~/components/admin/AdminStarpath.vue'
import AdminAudit from '~/components/admin/AdminAudit.vue'
import AdminSidebarGrouped from '~/components/admin/AdminSidebarGrouped.vue'
import AdminSidebarTabbed from '~/components/admin/AdminSidebarTabbed.vue'
import { useAdminNav, navModeOptions } from '~/composables/useAdminNav'
import { useAdminMenu, tabDomains } from '~/composables/useAdminMenu'
import { useAdminTheme } from '~/composables/useAdminTheme'

const { user, isAdmin, signInAsAdmin, signOut, refreshUser } = useAuth()
const { mode, sidebarCollapsed, switchMode, toggleSidebar, trackRecent } = useAdminNav()
const { getItemByKey, getDomainForItem, getGroupLabel } = useAdminMenu()
const { resolvedTheme, colorScheme } = useAdminTheme()

useSeoMeta({ title: '项目管理后台' })

// ── Toast 通知 ─────────────────────────────────────────────────
const toastRef = ref<InstanceType<typeof AdminToast> | null>(null)
const toast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => toastRef.value?.show(msg, type)

// ── 类型定义 ──────────────────────────────────────────────────
interface ActivityLog { id: number; category: string; user_id: string | null; action: string; ip: string | null; metadata: Record<string, any>; created_at: string }
interface Task { id: string; title: string; completed: boolean; created_at: string }
interface Campaign { id: string; subdomain: string; title: string; subtitle: string; badge: string; color_from: string; color_to: string; is_active: boolean; cta_text: string; cta_url: string | null; cover_image: string | null; description: string | null; features: any[]; config: Record<string, any> | null; sort_order: number; leads_count?: number; ga_measurement_id?: string | null; meta_pixel_id?: string | null; tiktok_pixel_id?: string | null; created_at: string; updated_at: string }

interface LogsResponse { success: boolean; data: { items: ActivityLog[]; pagination: { page: number; pageSize: number; total: number } } }
interface TasksResponse { success: boolean; data: { items: Task[]; pagination: { page: number; pageSize: number; total: number } } }
interface CampaignsResponse { success: boolean; data: { items: Campaign[]; pagination: { page: number; pageSize: number; total: number } } }
interface OrdersResponse { success: boolean; data: { items: any[]; pagination: { page: number; pageSize: number; total: number } } }
interface RevenueResponse { success: boolean; data: any }
interface UsersResponse { success: boolean; data: { items: any[]; pagination: { page: number; pageSize: number; total: number } } }

// ── 全局 UI 状态 ───────────────────────────────────────────────
const activeTab = ref('dashboard')
const activeDomain = ref('ops')  // Tabbed 模式当前域
const showProfileModal = ref(false)
const showTasksPanel = ref(false)
const showUserDropdown = ref(false)

// ── Tab 持久化（刷新后恢复当前位置）──────────────────────────
const TAB_STORAGE_KEY = 'admin_active_tab'
const DOMAIN_STORAGE_KEY = 'admin_active_domain'
const MODE_STORAGE_KEY = 'admin_nav_mode'

if (import.meta.client) {
  const savedTab = localStorage.getItem(TAB_STORAGE_KEY)
  const savedDomain = localStorage.getItem(DOMAIN_STORAGE_KEY)
  const savedMode = localStorage.getItem(MODE_STORAGE_KEY)
  if (savedTab) activeTab.value = savedTab
  if (savedDomain) activeDomain.value = savedDomain
  if (savedMode) {
    const valid = navModeOptions.find(o => o.mode === savedMode)
    if (valid) switchMode(valid.mode)
  }
}
watch(activeTab, (v) => { if (import.meta.client) localStorage.setItem(TAB_STORAGE_KEY, v) })
watch(activeDomain, (v) => { if (import.meta.client) localStorage.setItem(DOMAIN_STORAGE_KEY, v) })
watch(mode, (v) => { if (import.meta.client) localStorage.setItem(MODE_STORAGE_KEY, v) })

// ── 导航处理 ─────────────────────────────────────────────────
const handleNavigate = (key: string) => {
  activeTab.value = key
  trackRecent(key)
  // Tabbed 模式：自动切换域
  if (mode.value === 'tabbed') {
    const domain = getDomainForItem(key)
    if (domain) activeDomain.value = domain.id
  }
}

const handleSwitchDomain = (domainId: string) => {
  activeDomain.value = domainId
  const domain = tabDomains.find(d => d.id === domainId)
  if (domain) {
    activeTab.value = domain.defaultItem
    trackRecent(domain.defaultItem)
  }
}

// 面包屑（Grouped 模式）
const breadcrumb = computed(() => {
  if (mode.value !== 'grouped') return null
  const item = getItemByKey(activeTab.value)
  if (!item) return null
  const groupLabel = getGroupLabel(activeTab.value)
  return groupLabel ? `${groupLabel} / ${item.label}` : item.label
})

// ── 登录鉴权 ────────────────────────────────────────────────────
const loginCardRef = ref<InstanceType<typeof AdminLoginCard> | null>(null)
const isLoggedIn = computed(() => !!user.value && isAdmin.value)

// ── 数据拉取（惰性加载，不阻塞 Suspense）──────────────────────
const fetchOpts = computed(() => (isLoggedIn.value ? { lazy: true } : { lazy: true, immediate: false }))
// 非首屏 Tab 延迟初始化：登录且当前 Tab 不匹配时跳过首次请求
const deferUnless = (...tabs: string[]) => isLoggedIn.value && tabs.includes(activeTab.value)

// 审计日志分页状态
const auditPage = ref(1)
const auditPageSize = ref(20)
const auditCategory = ref('ALL')
const auditDateFrom = ref('')
const auditDateTo = ref('')
const auditUrl = computed(() => {
  const params = new URLSearchParams()
  params.set('page', String(auditPage.value))
  params.set('pageSize', String(auditPageSize.value))
  if (auditCategory.value !== 'ALL') params.set('category', auditCategory.value)
  if (auditDateFrom.value) params.set('dateFrom', auditDateFrom.value)
  if (auditDateTo.value) params.set('dateTo', auditDateTo.value)
  return `/api/admin/audit-logs?${params.toString()}`
})

// 审计日志统计 URL（与列表共用筛选条件）
const auditStatsUrl = computed(() => {
  const params = new URLSearchParams()
  if (auditCategory.value !== 'ALL') params.set('category', auditCategory.value)
  if (auditDateFrom.value) params.set('dateFrom', auditDateFrom.value)
  if (auditDateTo.value) params.set('dateTo', auditDateTo.value)
  return `/api/admin/audit-logs/stats?${params.toString()}`
})

// 任务分页状态
const tasksPage = ref(1)
const tasksPageSize = ref(20)
const tasksUrl = computed(() => {
  const params = new URLSearchParams()
  params.set('page', String(tasksPage.value))
  params.set('pageSize', String(tasksPageSize.value))
  return `/api/admin/tasks?${params.toString()}`
})

// 营销活动分页状态
const campaignsPage = ref(1)
const campaignsPageSize = ref(5)
const campaignsUrl = computed(() => {
  const params = new URLSearchParams()
  params.set('page', String(campaignsPage.value))
  params.set('pageSize', String(campaignsPageSize.value))
  return `/api/admin/campaigns?${params.toString()}`
})
const leadsPage = ref(1)
const leadsPageSize = ref(20)
const leadsSubdomain = ref('')
const leadsUrl = computed(() => {
  const params = new URLSearchParams()
  params.set('page', String(leadsPage.value))
  params.set('pageSize', String(leadsPageSize.value))
  if (leadsSubdomain.value) params.set('subdomain', leadsSubdomain.value)
  return `/api/admin/campaigns/leads?${params.toString()}`
})

// 订单分页状态
const ordersPage = ref(1)
const ordersPageSize = ref(20)
const ordersUrl = computed(() => {
  const params = new URLSearchParams()
  params.set('page', String(ordersPage.value))
  params.set('pageSize', String(ordersPageSize.value))
  return `/api/admin/orders?${params.toString()}`
})

// 用户分页状态
const usersPage = ref(1)
const usersPageSize = ref(20)
const usersRole = ref('all')
const usersPlan = ref('all')
const usersUrl = computed(() => {
  const params = new URLSearchParams()
  params.set('page', String(usersPage.value))
  params.set('pageSize', String(usersPageSize.value))
  if (usersRole.value !== 'all') params.set('role', usersRole.value)
  if (usersPlan.value !== 'all') params.set('plan', usersPlan.value)
  return `/api/admin/users?${params.toString()}`
})

// 订阅分页状态
const subsPage = ref(1)
const subsPageSize = ref(20)
const subsUrl = computed(() => {
  const params = new URLSearchParams()
  params.set('page', String(subsPage.value))
  params.set('pageSize', String(subsPageSize.value))
  return `/api/admin/subscriptions?${params.toString()}`
})

// ── Dashboard 首屏（lazy 不阻塞挂载，登录即取）──
const { data: logRes, refresh: refreshLogs } = useFetch<LogsResponse>(auditUrl, { ...fetchOpts.value, watch: [auditUrl] })
const { data: auditStatsRes, refresh: refreshAuditStats } = useFetch<any>(auditStatsUrl, { ...fetchOpts.value, watch: [auditStatsUrl] })
const { data: revenueRes, refresh: refreshRevenue } = useFetch<RevenueResponse>('/api/admin/revenue', { ...fetchOpts.value, lazy: true })
// ── 非首屏 Tab（immediate 受 activeTab 控制，切换时由 watcher 触发）──
const { data: tasksRes, refresh: refreshTasks } = useFetch<TasksResponse>(tasksUrl, { ...fetchOpts.value, immediate: deferUnless('tasks'), watch: [tasksUrl] })
const { data: campaignsRes, refresh: refreshCampaigns } = useFetch<CampaignsResponse>(campaignsUrl, { ...fetchOpts.value, immediate: deferUnless('campaigns'), watch: [campaignsUrl] })
const { data: leadsRes, refresh: refreshLeads } = useFetch<any>(leadsUrl, { ...fetchOpts.value, immediate: deferUnless('campaigns'), watch: [leadsUrl] })
const { data: apmRes, refresh: refreshApm } = useFetch<any>('/api/admin/apm/stats', { ...fetchOpts.value, immediate: deferUnless('health') })
const { data: ordersRes, refresh: refreshOrders } = useFetch<any>(ordersUrl, { ...fetchOpts.value, immediate: deferUnless('orders'), watch: [ordersUrl] })
const { data: subsRes, refresh: refreshSubs } = useFetch<any>(subsUrl, { ...fetchOpts.value, immediate: deferUnless('subscriptions'), watch: [subsUrl] })
const { data: usersRes, refresh: refreshUsers } = useFetch<any>(usersUrl, { ...fetchOpts.value, immediate: deferUnless('users'), watch: [usersUrl] })
const { data: userStatsRes, refresh: refreshUserStats } = useFetch<any>('/api/admin/users/stats', { ...fetchOpts.value, immediate: deferUnless('users') })

// ── Tab 切换按需加载：非首屏 Tab 进入时才触发首次请求 ─────────
watch(activeTab, (newTab) => {
  if (!isLoggedIn.value) return
  if (newTab === 'campaigns') { refreshCampaigns(); refreshLeads() }
  else if (newTab === 'orders') refreshOrders()
  else if (newTab === 'subscriptions') refreshSubs()
  else if (newTab === 'users') { refreshUsers(); refreshUserStats() }
})

// ── APM 轮询 ───────────────────────────────────────────────────
let apmTimer: ReturnType<typeof setInterval> | null = null
watch(activeTab, (newTab) => {
  if (newTab === 'health') {
    refreshApm()
    apmTimer = setInterval(() => {
      if (isLoggedIn.value && activeTab.value === 'health') refreshApm()
    }, 3000)
  } else {
    if (apmTimer) { clearInterval(apmTimer); apmTimer = null }
  }
}, { immediate: true })

onUnmounted(() => { if (apmTimer) clearInterval(apmTimer) })

// ── 点击外部关闭下拉菜单 ─────────────────────────────────────
const handleClickOutside = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (showUserDropdown.value && !target.closest('.admin-header__user-wrapper')) {
    showUserDropdown.value = false
  }
}
onMounted(() => {
  if (import.meta.client) {
    window.addEventListener('click', handleClickOutside, true)
  }
})
onBeforeUnmount(() => {
  if (import.meta.client) {
    window.removeEventListener('click', handleClickOutside, true)
  }
})

// ── 登录 ─────────────────────────────────────────────────────────
const handleLogin = async (username: string, password: string) => {
  try {
    await signInAsAdmin(username, password)
    try {
      // 登录成功后仅刷新首屏 Dashboard + 顶栏任务徽章所需数据
      await Promise.all([refreshLogs(), refreshRevenue(), refreshTasks()])
    } catch (e) { console.error('登录后初始化数据失败:', e) }
  } catch (e: any) {
    loginCardRef.value?.showError(e.data?.statusMessage || e.message || '用户名或密码错误')
  }
}

const handleLogout = async () => {
  await signOut()
  if (apmTimer) { clearInterval(apmTimer); apmTimer = null }
  showProfileModal.value = false
}

// ── 通用刷新 ───────────────────────────────────────────────────
const refreshing = ref<Record<string, boolean>>({})
const handleRefresh = async () => {
  const key = activeTab.value
  refreshing.value[key] = true
  try {
    const refreshMap: Record<string, () => Promise<void>> = {
      dashboard: async () => { await Promise.all([refreshLogs(), refreshAuditStats()]) },
      tasks: refreshTasks,
      campaigns: async () => { await Promise.all([refreshCampaigns(), refreshLeads()]) },
      health: refreshApm,
      orders: refreshOrders,
      subscriptions: refreshSubs,
      revenue: refreshRevenue,
      users: async () => { await Promise.all([refreshUsers(), refreshUserStats()]) },
      media: async () => { mediaRef.value?.refresh() },
      audit: async () => { await Promise.all([refreshLogs(), refreshAuditStats()]) },
    }
    await refreshMap[activeTab.value]?.()
  } catch (err: any) {
    toast('数据同步失败: ' + (err.message || '未知错误'), 'error')
  } finally {
    setTimeout(() => { refreshing.value[key] = false }, 450)
  }
}

// ── 任务操作 ───────────────────────────────────────────────────
const toggleAdminTask = async (task: Task) => {
  try {
    await $fetch(`/api/admin/tasks/${task.id}`, { method: 'PATCH', body: { completed: !task.completed } })
    await Promise.all([refreshTasks(), refreshLogs()])
    toast('任务状态已更新', 'success')
  } catch (e: any) { toast('修改状态失败: ' + (e.message || '未知错误'), 'error') }
}
const createAdminTask = async (title: string) => {
  try {
    await $fetch('/api/admin/tasks', { method: 'POST', body: { title } })
    await Promise.all([refreshTasks(), refreshLogs()])
    toast('任务创建成功', 'success')
  } catch (e: any) { toast('创建任务失败: ' + (e.data?.statusMessage || e.message || '未知错误'), 'error') }
}
const deleteAdminTask = async (id: string) => {
  try {
    await $fetch(`/api/admin/tasks/${id}`, { method: 'DELETE' })
    await Promise.all([refreshTasks(), refreshLogs()])
    toast('任务已删除', 'success')
  } catch (e: any) { toast('删除任务失败: ' + (e.message || '未知错误'), 'error') }
}

// ── 营销活动操作 ───────────────────────────────────────────────
const campaignsRef = ref<InstanceType<typeof AdminCampaigns> | null>(null)
const mediaRef = ref<InstanceType<typeof AdminMedia> | null>(null)

const saveCampaignConfig = async (subdomain: string, data: Record<string, any>) => {
  try {
    await $fetch(`/api/admin/campaigns/${subdomain}`, { method: 'PATCH', body: data })
    campaignsRef.value?.onSaved()
    await Promise.all([refreshCampaigns(), refreshLogs()])
    toast('营销活动配置已更新', 'success')
  } catch (e: any) { toast('营销活动配置更新失败: ' + (e.data?.statusMessage || e.message || '未知错误'), 'error') }
}
const handleToggleCampaignStatus = async (subdomain: string, isActive: boolean) => {
  try {
    await $fetch(`/api/admin/campaigns/${subdomain}/status`, { method: 'PATCH' as any, body: { is_active: isActive } })
    await Promise.all([refreshCampaigns(), refreshLogs()])
    toast(isActive ? '活动已上线' : '活动已下线', 'success')
  } catch (e: any) { toast('状态切换失败: ' + (e.data?.statusMessage || e.message || '未知错误'), 'error') }
}
const deleteCampaignLead = async (id: string) => {
  try {
    await $fetch(`/api/admin/campaigns/leads/${id}`, { method: 'DELETE' })
    await Promise.all([refreshLeads(), refreshLogs()])
    toast('预约留资记录已成功删除', 'success')
  } catch (e: any) { toast('删除留资记录失败: ' + (e.message || '未知错误'), 'error') }
}
const createCampaign = async (data: Record<string, any>) => {
  try {
    await $fetch('/api/admin/campaigns', { method: 'POST' as any, body: data })
    await Promise.all([refreshCampaigns(), refreshLogs()])
    toast(`活动「${data.title}」已创建`, 'success')
  } catch (e: any) { toast('创建活动失败: ' + (e.data?.statusMessage || e.message || '未知错误'), 'error') }
}
const deleteCampaign = async (subdomain: string) => {
  try {
    await $fetch(`/api/admin/campaigns/${subdomain}`, { method: 'DELETE' as any })
    await Promise.all([refreshCampaigns(), refreshLeads(), refreshLogs()])
    toast(`活动已删除`, 'success')
  } catch (e: any) { toast('删除活动失败: ' + (e.data?.statusMessage || e.message || '未知错误'), 'error') }
}
const exportLeads = async (subdomain?: string) => {
  try {
    const url = subdomain ? `/api/admin/campaigns/leads/export?subdomain=${subdomain}` : '/api/admin/campaigns/leads/export'
    const response = await $fetch(url, { responseType: 'text' as any })
    const blob = new Blob([response as string], { type: 'text/csv;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `leads_${subdomain || 'all'}_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
    toast('留资 CSV 导出成功', 'success')
  } catch (e: any) { toast('导出失败: ' + (e.message || '未知错误'), 'error') }
}
const handleChangeLeadsPage = (page: number) => {
  leadsPage.value = page
}
const handleFilterLeads = (subdomain: string) => {
  leadsSubdomain.value = subdomain
  leadsPage.value = 1
}
const handleChangeOrdersPage = (page: number) => {
  ordersPage.value = page
}
const handleChangeSubsPage = (page: number) => {
  subsPage.value = page
}
const handleChangeUsersPage = (page: number) => {
  usersPage.value = page
}
const handleFilterUsersRole = (role: string) => {
  usersRole.value = role
  usersPage.value = 1
}
const handleFilterUsersPlan = (plan: string) => {
  usersPlan.value = plan
  usersPage.value = 1
}
const handleChangeAuditPage = (page: number) => {
  auditPage.value = page
}
const handleChangeAuditCategory = (category: string) => {
  auditCategory.value = category
  auditPage.value = 1
}
const handleChangeAuditDateRange = (dateFrom: string, dateTo: string) => {
  // 将 local date (YYYY-MM-DD) 转换为 UTC date，避免跨时区偏移
  const toUtcDate = (localDate: string) => {
    if (!localDate) return ''
    return new Date(localDate + 'T00:00:00').toISOString().slice(0, 10)
  }
  auditDateFrom.value = toUtcDate(dateFrom)
  auditDateTo.value = toUtcDate(dateTo)
  auditPage.value = 1
}
const handleChangeTasksPage = (page: number) => {
  tasksPage.value = page
}
const handleChangeCampaignsPage = (page: number) => {
  campaignsPage.value = page
}

// ── APM 模拟告警 ───────────────────────────────────────────────
const isSimulating = ref(false)
const handleSimulateAlert = async (level: 'warning' | 'critical', message: string) => {
  isSimulating.value = true
  try {
    await $fetch('/api/admin/apm/simulate', { method: 'POST', body: { level, message } })
    await refreshApm()
    toast('模拟警报已触发', 'info')
  } catch (e: any) { toast('触发模拟警报失败: ' + (e.message || '未知错误'), 'error') } finally { isSimulating.value = false }
}

const handleProfileSaved = async () => { await refreshLogs() }

// ── 订单操作 ─────────────────────────────────────────────────
const handleOrderStatusUpdate = async (id: string, status: string) => {
  try {
    await $fetch(`/api/admin/orders/${id}`, { method: 'PATCH', body: { status } })
    await Promise.all([refreshOrders(), refreshLogs(), refreshRevenue()])
    toast('订单状态已更新', 'success')
  } catch (e: any) { toast('订单状态更新失败: ' + (e.message || '未知错误'), 'error') }
}

// ── 用户管理操作 ─────────────────────────────────────────────
const handleUpdateUser = async (id: string, data: { role?: string; plan_status?: string; display_name?: string }) => {
  try {
    await $fetch(`/api/admin/users/${id}`, { method: 'PATCH', body: data })
    await Promise.all([refreshUsers(), refreshUserStats(), refreshLogs()])
    toast('用户信息已更新', 'success')
  } catch (e: any) { toast('更新用户失败: ' + (e.data?.statusMessage || e.message || '未知错误'), 'error') }
}
const handleDeleteUser = async (id: string) => {
  try {
    await $fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    await Promise.all([refreshUsers(), refreshUserStats(), refreshLogs()])
    toast('用户已删除', 'success')
  } catch (e: any) { toast('删除用户失败: ' + (e.data?.statusMessage || e.message || '未知错误'), 'error') }
}

</script>

<template>
  <div
    class="admin-dashboard-root flex min-h-screen font-sans relative overflow-hidden"
    :class="'theme-' + resolvedTheme"
    :style="{ colorScheme: colorScheme }"
  >
    <!-- 背景效果 -->
    <div class="absolute top-[-10%] left-[-10%] w-[60vw] h-[50vh] rounded-full bg-purple-600/[0.04] blur-[130px] pointer-events-none animate-pulse-slow"></div>
    <div class="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[50vh] rounded-full bg-blue-600/[0.04] blur-[130px] pointer-events-none animate-pulse-slower"></div>
    <div class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.008)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.008)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_80%,transparent_100%)] z-0"></div>

    <AdminToast ref="toastRef" />

    <!-- ── 登录态 ── -->
    <AdminLoginCard v-if="!isLoggedIn" ref="loginCardRef" @login="handleLogin" />

    <!-- ── 登录后主界面 ── -->
    <template v-else>
      <!-- 动态侧边栏 -->
      <AdminSidebarGrouped
        v-if="mode === 'grouped'"
        :active-tab="activeTab"
        :collapsed="sidebarCollapsed"
        @navigate="handleNavigate"
        @toggle-collapse="toggleSidebar"
      />
      <AdminSidebarTabbed
        v-else-if="mode === 'tabbed'"
        :active-tab="activeTab"
        :active-domain="activeDomain"
        @navigate="handleNavigate"
      />

      <!-- 右侧主工作区 -->
      <main class="flex-1 flex flex-col min-w-0 relative z-10 bg-[#08080f]/60 backdrop-blur-3xl">
        <!-- 顶栏 -->
        <header class="admin-header">
          <!-- 左侧区域 -->
          <div class="flex items-center gap-3">
            <!-- LIVE 徽章 -->
            <span class="admin-header__badge">
              <span class="admin-header__badge-dot" />
              LIVE
            </span>

            <!-- 面包屑（Grouped 模式） -->
            <div v-if="mode === 'grouped' && breadcrumb" class="admin-header__breadcrumb">
              <template v-for="(part, i) in breadcrumb.split(' / ')" :key="i">
                <span v-if="i > 0" class="admin-header__breadcrumb-sep">/</span>
                <span class="admin-header__breadcrumb-item" :class="{ 'admin-header__breadcrumb-item--current': i === breadcrumb.split(' / ').length - 1 }">{{ part }}</span>
              </template>
            </div>

            <!-- 域 Tab 栏（Tabbed 模式） -->
            <div v-if="mode === 'tabbed'" class="admin-header__domain-tabs">
              <button
                v-for="domain in tabDomains" :key="domain.id"
                @click="handleSwitchDomain(domain.id)"
                class="admin-header__domain-tab"
                :class="{ 'admin-header__domain-tab--active': activeDomain === domain.id }"
              >
                <span class="admin-header__domain-dot" :class="{ 'admin-header__domain-dot--active': activeDomain === domain.id }" />
                {{ domain.label }}
              </button>
            </div>
          </div>

          <!-- 右侧区域 -->
          <div class="flex items-center gap-3">
            <NuxtLink to="/" class="admin-header__link">主站</NuxtLink>
            <span class="admin-header__sep" />

            <!-- 任务全局入口（右上角） -->
            <button @click="showTasksPanel = !showTasksPanel" class="admin-header__task-btn" :class="{ 'admin-header__task-btn--active': showTasksPanel }">
              <span class="i-lucide-clipboard-list text-[13px]" />
              <span v-if="tasksRes?.data?.pagination?.total && tasksRes.data.pagination.total > 0" class="admin-header__task-badge">{{ tasksRes.data.pagination.total > 99 ? '99+' : tasksRes.data.pagination.total }}</span>
            </button>

            <span class="admin-header__sep" />

            <!-- 用户头像 + 下拉菜单 -->
            <div class="admin-header__user-wrapper">
              <button @click="showUserDropdown = !showUserDropdown" class="admin-header__user">
                <img v-if="user?.avatarUrl" :src="user.avatarUrl" class="admin-header__avatar" alt="avatar" />
                <div v-else class="admin-header__avatar-fallback">{{ (user?.displayName || user?.username || 'A').charAt(0).toUpperCase() }}</div>
              </button>
              <Transition name="dropdown">
                <div v-if="showUserDropdown" class="admin-user-dropdown">
                  <!-- 用户信息头部 -->
                  <div class="admin-user-dropdown__header">
                    <img v-if="user?.avatarUrl" :src="user.avatarUrl" class="admin-user-dropdown__avatar" alt="avatar" />
                    <div v-else class="admin-user-dropdown__avatar-fallback">{{ (user?.displayName || user?.username || 'A').charAt(0).toUpperCase() }}</div>
                    <div class="admin-user-dropdown__info">
                      <span class="admin-user-dropdown__name">{{ user?.displayName || user?.username || 'Admin' }}</span>
                      <span class="admin-user-dropdown__email">{{ user?.email || '' }}</span>
                    </div>
                  </div>
                  <div class="admin-user-dropdown__divider" />

                  <!-- 导航风格 -->
                  <div class="admin-user-dropdown__section-title">
                    <span class="i-lucide-layout-grid text-[11px]" />
                    导航风格
                  </div>
                  <div class="admin-user-dropdown__nav-opts">
                    <button
                      v-for="opt in navModeOptions" :key="opt.mode"
                      @click="switchMode(opt.mode)"
                      class="admin-user-dropdown__nav-opt"
                      :class="{ 'admin-user-dropdown__nav-opt--active': mode === opt.mode }"
                    >
                      <span class="admin-user-dropdown__nav-radio" />
                      <div class="admin-user-dropdown__nav-text">
                        <span class="admin-user-dropdown__nav-label">{{ opt.label }}</span>
                        <span class="admin-user-dropdown__nav-desc">{{ opt.desc }}</span>
                      </div>
                      <span v-if="mode === opt.mode" class="i-lucide-check text-[13px] ml-auto flex-shrink-0" />
                    </button>
                  </div>
                  <div class="admin-user-dropdown__divider" />

                  <!-- 操作项 -->
                  <button class="admin-user-dropdown__item" @click="showProfileModal = true; showUserDropdown = false">
                    <span class="i-lucide-user text-[14px]" />
                    <span>个人信息</span>
                  </button>
                  <button class="admin-user-dropdown__item admin-user-dropdown__item--danger" @click="handleLogout">
                    <span class="i-lucide-log-out text-[14px]" />
                    <span>退出登录</span>
                  </button>
                </div>
              </Transition>
            </div>
          </div>
        </header>

        <!-- Tab 内容区 -->
        <div class="p-10 space-y-10 overflow-y-auto flex-1 scrollbar-none max-w-[1400px] w-full mx-auto">
          <AdminOverview v-if="activeTab === 'dashboard'" :logs="logRes?.data?.items ?? null" :revenue="revenueRes?.data ?? null" :is-loading="!!refreshing.dashboard" :stats="auditStatsRes?.data ?? null" @refresh="handleRefresh" />
          <AdminProducts v-else-if="activeTab === 'products'" :is-loading="!!refreshing.products" @refresh="handleRefresh" @toast="toast" />
          <!-- 注意：tasks 已迁移至右上角全局面板，不再在主内容区渲染 -->
          <AdminOrders v-else-if="activeTab === 'orders'" :orders="ordersRes?.data?.items ?? null" :orders-total="ordersRes?.data?.pagination?.total ?? 0" :orders-page="ordersPage" :orders-page-size="ordersPageSize" :is-loading="!!refreshing.orders" @refresh="handleRefresh" @update-status="handleOrderStatusUpdate" @change-page="handleChangeOrdersPage" @toast="toast" />
          <AdminSubscriptions v-else-if="activeTab === 'subscriptions'" :subscriptions="subsRes?.data?.items ?? null" :subscriptions-total="subsRes?.data?.pagination?.total ?? 0" :subscriptions-page="subsPage" :subscriptions-page-size="subsPageSize" :is-loading="!!refreshing.subscriptions" @refresh="handleRefresh" @change-page="handleChangeSubsPage" @toast="toast" />
          <AdminRevenue v-else-if="activeTab === 'revenue'" :revenue="revenueRes?.data ?? null" :is-loading="!!refreshing.revenue" @refresh="handleRefresh" />
          <AdminPayments v-else-if="activeTab === 'payments'" />
          <AdminCampaigns v-else-if="activeTab === 'campaigns'" ref="campaignsRef" :campaigns="campaignsRes?.data?.items ?? null" :campaigns-total="campaignsRes?.data?.pagination?.total ?? 0" :campaigns-page="campaignsPage" :campaigns-page-size="campaignsPageSize" :leads="leadsRes?.data?.items ?? null" :leads-total="leadsRes?.data?.total ?? 0" :leads-page="leadsPage" :leads-page-size="leadsPageSize" :is-loading="!!refreshing.campaigns" @refresh="handleRefresh" @save="saveCampaignConfig" @toggle-status="handleToggleCampaignStatus" @create="createCampaign" @delete-campaign="deleteCampaign" @delete-lead="deleteCampaignLead" @export-leads="exportLeads" @change-leads-page="handleChangeLeadsPage" @filter-leads="handleFilterLeads" @change-campaigns-page="handleChangeCampaignsPage" />
          <AdminFeedback v-else-if="activeTab === 'feedback'" :is-loading="!!refreshing.feedback" @refresh="handleRefresh" />
          <AdminStarpath v-else-if="activeTab === 'starpath'" />
          <AdminUsers v-else-if="activeTab === 'users'" :users="usersRes?.data?.items ?? null" :users-total="usersRes?.data?.pagination?.total ?? 0" :users-page="usersPage" :users-page-size="usersPageSize" :stats="userStatsRes?.data ?? null" :is-loading="!!refreshing.users" @refresh="handleRefresh" @update-user="handleUpdateUser" @delete-user="handleDeleteUser" @change-page="handleChangeUsersPage" @filter-role="handleFilterUsersRole" @filter-plan="handleFilterUsersPlan" />
          <AdminMedia v-else-if="activeTab === 'media'" ref="mediaRef" :is-loading="!!refreshing.media" />
          <AdminApiSecurity v-else-if="activeTab === 'security'" @toast="toast" />
          <AdminApm v-else-if="activeTab === 'health'" :apm-data="apmRes?.data ?? null" :is-loading="!!refreshing.health" :is-simulating="isSimulating" @refresh="handleRefresh" @simulate="handleSimulateAlert" />
          <AdminConfig v-else-if="activeTab === 'settings'" @toast="toast" />
          <AdminAudit v-else-if="activeTab === 'audit'" :logs="logRes?.data?.items ?? null" :logs-total="logRes?.data?.pagination?.total ?? 0" :logs-page="auditPage" :logs-page-size="auditPageSize" :category="auditCategory" :date-from="auditDateFrom" :date-to="auditDateTo" :is-loading="!!refreshing.audit" :stats="auditStatsRes?.data ?? null" @refresh="handleRefresh" @change-page="handleChangeAuditPage" @change-category="handleChangeAuditCategory" @change-date-range="handleChangeAuditDateRange" />
        </div>
      </main>

      <!-- 任务全局面板（右上角滑出） -->
      <Transition name="tasks-panel">
        <div v-if="showTasksPanel" class="admin-tasks-overlay" @click.self="showTasksPanel = false">
          <aside class="admin-tasks-panel">
            <div class="admin-tasks-panel__header">
              <div class="flex items-center gap-2">
                <span class="i-lucide-clipboard-list text-[15px] text-indigo-400" />
                <span class="text-sm font-semibold text-white/80">任务中心</span>
              </div>
              <button @click="showTasksPanel = false" class="admin-tasks-panel__close">
                <span class="i-lucide-x text-[14px]" />
              </button>
            </div>
            <div class="admin-tasks-panel__body">
              <AdminTasks
                :tasks="tasksRes?.data?.items ?? null"
                :tasks-total="tasksRes?.data?.pagination?.total ?? 0"
                :tasks-page="tasksPage"
                :tasks-page-size="tasksPageSize"
                :is-loading="!!refreshing.tasks"
                @refresh="handleRefresh"
                @create="createAdminTask"
                @toggle="toggleAdminTask"
                @delete="deleteAdminTask"
                @change-page="handleChangeTasksPage"
                @toast="toast"
              />
            </div>
          </aside>
        </div>
      </Transition>

      <!-- 个人设置 Modal -->
      <AdminProfileModal v-if="showProfileModal" :avatar-url="user?.avatarUrl" @close="showProfileModal = false" @saved="handleProfileSaved" />
    </template>
  </div>
</template>

<style scoped>
.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }

/* ─── 任务全局入口按钮 ─── */
.admin-header__task-btn {
  position: relative;
  display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px;
  border-radius: 8px;
  background: rgba(255,255,255,0.025);
  border: 1px solid rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.38);
  cursor: pointer; transition: all 0.15s;
}
.admin-header__task-btn:hover {
  background: rgba(255,255,255,0.04);
  border-color: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.7);
}
.admin-header__task-btn--active {
  background: rgba(99,102,241,0.1) !important;
  border-color: rgba(99,102,241,0.25) !important;
  color: #818cf8 !important;
}
.admin-header__task-badge {
  position: absolute; top: -4px; right: -4px;
  min-width: 16px; height: 16px; padding: 0 4px;
  border-radius: 8px;
  background: #ff453a; color: #fff;
  font-size: 9px; font-weight: 700; line-height: 16px; text-align: center;
  box-shadow: 0 0 6px rgba(255,69,58,0.4);
}

/* ─── 任务滑出面板 ─── */
.admin-tasks-overlay {
  position: fixed; inset: 0; z-index: 50;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(4px);
}
.admin-tasks-panel {
  position: absolute; right: 0; top: 0; bottom: 0;
  width: 560px; max-width: 90vw;
  background: #0a0a14;
  border-left: 1px solid rgba(255,255,255,0.06);
  box-shadow: -16px 0 48px rgba(0,0,0,0.6);
  display: flex; flex-direction: column;
  overflow: hidden;
}
.admin-tasks-panel__header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
}
.admin-tasks-panel__close {
  display: flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 6px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.4);
  cursor: pointer; transition: all 0.15s;
}
.admin-tasks-panel__close:hover {
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.8);
}
.admin-tasks-panel__body {
  flex: 1; overflow-y: auto; padding: 24px 20px;
}

/* ─── 任务面板动画 ─── */
.tasks-panel-enter-active { transition: opacity 0.2s ease; }
.tasks-panel-enter-active .admin-tasks-panel { transition: transform 0.25s cubic-bezier(0.16,1,0.3,1); }
.tasks-panel-leave-active { transition: opacity 0.15s ease; }
.tasks-panel-leave-active .admin-tasks-panel { transition: transform 0.15s ease; }
.tasks-panel-enter-from,
.tasks-panel-leave-to { opacity: 0; }
.tasks-panel-enter-from .admin-tasks-panel,
.tasks-panel-leave-to .admin-tasks-panel { transform: translateX(100%); }

/* ─── Header ─── */
.admin-header {
  height: 64px; padding: 0 24px;
  display: flex; align-items: center; justify-content: space-between;
  z-index: 10; flex-shrink: 0;
  background: rgba(8,8,15,0.8);
  backdrop-filter: blur(24px);
  box-shadow: 0 1px 0 rgba(255,255,255,0.04), 0 4px 20px rgba(0,0,0,0.3);
}

.admin-header__badge {
  display: flex; align-items: center; gap: 6px;
  font-size: 10px; font-weight: 600; letter-spacing: 0.04em;
  color: rgba(255,255,255,0.55);
  padding: 4px 12px; border-radius: 20px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
}
.admin-header__badge-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: #30d158;
  box-shadow: 0 0 6px rgba(48,209,88,0.5);
  animation: pulse-glow 2.5s ease-in-out infinite;
}

.admin-header__breadcrumb {
  display: none; align-items: center; gap: 0;
  font-size: 12px; font-family: ui-monospace, monospace;
}
@media (min-width: 768px) { .admin-header__breadcrumb { display: flex; } }
.admin-header__breadcrumb-sep {
  color: rgba(255,255,255,0.12); margin: 0 6px;
  font-size: 10px;
}
.admin-header__breadcrumb-item {
  color: rgba(255,255,255,0.25);
  transition: color 0.15s;
}
.admin-header__breadcrumb-item--current {
  color: rgba(255,255,255,0.6);
}

.admin-header__domain-tabs {
  display: flex; align-items: center; gap: 2px;
  margin-left: 4px;
  padding: 2px; border-radius: 8px;
  background: rgba(255,255,255,0.02);
}
.admin-header__domain-tab {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 16px; border-radius: 6px;
  font-size: 12px; font-weight: 500;
  color: rgba(255,255,255,0.32);
  background: transparent; border: none; cursor: pointer;
  transition: all 0.15s;
}
.admin-header__domain-tab:hover {
  color: rgba(255,255,255,0.65);
  background: rgba(255,255,255,0.03);
}
.admin-header__domain-tab--active {
  color: #fff !important;
  background: rgba(99,102,241,0.1) !important;
}
.admin-header__domain-dot {
  width: 4px; height: 4px; border-radius: 50%;
  background: rgba(255,255,255,0.12);
  transition: all 0.2s;
}
.admin-header__domain-dot--active {
  background: #818cf8;
  box-shadow: 0 0 5px rgba(129,140,248,0.5);
}

.admin-header__cmdk {
  display: flex; align-items: center; gap: 6px;
  margin-left: 6px; padding: 5px 12px;
  border-radius: 7px;
  background: rgba(255,255,255,0.025);
  border: 1px solid rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.25);
  font-size: 11px; cursor: pointer;
  transition: all 0.15s;
}
.admin-header__cmdk:hover {
  background: rgba(255,255,255,0.04);
  border-color: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.5);
}
.admin-header__cmdk-kbd {
  font-size: 9px; font-family: ui-monospace, monospace;
  padding: 1px 5px; border-radius: 3px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.15);
}

.admin-header__link {
  font-size: 12px; color: rgba(255,255,255,0.38);
  text-decoration: none; transition: color 0.15s;
  letter-spacing: 0.01em;
}
.admin-header__link:hover { color: rgba(255,255,255,0.8); }

.admin-header__sep {
  width: 1px; height: 14px;
  background: rgba(255,255,255,0.06);
}

.admin-header__mode-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 5px 10px; border-radius: 7px;
  background: rgba(255,255,255,0.025);
  border: 1px solid rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.38);
  font-size: 11px; cursor: pointer;
  transition: all 0.15s;
}
.admin-header__mode-btn:hover {
  background: rgba(255,255,255,0.04);
  border-color: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.7);
}

.admin-header__user {
  display: flex; align-items: center; gap: 0;
  cursor: pointer; transition: all 0.15s;
  background: none; border: none; padding: 0;
}
.admin-header__user:hover { opacity: 0.85; }
.admin-header__user-wrapper { position: relative; }
.admin-header__avatar {
  width: 28px; height: 28px; border-radius: 50%;
  object-fit: cover;
  border: 1px solid rgba(255,255,255,0.1);
}
.admin-header__avatar-fallback {
  width: 28px; height: 28px; border-radius: 50%;
  background: linear-gradient(135deg, #818cf8, #6366f1);
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 600; color: #fff;
}


/* ─── 用户下拉菜单 ─── */
.admin-user-dropdown {
  position: absolute; right: 0; top: calc(100% + 8px);
  width: 256px; z-index: 50;
  background: #0e0e11;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 6px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04);
  backdrop-filter: blur(20px);
}
.admin-user-dropdown__header {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 10px 8px;
}
.admin-user-dropdown__avatar {
  width: 36px; height: 36px; border-radius: 50%;
  object-fit: cover;
  border: 1px solid rgba(255,255,255,0.1);
  flex-shrink: 0;
}
.admin-user-dropdown__avatar-fallback {
  width: 36px; height: 36px; border-radius: 50%;
  background: linear-gradient(135deg, #818cf8, #6366f1);
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 600; color: #fff;
  flex-shrink: 0;
}
.admin-user-dropdown__info {
  display: flex; flex-direction: column; gap: 2px; min-width: 0;
}
.admin-user-dropdown__name {
  font-size: 13px; font-weight: 500;
  color: rgba(255,255,255,0.88);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.admin-user-dropdown__email {
  font-size: 11px; color: rgba(255,255,255,0.35);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.admin-user-dropdown__divider {
  height: 1px; background: rgba(255,255,255,0.06);
  margin: 4px 8px;
}
.admin-user-dropdown__item {
  display: flex; align-items: center; gap: 10px;
  width: 100%; padding: 9px 12px;
  border-radius: 8px; border: none; outline: none;
  background: transparent; cursor: pointer;
  font-size: 13px; font-weight: 450;
  color: rgba(255,255,255,0.6);
  transition: all 0.12s ease;
}
.admin-user-dropdown__item:hover {
  color: rgba(255,255,255,0.95);
  background: rgba(255,255,255,0.05);
}
.admin-user-dropdown__item--danger {
  color: rgba(255,69,58,0.7);
}
.admin-user-dropdown__item--danger:hover {
  color: #ff453a;
  background: rgba(255,69,58,0.08);
}

/* ─── 导航风格：列表行样式 ─── */
.admin-user-dropdown__nav-opts {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 0 4px 4px;
}
.admin-user-dropdown__nav-opt {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: rgba(255,255,255,0.5);
  transition: all 0.12s ease;
  text-align: left;
}
.admin-user-dropdown__nav-opt:hover {
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.85);
}
.admin-user-dropdown__nav-opt--active {
  background: rgba(99,102,241,0.08);
  color: rgba(255,255,255,0.92);
}
.admin-user-dropdown__nav-radio {
  width: 14px; height: 14px; flex-shrink: 0;
  border-radius: 50%;
  border: 1.5px solid rgba(255,255,255,0.2);
  position: relative;
  transition: all 0.15s;
}
.admin-user-dropdown__nav-opt--active .admin-user-dropdown__nav-radio {
  border-color: #818cf8;
  background: radial-gradient(circle, #818cf8 35%, transparent 40%);
  box-shadow: 0 0 6px rgba(129,140,248,0.35);
}
.admin-user-dropdown__nav-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  flex: 1;
}
.admin-user-dropdown__nav-label {
  font-size: 13px;
  font-weight: 500;
  line-height: 1.2;
}
.admin-user-dropdown__nav-desc {
  font-size: 11px;
  opacity: 0.38;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.admin-user-dropdown__nav-opt--active .admin-user-dropdown__nav-desc {
  opacity: 0.55;
}
.admin-user-dropdown__nav-opt--active .i-lucide-check {
  color: #818cf8;
}

/* ─── 外观主题：4列单行 pill ─── */
.admin-user-dropdown__theme-opts {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  padding: 0 8px 4px;
}
.admin-user-dropdown__theme-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 9px 4px 8px;
  border-radius: 9px;
  border: 1px solid transparent;
  background: rgba(255,255,255,0.03);
  cursor: pointer;
  color: rgba(255,255,255,0.45);
  transition: all 0.14s ease;
}
.admin-user-dropdown__theme-btn:hover {
  background: rgba(255,255,255,0.07);
  border-color: rgba(255,255,255,0.10);
  color: rgba(255,255,255,0.85);
}
.admin-user-dropdown__theme-btn--active {
  background: rgba(99,102,241,0.10);
  border-color: rgba(99,102,241,0.30);
  color: rgba(255,255,255,0.92);
}
.admin-user-dropdown__theme-icon {
  font-size: 16px;
  line-height: 1;
  transition: transform 0.2s ease;
}
.admin-user-dropdown__theme-btn:hover .admin-user-dropdown__theme-icon {
  transform: scale(1.1);
}
.admin-user-dropdown__theme-label {
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
}

/* ─── 模式切换下拉 ─── */
.admin-mode-dropdown {
  position: absolute; right: 0; top: calc(100% + 6px);
  width: 240px; z-index: 50;
  background: #0e0e11;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  box-shadow: 0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.02);
  padding: 6px;
  backdrop-filter: blur(24px);
}
.admin-mode-dropdown__title {
  padding: 8px 12px 6px;
  font-size: 10px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.08em;
  color: rgba(255,255,255,0.16);
}
.admin-mode-dropdown__item {
  display: flex; align-items: center; gap: 10px;
  width: 100%; padding: 10px 12px;
  border-radius: 8px; border: none; cursor: pointer;
  background: transparent;
  color: rgba(255,255,255,0.5);
  text-align: left;
  transition: all 0.12s;
}
.admin-mode-dropdown__item:hover {
  background: rgba(255,255,255,0.03);
  color: rgba(255,255,255,0.8);
}
.admin-mode-dropdown__item--active {
  background: rgba(99,102,241,0.06) !important;
  color: #fff !important;
}
.admin-mode-dropdown__radio {
  width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0;
  border: 2px solid rgba(255,255,255,0.12);
  transition: all 0.15s;
}
.admin-mode-dropdown__radio--active {
  border-color: #818cf8;
  background: radial-gradient(circle, #818cf8 30%, transparent 35%);
  box-shadow: 0 0 6px rgba(129,140,248,0.3);
}

/* ─── 动画 ─── */
@keyframes pulse-glow {
  0%, 100% { opacity: 0.6; filter: drop-shadow(0 0 2px currentColor); }
  50% { opacity: 1; filter: drop-shadow(0 0 6px currentColor); }
}

.dropdown-enter-active { transition: opacity 0.15s ease, transform 0.15s cubic-bezier(0.16,1,0.3,1); }
.dropdown-leave-active { transition: opacity 0.1s ease, transform 0.1s ease; }
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: translateY(-4px) scale(0.97); }
</style>

<!-- ════════════════════════════════════════════════════════════════
     全局主题引擎（非 scoped）
     使用 CSS 自定义属性（Design Tokens）驱动四套主题。
     子组件无需任何改动即可自动适配。
     行业最佳实践：CSS 变量 + data-attribute 作用域覆写
═══════════════════════════════════════════════════════════════════ -->
<style>
/* ──────────────────────────────────────────────
   1. 默认主题（Dark — 深靛蓝极简，与原有风格一致）
   这是 .admin-dashboard-root 的默认值，也就是原始配色。
────────────────────────────────────────────────── */
.admin-dashboard-root {
  /* 基础背景层 */
  --admin-bg:              #08080f;
  --admin-bg-main:         rgba(8,8,15,0.6);
  --admin-bg-elevated:     rgba(255,255,255,0.04);
  --admin-bg-hover:        rgba(255,255,255,0.06);
  --admin-bg-active:       rgba(255,255,255,0.10);
  --admin-bg-input:        rgba(255,255,255,0.03);
  --admin-bg-panel:        #0a0a14;
  --admin-bg-dropdown:     #0e0e11;
  --admin-bg-row-hover:    rgba(255,255,255,0.02);

  /* 文字层 */
  --admin-text-primary:    #ffffff;
  --admin-text-secondary:  rgba(255,255,255,0.60);
  --admin-text-muted:      rgba(255,255,255,0.30);
  --admin-text-ultra-muted: rgba(255,255,255,0.16);

  /* 边框层 */
  --admin-border-subtle:   rgba(255,255,255,0.06);
  --admin-border-medium:   rgba(255,255,255,0.10);
  --admin-border-strong:   rgba(255,255,255,0.18);

  /* 品牌色（紫蓝渐变系） */
  --admin-brand:           #818cf8;
  --admin-brand-alt:       #6366f1;
  --admin-brand-bg:        rgba(99,102,241,0.10);
  --admin-brand-border:    rgba(99,102,241,0.25);

  /* 选中高亮 */
  --admin-selection-bg:    rgba(99,102,241,0.30);

  /* Header */
  --admin-header-bg:       rgba(8,8,15,0.80);
  --admin-header-shadow:   0 1px 0 rgba(255,255,255,0.04), 0 4px 20px rgba(0,0,0,0.30);

  /* 阴影 */
  --admin-shadow-card:     0 20px 25px -5px rgba(0,0,0,0.20);
  --admin-shadow-dropdown: 0 12px 40px rgba(0,0,0,0.60), 0 0 0 1px rgba(255,255,255,0.04);

  /* 全局 */
  background-color: var(--admin-bg);
  color: var(--admin-text-primary);
  selection-color: var(--admin-text-primary);
}

/* ──────────────────────────────────────────────
   2. Light 主题（极简亮白）
────────────────────────────────────────────────── */
.admin-dashboard-root.theme-light {
  --admin-bg:              #f4f5f7;
  --admin-bg-main:         rgba(244,245,247,0.90);
  --admin-bg-elevated:     #ffffff;
  --admin-bg-hover:        rgba(0,0,0,0.05);
  --admin-bg-active:       rgba(0,0,0,0.08);
  --admin-bg-input:        #ffffff;
  --admin-bg-panel:        #ffffff;
  --admin-bg-dropdown:     #ffffff;
  --admin-bg-row-hover:    rgba(0,0,0,0.03);

  --admin-text-primary:    #0f172a;
  --admin-text-secondary:  rgba(15,23,42,0.72);   /* ↑ 0.65 → 0.72 */
  --admin-text-muted:      rgba(15,23,42,0.55);   /* ↑ 0.40 → 0.55 */
  --admin-text-ultra-muted: rgba(15,23,42,0.42);  /* ↑ 0.22 → 0.42 */

  --admin-border-subtle:   rgba(0,0,0,0.10);      /* ↑ 0.07 → 0.10 */
  --admin-border-medium:   rgba(0,0,0,0.16);      /* ↑ 0.12 → 0.16 */
  --admin-border-strong:   rgba(0,0,0,0.26);      /* ↑ 0.20 → 0.26 */

  /* 亮色模式品牌色需提高对比度（a11y WCAG AA）*/
  --admin-brand:           #4f46e5;
  --admin-brand-alt:       #4338ca;
  --admin-brand-bg:        rgba(79,70,229,0.08);
  --admin-brand-border:    rgba(79,70,229,0.22);

  --admin-selection-bg:    rgba(79,70,229,0.15);

  --admin-header-bg:       rgba(255,255,255,0.90);
  --admin-header-shadow:   0 1px 0 rgba(0,0,0,0.08), 0 4px 20px rgba(0,0,0,0.06);

  --admin-shadow-card:     0 1px 3px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.05);
  --admin-shadow-dropdown: 0 8px 30px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.08);
}

/* ──────────────────────────────────────────────
   3. Classic Dark 主题（经典纯黑，高对比度）
────────────────────────────────────────────────── */
.admin-dashboard-root.theme-classic-dark {
  --admin-bg:              #000000;
  --admin-bg-main:         rgba(0,0,0,0.80);
  --admin-bg-elevated:     #111111;            /* 实色深灰，纯黑上清晰可见 */
  --admin-bg-hover:        #1a1a1a;            /* hover 状态略亮 */
  --admin-bg-active:       #222222;            /* active 状态 */
  --admin-bg-input:        #141414;            /* 输入框背景 */
  --admin-bg-panel:        #080808;            /* 侧边栏 */
  --admin-bg-dropdown:     #141414;            /* 下拉框 */
  --admin-bg-row-hover:    #0d0d0d;            /* 表格行 hover */

  --admin-text-primary:    #ffffff;
  --admin-text-secondary:  rgba(255,255,255,0.80);   /* ↑ 0.70 → 0.80 */
  --admin-text-muted:      rgba(255,255,255,0.55);   /* ↑ 0.40 → 0.55 */
  --admin-text-ultra-muted: rgba(255,255,255,0.38);  /* ↑ 0.20 → 0.38 */

  --admin-border-subtle:   rgba(255,255,255,0.12);   /* ↑ 0.10 → 0.12 */
  --admin-border-medium:   rgba(255,255,255,0.18);   /* ↑ 0.16 → 0.18 */
  --admin-border-strong:   rgba(255,255,255,0.30);   /* ↑ 0.28 → 0.30 */

  /* Classic Dark 品牌色用更亮的电气蓝 */
  --admin-brand:           #60a5fa;
  --admin-brand-alt:       #3b82f6;
  --admin-brand-bg:        rgba(59,130,246,0.12);
  --admin-brand-border:    rgba(59,130,246,0.30);

  --admin-selection-bg:    rgba(59,130,246,0.30);

  --admin-header-bg:       rgba(0,0,0,0.90);
  --admin-header-shadow:   0 1px 0 rgba(255,255,255,0.10), 0 4px 20px rgba(0,0,0,0.60);

  --admin-shadow-card:     0 4px 24px rgba(0,0,0,0.60);
  --admin-shadow-dropdown: 0 12px 40px rgba(0,0,0,0.80), 0 0 0 1px rgba(255,255,255,0.10);
}

/* ══════════════════════════════════════════════════
   全局 CSS 重写：将 UnoCSS 原子类和硬编码颜色映射到
   CSS 变量，使 23 个子组件无需任何修改即可适配主题
   ════════════════════════════════════════════════════ */

/* 主背景 */
.admin-dashboard-root .bg-\[\#08080f\] { background-color: var(--admin-bg) !important; }
.admin-dashboard-root .bg-\[\#08080f\]\/60 { background-color: var(--admin-bg-main) !important; }
.admin-dashboard-root .bg-\[\#08080f\]\/80 { background-color: var(--admin-bg-main) !important; }
.admin-dashboard-root .bg-\[\#0e0e11\] { background-color: var(--admin-bg-dropdown) !important; }
.admin-dashboard-root .bg-\[\#0a0a14\] { background-color: var(--admin-bg-panel) !important; }
.admin-dashboard-root .bg-\[\#0c0c0e\]\/95 { background-color: var(--admin-bg-dropdown) !important; }
.admin-dashboard-root .bg-\[\#12121a\] { background-color: var(--admin-bg-panel) !important; }
.admin-dashboard-root .bg-\[\#0d0d18\]\/95 { background-color: var(--admin-bg-elevated) !important; }

/* 白透明度叠层（卡片/输入框/hover） */
.admin-dashboard-root .bg-white\/\[0\.04\] { background-color: var(--admin-bg-elevated) !important; }
.admin-dashboard-root .bg-white\/\[0\.03\] { background-color: var(--admin-bg-input) !important; }
.admin-dashboard-root .bg-white\/\[0\.02\] { background-color: var(--admin-bg-row-hover) !important; }
.admin-dashboard-root .bg-white\/4 { background-color: var(--admin-bg-elevated) !important; }
.admin-dashboard-root .bg-white\/5 { background-color: var(--admin-bg-elevated) !important; }
.admin-dashboard-root .bg-white\/10 { background-color: var(--admin-bg-hover) !important; }
.admin-dashboard-root .bg-white\/15 { background-color: var(--admin-bg-active) !important; }
.admin-dashboard-root .hover\:bg-white\/\[0\.06\]:hover { background-color: var(--admin-bg-hover) !important; }
.admin-dashboard-root .hover\:bg-white\/\[0\.04\]:hover { background-color: var(--admin-bg-elevated) !important; }
.admin-dashboard-root .hover\:bg-white\/5:hover { background-color: var(--admin-bg-elevated) !important; }
.admin-dashboard-root .hover\:bg-white\/10:hover { background-color: var(--admin-bg-hover) !important; }
.admin-dashboard-root .hover\:bg-white\/15:hover { background-color: var(--admin-bg-active) !important; }

/* 文字颜色 */
.admin-dashboard-root .text-white { color: var(--admin-text-primary) !important; }
.admin-dashboard-root .text-white\/90 { color: var(--admin-text-primary) !important; }
.admin-dashboard-root .text-white\/88 { color: var(--admin-text-primary) !important; }
.admin-dashboard-root .text-white\/80 { color: var(--admin-text-secondary) !important; }
.admin-dashboard-root .text-white\/70 { color: var(--admin-text-secondary) !important; }
.admin-dashboard-root .text-white\/60 { color: var(--admin-text-secondary) !important; }
.admin-dashboard-root .text-white\/55 { color: var(--admin-text-secondary) !important; }
.admin-dashboard-root .text-white\/50 { color: var(--admin-text-secondary) !important; }
.admin-dashboard-root .text-white\/40 { color: var(--admin-text-muted) !important; }
.admin-dashboard-root .text-white\/38 { color: var(--admin-text-muted) !important; }
.admin-dashboard-root .text-white\/35 { color: var(--admin-text-muted) !important; }
.admin-dashboard-root .text-white\/30 { color: var(--admin-text-muted) !important; }
.admin-dashboard-root .text-white\/25 { color: var(--admin-text-ultra-muted) !important; }
.admin-dashboard-root .text-white\/20 { color: var(--admin-text-ultra-muted) !important; }
.admin-dashboard-root .text-white\/16 { color: var(--admin-text-ultra-muted) !important; }
.admin-dashboard-root .text-white\/12 { color: var(--admin-text-ultra-muted) !important; }

/* 边框颜色 */
.admin-dashboard-root .border-white\/\[0\.06\] { border-color: var(--admin-border-subtle) !important; }
.admin-dashboard-root .border-white\/\[0\.05\] { border-color: var(--admin-border-subtle) !important; }
.admin-dashboard-root .border-white\/\[0\.08\] { border-color: var(--admin-border-medium) !important; }
.admin-dashboard-root .border-white\/5 { border-color: var(--admin-border-subtle) !important; }
.admin-dashboard-root .border-white\/6 { border-color: var(--admin-border-subtle) !important; }
.admin-dashboard-root .border-white\/8 { border-color: var(--admin-border-medium) !important; }
.admin-dashboard-root .border-white\/10 { border-color: var(--admin-border-medium) !important; }
.admin-dashboard-root .border-white\/15 { border-color: var(--admin-border-strong) !important; }

/* 品牌色（激活态、选中态） */
.admin-dashboard-root .text-indigo-400 { color: var(--admin-brand) !important; }
.admin-dashboard-root .text-indigo-300 { color: var(--admin-brand) !important; }
.admin-dashboard-root .bg-indigo-400\/10 { background-color: var(--admin-brand-bg) !important; }
.admin-dashboard-root .bg-\[\#818cf8\] { background-color: var(--admin-brand) !important; }
.admin-dashboard-root .border-\[\#818cf8\] { border-color: var(--admin-brand) !important; }

/* Sidebar 侧边栏背景（硬编码 #08080f） */
.admin-dashboard-root .admin-sidebar-bg { background-color: var(--admin-bg) !important; }

/* Header 组件 */
.admin-dashboard-root .admin-header {
  background: var(--admin-header-bg) !important;
  box-shadow: var(--admin-header-shadow) !important;
}

/* 卡片层 */
.admin-dashboard-root .shadow-\[0_20px_25px_-5px_rgba\(0\,0\,0\,0\.2\)\] {
  box-shadow: var(--admin-shadow-card) !important;
}

/* 下拉菜单 */
.admin-dashboard-root .admin-user-dropdown,
.admin-dashboard-root .admin-mode-dropdown {
  background: var(--admin-bg-dropdown) !important;
  border-color: var(--admin-border-medium) !important;
  box-shadow: var(--admin-shadow-dropdown) !important;
}
.admin-dashboard-root .admin-user-dropdown__name { color: var(--admin-text-primary) !important; }
.admin-dashboard-root .admin-user-dropdown__email { color: var(--admin-text-muted) !important; }
.admin-dashboard-root .admin-user-dropdown__divider { background: var(--admin-border-subtle) !important; }
.admin-dashboard-root .admin-user-dropdown__item { color: var(--admin-text-secondary) !important; }
.admin-dashboard-root .admin-user-dropdown__item:hover {
  color: var(--admin-text-primary) !important;
  background: var(--admin-bg-hover) !important;
}
.admin-dashboard-root .admin-user-dropdown__section-title {
  color: var(--admin-text-ultra-muted) !important;
}
/* 导航风格列表项 */
.admin-dashboard-root .admin-user-dropdown__nav-opt {
  color: var(--admin-text-muted) !important;
}
.admin-dashboard-root .admin-user-dropdown__nav-opt:hover {
  color: var(--admin-text-primary) !important;
  background: var(--admin-bg-hover) !important;
}
.admin-dashboard-root .admin-user-dropdown__nav-opt--active {
  color: var(--admin-text-primary) !important;
  background: var(--admin-brand-bg) !important;
}
.admin-dashboard-root .admin-user-dropdown__nav-radio {
  border-color: var(--admin-border-strong) !important;
}
.admin-dashboard-root .admin-user-dropdown__nav-opt--active .admin-user-dropdown__nav-radio {
  border-color: var(--admin-brand) !important;
  background: radial-gradient(circle, var(--admin-brand) 35%, transparent 40%) !important;
  box-shadow: 0 0 6px color-mix(in srgb, var(--admin-brand) 30%, transparent) !important;
}
.admin-dashboard-root .admin-user-dropdown__nav-opt--active .i-lucide-check {
  color: var(--admin-brand) !important;
}
/* 外观主题 pill */
.admin-dashboard-root .admin-user-dropdown__theme-btn {
  color: var(--admin-text-muted) !important;
  background: var(--admin-bg-input) !important;
  border-color: transparent !important;
}
.admin-dashboard-root .admin-user-dropdown__theme-btn:hover {
  color: var(--admin-text-primary) !important;
  background: var(--admin-bg-hover) !important;
  border-color: var(--admin-border-medium) !important;
}
.admin-dashboard-root .admin-user-dropdown__theme-btn--active {
  color: var(--admin-text-primary) !important;
  background: var(--admin-brand-bg) !important;
  border-color: var(--admin-brand-border) !important;
}
.admin-dashboard-root .admin-mode-dropdown__title { color: var(--admin-text-ultra-muted) !important; }
.admin-dashboard-root .admin-mode-dropdown__item { color: var(--admin-text-secondary) !important; }
.admin-dashboard-root .admin-mode-dropdown__item:hover {
  color: var(--admin-text-primary) !important;
  background: var(--admin-bg-hover) !important;
}
.admin-dashboard-root .admin-mode-dropdown__item--active {
  background: var(--admin-brand-bg) !important;
  color: var(--admin-text-primary) !important;
}
.admin-dashboard-root .admin-mode-dropdown__radio { border-color: var(--admin-border-strong) !important; }
.admin-dashboard-root .admin-mode-dropdown__radio--active {
  border-color: var(--admin-brand) !important;
  background: radial-gradient(circle, var(--admin-brand) 30%, transparent 35%) !important;
  box-shadow: 0 0 6px color-mix(in srgb, var(--admin-brand) 30%, transparent) !important;
}

/* 任务面板 */
.admin-dashboard-root .admin-tasks-panel {
  background: var(--admin-bg-panel) !important;
  border-left-color: var(--admin-border-subtle) !important;
}
.admin-dashboard-root .admin-tasks-panel__header { border-bottom-color: var(--admin-border-subtle) !important; }
.admin-dashboard-root .admin-tasks-panel__close {
  background: var(--admin-bg-elevated) !important;
  border-color: var(--admin-border-subtle) !important;
  color: var(--admin-text-muted) !important;
}
.admin-dashboard-root .admin-tasks-panel__close:hover {
  background: var(--admin-bg-hover) !important;
  color: var(--admin-text-primary) !important;
}

/* 各类 Header 按钮 */
.admin-dashboard-root .admin-header__mode-btn {
  background: var(--admin-bg-elevated) !important;
  border-color: var(--admin-border-subtle) !important;
  color: var(--admin-text-muted) !important;
}
.admin-dashboard-root .admin-header__mode-btn:hover {
  background: var(--admin-bg-hover) !important;
  border-color: var(--admin-border-medium) !important;
  color: var(--admin-text-secondary) !important;
}
.admin-dashboard-root .admin-header__cmdk {
  background: var(--admin-bg-elevated) !important;
  border-color: var(--admin-border-subtle) !important;
  color: var(--admin-text-ultra-muted) !important;
}
.admin-dashboard-root .admin-header__cmdk:hover {
  background: var(--admin-bg-hover) !important;
  border-color: var(--admin-border-medium) !important;
  color: var(--admin-text-secondary) !important;
}
.admin-dashboard-root .admin-header__cmdk-kbd {
  background: var(--admin-bg-elevated) !important;
  border-color: var(--admin-border-subtle) !important;
  color: var(--admin-text-ultra-muted) !important;
}
.admin-dashboard-root .admin-header__task-btn {
  background: var(--admin-bg-elevated) !important;
  border-color: var(--admin-border-subtle) !important;
  color: var(--admin-text-muted) !important;
}
.admin-dashboard-root .admin-header__task-btn:hover {
  background: var(--admin-bg-hover) !important;
  border-color: var(--admin-border-medium) !important;
  color: var(--admin-text-secondary) !important;
}
.admin-dashboard-root .admin-header__task-btn--active {
  background: var(--admin-brand-bg) !important;
  border-color: var(--admin-brand-border) !important;
  color: var(--admin-brand) !important;
}
.admin-dashboard-root .admin-header__link { color: var(--admin-text-muted) !important; }
.admin-dashboard-root .admin-header__link:hover { color: var(--admin-text-primary) !important; }
.admin-dashboard-root .admin-header__sep { background: var(--admin-border-subtle) !important; }
.admin-dashboard-root .admin-header__badge {
  color: var(--admin-text-secondary) !important;
  background: var(--admin-bg-elevated) !important;
  border-color: var(--admin-border-medium) !important;
}
.admin-dashboard-root .admin-header__breadcrumb-item { color: var(--admin-text-ultra-muted) !important; }
.admin-dashboard-root .admin-header__breadcrumb-item--current { color: var(--admin-text-secondary) !important; }
.admin-dashboard-root .admin-header__breadcrumb-sep { color: var(--admin-border-medium) !important; }
.admin-dashboard-root .admin-header__domain-tab { color: var(--admin-text-ultra-muted) !important; }
.admin-dashboard-root .admin-header__domain-tab:hover {
  color: var(--admin-text-secondary) !important;
  background: var(--admin-bg-elevated) !important;
}
.admin-dashboard-root .admin-header__domain-tab--active {
  color: var(--admin-text-primary) !important;
  background: var(--admin-brand-bg) !important;
}
.admin-dashboard-root .admin-header__domain-tabs { background: var(--admin-bg-elevated) !important; }

/* 选区高亮 */
.admin-dashboard-root ::selection {
  background-color: var(--admin-selection-bg);
  color: var(--admin-text-primary);
}

/* ── Light 模式：背景发光球减淡为浅紫蓝系 ── */
.admin-dashboard-root.theme-light .bg-purple-600\/\[0\.04\] {
  background: rgba(139,92,246,0.06) !important;
}
.admin-dashboard-root.theme-light .bg-blue-600\/\[0\.04\] {
  background: rgba(99,102,241,0.05) !important;
}

/* ── Classic Dark 模式：隐藏背景发光球 ── */
.admin-dashboard-root.theme-classic-dark .bg-purple-600\/\[0\.04\],
.admin-dashboard-root.theme-classic-dark .bg-blue-600\/\[0\.04\] {
  opacity: 0 !important;
}

/* ── Sidebar 组件（scoped 穿透，使用后代选择器） ── */
/* AdminSidebarGrouped / Tabbed 背景层 */
.admin-dashboard-root [class*="nav-sidebar__bg"],
.admin-dashboard-root [class*="sidebar-tabbed__bg"] {
  background: var(--admin-bg) !important;
  border-right-color: var(--admin-border-subtle) !important;
}
/* Sidebar 导航项通用文字 */
.admin-dashboard-root [class*="nav-item"]:not([class*="nav-item--active"]) {
  color: var(--admin-text-muted) !important;
}
.admin-dashboard-root [class*="nav-item"]:not([class*="nav-item--active"]):hover {
  color: var(--admin-text-primary) !important;
  background: var(--admin-bg-hover) !important;
}
/* 激活菜单项 */
.admin-dashboard-root [class*="nav-item--active"] {
  color: var(--admin-text-primary) !important;
  background: var(--admin-brand-bg) !important;
}
/* 分组标签 */
.admin-dashboard-root [class*="nav-group__label"] {
  color: var(--admin-text-ultra-muted) !important;
}
/* 品牌 Logo 文字 */
.admin-dashboard-root [class*="nav-sidebar__brand-name"],
.admin-dashboard-root [class*="sidebar-brand-name"] {
  color: var(--admin-text-primary) !important;
}
.admin-dashboard-root [class*="nav-sidebar__brand-sub"],
.admin-dashboard-root [class*="sidebar-brand-sub"] {
  color: var(--admin-text-ultra-muted) !important;
}
/* Sidebar Footer */
.admin-dashboard-root [class*="nav-sidebar__footer"] {
  border-top-color: var(--admin-border-subtle) !important;
}
.admin-dashboard-root [class*="nav-sidebar__search-hint"] {
  background: var(--admin-bg-input) !important;
  border-color: var(--admin-border-subtle) !important;
}
</style>
