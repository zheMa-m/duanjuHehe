<script setup lang="ts">
interface Subscription {
  id: string
  user_id: string
  stripe_subscription_id: string
  status: string
  price_id: string
  quantity: number
  cancel_at_period_end: boolean
  current_period_start: string
  current_period_end: string
  created_at: string
  updated_at: string
  user_email: string | null
  user_display_name: string | null
}

const props = defineProps<{
  subscriptions: Subscription[] | null
  subscriptionsTotal: number
  subscriptionsPage: number
  subscriptionsPageSize: number
  isLoading: boolean
}>()

const emit = defineEmits<{
  refresh: []
  changePage: [page: number]
  toast: [msg: string, type: 'success' | 'error' | 'info']
}>()

const cancelLoading = ref<Record<string, boolean>>({})
const statusFilter = ref('all')

const statusList = ['all', 'active', 'trialing', 'past_due', 'canceled', 'unpaid']
const statusLabel: Record<string, string> = {
  all: '全部订阅',
  active: '生效中',
  trialing: '试用中',
  past_due: '已逾期',
  canceled: '已取消',
  unpaid: '未付款',
}

const statusText: Record<string, string> = {
  active: '生效中',
  trialing: '试用中',
  past_due: '已逾期',
  canceled: '已取消',
  unpaid: '未付款',
}

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    active: 'bg-[#30d158]/10 text-[#30d158] border-[#30d158]/20',
    trialing: 'bg-[#64d2ff]/10 text-[#64d2ff] border-[#64d2ff]/20',
    past_due: 'bg-[#ff9f0a]/10 text-[#ff9f0a] border-[#ff9f0a]/20',
    canceled: 'bg-white/5 text-white/40 border-white/10',
    unpaid: 'bg-[#ff453a]/10 text-[#ff453a] border-[#ff453a]/20',
  }
  return map[status] || 'bg-white/5 text-white/40 border-white/10'
}

const statusPulseDot = (status: string) => {
  const map: Record<string, string> = {
    active: 'bg-[#30d158] animate-pulse',
    trialing: 'bg-[#64d2ff] animate-pulse',
    past_due: 'bg-[#ff9f0a] animate-pulse',
    canceled: 'bg-white/40',
    unpaid: 'bg-[#ff453a]',
  }
  return map[status] || 'bg-white/40'
}

const filteredSubs = computed(() => {
  if (!props.subscriptions) return []
  if (statusFilter.value === 'all') return props.subscriptions
  return props.subscriptions.filter(s => s.status === statusFilter.value)
})

const totalPages = computed(() => Math.max(1, Math.ceil(props.subscriptionsTotal / props.subscriptionsPageSize)))
const handlePageChange = (page: number) => {
  if (page < 1 || page > totalPages.value) return
  emit('changePage', page)
}

