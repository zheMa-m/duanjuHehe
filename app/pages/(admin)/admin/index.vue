<script setup lang="ts">
import AdminLoginCard from '~/components/admin/AdminLoginCard.vue'
import AdminCampaigns from '~/components/admin/AdminCampaigns.vue'
import AdminOrders from '~/components/admin/AdminOrders.vue'
import AdminRevenue from '~/components/admin/AdminRevenue.vue'
import AdminToast from '~/components/admin/AdminToast.vue'
import AdminOverview from '~/components/admin/AdminOverview.vue'
import AdminTasks from '~/components/admin/AdminTasks.vue'
import AdminApm from '~/components/admin/AdminApm.vue'
import AdminConfig from '~/components/admin/AdminConfig.vue'
import AdminProfileModal from '~/components/admin/AdminProfileModal.vue'
const { user, isAdmin, signInAsAdmin, signOut, refreshUser } = useAuth()

useSeoMeta({ title: '项目管理后台 - Project Admin Portal' })

// ── Toast 通知 ─────────────────────────────────────────────────
const toastRef = ref<InstanceType<typeof AdminToast> | null>(null)
const toast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => toastRef.value?.show(msg, type)

// ── 类型定义 ──────────────────────────────────────────────────
interface ActivityLog { id: number; category: string; user_id: string | null; action: string; ip: string | null; metadata: Record<string, any>; created_at: string }
interface Task { id: string; title: string; completed: boolean; created_at: string }
interface Campaign { subdomain: string; title: string; subtitle: string; badge: string; color_from: string; color_to: string }

interface LogsResponse { success: boolean; data: ActivityLog[] }
interface TasksResponse { success: boolean; data: Task[] }
interface CampaignsResponse { success: boolean; data: Campaign[] }
interface OrdersResponse { success: boolean; data: { items: any[] } }
interface RevenueResponse { success: boolean; data: any }

// ── 全局 UI 状态 ───────────────────────────────────────────────
const isLoading = ref(false)
const activeTab = ref('overview')
const showProfileModal = ref(false)

// ── 登录鉴权：使用 useAuth() 服务端认证 ────────────────────────
const loginCardRef = ref<InstanceType<typeof AdminLoginCard> | null>(null)

// 已登录状态 = 有真实用户 且 是管理员
const isLoggedIn = computed(() => !!user.value && isAdmin.value)

// ── 数据拉取（仅在已登录时触发） ──────────────────────────────
const fetchOpts = computed(() => (isLoggedIn.value ? {} : { immediate: false }))

const { data: logRes, refresh: refreshLogs } = await useFetch<LogsResponse>('/api/admin/audit-logs', fetchOpts.value)
const { data: tasksRes, refresh: refreshTasks } = await useFetch<TasksResponse>('/api/admin/tasks', fetchOpts.value)
const { data: campaignsRes, refresh: refreshCampaigns } = await useFetch<CampaignsResponse>('/api/admin/campaigns', fetchOpts.value)
const { data: leadsRes, refresh: refreshLeads } = await useFetch<any>('/api/admin/campaigns/leads', fetchOpts.value)
const { data: apmRes, refresh: refreshApm } = await useFetch<any>('/api/admin/apm/stats', fetchOpts.value)
const { data: ordersRes, refresh: refreshOrders } = await useFetch<OrdersResponse>('/api/admin/orders', fetchOpts.value)
const { data: revenueRes, refresh: refreshRevenue } = await useFetch<RevenueResponse>('/api/admin/revenue', fetchOpts.value)

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

// ── 登录：内置管理员账号（用户名+密码）→ /api/admin/login ────────
const handleLogin = async (username: string, password: string) => {
  try {
    await signInAsAdmin(username, password)

    // 登录成功 → 刷新所有数据
    try {
      await Promise.all([refreshLogs(), refreshTasks(), refreshCampaigns(), refreshLeads(), refreshApm(), refreshOrders(), refreshRevenue()])
    } catch (e) { console.error('登录后初始化数据失败:', e) }
  } catch (e: any) {
    loginCardRef.value?.showError(e.data?.statusMessage || '用户名或密码错误')
  }
}

