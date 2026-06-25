<script setup lang="ts">
interface ChannelData {
  channel: string
  revenue: number
  count: number
}

interface DailyData {
  date: string
  payments: number
  count: number
}

interface RevenueData {
  totalPaymentRevenue: number
  totalRevenue: number
  todayRevenue: number
  todayOrderCount: number
  orderCount: number
  avgOrderValue: number
  growthPct: number
  channelBreakdown: ChannelData[]
  dailyBreakdown: DailyData[]
}

const props = defineProps<{
  revenue: RevenueData | null
  isLoading: boolean
}>()

const emit = defineEmits<{
  refresh: []
  'change-days': [days: number]
}>()

const selectedDays = ref(30)
const dayOptions = [7, 30, 90, 365] as const

function switchDays(d: number) {
  selectedDays.value = d
  emit('change-days', d)
}

const formatAmount = (n: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

const formatCompact = (n: number) => {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`
  return formatAmount(n)
}

// 渠道名称映射
const channelLabels: Record<string, string> = {
  stripe: 'Stripe', paypal: 'PayPal', google_pay: 'Google Pay',
  apple_iap: 'Apple IAP', alipay: 'Alipay', wechat: 'WeChat Pay', unknown: '其他',
}
const channelColors: Record<string, string> = {
  stripe: '#635bff', paypal: '#003087', google_pay: '#4285f4',
  apple_iap: '#a2aaad', alipay: '#1677ff', wechat: '#07c160', unknown: '#636366',
}

// 最大每日收入（用于条形图比例）
const maxDailyPayment = computed(() => {
  if (!props.revenue?.dailyBreakdown?.length) return 1
  return Math.max(...props.revenue.dailyBreakdown.map(d => d.payments), 1)
})
</script>

<template>
  <div class="space-y-6 animate-fade-in text-white">
    <!-- 顶栏 -->
    <div class="flex justify-between items-start flex-wrap gap-4">
      <div>
        <h1 class="text-[28px] font-bold text-white tracking-tight">收入分析</h1>
        <p class="text-white/40 text-sm mt-1">支付收入总览、渠道分布与增长趋势</p>
      </div>
      <div class="flex items-center gap-3">
        <!-- 时间范围切换 -->
        <div class="inline-flex bg-white/[0.02] border border-white/[0.06] p-0.5 rounded-lg">
          <button v-for="d in dayOptions" :key="d" @click="switchDays(d)"
            class="text-[10px] font-semibold px-3 py-1.5 rounded-md transition-all cursor-pointer border-0"
            :class="selectedDays === d ? 'bg-white/10 text-white' : 'bg-transparent text-white/50 hover:text-white/80'"
          >{{ d === 365 ? '全部' : `${d}天` }}</button>
        </div>
        <button
          @click="$emit('refresh')"
          :disabled="isLoading"
          class="text-xs bg-white/[0.06] hover:bg-white/[0.10] disabled:opacity-50 text-white/70 hover:text-white/90 font-medium px-4 py-2 rounded-lg transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5 border border-white/[0.06]"
        >
          <span :class="{'animate-spin': isLoading}" class="i-lucide-refresh-cw text-[12px]" />
          刷新
        </button>
      </div>
    </div>

    <!-- KPI 卡片 4 列 -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <!-- 总收入 -->
      <div class="relative p-6 rounded-xl bg-white/[0.03] border border-white/[0.05] overflow-hidden group hover:bg-white/[0.045] hover:border-white/[0.08] transition-all duration-300">
        <div class="absolute -top-16 -right-16 w-32 h-32 rounded-full bg-indigo-500/[0.04] blur-3xl group-hover:bg-indigo-500/[0.07] transition-all duration-500" />
        <div class="relative z-10">
          <div class="flex items-center gap-2 mb-2">
            <span class="i-lucide-dollar-sign text-[12px] text-indigo-400/60" />
            <span class="text-[9px] font-semibold uppercase tracking-[0.1em] text-white/25">总收入</span>
          </div>
          <span class="text-[32px] font-bold tracking-tight text-white font-mono leading-none">{{ formatCompact(revenue?.totalRevenue || 0) }}</span>
          <div v-if="revenue?.growthPct != null" class="flex items-center gap-1.5 mt-2">
            <span class="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded"
              :class="revenue.growthPct >= 0 ? 'bg-emerald-500/10 text-[#30d158]' : 'bg-rose-500/10 text-[#ff453a]'">
              {{ revenue.growthPct >= 0 ? '↑' : '↓' }} {{ Math.abs(revenue.growthPct) }}%
            </span>
            <span class="text-[9px] text-white/20">vs 上周期</span>
          </div>
        </div>
      </div>

      <!-- 今日收入 -->
      <div class="relative p-6 rounded-xl bg-white/[0.03] border border-white/[0.05] overflow-hidden group hover:bg-white/[0.045] hover:border-emerald-500/15 transition-all duration-300">
        <div class="absolute -top-16 -right-16 w-32 h-32 rounded-full bg-emerald-500/[0.04] blur-3xl group-hover:bg-emerald-500/[0.07] transition-all duration-500" />
        <div class="relative z-10">
          <div class="flex items-center gap-2 mb-2">
            <span class="i-lucide-trending-up text-[12px] text-emerald-400/60" />
            <span class="text-[9px] font-semibold uppercase tracking-[0.1em] text-white/25">今日收入</span>
          </div>
          <span class="text-[32px] font-bold tracking-tight text-emerald-400 font-mono leading-none">{{ formatAmount(revenue?.todayRevenue || 0) }}</span>
          <div class="text-[10px] text-white/20 mt-2">{{ revenue?.todayOrderCount || 0 }} 笔订单</div>
        </div>
      </div>

      <!-- 客单价 -->
      <div class="relative p-6 rounded-xl bg-white/[0.03] border border-white/[0.05] overflow-hidden group hover:bg-white/[0.045] hover:border-white/[0.08] transition-all duration-300">
        <div class="absolute -top-16 -right-16 w-32 h-32 rounded-full bg-amber-500/[0.04] blur-3xl group-hover:bg-amber-500/[0.07] transition-all duration-500" />
        <div class="relative z-10">
          <div class="flex items-center gap-2 mb-2">
            <span class="i-lucide-receipt text-[12px] text-amber-400/60" />
            <span class="text-[9px] font-semibold uppercase tracking-[0.1em] text-white/25">客单价</span>
          </div>
          <span class="text-[32px] font-bold tracking-tight text-amber-400 font-mono leading-none">{{ formatAmount(revenue?.avgOrderValue || 0) }}</span>
          <div class="text-[10px] text-white/20 mt-2">平均订单金额</div>
        </div>
      </div>

      <!-- 订单总数 -->
      <div class="relative p-6 rounded-xl bg-white/[0.03] border border-white/[0.05] overflow-hidden group hover:bg-white/[0.045] hover:border-white/[0.08] transition-all duration-300">
        <div class="absolute -top-16 -right-16 w-32 h-32 rounded-full bg-blue-500/[0.04] blur-3xl group-hover:bg-blue-500/[0.07] transition-all duration-500" />
        <div class="relative z-10">
          <div class="flex items-center gap-2 mb-2">
            <span class="i-lucide-shopping-bag text-[12px] text-blue-400/60" />
            <span class="text-[9px] font-semibold uppercase tracking-[0.1em] text-white/25">订单总数</span>
          </div>
          <span class="text-[32px] font-bold tracking-tight text-white font-mono leading-none">{{ (revenue?.orderCount || 0).toLocaleString() }}</span>
          <div class="text-[10px] text-white/20 mt-2">已完成支付</div>
        </div>
      </div>
    </div>

    <!-- 渠道收入分布 -->
    <div class="bg-white/[0.03] border border-white/[0.05] rounded-xl p-6">
      <div class="flex items-center gap-2 mb-5">
        <span class="i-lucide-pie-chart text-[13px] text-indigo-400/50" />
        <h3 class="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/30">渠道收入分布</h3>
      </div>
      <div v-if="revenue?.channelBreakdown?.length" class="space-y-3">
        <div v-for="ch in revenue.channelBreakdown" :key="ch.channel" class="flex items-center gap-3">
          <span class="text-[11px] text-white/50 w-24 flex-shrink-0 font-medium truncate">{{ channelLabels[ch.channel] || ch.channel }}</span>
          <div class="flex-1 h-6 bg-white/[0.03] rounded-md overflow-hidden relative">
            <div class="h-full rounded-md transition-all duration-500"
              :style="{ width: `${Math.max((ch.revenue / (revenue.totalRevenue || 1)) * 100, 2)}%`, background: channelColors[ch.channel] || '#6366f1' }" />
          </div>
          <span class="text-[11px] text-white/60 font-mono w-20 text-right flex-shrink-0">{{ formatAmount(ch.revenue) }}</span>
          <span class="text-[9px] text-white/25 w-14 text-right flex-shrink-0">{{ ch.count }} 笔</span>
        </div>
      </div>
      <div v-else class="py-8 text-center text-white/20 text-xs">暂无渠道数据</div>
    </div>

    <!-- 每日收入趋势 -->
    <div class="bg-white/[0.03] border border-white/[0.05] rounded-xl p-6">
      <div class="flex items-center justify-between mb-5">
        <div class="flex items-center gap-2">
          <span class="i-lucide-bar-chart-3 text-[13px] text-emerald-400/50" />
          <h3 class="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/30">每日收入趋势</h3>
        </div>
        <span class="text-[9px] text-white/20 font-mono">近 {{ selectedDays }} 天</span>
      </div>
      <div v-if="revenue?.dailyBreakdown?.length" class="space-y-1.5">
        <div
          v-for="day in revenue.dailyBreakdown.slice(0, 14)"
          :key="day.date"
          class="flex items-center gap-3 group/row hover:bg-white/[0.02] rounded-md px-2 py-1 -mx-2 transition-colors"
        >
          <span class="text-white/30 font-mono text-[10px] w-20 flex-shrink-0">{{ day.date.slice(5) }}</span>
          <div class="flex-1 h-5 bg-white/[0.02] rounded-sm overflow-hidden">
            <div
              class="bg-emerald-500/40 group-hover/row:bg-emerald-500/60 h-full rounded-sm transition-all duration-300"
              :style="{ width: `${(day.payments / maxDailyPayment) * 100}%` }"
            />
          </div>
          <span class="text-white/40 font-mono text-[10px] w-16 text-right flex-shrink-0">{{ formatAmount(day.payments) }}</span>
          <span class="text-white/15 text-[9px] w-8 text-right flex-shrink-0">{{ day.count }}笔</span>
        </div>
        <div v-if="revenue.dailyBreakdown.length > 14" class="text-center pt-2">
          <span class="text-[9px] text-white/20">... 共 {{ revenue.dailyBreakdown.length }} 天数据</span>
        </div>
      </div>
      <div v-else class="py-8 text-center text-white/20 text-xs">暂无收入数据</div>
    </div>
  </div>
</template>
