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
        class="text-xs bg-white/10 hover:bg-white/15 text-white font-medium px-4 py-2 rounded-full transition-all"
      >
        刷新
      </button>
    </div>

    <!-- KPI Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="bg-white/[0.04] rounded-2xl p-6 shadow-lg shadow-black/20">
        <div class="text-[11px] text-white/40 uppercase tracking-wider mb-2">总收入</div>
        <div class="text-2xl font-bold text-white">{{ formatAmount(revenue?.totalRevenue || 0) }}</div>
      </div>
      <div class="bg-white/[0.04] rounded-2xl p-6 shadow-lg shadow-black/20">
        <div class="text-[11px] text-white/40 uppercase tracking-wider mb-2">支付收入</div>
        <div class="text-2xl font-bold text-emerald-400">{{ formatAmount(revenue?.totalPaymentRevenue || 0) }}</div>
        <div class="text-xs text-white/30 mt-1">{{ revenue?.orderCount || 0 }} 订单</div>
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
