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
    paid: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    failed: 'bg-red-500/10 text-red-400 border-red-500/20',
    refunded: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  }
  return map[status] || 'bg-white/5 text-white/40 border-white/10'
}

const handleRefund = (orderId: string) => {
  if (!confirm('Confirm refund this order? This will be logged to audit.')) return
  emit('updateStatus', orderId, 'refunded')
}
</script>

<template>
  <div class="space-y-8 animate-fade-in">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-semibold text-white tracking-tight">Orders Management</h1>
        <p class="text-white/40 text-xs mt-1">Manage all payment orders, track refunds and audit trail</p>
      </div>
      <button
        @click="$emit('refresh')"
        :disabled="isLoading"
        class="text-xs bg-white/10 hover:bg-white/15 text-white font-medium px-4 py-2 rounded-full transition-all active:scale-[0.98]"
      >
        Refresh
      </button>
    </div>

    <!-- Status Filter -->
    <div class="flex gap-2">
      <button
        v-for="s in ['all', 'paid', 'pending', 'failed', 'refunded']"
        :key="s"
        @click="statusFilter = s"
        class="text-[10px] px-3 py-1.5 rounded-full border transition-all"
        :class="statusFilter === s ? 'bg-white/10 text-white border-white/20' : 'bg-transparent text-white/40 border-white/5 hover:border-white/10'"
      >
        {{ s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1) }}
      </button>
    </div>

    <!-- Orders Table -->
    <div class="bg-[#1c1c1e] border border-white/5 rounded-2xl overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="border-b border-white/5 text-white/40 uppercase tracking-wider text-[9px]">
              <th class="px-6 py-3.5 font-medium">Order No</th>
              <th class="px-6 py-3.5 font-medium">Product</th>
              <th class="px-6 py-3.5 font-medium">Amount</th>
              <th class="px-6 py-3.5 font-medium">Status</th>
              <th class="px-6 py-3.5 font-medium">Provider</th>
              <th class="px-6 py-3.5 font-medium">Created</th>
              <th class="px-6 py-3.5 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="order in filteredOrders"
              :key="order.id"
              class="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
            >
              <td class="px-6 py-3 font-mono text-[10px] text-white/70">{{ order.order_no }}</td>
              <td class="px-6 py-3 text-white/80">{{ order.product_name }}</td>
              <td class="px-6 py-3 font-mono text-white/80">{{ order.currency }} {{ Number(order.amount).toFixed(2) }}</td>
              <td class="px-6 py-3">
                <span class="text-[9px] px-2 py-0.5 rounded-full border" :class="statusBadge(order.status)">
                  {{ order.status }}
                </span>
              </td>
              <td class="px-6 py-3 text-white/50">{{ order.payment_provider }}</td>
              <td class="px-6 py-3 text-white/40 text-[10px]">{{ new Date(order.created_at).toLocaleDateString() }}</td>
              <td class="px-6 py-3">
                <button
                  v-if="order.status === 'paid'"
                  @click="handleRefund(order.id)"
                  class="text-[10px] text-red-400 hover:text-red-300 transition-colors"
                >
                  Refund
                </button>
                <span v-else class="text-white/20 text-[10px]">-</span>
              </td>
            </tr>
            <tr v-if="!filteredOrders.length">
              <td colspan="7" class="px-6 py-12 text-center text-white/20">No orders found</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
