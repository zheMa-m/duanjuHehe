<script setup lang="ts">
interface DashboardStats {
  todayOrderCount: number
  todayRevenue: number
  totalRevenue30d: number
  growthPct: number
  activeSubscriptions: number
  newUsersToday: number
  paymentChannels: { enabled: number; total: number }
  revenueTrend: Array<{ date: string; amount: number }>
  channelShare: Array<{ channel: string; revenue: number }>
}

interface ActivityLog {
  id: number
  category: string
  user_id: string | null
  action: string
  ip: string | null
  metadata: Record<string, any>
  created_at: string
}

const props = defineProps<{
  logs: ActivityLog[] | null
  isLoading: boolean
}>()

const emit = defineEmits<{
  refresh: []
}>()

// ── 自治数据加载 ──
const dashLoading = ref(false)
const stats = ref<DashboardStats | null>(null)

async function fetchDashboardStats() {
  dashLoading.value = true
  try {
    const res = await $fetch<{ data: DashboardStats }>('/api/admin/dashboard/stats')
    stats.value = res.data
  } catch {
    // silent - 数据未就绪时显示零值
  } finally {
    dashLoading.value = false
  }
}

onMounted(() => fetchDashboardStats())

function handleRefresh() {
  emit('refresh')
  fetchDashboardStats()
}

