<script setup lang="ts">
import { ref, onMounted } from 'vue'

const emit = defineEmits<{ toast: [msg: string, type: 'success' | 'error' | 'info'] }>()

// ── 状态定义 ────────────────────────────────────────────
const activeSubTab = ref('health') // 'health' | 'notifications' | 'analytics'
const loading = ref(false)
const saving = ref(false)
const lastUpdated = ref('')

// 1. 系统健康与监控状态数据
interface ServiceStatus { status: string; latency_ms: number }
interface StatusData {
  services: { database: ServiceStatus; storage: ServiceStatus }
  runtime: { node_version: string; platform: string; uptime_seconds: number; mock_db: boolean }
  env_config: Record<string, boolean>
  timestamp: string
}
const status = ref<StatusData | null>(null)

// 2. 通知网关数据
interface WebhookItem {
  platform: 'feishu' | 'wechat' | 'dingtalk' | 'slack'
  url: string
  events: ('payment_success' | 'payment_refund' | 'system_alert' | 'security_alert')[]
  isEnabled: boolean
}
const webhooks = ref<WebhookItem[]>([])
const showWebhookModal = ref(false)
const editingWebhook = ref<WebhookItem | null>(null)
const editingWebhookIndex = ref<number | null>(null)

const eventOptions = [
  { value: 'payment_success', label: '支付成功通知' },
  { value: 'payment_refund', label: '退款退订通知' },
  { value: 'system_alert', label: '系统 APM 告警' },
  { value: 'security_alert', label: '安全拦截告警' },
]

// 4. 多平台埋点配置
interface AnalyticsSettings {
  isEnabled:       boolean
  enableClient:    boolean
  enableH5:        boolean
  enableAdmin:     boolean
  gaMeasurementId: string
  metaPixelId:     string
  tiktokPixelId:   string
  updatedAt?:      string | null
}
const analytics = ref<AnalyticsSettings>({
  isEnabled:       false,
  enableClient:    true,
  enableH5:        true,
  enableAdmin:     false,
  gaMeasurementId: '',
  metaPixelId:     '',
  tiktokPixelId:   '',
})
const analyticsLoading = ref(false)
const analyticsSaving  = ref(false)

const platformNames: Record<string, string> = {
  feishu: '飞书机器人',
  wechat: '企业微信机器人',
  dingtalk: '钉钉机器人',
  slack: 'Slack Webhook'
}

// ── 数据拉取 ────────────────────────────────────────────
async function fetchStatus() {
  loading.value = true
  try {
    const res = await $fetch<{ data: StatusData }>('/api/admin/config/status')
    status.value = res.data
    lastUpdated.value = new Date().toLocaleTimeString('zh-CN')
  } catch (e: any) {
    emit('toast', '监控状态获取失败: ' + (e.message || '未知错误'), 'error')
  } finally {
    loading.value = false
  }
}

async function fetchNotifications() {
  loading.value = true
  try {
    const res = await $fetch<{ data: WebhookItem[] }>('/api/admin/config/notifications')
    webhooks.value = res.data || []
  } catch (e: any) {
    emit('toast', '通知配置获取失败: ' + (e.message || '未知错误'), 'error')
  } finally {
    loading.value = false
  }
}

async function fetchAnalytics() {
  analyticsLoading.value = true
  try {
    const res = await $fetch<{ data: AnalyticsSettings }>('/api/admin/analytics/config')
    analytics.value = res.data
  } catch (e: any) {
    emit('toast', '埋点配置获取失败: ' + (e.message || '未知错误'), 'error')
  } finally {
    analyticsLoading.value = false
  }
}

// 全局刷新
async function handleRefresh() {
  if (activeSubTab.value === 'health')         await fetchStatus()
  if (activeSubTab.value === 'notifications')  await fetchNotifications()
  if (activeSubTab.value === 'analytics')      await fetchAnalytics()
}

