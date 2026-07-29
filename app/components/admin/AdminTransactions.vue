<script setup lang="ts">
defineProps<{ isLoading: boolean }>()
const emit = defineEmits<{ refresh: []; toast: [msg: string, type: 'success' | 'error' | 'info'] }>()

const transactions = ref<any[]>([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const typeFilter = ref('')
const searchQuery = ref('')

const typeLabels: Record<string, string> = { earn: '广告赚取', purchase: '购买', spend: '解锁消费', refund: '退款', bonus: '赠送' }
const typeBadge = (t: string) => {
  const map: Record<string, string> = {
    earn: 'bg-[#30d158]/10 text-[#30d158] border-[#30d158]/20',
    purchase: 'bg-[#64d2ff]/10 text-[#64d2ff] border-[#64d2ff]/20',
    spend: 'bg-[#ff9f0a]/10 text-[#ff9f0a] border-[#ff9f0a]/20',
    refund: 'bg-[#ff453a]/10 text-[#ff453a] border-[#ff453a]/20',
    bonus: 'bg-[#bf5af2]/10 text-[#bf5af2] border-[#bf5af2]/20',
  }
  return map[t] || 'bg-white/[0.04] text-white/30 border-white/[0.06]'
}

async function fetchData() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    params.set('page', String(page.value)); params.set('pageSize', String(pageSize.value))
    if (typeFilter.value) params.set('type', typeFilter.value)
    const res = await $fetch<any>(`/api/admin/transactions?${params}`)
    transactions.value = res.data?.items || []
    total.value = res.data?.pagination?.total || 0
  } catch (e: any) { emit('toast', 'Failed to load: ' + (e.message || 'Error'), 'error') }
  finally { loading.value = false }
}

function changePage(p: number) { page.value = p; fetchData() }

onMounted(() => fetchData())
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-white/90 text-lg font-semibold">金币交易流水</h2>
      <div class="flex gap-2">
        <select v-model="typeFilter" @change="page = 1; fetchData()" class="bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white/70 outline-none">
          <option value="">全部类型</option>
          <option value="purchase">购买</option>
          <option value="spend">解锁消费</option>
          <option value="earn">广告赚取</option>
          <option value="bonus">赠送</option>
          <option value="refund">退款</option>
        </select>
        <button @click="fetchData" class="px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/50 text-sm hover:text-white/80 transition flex items-center gap-2">
          <span class="i-lucide-refresh-cw text-xs" :class="{ 'animate-spin': loading }" /> 刷新
        </button>
      </div>
    </div>

    <div class="bg-white/[0.04] rounded-2xl overflow-hidden shadow-xl shadow-black/20">
      <div class="overflow-x-auto max-h-[60vh]">
        <table class="w-full text-left text-sm border-collapse">
          <thead class="sticky top-0 z-10 bg-[#0d0d18]/95 backdrop-blur-sm">
            <tr>
              <th class="px-5 py-3 text-white/40 uppercase tracking-widest text-[10px] font-semibold font-mono">用户</th>
              <th class="px-5 py-3 text-white/40 uppercase tracking-widest text-[10px] font-semibold font-mono">类型</th>
              <th class="px-5 py-3 text-white/40 uppercase tracking-widest text-[10px] font-semibold font-mono">金额</th>
              <th class="px-5 py-3 text-white/40 uppercase tracking-widest text-[10px] font-semibold font-mono">余额</th>
              <th class="px-5 py-3 text-white/40 uppercase tracking-widest text-[10px] font-semibold font-mono">描述</th>
              <th class="px-5 py-3 text-white/40 uppercase tracking-widest text-[10px] font-semibold font-mono">时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="tx in transactions" :key="tx.id" class="border-b border-white/[0.04] hover:bg-white/[0.02] transition">
              <td class="px-5 py-3 text-white/50 font-mono text-xs">{{ tx.user_id?.slice(0, 12) }}...</td>
              <td class="px-5 py-3">
                <span class="inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full border" :class="typeBadge(tx.type)">{{ typeLabels[tx.type] || tx.type }}</span>
              </td>
              <td class="px-5 py-3 font-mono" :class="tx.amount >= 0 ? 'text-green-400' : 'text-red-400'">{{ tx.amount >= 0 ? '+' : '' }}{{ tx.amount }}</td>
              <td class="px-5 py-3 text-white/60 font-mono">{{ tx.balance_after?.toLocaleString() }}</td>
              <td class="px-5 py-3 text-white/50 text-xs max-w-[200px] truncate">{{ tx.description }}</td>
              <td class="px-5 py-3 text-white/40 text-xs">{{ new Date(tx.created_at).toLocaleString('zh-CN') }}</td>
            </tr>
            <tr v-if="transactions.length === 0 && !loading">
              <td colspan="6" class="px-5 py-10 text-center text-white/25">暂无交易记录</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="total > pageSize" class="flex items-center justify-between px-5 py-3 bg-white/[0.02] border-t border-white/[0.04]">
        <span class="text-white/30 text-xs">共 {{ total }} 条</span>
        <div class="flex gap-2">
          <button @click="changePage(page - 1)" :disabled="page <= 1" class="px-3 py-1 rounded-lg bg-white/5 text-white/50 text-xs hover:bg-white/10 disabled:opacity-30 transition">上一页</button>
          <span class="text-white/40 text-xs px-2 py-1">{{ page }} / {{ Math.ceil(total / pageSize) }}</span>
          <button @click="changePage(page + 1)" :disabled="page >= Math.ceil(total / pageSize)" class="px-3 py-1 rounded-lg bg-white/5 text-white/50 text-xs hover:bg-white/10 disabled:opacity-30 transition">下一页</button>
        </div>
      </div>
    </div>
  </div>
</template>
