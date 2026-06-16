<script setup lang="ts">
import AdminLoginCard from '~/components/admin/AdminLoginCard.vue'
import AdminCampaigns from '~/components/admin/AdminCampaigns.vue'
import AdminOrders from '~/components/admin/AdminOrders.vue'
import AdminAdSlots from '~/components/admin/AdminAdSlots.vue'
import AdminRevenue from '~/components/admin/AdminRevenue.vue'

useSeoMeta({ title: '项目管理后台 - Project Admin Portal' })

// ── 类型定义 ──────────────────────────────────────────────────
interface ActivityLog { id: number; category: string; user_id: string | null; action: string; ip: string | null; metadata: Record<string, any>; created_at: string }
interface Task { id: string; title: string; completed: boolean; created_at: string }
interface Campaign { subdomain: string; title: string; subtitle: string; badge: string; color_from: string; color_to: string }

interface LogsResponse { success: boolean; data: ActivityLog[] }
interface TasksResponse { success: boolean; data: Task[] }
interface CampaignsResponse { success: boolean; data: Campaign[] }
interface OrdersResponse { success: boolean; data: { items: any[] } }
interface AdSlotsResponse { success: boolean; data: any[] }
interface RevenueResponse { success: boolean; data: any }

// ── 全局 UI 状态 ───────────────────────────────────────────────
const isLoading = ref(false)
const activeTab = ref('overview')
const showProfileModal = ref(false)

// ── 登录鉴权 ───────────────────────────────────────────────────
const isLoggedIn = ref(false)
if (typeof window !== 'undefined') {
  isLoggedIn.value = localStorage.getItem('admin_logged_in') === 'true'
}

const loginCardRef = ref<InstanceType<typeof AdminLoginCard> | null>(null)

const headers = computed<Record<string, string>>(() => {
  if (!isLoggedIn.value) return { 'x-mock-unauthorized': 'true' }
  return {} as Record<string, string>
})

// ── 数据拉取 ───────────────────────────────────────────────────
const { data: logRes, refresh: refreshLogs } = await useFetch<LogsResponse>('/api/admin/audit-logs', { headers })
const { data: tasksRes, refresh: refreshTasks } = await useFetch<TasksResponse>('/api/admin/tasks', { headers })
const { data: campaignsRes, refresh: refreshCampaigns } = await useFetch<CampaignsResponse>('/api/admin/campaigns', { headers })
const { data: apmRes, refresh: refreshApm } = await useFetch<any>('/api/admin/apm/stats', { headers })
const { data: ordersRes, refresh: refreshOrders } = await useFetch<OrdersResponse>('/api/admin/orders', { headers })
const { data: adSlotsRes, refresh: refreshAdSlots } = await useFetch<AdSlotsResponse>('/api/admin/ad-slots', { headers })
const { data: revenueRes, refresh: refreshRevenue } = await useFetch<RevenueResponse>('/api/admin/revenue', { headers })

// ── APM 轮询 ───────────────────────────────────────────────────
let apmTimer: ReturnType<typeof setInterval> | null = null
watch(activeTab, (newTab) => {
  if (newTab === 'apm') {
    refreshApm()
    apmTimer = setInterval(() => {
      if (isLoggedIn.value && activeTab.value === 'apm') refreshApm()
    }, 3000)
  } else {
    if (apmTimer) { clearInterval(apmTimer); apmTimer = null }
  }
}, { immediate: true })

onUnmounted(() => { if (apmTimer) clearInterval(apmTimer) })

// ── 登录 / 登出 ────────────────────────────────────────────────
const handleLogin = async (username: string, password: string) => {
  // 默认密码校验逻辑（Mock 模式）。真实生产应改为向后端 POST /api/admin/login 验证
  const expectedPassword = typeof window !== 'undefined'
    ? (localStorage.getItem('admin_session_pwd_hash') || 'admin888')
    : 'admin888'

  if (username === 'admin' && password === expectedPassword) {
    isLoggedIn.value = true
    if (typeof window !== 'undefined') localStorage.setItem('admin_logged_in', 'true')
    try {
      await Promise.all([refreshLogs(), refreshTasks(), refreshCampaigns(), refreshApm(), refreshOrders(), refreshAdSlots(), refreshRevenue()])
    } catch (e) { console.error('登录后初始化数据失败:', e) }
  } else {
    loginCardRef.value?.showError('用户名或密码错误')
  }
}

const handleLogout = () => {
  isLoggedIn.value = false
  if (typeof window !== 'undefined') localStorage.removeItem('admin_logged_in')
  if (apmTimer) { clearInterval(apmTimer); apmTimer = null }
  showProfileModal.value = false
}

