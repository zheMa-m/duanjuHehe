<script setup lang="ts">
interface RevenueData {
  totalPaymentRevenue: number
  totalRevenue: number
  dailyBreakdown: Array<{
    date: string
    payments: number
  }>
  orderCount: number
}

const props = defineProps<{
  revenue: RevenueData | null
  isLoading: boolean
}>()

const emit = defineEmits<{
  refresh: []
}>()

const formatAmount = (n: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}
</script>

<template>
  <div class="space-y-8 animate-fade-in">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-[28px] font-bold text-white tracking-tight">收入分析</h1>
        <p class="text-white/40 text-sm mt-1">支付收入总览与每日明细</p>
      </div>
      <button
        @click="$emit('refresh')"
        :disabled="isLoading"
        class="text-xs bg-white/[0.06] hover:bg-white/[0.10] disabled:opacity-50 text-white/70 hover:text-white/90 font-medium px-4 py-2 rounded-xl transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5 border border-white/[0.06] hover:border-white/[0.10]"
      >
        <span :class="{'animate-spin': isLoading}" class="i-lucide-refresh-cw text-[13px]" />
        刷新
      </button>
    </div>

    <!-- KPI Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div class="relative p-7 rounded-[14px] bg-white/[0.03] border border-white/[0.05] overflow-hidden transition-all duration-300 hover:bg-white/[0.045] hover:border-white/[0.08] hover:-translate-y-px hover:shadow-[0_12px_40px_rgba(0,0,0,0.25)] group">
        <div class="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-indigo-500/[0.04] blur-3xl group-hover:bg-indigo-500/[0.07] transition-all duration-500"></div>
        <div class="relative z-10">
          <div class="flex items-center gap-2 mb-3">
            <span class="i-lucide-dollar-sign text-[13px] text-indigo-400/60" />
            <span class="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/25">总收入</span>
          </div>
          <span class="text-[42px] font-bold tracking-tight text-white font-mono leading-none">{{ formatAmount(revenue?.totalRevenue || 0) }}</span>
        </div>
      </div>
      <div class="relative p-7 rounded-[14px] bg-white/[0.03] border border-white/[0.05] overflow-hidden transition-all duration-300 hover:bg-white/[0.045] hover:border-[#30d158]/15 hover:-translate-y-px hover:shadow-[0_12px_40px_rgba(0,0,0,0.25)] group">
        <div class="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-emerald-500/[0.04] blur-3xl group-hover:bg-emerald-500/[0.07] transition-all duration-500"></div>
        <div class="relative z-10">
          <div class="flex items-center gap-2 mb-3">
            <span class="i-lucide-trending-up text-[13px] text-emerald-400/60" />
            <span class="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/25">支付收入</span>
          </div>
          <span class="text-[42px] font-bold tracking-tight text-emerald-400 font-mono leading-none">{{ formatAmount(revenue?.totalPaymentRevenue || 0) }}</span>
          <div class="text-[11px] text-white/20 mt-2 font-light">{{ revenue?.orderCount || 0 }} 订单</div>
        </div>
      </div>
    </div>

    <!-- Daily Breakdown Chart (Text-based) -->
    <div class="bg-white/[0.04] rounded-2xl p-7 shadow-lg shadow-black/20">
      <h3 class="text-sm font-medium text-white mb-4">每日收入明细</h3>
      <div v-if="revenue?.dailyBreakdown?.length" class="space-y-2">
        <div
          v-for="day in revenue.dailyBreakdown"
          :key="day.date"
          class="flex items-center gap-4 text-sm"
        >
          <span class="text-white/40 font-mono text-xs w-24 flex-shrink-0">{{ day.date }}</span>
          <div class="flex-1 flex gap-1 h-5">
            <div
              class="bg-emerald-500/30 rounded-sm h-full"
              :style="{ width: `${Math.min((day.payments / (revenue.totalRevenue || 1)) * 100, 100)}%` }"
              :title="`支付: ${formatAmount(day.payments)}`"
            ></div>
          </div>
          <span class="text-white/50 font-mono text-xs w-20 text-right">{{ formatAmount(day.payments) }}</span>
        </div>
      </div>
      <div v-else class="text-center text-white/20 py-8">暂无收入数据</div>
    </div>
  </div>
</template>