const formatDate = (iso: string) => {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

const handleCancel = async (subId: string, immediate: boolean) => {
  const mode = immediate ? '立即取消' : '周期末取消'
  const detail = immediate
    ? '该操作将：\n1. 立即通过 Stripe 终止订阅\n2. 同步将用户会员方案降级为免费版\n3. 记录管理员审计日志'
    : '该操作将：\n1. 设定在当前周期结束后自动取消\n2. 用户在此周期内仍可正常使用\n3. 记录管理员审计日志'
  if (!confirm(`确定要对该订阅执行「${mode}」吗？\n${detail}`)) return

  cancelLoading.value[subId] = true
  try {
    const res = await $fetch<any>(`/api/admin/subscriptions/${subId}/cancel`, {
      method: 'POST',
      body: { immediate }
    })
    emit('toast', res?.message || `订阅已${mode}`, 'success')
    emit('refresh')
  } catch (e: any) {
    emit('toast', '取消订阅失败: ' + (e.data?.statusMessage || e.message), 'error')
  } finally {
    cancelLoading.value[subId] = false
  }
}
</script>

<template>
  <div class="space-y-8 animate-fade-in text-white">
    <!-- 标题 -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-[28px] font-bold text-white tracking-tight">订阅管理</h1>
        <p class="text-white/40 text-sm mt-1">管理用户周期性计费订阅、查看状态与手动取消操作</p>
      </div>
      <button
        @click="$emit('refresh')"
        :disabled="isLoading"
        class="text-xs bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-full transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
      >
        <span :class="{'animate-spin': isLoading}">🔄</span>
        刷新订阅
      </button>
    </div>

    <!-- 状态筛选栏 -->
    <div class="inline-flex bg-white/[0.02] border border-white/[0.06] p-1 rounded-full shadow-[inset_0_1px_rgba(255,255,255,0.02)]">
      <button
        v-for="s in statusList"
        :key="s"
        @click="statusFilter = s"
        class="text-[10px] font-semibold px-4.5 py-2.5 rounded-full transition-all cursor-pointer focus:outline-none border-0"
        :class="statusFilter === s 
          ? 'bg-white/10 text-white shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_rgba(255,255,255,0.05)]' 
          : 'bg-transparent text-white/60 hover:text-white/90'"
      >
        {{ statusLabel[s] || s }}
      </button>
    </div>

    <!-- 订阅表格 -->
    <div class="bg-white/[0.04] rounded-2xl overflow-hidden shadow-xl shadow-black/20">
      <div class="overflow-x-auto overflow-y-auto max-h-[60vh]">
        <table class="w-full text-left text-sm border-collapse">
          <thead class="sticky top-0 z-10">
            <tr class="border-b border-white/[0.05] text-white/40 uppercase tracking-widest text-[10px] bg-[#0d0d18]/95 backdrop-blur-sm">
              <th class="px-6 py-4 font-semibold font-mono">用户</th>
              <th class="px-6 py-4 font-semibold font-mono">状态</th>
              <th class="px-6 py-4 font-semibold font-mono">价格方案</th>
              <th class="px-6 py-4 font-semibold font-mono">当前周期</th>
              <th class="px-6 py-4 font-semibold font-mono">到期取消</th>
              <th class="px-6 py-4 font-semibold font-mono">创建时间</th>
              <th class="px-6 py-4 font-semibold font-mono">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.04]">
            <tr
              v-for="sub in filteredSubs"
              :key="sub.id"
              class="hover:bg-white/[0.02] transition-colors duration-200"
            >
              <!-- 用户 -->
              <td class="px-6 py-5">
                <div class="text-white/90 font-medium text-sm">{{ sub.user_display_name || '-' }}</div>
                <div class="text-white/35 text-xs font-mono mt-0.5">{{ sub.user_email || sub.user_id.slice(0, 8) }}</div>
              </td>
              <!-- 状态 -->
              <td class="px-6 py-5">
                <span class="text-[10px] px-2.5 py-0.5 rounded-full border inline-flex items-center" :class="statusBadge(sub.status)">
                  <span class="w-1.2 h-1.2 rounded-full mr-1.5" :class="statusPulseDot(sub.status)"></span>
                  {{ statusText[sub.status] || sub.status }}
                </span>
              </td>
              <!-- 价格方案 -->
              <td class="px-6 py-5 font-mono text-xs text-white/60">{{ sub.price_id }}</td>
              <!-- 当前周期 -->
              <td class="px-6 py-5">
                <div class="text-xs text-white/50 font-mono">
                  {{ formatDate(sub.current_period_start) }}
                </div>
                <div class="text-xs text-white/30 font-mono">~ {{ formatDate(sub.current_period_end) }}</div>
              </td>
              <!-- 到期取消 -->
              <td class="px-6 py-5">
                <span v-if="sub.cancel_at_period_end" class="text-[10px] px-2 py-0.5 rounded-full bg-[#ff9f0a]/10 text-[#ff9f0a] border border-[#ff9f0a]/20">是</span>
                <span v-else class="text-white/25 text-xs">否</span>
              </td>
              <!-- 创建时间 -->
              <td class="px-6 py-5 text-white/40 font-mono text-xs">{{ new Date(sub.created_at).toLocaleString() }}</td>
              <!-- 操作 -->
              <td class="px-6 py-5">
                <div v-if="sub.status === 'active' || sub.status === 'trialing'" class="flex items-center gap-2">
                  <button
                    @click="handleCancel(sub.id, false)"
                    :disabled="cancelLoading[sub.id] || sub.cancel_at_period_end"
                    class="text-[11px] font-semibold bg-[#ff9f0a]/10 hover:bg-[#ff9f0a]/20 disabled:opacity-50 disabled:cursor-not-allowed text-[#ff9f0a] px-3 py-1.5 rounded-full border border-[#ff9f0a]/20 transition-all active:scale-[0.93] cursor-pointer focus:outline-none"
                  >
                    {{ sub.cancel_at_period_end ? '已设定' : '周期末取消' }}
                  </button>
                  <button
                    @click="handleCancel(sub.id, true)"
                    :disabled="cancelLoading[sub.id]"
                    class="text-[11px] font-semibold bg-[#ff453a]/10 hover:bg-[#ff453a]/20 disabled:opacity-50 disabled:cursor-not-allowed text-[#ff453a] px-3 py-1.5 rounded-full border border-[#ff453a]/20 transition-all active:scale-[0.93] cursor-pointer focus:outline-none"
                  >
                    {{ cancelLoading[sub.id] ? '处理中...' : '立即取消' }}
                  </button>
                </div>
                <span v-else class="text-white/20 text-xs">-</span>
              </td>
            </tr>
            <tr v-if="!filteredSubs.length">
              <td colspan="7" class="py-12 text-center text-xs text-white/25 font-light">暂无符合条件的订阅记录</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 分页控制栏 -->
    <div v-if="subscriptionsTotal > 0" class="flex items-center justify-between px-5 py-3 bg-white/[0.02] rounded-xl border border-white/[0.04]">
      <div class="text-[11px] text-white/30 font-mono">
        共 {{ subscriptionsTotal }} 条 · 第 {{ subscriptionsPage }}/{{ totalPages }} 页
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="handlePageChange(subscriptionsPage - 1)"
          :disabled="subscriptionsPage <= 1"
          class="text-[11px] font-semibold bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white/80 px-3 py-1.5 rounded-full border border-white/10 transition-all cursor-pointer focus:outline-none"
        >上一页</button>
        <button
          @click="handlePageChange(subscriptionsPage + 1)"
          :disabled="subscriptionsPage >= totalPages"
          class="text-[11px] font-semibold bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white/80 px-3 py-1.5 rounded-full border border-white/10 transition-all cursor-pointer focus:outline-none"
        >下一页</button>
      </div>
    </div>
  </div>
</template>
