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
  ordersTotal: number
  ordersPage: number
  ordersPageSize: number
  isLoading: boolean
}>()

const refundLoading = ref<Record<string, boolean>>({})

const emit = defineEmits<{
  refresh: []
  updateStatus: [id: string, status: string]
  changePage: [page: number]
  toast: [msg: string, type: 'success' | 'error' | 'info']
}>()

const handleRefund = async (orderId: string) => {
  if (!confirm('确定要为该订单办理原路退款吗？\n该操作将自动：\n1. 向 Stripe 发起原路退款申请\n2. 取消该用户的活跃订阅\n3. 将该用户 Profiles 权限降级为 Free\n4. 在系统安全表中记录管理员退款操作审计日志')) return
  
  refundLoading.value[orderId] = true
  try {
    const res = await $fetch<any>(`/api/admin/orders/${orderId}/refund`, { method: 'POST' })
    emit('toast', res?.message || '退款及用户会员降级处理成功', 'success')
    emit('refresh')
  } catch (e: any) {
    emit('toast', '退款处理失败: ' + (e.data?.statusMessage || e.message), 'error')
  } finally {
    refundLoading.value[orderId] = false
  }
}

const statusFilter = ref('all')

const orderStatusList = ['all', 'paid', 'pending', 'failed', 'refunded']
const orderStatusLabel: Record<string, string> = {
  all: '全部订单',
  paid: '已支付',
  pending: '待支付',
  failed: '已失败',
  refunded: '已退款',
}
const orderStatusText: Record<string, string> = {
  paid: '已支付',
  pending: '待支付',
  failed: '已失败',
  refunded: '已退款',
}

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
    refunded: 'bg-[#64d2ff]/10 text-[#64d2ff] border-[#64d2ff]/20',
  }
  return map[status] || 'bg-white/5 text-white/40 border-white/10'
}

const statusPulseDot = (status: string) => {
  const map: Record<string, string> = {
    paid: 'bg-[#30d158]',
    pending: 'bg-[#ff9f0a]',
    failed: 'bg-[#ff453a]',
    refunded: 'bg-[#64d2ff]',
  }
  return map[status] || 'bg-white/40'
}

const totalPages = computed(() => Math.max(1, Math.ceil(props.ordersTotal / props.ordersPageSize)))
const handlePageChange = (page: number) => {
  if (page < 1 || page > totalPages.value) return
  emit('changePage', page)
}
</script>

<template>
  <div class="space-y-8 animate-fade-in text-white">
    <!-- 标题 -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-[28px] font-bold text-white tracking-tight">订单流水管理</h1>
        <p class="text-white/40 text-sm mt-1">管理并监控全站支付订单、追踪退款及安全合规流水</p>
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
        v-for="s in orderStatusList"
        :key="s"
        @click="statusFilter = s"
        class="text-[10px] font-semibold px-4.5 py-2.5 rounded-full transition-all cursor-pointer focus:outline-none border-0"
        :class="statusFilter === s 
          ? 'bg-white/10 text-white shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_rgba(255,255,255,0.05)]' 
          : 'bg-transparent text-white/60 hover:text-white/90'"
      >
        {{ orderStatusLabel[s] || s }}
      </button>
    </div>

    <!-- 订单表格 (毛玻璃卡片) -->
    <div class="bg-white/[0.04] rounded-2xl overflow-hidden shadow-xl shadow-black/20">
      <div class="overflow-x-auto overflow-y-auto max-h-[60vh]">
        <table class="w-full text-left text-sm border-collapse">
          <thead class="sticky top-0 z-10">
            <tr class="border-b border-white/[0.05] text-white/40 uppercase tracking-widest text-[10px] bg-[#0d0d18]/95 backdrop-blur-sm">
              <th class="px-6 py-4 font-semibold font-mono">订单号</th>
              <th class="px-6 py-4 font-semibold font-mono">购买商品</th>
              <th class="px-6 py-4 font-semibold font-mono">金额</th>
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
              <td class="px-6 py-5 font-mono text-xs text-white/70 tracking-wide">{{ order.order_no }}</td>
              <td class="px-6 py-5 text-white/90 font-medium">{{ order.product_name }}</td>
              <td class="px-6 py-5 font-mono text-white/90 text-sm font-semibold">
                {{ order.currency }} {{ Number(order.amount).toFixed(2) }}
              </td>
              <td class="px-6 py-5">
                <span class="text-[10px] px-2.5 py-0.5 rounded-full border inline-flex items-center" :class="statusBadge(order.status)">
                  <span 
                    class="w-1.2 h-1.2 rounded-full mr-1.5"
                    :class="[
                      statusPulseDot(order.status),
                      order.status === 'paid' || order.status === 'pending' ? 'animate-pulse' : ''
                    ]"
                  ></span>
                  {{ orderStatusText[order.status] || order.status }}
                </span>
              </td>
              <td class="px-6 py-5 text-white/50 font-light">{{ order.payment_provider }}</td>
              <td class="px-6 py-5 text-white/40 font-mono text-xs">{{ new Date(order.created_at).toLocaleString() }}</td>
              <td class="px-6 py-5">
                <button
                  v-if="order.status === 'paid'"
                  @click="handleRefund(order.id)"
                  :disabled="refundLoading[order.id]"
                  class="text-[11px] font-semibold bg-[#ff453a]/10 hover:bg-[#ff453a]/20 disabled:opacity-50 disabled:cursor-not-allowed text-[#ff453a] px-4 py-2 rounded-full border border-[#ff453a]/20 transition-all active:scale-[0.93] cursor-pointer focus:outline-none"
                >
                  {{ refundLoading[order.id] ? '退款中...' : '办理退款' }}
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

    <!-- 分页控制栏 -->
    <div v-if="ordersTotal > 0" class="flex items-center justify-between px-5 py-3 bg-white/[0.02] rounded-xl border border-white/[0.04]">
      <div class="text-[11px] text-white/30 font-mono">
        共 {{ ordersTotal }} 条 · 第 {{ ordersPage }}/{{ totalPages }} 页
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="handlePageChange(ordersPage - 1)"
          :disabled="ordersPage <= 1"
          class="text-[11px] font-semibold bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white/80 px-3 py-1.5 rounded-full border border-white/10 transition-all cursor-pointer focus:outline-none"
        >上一页</button>
        <button
          @click="handlePageChange(ordersPage + 1)"
          :disabled="ordersPage >= totalPages"
          class="text-[11px] font-semibold bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white/80 px-3 py-1.5 rounded-full border border-white/10 transition-all cursor-pointer focus:outline-none"
        >下一页</button>
      </div>
    </div>
  </div>
</template>