// ── 通用刷新 ───────────────────────────────────────────────────
const handleRefresh = async () => {
  isLoading.value = true
  try {
    const refreshMap: Record<string, () => Promise<void>> = {
      overview: refreshLogs,
      tasks: refreshTasks,
      campaigns: refreshCampaigns,
      apm: refreshApm,
      orders: refreshOrders,
      'ad-slots': refreshAdSlots,
      revenue: refreshRevenue,
    }
    await refreshMap[activeTab.value]?.()
  } catch (err: any) {
    alert('数据同步失败: ' + err.message)
  } finally {
    setTimeout(() => { isLoading.value = false }, 450)
  }
}

// ── 任务操作 ───────────────────────────────────────────────────
const toggleAdminTask = async (task: Task) => {
  try {
    await $fetch(`/api/admin/tasks/${task.id}`, { method: 'PATCH', body: { completed: !task.completed } })
    await Promise.all([refreshTasks(), refreshLogs()])
  } catch (e: any) { alert('修改状态失败: ' + e.message) }
}

const deleteAdminTask = async (id: string) => {
  try {
    await $fetch(`/api/admin/tasks/${id}`, { method: 'DELETE' })
    await Promise.all([refreshTasks(), refreshLogs()])
  } catch (e: any) { alert('删除任务失败: ' + e.message) }
}

// ── 营销活动操作 ───────────────────────────────────────────────
const campaignsRef = ref<InstanceType<typeof AdminCampaigns> | null>(null)

const saveCampaignConfig = async (campaign: Campaign) => {
  try {
    await $fetch(`/api/admin/campaigns/${campaign.subdomain}`, {
      method: 'PATCH',
      body: { title: campaign.title, subtitle: campaign.subtitle, badge: campaign.badge }
    })
    campaignsRef.value?.onSaved()
    await Promise.all([refreshCampaigns(), refreshLogs()])
  } catch (e: any) { alert('营销活动配置更新失败: ' + e.message) }
}

// ── APM 模拟告警 ───────────────────────────────────────────────
const isSimulating = ref(false)
const handleSimulateAlert = async (level: 'warning' | 'critical', message: string) => {
  isSimulating.value = true
  try {
    await $fetch('/api/admin/apm/simulate', { method: 'POST', body: { level, message } })
    await refreshApm()
  } catch (e: any) { alert('触发模拟警报失败: ' + e.message) } finally { isSimulating.value = false }
}

// ── 密码更新后刷新审计日志 ────────────────────────────────────
const handleProfileSaved = async () => { await refreshLogs() }

// ── 订单操作 ───────────────────────────────────────────
const handleOrderStatusUpdate = async (id: string, status: string) => {
  try {
    await $fetch(`/api/admin/orders/${id}`, { method: 'PATCH', body: { status } })
    await Promise.all([refreshOrders(), refreshLogs(), refreshRevenue()])
  } catch (e: any) { alert('Order update failed: ' + e.message) }
}

// ── 广告位操作 ─────────────────────────────────────────
const handleAdSlotCreate = async (data: any) => {
  try {
    await $fetch('/api/admin/ad-slots', { method: 'POST', body: data })
    await Promise.all([refreshAdSlots(), refreshLogs()])
  } catch (e: any) { alert('Ad slot create failed: ' + e.message) }
}

const handleAdSlotUpdate = async (id: string, data: any) => {
  try {
    await $fetch(`/api/admin/ad-slots/${id}`, { method: 'PATCH', body: data })
    await Promise.all([refreshAdSlots(), refreshLogs()])
  } catch (e: any) { alert('Ad slot update failed: ' + e.message) }
}

const handleAdSlotDelete = async (id: string) => {
  try {
    await $fetch(`/api/admin/ad-slots/${id}`, { method: 'DELETE' })
    await Promise.all([refreshAdSlots(), refreshLogs()])
  } catch (e: any) { alert('Ad slot delete failed: ' + e.message) }
}
</script>

