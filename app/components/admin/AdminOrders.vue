<script setup lang="ts">
interface Order {
  id: string
  order_no: string
  product_id: string
  product_name: string
  amount: number
  currency: string
  status: string
  user_id: string
  payment_provider: string
  payment_intent_id: string
  created_at: string
  updated_at: string
}

const props = defineProps<{
  orders: Order[] | null
  isLoading: boolean
}>()

const emit = defineEmits<{
  refresh: []
  updateStatus: [id: string, status: string]
}>()

const statusFilter = ref('all')

const filteredOrders = computed(() => {
  if (!props.orders) return []
  if (statusFilter.value === 'all') return props.orders
  return props.orders.filter(o => o.status === statusFilter.value)
})

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    paid: 'bg-[#30d158]/10 text-[#30d158] border-[#30d158]/20',
    pending: 'bg-[#ff9f0a]/10 text-[#ff9f0a] border-[#ff9f0a]/20',
    failed: 'bg-[#ff453a]/10 text-[#ff453a] border-[#ff453a]/20',
    refunded: 'bg-[#bf5af2]/10 text-[#bf5af2] border-[#bf5af2]/20',
  }
  return map[status] || 'bg-white/5 text-white/40 border-white/10'
}

const statusPulseDot = (status: string) => {
  const map: Record<string, string> = {
    paid: 'bg-[#30d158]',
    pending: 'bg-[#ff9f0a]',
    failed: 'bg-[#ff453a]',
    refunded: 'bg-[#bf5af2]',
  }
  return map[status] || 'bg-white/40'
}

const handleRefund = (orderId: string) => {
  if (!confirm('确定要为该订单办理退款回收吗？此操作将实时触发审计流并在 Supabase 标记为 refunded。')) return
  emit('updateStatus', orderId, 'refunded')
}
</script>

<template>
  <div class="space-y-8 animate-fade-in text-white">
    <!-- 标题 -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-semibold text-white tracking-tight">订单流水管理</h1>
        <p class="text-white/40 text-xs mt-1">管理并监控全站支付订单、追踪退款及安全合规流水</p>
      </div>
      <button
        @click="$emit('refresh')"
        :disabled="isLoading"
        class="text-xs bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-full transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
      >
        <span :class="{'animate-spin': isLoading}">🔄</span>
        刷新订单
      </button>
    </div>

    <!-- 订单状态分类栏 (高级一体化胶囊 Switcher) -->
    <div class="inline-flex bg-white/[0.02] border border-white/[0.06] p-1 rounded-full shadow-[inset_0_1px_rgba(255,255,255,0.02)]">
      <button
        v-for="s in ['all', 'paid', 'pending', 'failed', 'refunded']"
        :key="s"
        @click="statusFilter = s"
        class="text-[10px] font-semibold px-4.5 py-2.5 rounded-full transition-all cursor-pointer focus:outline-none border-0"
        :class="statusFilter === s 
          ? 'bg-white/10 text-white shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_rgba(255,255,255,0.05)]' 
          : 'bg-transparent text-white/40 hover:text-white/70'"
      >
        {{ s === 'all' ? '全部订单' : s.charAt(0).toUpperCase() + s.slice(1) }}
      </button>
    </div>

    <!-- 订单表格 (毛玻璃卡片) -->
    <div class="bg-[#0c0c0e]/60 border border-white/[0.06] rounded-2xl overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="border-b border-white/[0.05] text-white/40 uppercase tracking-widest text-[9px] bg-white/[0.005]">
              <th class="px-6 py-4 font-semibold font-mono">订单号 (Order No)</th>
              <th class="px-6 py-4 font-semibold font-mono">购买商品</th>
              <th class="px-6 py-4 font-semibold font-mono">金额 (Amount)</th>
              <th class="px-6 py-4 font-semibold font-mono">支付状态</th>
              <th class="px-6 py-4 font-semibold font-mono">支付渠道</th>
              <th class="px-6 py-4 font-semibold font-mono">下单时间</th>
              <th class="px-6 py-4 font-semibold font-mono">后台控制</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.04]">
            <tr
              v-for="order in filteredOrders"
              :key="order.id"
              class="hover:bg-white/[0.02] transition-colors duration-200"
            >
              <td class="px-6 py-4 font-mono text-[11px] text-white/70 tracking-wide">{{ order.order_no }}</td>
              <td class="px-6 py-4 text-white/90 font-medium">{{ order.product_name }}</td>
              <td class="px-6 py-4 font-mono text-white/90 text-xs font-semibold">
                {{ order.currency }} {{ Number(order.amount).toFixed(2) }}
              </td>
              <td class="px-6 py-4">
                <span class="text-[9px] px-2.5 py-0.5 rounded-full border inline-flex items-center" :class="statusBadge(order.status)">
                  <span 
                    class="w-1.2 h-1.2 rounded-full mr-1.5"
                    :class="[
                      statusPulseDot(order.status),
                      order.status === 'paid' || order.status === 'pending' ? 'animate-pulse' : ''
                    ]"
                  ></span>
                  {{ order.status }}
                </span>
              </td>
              <td class="px-6 py-4 text-white/50 font-light">{{ order.payment_provider }}</td>
              <td class="px-6 py-4 text-white/40 font-mono text-[11px]">{{ new Date(order.created_at).toLocaleString() }}</td>
              <td class="px-6 py-4">
                <button
                  v-if="order.status === 'paid'"
                  @click="handleRefund(order.id)"
                  class="text-[10px] font-semibold bg-[#ff453a]/10 hover:bg-[#ff453a]/20 text-[#ff453a] px-3.5 py-1.5 rounded-full border border-[#ff453a]/20 transition-all active:scale-[0.93] cursor-pointer focus:outline-none"
                >
                  办理退款
                </button>
                <span v-else class="text-white/20 text-xs">-</span>
              </td>
            </tr>
            <tr v-if="!filteredOrders.length">
              <td colspan="7" class="py-12 text-center text-xs text-white/25 font-light">暂无符合条件的订单记录</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