// ── 格式化工具 ──
const formatAmount = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
const formatCompact = (n: number) => {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`
  return formatAmount(n)
}

// ── 7 天趋势最大值 ──
const maxTrend = computed(() => {
  if (!stats.value?.revenueTrend?.length) return 1
  return Math.max(...stats.value.revenueTrend.map(t => t.amount), 1)
})

// ── 渠道标签 ──
const channelLabels: Record<string, string> = {
  stripe: 'Stripe', paypal: 'PayPal', google_pay: 'Google Pay',
  apple_iap: 'Apple IAP', alipay: 'Alipay', wechat: 'WeChat', unknown: '其他',
}
const channelColors: Record<string, string> = {
  stripe: '#635bff', paypal: '#003087', google_pay: '#4285f4',
  apple_iap: '#a2aaad', alipay: '#1677ff', wechat: '#07c160', unknown: '#636366',
}

// ── 日志（最近 10 条） ──
const recentLogs = computed(() => (props.logs || []).slice(0, 10))

// ── 从 action 文本推导分类 ──
function inferCategory(action: string): string {
  const a = action.toUpperCase()
  if (a.includes('STORAGE') || a.includes('UPLOAD') || a.includes('BUCKET') || a.includes('TRASH') || a.includes('MEDIA')) return 'STORAGE'
  if (a.includes('ORDER') || a.includes('REFUND')) return 'ORDER'
  if (a.includes('PAYMENT') || a.includes('PAY') || a.includes('SUBSCRIPTION') || a.includes('SUB')) return 'PAYMENT'
  if (a.includes('CAMPAIGN') || a.includes('LEAD')) return 'CAMPAIGN'
  if (a.includes('PRODUCT')) return 'PRODUCT'
  if (a.includes('USER') || a.includes('LOGIN') || a.includes('AUTH') || a.includes('SIGN') || a.includes('PROFILE')) return 'AUTH'
  if (a.includes('SECURITY') || a.includes('API_KEY') || a.includes('POLICY') || a.includes('RATE')) return 'SECURITY'
  if (a.includes('CONFIG') || a.includes('SETTING')) return 'CONFIG'
  if (a.includes('STARPATH') || a.includes('QUESTIONNAIRE') || a.includes('REPORT')) return 'STARPATH'
  if (a.includes('ERROR') || a.includes('FAIL')) return 'ERROR'
  return 'SYSTEM'
}

// ── action 文本翻译为可读中文 ──
const actionLabels: Record<string, string> = {
  STORAGE_UPLOAD: '上传文件',
  STORAGE_DELETE: '删除文件',
  STORAGE_RESTORE: '还原文件',
  STORAGE_EMPTY_TRASH: '清空回收站',
  STORAGE_BATCH_DELETE: '批量删除文件',
  STORAGE_BATCH_RESTORE: '批量还原文件',
  STORAGE_BUCKET_CREATE: '创建存储桶',
  STORAGE_BUCKET_DELETE: '删除存储桶',
  ADMIN_ORDER_UPDATE: '更新订单状态',
  ADMIN_ORDER_REFUND: '订单退款',
  SECURITY_POLICY_UPDATE: '更新安全策略',
  API_KEY_REVOKED: '撤销 API 密钥',
  CONFIG_UPDATE: '更新系统配置',
  PRODUCT_CREATE: '创建商品',
  PRODUCT_UPDATE: '更新商品',
  PRODUCT_DELETE: '删除商品',
  CAMPAIGN_CREATE: '创建活动',
  CAMPAIGN_UPDATE: '更新活动',
  CAMPAIGN_DELETE: '删除活动',
  USER_LOGIN: '管理员登录',
  USER_LOGOUT: '管理员登出',
  PROFILE_UPDATE: '更新个人资料',
}
function formatAction(raw: string): string {
  // 先尝试精确匹配（取冒号前的部分）
  const base = (raw.split(':')[0] ?? raw).trim()
  const label = actionLabels[base]
  if (label) {
    const detail = raw.slice(base.length).replace(/^:/, '').trim()
    return detail ? `${label}：${detail}` : label
  }
  // fallback：下划线转空格 + 首字母大写
  return raw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ── 日志分类配置 ──
const categoryConfig: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  AUTH: { label: '认证', icon: 'i-lucide-shield-check', color: 'text-blue-400', bg: 'bg-blue-400/10' },
  ORDER: { label: '订单', icon: 'i-lucide-shopping-cart', color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  PAYMENT: { label: '支付', icon: 'i-lucide-credit-card', color: 'text-amber-400', bg: 'bg-amber-400/10' },
  CAMPAIGN: { label: '活动', icon: 'i-lucide-megaphone', color: 'text-purple-400', bg: 'bg-purple-400/10' },
  PRODUCT: { label: '商品', icon: 'i-lucide-package', color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
  SUBSCRIPTION: { label: '订阅', icon: 'i-lucide-repeat', color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
  STORAGE: { label: '存储', icon: 'i-lucide-hard-drive', color: 'text-orange-400', bg: 'bg-orange-400/10' },
  SECURITY: { label: '安全', icon: 'i-lucide-lock', color: 'text-red-400', bg: 'bg-red-400/10' },
  CONFIG: { label: '配置', icon: 'i-lucide-sliders', color: 'text-teal-400', bg: 'bg-teal-400/10' },
  STARPATH: { label: '问卷', icon: 'i-lucide-star', color: 'text-violet-400', bg: 'bg-violet-400/10' },
  SYSTEM: { label: '系统', icon: 'i-lucide-settings', color: 'text-white/60', bg: 'bg-white/[0.06]' },
  ERROR: { label: '异常', icon: 'i-lucide-alert-triangle', color: 'text-[#ff453a]', bg: 'bg-[#ff453a]/10' },
}
function getCategory(cat: string) {
  return categoryConfig[cat] || { label: cat, icon: 'i-lucide-file-text', color: 'text-white/40', bg: 'bg-white/[0.04]' }
}

// ── IP 显示优化（::1 / 127.0.0.1 → “本地”） ──
function formatIp(ip: string | null): string | null {
  if (!ip) return null
  if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') return '本地'
  if (ip === 'system') return '系统'
  return ip
}

// ── 相对时间 ──
function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.max(0, now - then)
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return '刚刚'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} 天前`
  return new Date(dateStr).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="space-y-6 animate-fade-in text-white">
    <!-- 顶栏 -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-[28px] font-bold text-white tracking-tight">工作台</h1>
        <p class="text-white/40 text-sm mt-1">运营概览、收入监控与实时指标</p>
      </div>
      <button
        @click="handleRefresh"
        :disabled="isLoading || dashLoading"
        class="text-xs bg-white/[0.06] hover:bg-white/[0.10] disabled:opacity-50 text-white/70 hover:text-white/90 font-medium px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 active:scale-[0.98] cursor-pointer border border-white/[0.06]"
      >
        <span :class="{'animate-spin': isLoading || dashLoading}" class="i-lucide-refresh-cw text-[12px]" />
        刷新
      </button>
    </div>

    <!-- 核心 KPI 4 列 -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <!-- 今日订单 -->
      <div class="p-5 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.045] hover:border-white/[0.08] transition-all duration-300">
        <div class="flex items-center gap-2 mb-2">
          <span class="i-lucide-shopping-bag text-[12px] text-blue-400/60" />
          <span class="text-[9px] font-semibold uppercase tracking-[0.1em] text-white/25">今日订单</span>
        </div>
        <span class="text-[32px] font-bold tracking-tight text-white font-mono leading-none">{{ stats?.todayOrderCount ?? 0 }}</span>
        <div class="text-[10px] text-white/20 mt-1.5">{{ formatAmount(stats?.todayRevenue ?? 0) }} 收入</div>
      </div>

      <!-- 30 天总收入 -->
      <div class="p-5 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.045] hover:border-emerald-500/15 transition-all duration-300">
        <div class="flex items-center gap-2 mb-2">
          <span class="i-lucide-trending-up text-[12px] text-emerald-400/60" />
          <span class="text-[9px] font-semibold uppercase tracking-[0.1em] text-white/25">30 天收入</span>
        </div>
        <span class="text-[32px] font-bold tracking-tight text-[#30d158] font-mono leading-none">{{ formatCompact(stats?.totalRevenue30d ?? 0) }}</span>
        <div v-if="stats?.growthPct != null" class="flex items-center gap-1.5 mt-1.5">
          <span class="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded"
            :class="stats.growthPct >= 0 ? 'bg-emerald-500/10 text-[#30d158]' : 'bg-rose-500/10 text-[#ff453a]'">
            {{ stats.growthPct >= 0 ? '↑' : '↓' }} {{ Math.abs(stats.growthPct) }}%
          </span>
        </div>
      </div>

      <!-- 活跃订阅 -->
      <div class="p-5 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.045] hover:border-white/[0.08] transition-all duration-300">
        <div class="flex items-center gap-2 mb-2">
          <span class="i-lucide-repeat text-[12px] text-purple-400/60" />
          <span class="text-[9px] font-semibold uppercase tracking-[0.1em] text-white/25">活跃订阅</span>
        </div>
        <span class="text-[32px] font-bold tracking-tight text-white font-mono leading-none">{{ stats?.activeSubscriptions ?? 0 }}</span>
        <div class="text-[10px] text-white/20 mt-1.5">持续计费中</div>
      </div>

      <!-- 支付渠道 -->
      <div class="p-5 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.045] hover:border-white/[0.08] transition-all duration-300">
        <div class="flex items-center gap-2 mb-2">
          <span class="i-lucide-credit-card text-[12px] text-amber-400/60" />
          <span class="text-[9px] font-semibold uppercase tracking-[0.1em] text-white/25">支付渠道</span>
        </div>
        <div class="flex items-baseline gap-1">
          <span class="text-[32px] font-bold tracking-tight text-white font-mono leading-none">{{ stats?.paymentChannels?.enabled ?? 0 }}</span>
          <span class="text-[14px] text-white/30 font-mono">/{{ stats?.paymentChannels?.total ?? 0 }}</span>
        </div>
        <div class="text-[10px] text-white/20 mt-1.5">已启用渠道</div>
      </div>
    </div>

    <!-- 7 天收入趋势 + 渠道占比 并排 -->
    <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
      <!-- 7 天趋势（占 3 列） -->
      <div class="md:col-span-3 p-5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
        <div class="flex items-center gap-2 mb-4">
          <span class="i-lucide-bar-chart-3 text-[12px] text-emerald-400/50" />
          <span class="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/25">7 天收入趋势</span>
        </div>
        <div v-if="stats?.revenueTrend?.length" class="flex items-end gap-1.5 h-24">
          <div v-for="t in stats.revenueTrend" :key="t.date"
            class="flex-1 flex flex-col items-center gap-1 justify-end h-full">
            <div class="w-full bg-emerald-500/30 hover:bg-emerald-500/50 rounded-sm transition-all duration-200 min-h-[2px]"
              :style="{ height: `${Math.max((t.amount / maxTrend) * 100, 3)}%` }"
              :title="`${t.date}: ${formatAmount(t.amount)}`" />
            <span class="text-[8px] text-white/20 font-mono">{{ t.date.slice(8) }}</span>
          </div>
        </div>
        <div v-else class="h-24 flex items-center justify-center text-white/15 text-xs">暂无数据</div>
      </div>

      <!-- 渠道占比（占 2 列） -->
      <div class="md:col-span-2 p-5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
        <div class="flex items-center gap-2 mb-4">
          <span class="i-lucide-pie-chart text-[12px] text-indigo-400/50" />
          <span class="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/25">渠道收入</span>
        </div>
        <div v-if="stats?.channelShare?.length" class="space-y-2.5">
          <div v-for="ch in stats.channelShare.slice(0, 5)" :key="ch.channel" class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full flex-shrink-0" :style="{ background: channelColors[ch.channel] || '#636366' }" />
            <span class="text-[10px] text-white/50 w-16 flex-shrink-0 truncate">{{ channelLabels[ch.channel] || ch.channel }}</span>
            <div class="flex-1 h-4 bg-white/[0.02] rounded-sm overflow-hidden">
              <div class="h-full rounded-sm transition-all duration-500"
                :style="{ width: `${Math.max((ch.revenue / (stats.totalRevenue30d || 1)) * 100, 3)}%`, background: channelColors[ch.channel] || '#6366f1' }" />
            </div>
            <span class="text-[9px] text-white/30 font-mono w-14 text-right flex-shrink-0">{{ formatCompact(ch.revenue) }}</span>
          </div>
        </div>
        <div v-else class="py-6 text-center text-white/15 text-xs">暂无渠道数据</div>
      </div>
    </div>

    <!-- 最近审计日志 -->
    <div class="p-5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <span class="i-lucide-scroll-text text-[12px] text-white/30" />
          <span class="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/30">最近审计日志</span>
        </div>
        <span class="text-[9px] text-white/15 font-mono">最新 {{ recentLogs.length }} 条</span>
      </div>
      <div v-if="recentLogs.length" class="space-y-1">
        <div v-for="log in recentLogs" :key="log.id"
          class="group flex items-start gap-3 py-2.5 px-3 rounded-lg hover:bg-white/[0.025] transition-colors -mx-1">
          <!-- 分类图标（从 action 推导） -->
          <div class="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5"
            :class="getCategory(inferCategory(log.action)).bg">
            <span :class="[getCategory(inferCategory(log.action)).icon, getCategory(inferCategory(log.action)).color]" class="text-[12px]" />
          </div>
          <!-- 内容 -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-0.5">
              <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0"
                :class="[getCategory(inferCategory(log.action)).bg, getCategory(inferCategory(log.action)).color]">
                {{ getCategory(inferCategory(log.action)).label }}
              </span>
              <span class="text-[11px] text-white/70 leading-tight line-clamp-1">{{ formatAction(log.action) }}</span>
            </div>
            <div class="flex items-center gap-3 mt-1">
              <span v-if="formatIp(log.ip)" class="text-[9px] text-white/15 font-mono flex items-center gap-1">
                <span class="i-lucide-globe text-[9px]" />{{ formatIp(log.ip) }}
              </span>
              <span v-if="log.metadata?.operator" class="text-[9px] text-white/15 font-mono flex items-center gap-1">
                <span class="i-lucide-user text-[9px]" />{{ log.metadata.operator }}
              </span>
              <span class="text-[9px] text-white/15 font-mono ml-auto flex-shrink-0" :title="log.created_at">
                {{ timeAgo(log.created_at) }}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="py-8 text-center text-white/15 text-xs">暂无审计日志</div>
    </div>
  </div>
</template>