// ── 通知网关操作 ──────────────────────────────────────────
function openAddWebhook() {
  editingWebhookIndex.value = null
  editingWebhook.value = {
    platform: 'feishu',
    url: '',
    events: ['payment_success', 'system_alert'],
    isEnabled: true
  }
  showWebhookModal.value = true
}

function openEditWebhook(index: number) {
  const item = webhooks.value[index]
  if (item) {
    editingWebhookIndex.value = index
    editingWebhook.value = JSON.parse(JSON.stringify(item))
    showWebhookModal.value = true
  }
}

function deleteWebhook(index: number) {
  webhooks.value.splice(index, 1)
  saveAllWebhooks()
}

function toggleWebhookStatus(index: number) {
  const item = webhooks.value[index]
  if (item) {
    item.isEnabled = !item.isEnabled
    saveAllWebhooks()
  }
}

function saveWebhookItem() {
  if (!editingWebhook.value) return
  if (!editingWebhook.value.url.startsWith('http')) {
    emit('toast', '请输入以 http 或 https 开头的合法 Webhook URL', 'error')
    return
  }

  if (editingWebhookIndex.value !== null) {
    // 编辑
    webhooks.value[editingWebhookIndex.value] = editingWebhook.value
  } else {
    // 新增
    webhooks.value.push(editingWebhook.value)
  }
  
  showWebhookModal.value = false
  saveAllWebhooks()
}

async function saveAllWebhooks() {
  saving.value = true
  try {
    await $fetch('/api/admin/config/notifications', {
      method: 'PATCH',
      body: webhooks.value
    })
    emit('toast', '通知机器人配置已同步入库', 'success')
    await fetchNotifications()
  } catch (e: any) {
    emit('toast', '同步通知配置失败: ' + (e.data?.statusMessage || e.message), 'error')
  } finally {
    saving.value = false
  }
}

// ── 辅助格式化 ────────────────────────────────────────────
function statusColor(s: string) {
  if (s === 'healthy') return 'var(--brand-status-ok)'
  if (s === 'mock') return 'var(--brand-status-info)'
  if (s === 'error' || s === 'unreachable') return 'var(--brand-status-err)'
  return 'var(--brand-status-warn)'
}

function statusLabel(s: string) {
  const map: Record<string, string> = { healthy: '正常', error: '异常', unreachable: '不可达', mock: 'Mock', empty: '空', unknown: '检测中' }
  return map[s] || s
}