<template>
  <div class="flex min-h-screen bg-[#000000] text-white font-sans relative overflow-hidden selection:bg-[#007aff]/30 selection:text-white">
    
    <!-- 顶部漫反射背景光 -->
    <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[60vw] h-[25vh] rounded-full bg-white/[0.02] blur-[100px] pointer-events-none"></div>

    <!-- ── 登录态 ─────────────────────────────────────────────── -->
    <AdminLoginCard
      v-if="!isLoggedIn"
      ref="loginCardRef"
      @login="handleLogin"
    />

    <!-- ── 登录后主界面 ─────────────────────────────────────────── -->
    <template v-else>
      <!-- 左侧边栏 -->
      <aside class="hidden lg:flex flex-col w-60 bg-[#000000] border-r border-white/5 p-6 flex-shrink-0 relative z-20">
        <div class="flex items-center gap-2.5 mb-10 pl-2">
          <div class="w-6 h-6 rounded-md bg-white flex items-center justify-center font-bold text-black text-xs"></div>
          <span class="font-semibold text-sm tracking-tight text-white">Project Admin</span>
        </div>

        <nav class="space-y-1 flex-1">
          <button
            v-for="item in [
              { key: 'overview', icon: '📊', label: '仪表盘概览' },
              { key: 'tasks',    icon: '📝', label: '业务任务管理' },
              { key: 'campaigns',icon: '🚀', label: '营销活动配置' },
              { key: 'orders',   icon: '💳', label: '订单管理' },
              { key: 'ad-slots', icon: '📢', label: '广告位管理' },
              { key: 'revenue',  icon: '💰', label: '收入分析' },
              { key: 'apm',      icon: '🏥', label: '系统健康监控' },
              { key: 'config',   icon: '⚙️', label: '系统配置监控' },
            ]"
            :key="item.key"
            @click="activeTab = item.key"
            class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all text-left bg-transparent border-0 outline-none"
            :class="activeTab === item.key ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'"
          >
            <span class="text-sm">{{ item.icon }}</span> {{ item.label }}
          </button>
        </nav>

        <div class="pt-6 border-t border-white/5 text-[10px] text-white/30 pl-2">VERSION 1.0.0</div>
      </aside>

      <!-- 右侧主工作区 -->
      <main class="flex-1 flex flex-col min-w-0 relative z-10 bg-[#000000]">
        
        <!-- 顶栏 -->
        <header class="h-14 border-b border-white/5 bg-black/40 backdrop-blur-md px-8 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-[10px] uppercase tracking-wider text-white/40">Environment:</span>
            <span class="text-[10px] px-2 py-0.5 bg-white/5 text-white/70 border border-white/10 rounded-full flex items-center gap-1.5 font-normal">
              <span class="w-1 h-1 rounded-full bg-[#30d158]"></span>
              MOCK_DB
            </span>
          </div>
          <div class="flex items-center gap-5">
            <a href="http://yourdomain.localhost:3000/" class="text-xs text-white/60 hover:text-white transition-all">主站官网</a>
            <div class="h-3 w-px bg-white/10"></div>
            <div 
              @click="showProfileModal = true"
              class="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
              title="个人安全设置"
            >
              <div class="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-white/80">👤</div>
              <span class="text-xs font-medium text-white/80 select-none">solo_hacker</span>
            </div>
            <div class="h-3 w-px bg-white/10"></div>
            <button 
              @click="handleLogout"
              class="text-xs text-[#ff453a]/90 hover:text-[#ff453a] transition-all bg-transparent border-0 cursor-pointer p-0"
            >
              退出登录
            </button>
          </div>
        </header>

        <!-- Tab 内容区 -->
        <div class="p-8 space-y-8 overflow-y-auto flex-1 scrollbar-none max-w-6xl w-full mx-auto">
          <AdminOverview
            v-if="activeTab === 'overview'"
            :logs="logRes?.data ?? null"
            :is-loading="isLoading"
            @refresh="handleRefresh"
          />
          <AdminTasks
            v-else-if="activeTab === 'tasks'"
            :tasks="tasksRes?.data ?? null"
            :is-loading="isLoading"
            @refresh="handleRefresh"
            @toggle="toggleAdminTask"
            @delete="deleteAdminTask"
          />
          <AdminCampaigns
            v-else-if="activeTab === 'campaigns'"
            ref="campaignsRef"
            :campaigns="campaignsRes?.data ?? null"
            :is-loading="isLoading"
            @refresh="handleRefresh"
            @save="saveCampaignConfig"
          />
          <AdminApm
            v-else-if="activeTab === 'apm'"
            :apm-data="apmRes?.data ?? null"
            :is-loading="isLoading"
            :is-simulating="isSimulating"
            @refresh="handleRefresh"
            @simulate="handleSimulateAlert"
          />
          <AdminOrders
            v-else-if="activeTab === 'orders'"
            :orders="ordersRes?.data?.items ?? null"
            :is-loading="isLoading"
            @refresh="handleRefresh"
            @update-status="handleOrderStatusUpdate"
          />
          <AdminAdSlots
            v-else-if="activeTab === 'ad-slots'"
            :slots="adSlotsRes?.data ?? null"
            :is-loading="isLoading"
            @refresh="handleRefresh"
            @create="handleAdSlotCreate"
            @update="handleAdSlotUpdate"
            @delete="handleAdSlotDelete"
          />
          <AdminRevenue
            v-else-if="activeTab === 'revenue'"
            :revenue="revenueRes?.data ?? null"
            :is-loading="isLoading"
            @refresh="handleRefresh"
          />
          <AdminConfig v-else-if="activeTab === 'config'" />
        </div>
      </main>

      <!-- 个人设置 Modal -->
      <AdminProfileModal
        v-if="showProfileModal"
        @close="showProfileModal = false"
        @saved="handleProfileSaved"
      />
    </template>
  </div>
</template>

<style scoped>
.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
</style>