// ── 登出 ───────────────────────────────────────────────────────
const handleLogout = async () => {
  await signOut()
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
      campaigns: async () => {
        await Promise.all([refreshCampaigns(), refreshLeads()])
      },
      apm: refreshApm,
      orders: refreshOrders,
      revenue: refreshRevenue,
    }
    await refreshMap[activeTab.value]?.()
  } catch (err: any) {
    toast('数据同步失败: ' + (err.message || '未知错误'), 'error')
  } finally {
    setTimeout(() => { isLoading.value = false }, 450)
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

const saveCampaignConfig = async (campaign: Campaign) => {
  try {
    await $fetch(`/api/admin/campaigns/${campaign.subdomain}`, {
      method: 'PATCH',
      body: { title: campaign.title, subtitle: campaign.subtitle, badge: campaign.badge }
    })
    campaignsRef.value?.onSaved()
    await Promise.all([refreshCampaigns(), refreshLogs()])
  } catch (e: any) { toast('营销活动配置更新失败: ' + (e.message || '未知错误'), 'error') }
}

const deleteCampaignLead = async (id: string) => {
  try {
    await $fetch(`/api/admin/campaigns/leads/${id}`, { method: 'DELETE' })
    await Promise.all([refreshLeads(), refreshLogs()])
    toast('预约留资记录已成功删除', 'success')
  } catch (e: any) {
    toast('删除留资记录失败: ' + (e.message || '未知错误'), 'error')
  }
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

// ── 密码更新后刷新审计日志 ────────────────────────────────────
const handleProfileSaved = async () => { await refreshLogs() }

// ── 订单操作 ───────────────────────────────────────────
const handleOrderStatusUpdate = async (id: string, status: string) => {
  try {
    await $fetch(`/api/admin/orders/${id}`, { method: 'PATCH', body: { status } })
    await Promise.all([refreshOrders(), refreshLogs(), refreshRevenue()])
    toast('订单状态已更新', 'success')
  } catch (e: any) { toast('Order update failed: ' + (e.message || 'unknown'), 'error') }
}
</script>

<template>
  <div class="flex min-h-screen bg-[#070709] text-white font-sans relative overflow-hidden selection:bg-[#007aff]/30 selection:text-white">
    
    <!-- 赛博霓虹环境漫反射（深紫与深蓝缓慢呼吸） -->
    <div class="absolute top-[-10%] left-[-10%] w-[60vw] h-[50vh] rounded-full bg-purple-600/[0.02] blur-[130px] pointer-events-none animate-pulse-slow"></div>
    <div class="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[50vh] rounded-full bg-blue-600/[0.02] blur-[130px] pointer-events-none animate-pulse-slower"></div>
    
    <!-- 极高精细度点阵网格背景 -->
    <div class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.005)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.005)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_80%,transparent_100%)] z-0"></div>

    <!-- ── Toast 通知 ──────────────────────────────────────────── -->
    <AdminToast ref="toastRef" />

    <!-- ── 登录态 ─────────────────────────────────────────────── -->
    <AdminLoginCard
      v-if="!isLoggedIn"
      ref="loginCardRef"
      @login="handleLogin"
    />

    <!-- ── 登录后主界面 ─────────────────────────────────────────── -->
    <template v-else>
      <!-- 左侧边栏 (高阶磨砂质感) -->
      <aside class="hidden lg:flex flex-col w-60 bg-black/40 backdrop-blur-xl border-r border-white/[0.05] p-6 flex-shrink-0 relative z-20 shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
        <div class="flex items-center gap-3 mb-10 pl-2">
          <div class="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white text-xs shadow-[0_0_15px_rgba(59,130,246,0.3)]">
            H
          </div>
          <span class="font-semibold text-sm tracking-wide text-white uppercase bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">Hehe Admin</span>
        </div>

        <nav class="space-y-1.5 flex-1">
          <button
            v-for="item in [
              { key: 'overview', icon: '📊', label: '仪表盘概览' },
              { key: 'tasks',    icon: '📝', label: '业务任务管理' },
              { key: 'campaigns',icon: '🚀', label: '营销活动配置' },
              { key: 'orders',   icon: '💳', label: '订单管理' },
              { key: 'revenue',  icon: '💰', label: '收入分析' },
              { key: 'apm',      icon: '🏥', label: '系统健康监控' },
              { key: 'config',   icon: '⚙️', label: '系统配置监控' },
            ]"
            :key="item.key"
            @click="activeTab = item.key"
            class="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-medium transition-all text-left bg-transparent border-0 outline-none relative cursor-pointer"
            :class="activeTab === item.key ? 'text-[#0a84ff] bg-white/[0.03] shadow-[inset_0_1px_rgba(255,255,255,0.05)] border border-white/[0.05]' : 'text-white/50 border border-transparent hover:text-white hover:bg-white/[0.02]'"
          >
            <!-- 选中高光点装饰 -->
            <span v-if="activeTab === item.key" class="absolute left-0 top-1/3 bottom-1/3 w-1 bg-[#0a84ff] rounded-r-md"></span>
            <span class="text-sm transition-transform duration-300" :class="activeTab === item.key ? 'scale-110' : ''">{{ item.icon }}</span>
            <span class="tracking-wide">{{ item.label }}</span>
          </button>
        </nav>

        <div class="pt-6 border-t border-white/[0.05] text-[10px] text-white/30 pl-2 uppercase tracking-wider font-mono">Ver 1.0.0</div>
      </aside>

      <!-- 右侧主工作区 -->
      <main class="flex-1 flex flex-col min-w-0 relative z-10 bg-[#070709]/80 backdrop-blur-3xl">
        
        <!-- 顶栏 (精细半透明卡片) -->
        <header class="h-16 border-b border-white/[0.05] bg-black/30 backdrop-blur-md px-8 flex items-center justify-between z-10 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div class="flex items-center gap-2">
            <span class="text-[9px] uppercase tracking-widest text-white/30 font-mono">Environment:</span>
            <span class="text-[9px] px-2.5 py-1 bg-white/[0.03] text-white/70 border border-white/[0.08] rounded-full flex items-center gap-1.5 font-medium tracking-wide">
              <span class="w-1.5 h-1.5 rounded-full animate-pulse-glow" :class="isLoggedIn ? 'bg-[#30d158]' : 'bg-[#ff9f0a]'"></span>
              {{ isLoggedIn ? 'LIVE' : 'AUTH' }}
            </span>
          </div>
          <div class="flex items-center gap-5">
            <NuxtLink to="/" class="text-xs text-white/60 hover:text-white transition-all no-underline tracking-wide">主站官网</NuxtLink>
            <div class="h-3 w-px bg-white/10"></div>
            <div 
              @click="showProfileModal = true"
              class="flex items-center gap-2 cursor-pointer hover:opacity-85 transition-opacity"
              title="个人安全设置"
            >
              <img
                v-if="user?.avatarUrl"
                :src="user.avatarUrl"
                class="w-5 h-5 rounded-full object-cover ring-1 ring-white/20"
                alt="avatar"
              />
              <div v-else class="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-white/80 ring-1 ring-white/20">👤</div>
              <span class="text-xs font-medium text-white/80 select-none tracking-wide">{{ user?.displayName || user?.username || user?.email || 'Admin' }}</span>
            </div>
            <div class="h-3 w-px bg-white/10"></div>
            <button 
              @click="handleLogout"
              class="text-xs text-[#ff453a]/90 hover:text-[#ff453a] transition-all bg-transparent border-0 cursor-pointer p-0 font-medium"
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
            :revenue="revenueRes?.data ?? null"
            :is-loading="isLoading"
            @refresh="handleRefresh"
          />
          <AdminTasks
            v-else-if="activeTab === 'tasks'"
            :tasks="tasksRes?.data ?? null"
            :is-loading="isLoading"
            @refresh="handleRefresh"
            @create="createAdminTask"
            @toggle="toggleAdminTask"
            @delete="deleteAdminTask"
          />
          <AdminCampaigns
            v-else-if="activeTab === 'campaigns'"
            ref="campaignsRef"
            :campaigns="campaignsRes?.data ?? null"
            :leads="leadsRes?.data ?? null"
            :is-loading="isLoading"
            @refresh="handleRefresh"
            @save="saveCampaignConfig"
            @delete-lead="deleteCampaignLead"
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
        :avatar-url="user?.avatarUrl"
        @close="showProfileModal = false"
        @saved="handleProfileSaved"
      />
    </template>
  </div>
</template>

<style scoped>
.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }

/* 缓慢环境氛围灯呼吸动画 */
@keyframes pulse-slow {
  0%, 100% { opacity: 0.6; transform: scale(1) translate(0, 0); }
  50% { opacity: 0.9; transform: scale(1.1) translate(4%, 2%); }
}
@keyframes pulse-slower {
  0%, 100% { opacity: 0.5; transform: scale(1) translate(0, 0); }
  50% { opacity: 0.8; transform: scale(1.15) translate(-2%, -4%); }
}
@keyframes pulse-glow {
  0%, 100% { opacity: 0.6; transform: scale(0.95); filter: drop-shadow(0 0 2px currentColor); }
  50% { opacity: 1; transform: scale(1.05); filter: drop-shadow(0 0 6px currentColor); }
}

.animate-pulse-slow {
  animation: pulse-slow 10s ease-in-out infinite;
}
.animate-pulse-slower {
  animation: pulse-slower 15s ease-in-out infinite;
}
.animate-pulse-glow {
  animation: pulse-glow 2.5s ease-in-out infinite;
}
</style>