function formatUptime(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

onMounted(() => {
  fetchStatus()
  fetchNotifications()
  fetchAnalytics()
})

// 埋点配置保存
let analyticsDebounce: ReturnType<typeof setTimeout> | null = null
function debounceSaveAnalytics() {
  if (analyticsDebounce) clearTimeout(analyticsDebounce)
  analyticsDebounce = setTimeout(() => saveAnalytics(), 1200)
}

async function saveAnalytics() {
  analyticsSaving.value = true
  try {
    await $fetch('/api/admin/analytics/config', {
      method: 'PATCH',
      body: {
        isEnabled:       analytics.value.isEnabled,
        enableClient:    analytics.value.enableClient,
        enableH5:        analytics.value.enableH5,
        enableAdmin:     analytics.value.enableAdmin,
        gaMeasurementId: analytics.value.gaMeasurementId,
        metaPixelId:     analytics.value.metaPixelId,
        tiktokPixelId:   analytics.value.tiktokPixelId,
      }
    })
    emit('toast', '埋点配置已成功保存', 'success')
  } catch (e: any) {
    emit('toast', '埋点配置保存失败: ' + (e.data?.statusMessage || e.message), 'error')
  } finally {
    analyticsSaving.value = false
  }
}
</script>

<template>
  <div class="space-y-8 animate-fade-in text-white">
    <!-- 顶栏标题 -->
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-[28px] font-bold text-white tracking-tight">系统与网关配置</h1>
        <p class="text-white/40 text-sm mt-1">可视化配置与管理 HeHe 平台通知告警网关、多平台埋点及健康监控</p>
      </div>
      <button
        @click="handleRefresh"
        :disabled="loading"
        class="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all bg-white/[0.08] hover:bg-white/[0.14] text-white disabled:opacity-50 cursor-pointer"
      >
        <span class="i-lucide-refresh-cw text-xs" :class="{ 'animate-spin': loading }" />
        {{ loading ? '同步中...' : '同步配置' }}
      </button>
    </div>

    <!-- 子 Tab 切换 -->
    <div class="flex border-b border-white/[0.06] gap-1">
      <button
        @click="activeSubTab = 'health'"
        class="px-5 py-2.5 text-sm font-medium border-b-2 transition-all cursor-pointer bg-transparent border-t-0 border-x-0 outline-none"
        :class="activeSubTab === 'health' ? 'border-indigo-500 text-white' : 'border-transparent text-white/40 hover:text-white/70'"
      >
        <span class="flex items-center gap-2">
          <span class="i-lucide-activity text-sm"></span>
          系统健康监控
        </span>
      </button>
      <button
        @click="activeSubTab = 'notifications'"
        class="px-5 py-2.5 text-sm font-medium border-b-2 transition-all cursor-pointer bg-transparent border-t-0 border-x-0 outline-none"
        :class="activeSubTab === 'notifications' ? 'border-indigo-500 text-white' : 'border-transparent text-white/40 hover:text-white/70'"
      >
        <span class="flex items-center gap-2">
          <span class="i-lucide-bell text-sm"></span>
          告警通知网关
        </span>
      </button>
      <button
        @click="activeSubTab = 'analytics'"
        class="px-5 py-2.5 text-sm font-medium border-b-2 transition-all cursor-pointer bg-transparent border-t-0 border-x-0 outline-none"
        :class="activeSubTab === 'analytics' ? 'border-purple-500 text-white' : 'border-transparent text-white/40 hover:text-white/70'"
      >
        <span class="flex items-center gap-2">
          <span class="i-lucide-bar-chart-2 text-sm"></span>
          多平台埋点
        </span>
      </button>
    </div>

    <!-- ── 页面内容分发 ── -->

    <!-- TAB 1: 健康监控 -->
    <div v-if="activeSubTab === 'health'" class="space-y-8 animate-fade-in">
      <div v-if="status" class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <!-- 数据库 -->
        <div class="bg-white/[0.03] rounded-2xl p-5 border border-white/[0.05] shadow-lg">
          <div class="flex items-center gap-2.5 mb-3">
            <div class="w-2.5 h-2.5 rounded-full" :style="{ background: statusColor(status.services.database.status) }" />
            <span class="text-sm font-semibold text-white/95">数据库 (Supabase PG)</span>
          </div>
          <div class="text-[11px] font-mono space-y-1.5 pl-1">
            <div class="flex justify-between text-white/45">
              <span>运行状态</span>
              <span :style="{ color: statusColor(status.services.database.status) }" class="font-semibold">{{ statusLabel(status.services.database.status) }}</span>
            </div>
            <div class="flex justify-between text-white/45">
              <span>SQL 延时</span>
              <span class="text-white/75">{{ status.services.database.latency_ms }}ms</span>
            </div>
          </div>
        </div>

        <!-- Storage -->
        <div class="bg-white/[0.03] rounded-2xl p-5 border border-white/[0.05] shadow-lg">
          <div class="flex items-center gap-2.5 mb-3">
            <div class="w-2.5 h-2.5 rounded-full" :style="{ background: statusColor(status.services.storage.status) }" />
            <span class="text-sm font-semibold text-white/95">存储服务 (Storage)</span>
          </div>
          <div class="text-[11px] font-mono space-y-1.5 pl-1">
            <div class="flex justify-between text-white/45">
              <span>服务状态</span>
              <span :style="{ color: statusColor(status.services.storage.status) }" class="font-semibold">{{ statusLabel(status.services.storage.status) }}</span>
            </div>
            <div class="flex justify-between text-white/45">
              <span>API 延时</span>
              <span class="text-white/75">{{ status.services.storage.latency_ms }}ms</span>
            </div>
          </div>
        </div>

        <!-- 运行时 -->
        <div class="bg-white/[0.03] rounded-2xl p-5 border border-white/[0.05] shadow-lg">
          <div class="flex items-center gap-2.5 mb-3">
            <div class="w-2.5 h-2.5 rounded-full bg-[#6366f1]" />
            <span class="text-sm font-semibold text-white/95">应用运行时</span>
          </div>
          <div class="text-[11px] font-mono space-y-1.5 pl-1">
            <div class="flex justify-between text-white/45">
              <span>Node 版本</span>
              <span class="text-white/75">{{ status.runtime.node_version }}</span>
            </div>
            <div class="flex justify-between text-white/45">
              <span>已运行时间</span>
              <span class="text-white/75">{{ formatUptime(status.runtime.uptime_seconds) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 环境变量配置状态 -->
      <div v-if="status" class="space-y-3">
        <h2 class="text-xs font-semibold uppercase tracking-wider text-white/35 pl-1">核心环境变量探测</h2>
        <div class="bg-white/[0.03] rounded-2xl divide-y divide-white/[0.04] overflow-hidden border border-white/[0.04]">
          <div
            v-for="(configured, key) in status.env_config"
            :key="key"
            class="flex justify-between items-center px-5 py-3.5 text-sm"
          >
            <span class="text-white/85 font-mono text-xs">{{ key }}</span>
            <div class="flex items-center gap-2.5">
              <div class="w-1.5 h-1.5 rounded-full" :style="{ background: configured ? 'var(--brand-status-ok)' : 'var(--brand-status-err)' }" />
              <span :class="configured ? 'text-[#30d158]' : 'text-white/30'" class="text-xs font-semibold">
                {{ configured ? '已配置' : '未配置' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: 告警通知网关 -->
    <div v-else-if="activeSubTab === 'notifications'" class="space-y-6 animate-fade-in">
      <div class="flex justify-between items-center">
        <h2 class="text-xs font-semibold uppercase tracking-wider text-white/35 pl-1">动态即时通信机器人列表</h2>
        <button
          @click="openAddWebhook"
          class="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-full transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1"
        >
          <span class="i-lucide-plus"></span>
          添加机器人
        </button>
      </div>

      <!-- 机器人 Webhooks 列表 -->
      <div class="bg-white/[0.03] rounded-2xl border border-white/[0.04] overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm border-collapse">
            <thead>
              <tr class="border-b border-white/[0.05] text-white/40 uppercase tracking-widest text-[9px] bg-white/[0.005]">
                <th class="px-6 py-4 font-semibold font-mono">推送平台</th>
                <th class="px-6 py-4 font-semibold font-mono">Webhook 链接</th>
                <th class="px-6 py-4 font-semibold font-mono">订阅事件</th>
                <th class="px-6 py-4 font-semibold font-mono text-center">状态</th>
                <th class="px-6 py-4 font-semibold font-mono text-right">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/[0.04]">
              <tr v-for="(wh, index) in webhooks" :key="index" class="hover:bg-white/[0.01] transition-colors">
                <td class="px-6 py-4 font-medium">{{ platformNames[wh.platform] || wh.platform }}</td>
                <td class="px-6 py-4 font-mono text-xs text-white/50 truncate max-w-[260px]">{{ wh.url }}</td>
                <td class="px-6 py-4">
                  <div class="flex flex-wrap gap-1.5">
                    <span
                      v-for="e in wh.events" :key="e"
                      class="px-2 py-0.5 rounded-full text-[9px] bg-white/5 text-white/60 border border-white/10"
                    >
                      {{ eventOptions.find(opt => opt.value === e)?.label || e }}
                    </span>
                  </div>
                </td>
                <td class="px-6 py-4 text-center">
                  <button
                    @click="toggleWebhookStatus(index)"
                    class="px-2.5 py-0.5 rounded-full text-[10px] font-bold border cursor-pointer transition-all active:scale-95"
                    :class="wh.isEnabled
                      ? 'bg-[#30d158]/10 text-[#30d158] border-[#30d158]/20'
                      : 'bg-white/5 text-white/40 border-white/10'"
                  >
                    {{ wh.isEnabled ? '启用' : '禁用' }}
                  </button>
                </td>
                <td class="px-6 py-4 text-right space-x-2">
                  <button @click="openEditWebhook(index)" class="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer">编辑</button>
                  <button @click="deleteWebhook(index)" class="text-xs text-rose-500/70 hover:text-rose-500 font-semibold cursor-pointer">删除</button>
                </td>
              </tr>
              <tr v-if="!webhooks.length">
                <td colspan="5" class="py-12 text-center text-xs text-white/20 font-light">
                  未配置任何通知告警机器人，请点击“添加机器人”创建。
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ── 弹窗 1: Webhook 告警机器人配置 Modal ── -->
    <Transition name="dropdown">
      <div v-if="showWebhookModal && editingWebhook" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div class="w-full max-w-lg bg-[#0e0e12] border border-white/[0.08] rounded-2xl p-6 shadow-2xl animate-fade-in relative">
          <h3 class="text-lg font-bold text-white mb-4">
            {{ editingWebhookIndex !== null ? '修改通知机器人' : '添加通知机器人' }}
          </h3>
          
          <div class="space-y-4">
            <!-- 平台选择 -->
            <div class="space-y-1.5">
              <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide">推送平台</label>
              <select
                v-model="editingWebhook.platform"
                class="w-full bg-[#18181c] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50"
              >
                <option value="feishu">飞书机器人</option>
                <option value="wechat">企业微信机器人</option>
                <option value="dingtalk">钉钉机器人</option>
                <option value="slack">Slack Webhook</option>
              </select>
            </div>

            <!-- Webhook URL -->
            <div class="space-y-1.5">
              <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide">Webhook 链接地址</label>
              <input
                type="text"
                v-model="editingWebhook.url"
                class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-indigo-500/50"
                placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..."
              />
            </div>

            <!-- 事件订阅多选 -->
            <div class="space-y-2">
              <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide block">事件源订阅（多选）</label>
              <div class="grid grid-cols-2 gap-2">
                <label
                  v-for="opt in eventOptions" :key="opt.value"
                  class="flex items-center gap-2 bg-white/[0.02] border border-white/[0.04] p-3 rounded-xl cursor-pointer hover:bg-white/[0.04] transition-colors"
                >
                  <input
                    type="checkbox"
                    :value="opt.value"
                    v-model="editingWebhook.events"
                    class="rounded text-indigo-600 focus:ring-0"
                  />
                  <span class="text-xs text-white/80 font-medium">{{ opt.label }}</span>
                </label>
              </div>
            </div>
          </div>

          <div class="mt-6 flex justify-end gap-3 border-t border-white/[0.06] pt-4">
            <button
              @click="showWebhookModal = false"
              class="text-xs bg-white/5 hover:bg-white/10 text-white/70 font-semibold px-5 py-2.5 rounded-full transition-all cursor-pointer"
            >
              取消
            </button>
            <button
              @click="saveWebhookItem"
              class="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-full transition-all active:scale-[0.98] cursor-pointer"
            >
              完成
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- TAB 3: 多平台埋点 -->
    <div v-if="activeSubTab === 'analytics'" class="space-y-6 animate-fade-in">
      <!-- 加载中 -->
      <div v-if="analyticsLoading" class="flex items-center justify-center py-16">
        <span class="i-lucide-loader-2 animate-spin text-2xl text-purple-400" />
      </div>

      <template v-else>
        <!-- 卡片1: 全局开关 + 各端开关 -->
        <div class="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 space-y-5">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-base font-semibold text-white">埋点系统总开关</h3>
              <p class="text-xs text-white/40 mt-0.5">关闭后所有平台 SDK 均不加载，页面无任何埋点请求</p>
            </div>
            <button
              @click="analytics.isEnabled = !analytics.isEnabled; debounceSaveAnalytics()"
              class="relative w-12 h-6 rounded-full transition-colors duration-200 cursor-pointer"
              :class="analytics.isEnabled ? 'bg-purple-600' : 'bg-white/20'"
            >
              <span
                class="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200"
                :class="analytics.isEnabled ? 'translate-x-6' : 'translate-x-0'"
              />
            </button>
          </div>

          <div class="border-t border-white/[0.06] pt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="flex items-center justify-between bg-white/[0.03] rounded-xl px-4 py-3">
              <div>
                <p class="text-sm font-medium text-white/90">官网端</p>
                <p class="text-[11px] text-white/35">/  /architecture  /help</p>
              </div>
              <button
                @click="analytics.enableClient = !analytics.enableClient; debounceSaveAnalytics()"
                :disabled="!analytics.isEnabled"
                class="relative w-10 h-5 rounded-full transition-colors duration-200 cursor-pointer disabled:opacity-40"
                :class="analytics.enableClient && analytics.isEnabled ? 'bg-purple-600' : 'bg-white/20'"
              >
                <span class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200" :class="analytics.enableClient && analytics.isEnabled ? 'translate-x-5' : 'translate-x-0'" />
              </button>
            </div>
            <div class="flex items-center justify-between bg-white/[0.03] rounded-xl px-4 py-3">
              <div>
                <p class="text-sm font-medium text-white/90">营销 H5 端</p>
                <p class="text-[11px] text-white/35">/h5/*</p>
              </div>
              <button
                @click="analytics.enableH5 = !analytics.enableH5; debounceSaveAnalytics()"
                :disabled="!analytics.isEnabled"
                class="relative w-10 h-5 rounded-full transition-colors duration-200 cursor-pointer disabled:opacity-40"
                :class="analytics.enableH5 && analytics.isEnabled ? 'bg-purple-600' : 'bg-white/20'"
              >
                <span class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200" :class="analytics.enableH5 && analytics.isEnabled ? 'translate-x-5' : 'translate-x-0'" />
              </button>
            </div>
            <div class="flex items-center justify-between bg-white/[0.03] rounded-xl px-4 py-3">
              <div>
                <p class="text-sm font-medium text-white/90">管理后台</p>
                <p class="text-[11px] text-white/35">/admin/*</p>
              </div>
              <button
                @click="analytics.enableAdmin = !analytics.enableAdmin; debounceSaveAnalytics()"
                :disabled="!analytics.isEnabled"
                class="relative w-10 h-5 rounded-full transition-colors duration-200 cursor-pointer disabled:opacity-40"
                :class="analytics.enableAdmin && analytics.isEnabled ? 'bg-purple-600' : 'bg-white/20'"
              >
                <span class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200" :class="analytics.enableAdmin && analytics.isEnabled ? 'translate-x-5' : 'translate-x-0'" />
              </button>
            </div>
          </div>
        </div>

        <!-- 卡片2: 像素 ID 配置 -->
        <div class="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 space-y-5">
          <div>
            <h3 class="text-base font-semibold text-white">全局像素 ID 配置</h3>
            <p class="text-xs text-white/40 mt-0.5">各营销活动可在活动编辑页单独覆盖这里的全局配置</p>
          </div>

          <!-- GA4 -->
          <div class="space-y-1.5">
            <label class="flex items-center gap-2 text-sm font-medium text-white/80">
              <span class="w-2 h-2 rounded-full bg-green-400 inline-block"></span>
              GA4 衡量 ID
            </label>
            <input
              v-model="analytics.gaMeasurementId"
              @input="debounceSaveAnalytics"
              type="text"
              placeholder="G-XXXXXXXXXX"
              class="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500/60 transition"
            />
            <p class="text-[11px] text-white/30">Google Analytics 4 衡量流 ID，格式为 G- 开头的 10 位字符串</p>
          </div>

          <!-- Meta Pixel -->
          <div class="space-y-1.5">
            <label class="flex items-center gap-2 text-sm font-medium text-white/80">
              <span class="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
              Meta (Facebook) Pixel ID
            </label>
            <input
              v-model="analytics.metaPixelId"
              @input="debounceSaveAnalytics"
              type="text"
              placeholder="123456789012345"
              class="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500/60 transition"
            />
            <p class="text-[11px] text-white/30">Meta 广告投放落地接，15 位纯数字 ID</p>
          </div>

          <!-- TikTok Pixel -->
          <div class="space-y-1.5">
            <label class="flex items-center gap-2 text-sm font-medium text-white/80">
              <span class="w-2 h-2 rounded-full bg-pink-400 inline-block"></span>
              TikTok Pixel ID
            </label>
            <input
              v-model="analytics.tiktokPixelId"
              @input="debounceSaveAnalytics"
              type="text"
              placeholder="CXXXXXXXXXXXXXXXXXXXXXXXX"
              class="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500/60 transition"
            />
            <p class="text-[11px] text-white/30">TikTok for Business 像素 ID，通常以 C 开头</p>
          </div>

          <div class="flex items-center justify-between pt-2 border-t border-white/[0.05]">
            <p class="text-xs text-white/30">输入后 1.2 秒自动保存，无需手动操作</p>
            <div class="flex items-center gap-2 text-xs">
              <span v-if="analyticsSaving" class="flex items-center gap-1.5 text-purple-400">
                <span class="i-lucide-loader-2 animate-spin text-xs" />
                保存中...
              </span>
              <span v-else-if="analytics.updatedAt" class="text-white/30">
                上次保存: {{ new Date(analytics.updatedAt!).toLocaleString('zh-CN') }}
              </span>
            </div>
          </div>
        </div>

        <!-- 卡片3: 统一事件映射说明表 -->
        <div class="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-5">
          <h4 class="text-sm font-semibold text-white/60 mb-3">统一事件映射表（只读参考）</h4>
          <div class="overflow-x-auto">
            <table class="w-full text-xs text-white/50">
              <thead>
                <tr class="text-white/30 border-b border-white/[0.05]">
                  <th class="text-left py-2 pr-6">统一事件名</th>
                  <th class="text-left py-2 pr-6">GA4</th>
                  <th class="text-left py-2 pr-6">Meta Pixel</th>
                  <th class="text-left py-2">TikTok Pixel</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/[0.03]">
                <tr><td class="py-2 pr-6 font-mono text-purple-400">page_view</td><td class="py-2 pr-6">page_view</td><td class="py-2 pr-6">PageView</td><td class="py-2">page()</td></tr>
                <tr><td class="py-2 pr-6 font-mono text-purple-400">campaign_register</td><td class="py-2 pr-6">generate_lead</td><td class="py-2 pr-6">Lead</td><td class="py-2">SubmitForm</td></tr>
                <tr><td class="py-2 pr-6 font-mono text-purple-400">purchase_initiate</td><td class="py-2 pr-6">begin_checkout</td><td class="py-2 pr-6">InitiateCheckout</td><td class="py-2">InitiateCheckout</td></tr>
                <tr><td class="py-2 pr-6 font-mono text-purple-400">purchase_complete</td><td class="py-2 pr-6">purchase</td><td class="py-2 pr-6">Purchase</td><td class="py-2">CompletePayment</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </div>
  </div>

</template>

<style scoped>
.dropdown-enter-active { transition: opacity 0.15s ease, transform 0.15s cubic-bezier(0.16,1,0.3,1); }
.dropdown-leave-active { transition: opacity 0.1s ease, transform 0.1s ease; }
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: scale(0.97); }

/* 强力重置子 Tab 按钮的默认灰白背景，防止任何原生按钮底色溢出 */
.flex.border-b button {
  background: transparent !important;
  border-top: none !important;
  border-left: none !important;
  border-right: none !important;
  box-shadow: none !important;
}
</style>
