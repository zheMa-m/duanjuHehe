<script setup lang="ts">
interface RevenueData {
  totalPaymentRevenue: number
  totalAdRevenue: number
  totalRevenue: number
  adMetrics: {
    impressions: number
    clicks: number
    ctr: number
  }
  dailyBreakdown: Array<{
    date: string
    payments: number
    ads: number
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
        <h1 class="text-2xl font-semibold text-white tracking-tight">Revenue Analytics</h1>
        <p class="text-white/40 text-xs mt-1">Payment + ad revenue overview with daily breakdown and CTR metrics</p>
      </div>
      <button
        @click="$emit('refresh')"
        :disabled="isLoading"
        class="text-xs bg-white/10 hover:bg-white/15 text-white font-medium px-4 py-2 rounded-full transition-all"
      >
        Refresh
      </button>
    </div>

    <!-- KPI Cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="bg-[#1c1c1e] border border-white/5 rounded-2xl p-5">
        <div class="text-[10px] text-white/40 uppercase tracking-wider mb-2">Total Revenue</div>
        <div class="text-xl font-bold text-white">{{ formatAmount(revenue?.totalRevenue || 0) }}</div>
      </div>
      <div class="bg-[#1c1c1e] border border-white/5 rounded-2xl p-5">
        <div class="text-[10px] text-white/40 uppercase tracking-wider mb-2">Payment Revenue</div>
        <div class="text-xl font-bold text-emerald-400">{{ formatAmount(revenue?.totalPaymentRevenue || 0) }}</div>
        <div class="text-[10px] text-white/30 mt-1">{{ revenue?.orderCount || 0 }} orders</div>
      </div>
      <div class="bg-[#1c1c1e] border border-white/5 rounded-2xl p-5">
        <div class="text-[10px] text-white/40 uppercase tracking-wider mb-2">Ad Revenue (Est.)</div>
        <div class="text-xl font-bold text-blue-400">{{ formatAmount(revenue?.totalAdRevenue || 0) }}</div>
        <div class="text-[10px] text-white/30 mt-1">CPM $2.00</div>
      </div>
      <div class="bg-[#1c1c1e] border border-white/5 rounded-2xl p-5">
        <div class="text-[10px] text-white/40 uppercase tracking-wider mb-2">Ad CTR</div>
        <div class="text-xl font-bold text-amber-400">{{ revenue?.adMetrics?.ctr || 0 }}%</div>
        <div class="text-[10px] text-white/30 mt-1">{{ revenue?.adMetrics?.clicks || 0 }} / {{ revenue?.adMetrics?.impressions || 0 }}</div>
      </div>
    </div>

    <!-- Daily Breakdown Chart (Text-based) -->
    <div class="bg-[#1c1c1e] border border-white/5 rounded-2xl p-6">
      <h3 class="text-sm font-medium text-white mb-4">Daily Revenue Breakdown</h3>
      <div v-if="revenue?.dailyBreakdown?.length" class="space-y-2">
        <div
          v-for="day in revenue.dailyBreakdown"
          :key="day.date"
          class="flex items-center gap-4 text-xs"
        >
          <span class="text-white/40 font-mono text-[10px] w-24 flex-shrink-0">{{ day.date }}</span>
          <div class="flex-1 flex gap-1 h-5">
            <div
              class="bg-emerald-500/30 rounded-l-sm h-full"
              :style="{ width: `${Math.min((day.payments / (revenue.totalRevenue || 1)) * 100, 100)}%` }"
              :title="`Payments: ${formatAmount(day.payments)}`"
            ></div>
            <div
              class="bg-blue-500/30 rounded-r-sm h-full"
              :style="{ width: `${Math.min((day.ads / (revenue.totalRevenue || 1)) * 100, 100)}%` }"
              :title="`Ads: ${formatAmount(day.ads)}`"
            ></div>
          </div>
          <span class="text-white/50 font-mono text-[10px] w-20 text-right">{{ formatAmount(day.payments) }}</span>
        </div>
      </div>
      <div v-else class="text-center text-white/20 py-8">No revenue data available</div>
    </div>

    <!-- Ad Metrics Detail -->
    <div class="bg-[#1c1c1e] border border-white/5 rounded-2xl p-6">
      <h3 class="text-sm font-medium text-white mb-4">Ad Performance Metrics</h3>
      <div class="grid grid-cols-3 gap-6 text-center">
        <div>
          <div class="text-2xl font-bold text-white">{{ revenue?.adMetrics?.impressions?.toLocaleString() || 0 }}</div>
          <div class="text-[10px] text-white/40 mt-1">Impressions</div>
        </div>
        <div>
          <div class="text-2xl font-bold text-white">{{ revenue?.adMetrics?.clicks?.toLocaleString() || 0 }}</div>
          <div class="text-[10px] text-white/40 mt-1">Clicks</div>
        </div>
        <div>
          <div class="text-2xl font-bold text-white">{{ revenue?.adMetrics?.ctr || 0 }}%</div>
          <div class="text-[10px] text-white/40 mt-1">CTR</div>
        </div>
      </div>
    </div>
  </div>
</template>
