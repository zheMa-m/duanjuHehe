<script setup lang="ts">
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
  logsTotal: number
  logsPage: number
  logsPageSize: number
  isLoading: boolean
}>()

const emit = defineEmits<{
  refresh: []
  changePage: [page: number]
}>()

const logCategoryFilter = ref('ALL')
const logSearchQuery = ref('')

const totalPages = computed(() => Math.max(1, Math.ceil(props.logsTotal / props.logsPageSize)))
const handlePageChange = (page: number) => {
  if (page < 1 || page > totalPages.value) return
  emit('changePage', page)
}

const filteredLogs = computed(() => {
  if (!props.logs) return []
  return props.logs.filter(log => {
    const matchCategory = logCategoryFilter.value === 'ALL' || log.category === logCategoryFilter.value
    const matchSearch = log.action.toLowerCase().includes(logSearchQuery.value.toLowerCase()) ||
                        (log.metadata?.operator || '').toLowerCase().includes(logSearchQuery.value.toLowerCase()) ||
                        (log.ip || '').toLowerCase().includes(logSearchQuery.value.toLowerCase())
    return matchCategory && matchSearch
  })
})

const exportActivityLogs = () => {
  if (!props.logs) return
  const csvHeaders = 'ID,类型,行为 (Action),用户ID,IP,元数据,时间\n'
  const rows = props.logs.map(log =>
    `"${log.id}","${log.category}","${log.action}","${log.user_id || ''}","${log.ip}","${JSON.stringify(log.metadata || {})}","${new Date(log.created_at).toLocaleString()}"`
  ).join('\n')
  const blob = new Blob(['\uFEFF' + csvHeaders + rows], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `activity_logs_${new Date().toISOString().slice(0, 10)}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="space-y-8 animate-fade-in text-white">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-[28px] font-bold text-white tracking-tight">审计日志</h1>
        <p class="text-white/40 text-sm mt-1">全模块操作链路审计流水，支持搜索、筛选与 CSV 导出</p>
      </div>
      <button
        @click="$emit('refresh')"
        :disabled="isLoading"
        class="text-xs bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-full transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
      >
        <span :class="{ 'animate-spin': isLoading }">
          <span class="i-lucide-refresh-cw text-xs"></span>
        </span>
        {{ isLoading ? '刷新中...' : '刷新' }}
      </button>
    </div>

    <!-- KPI -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="bg-white/[0.04] p-7 rounded-2xl relative group overflow-hidden shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/25 transition-all">
        <div class="absolute -top-12 -left-12 w-24 h-24 rounded-full bg-blue-500/8 blur-2xl"></div>
        <div class="text-white/40 text-[11px] font-semibold uppercase tracking-widest mb-2 font-mono">日志总量</div>
        <div class="text-4xl font-bold tracking-tight text-white font-mono relative z-10">{{ (logs || []).length }}</div>
        <div class="text-xs text-white/30 mt-2">审计日志总量</div>
      </div>
      <div class="bg-white/[0.04] p-7 rounded-2xl relative group overflow-hidden shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/25 transition-all">
        <div class="absolute -top-12 -left-12 w-24 h-24 rounded-full bg-emerald-500/8 blur-2xl"></div>
        <div class="text-white/40 text-[11px] font-semibold uppercase tracking-widest mb-2 font-mono">筛选结果</div>
        <div class="text-4xl font-bold tracking-tight text-indigo-400 font-mono relative z-10">{{ filteredLogs.length }}</div>
        <div class="text-xs text-white/30 mt-2">当前筛选结果</div>
      </div>
      <div class="bg-white/[0.04] p-7 rounded-2xl relative group overflow-hidden shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/25 transition-all">
        <div class="absolute -top-12 -left-12 w-24 h-24 rounded-full bg-purple-500/8 blur-2xl"></div>
        <div class="text-white/40 text-[11px] font-semibold uppercase tracking-widest mb-2 font-mono">日志分类</div>
        <div class="text-4xl font-bold tracking-tight text-[#8b5cf6] font-mono relative z-10">
          {{ new Set((logs || []).map(l => l.category)).size }}
        </div>
        <div class="text-xs text-white/30 mt-2">日志类型数</div>
      </div>
    </div>

    <!-- 日志表格 -->
    <div class="bg-white/[0.04] rounded-2xl overflow-hidden shadow-xl shadow-black/20">
      <div class="px-6 py-5 border-b border-white/[0.06] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/[0.01]">
        <div class="flex items-center gap-3">
          <h2 class="text-xs font-semibold text-white/60 uppercase tracking-widest font-mono">系统审计日志</h2>
          <span class="text-[10px] px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-full border border-indigo-500/20 font-medium animate-pulse">实时流</span>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <input
            v-model="logSearchQuery"
            type="text"
            placeholder="搜索行为/操作者/IP..."
            class="bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] rounded-full px-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/40 transition-all font-light w-44 sm:w-52 placeholder:text-white/20"
          />
          <select
            v-model="logCategoryFilter"
            class="bg-[#141416] border border-white/[0.08] hover:border-white/20 rounded-full px-4 py-2 text-xs text-white/80 focus:outline-none focus:border-indigo-500/40 transition-all font-light cursor-pointer"
          >
            <option value="ALL">全部类型</option>
            <option value="auth">认证 (auth)</option>
            <option value="admin">管理 (admin)</option>
            <option value="system">系统 (system)</option>
          </select>
          <button
            @click="exportActivityLogs"
            class="text-xs bg-gradient-to-r from-indigo-600/10 to-indigo-500/10 hover:from-indigo-600/20 hover:to-indigo-500/20 text-indigo-400 font-semibold px-4 py-2 rounded-full border border-indigo-500/25 transition-all active:scale-[0.98] cursor-pointer"
          >
            <span class="i-lucide-download text-xs mr-1"></span>导出 CSV
          </button>
        </div>
      </div>

      <div class="overflow-x-auto overflow-y-auto max-h-[60vh]">
        <table class="w-full text-left text-sm border-collapse">
          <thead class="sticky top-0 z-10">
            <tr class="border-b border-white/[0.05] text-white/40 uppercase tracking-widest text-[10px] bg-[#0d0d18]/95 backdrop-blur-sm">
              <th class="px-6 py-4 font-semibold font-mono">类型</th>
              <th class="px-6 py-4 font-semibold font-mono">行为 (Action)</th>
              <th class="px-6 py-4 font-semibold font-mono">操作者/用户</th>
              <th class="px-6 py-4 font-semibold font-mono">IP</th>
              <th class="px-6 py-4 font-semibold font-mono">状态</th>
              <th class="px-6 py-4 font-semibold font-mono">触发时间</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.04]">
            <tr v-for="log in filteredLogs" :key="log.id" class="hover:bg-white/[0.02] transition-colors">
              <td class="px-6 py-5">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border"
                  :class="{
                    'bg-indigo-500/10 text-indigo-400 border-indigo-500/20': log.category === 'auth',
                    'bg-[#30d158]/10 text-[#30d158] border-[#30d158]/20': log.category === 'admin',
                    'bg-white/5 text-white/50 border-white/10': log.category === 'system'
                  }">
                  {{ log.category }}
                </span>
              </td>
              <td class="px-6 py-5 font-medium text-white/90 font-mono text-xs">{{ log.action }}</td>
              <td class="px-6 py-5 text-white/60 font-light">{{ log.metadata?.operator || log.user_id || 'system' }}</td>
              <td class="px-6 py-5 text-white/30 font-mono text-xs">{{ log.ip || '-' }}</td>
              <td class="px-6 py-5">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-semibold border inline-flex items-center"
                  :class="{
                    'bg-[#30d158]/10 text-[#30d158] border-[#30d158]/20': log.metadata?.status === 'SUCCESS' || log.metadata?.success === true,
                    'bg-[#ff9f0a]/10 text-[#ff9f0a] border-[#ff9f0a]/20': log.metadata?.status === 'WARNING',
                    'bg-indigo-500/10 text-indigo-400 border-indigo-500/20': log.metadata?.status === 'INFO',
                    'bg-[#ff453a]/10 text-[#ff453a] border-[#ff453a]/20': log.metadata?.status === 'FAILED' || log.metadata?.success === false
                  }">
                  <span class="w-1 h-1 rounded-full mr-1.5 animate-pulse"
                    :class="{
                      'bg-[#30d158]': log.metadata?.status === 'SUCCESS' || log.metadata?.success === true,
                      'bg-[#ff9f0a]': log.metadata?.status === 'WARNING',
                      'bg-indigo-400': log.metadata?.status === 'INFO',
                      'bg-[#ff453a]': log.metadata?.status === 'FAILED' || log.metadata?.success === false
                    }"></span>
                  {{ log.metadata?.status || (log.metadata?.success ? 'SUCCESS' : log.metadata?.success === false ? 'FAILED' : '-') }}
                </span>
              </td>
              <td class="px-6 py-5 text-white/40 font-mono text-xs">{{ new Date(log.created_at).toLocaleTimeString() }}</td>
            </tr>
            <tr v-if="!filteredLogs.length">
              <td colspan="6" class="py-12 text-center text-xs text-white/25 font-light">暂无任何匹配的活动审计日志</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 分页控制栏 -->
    <div v-if="logsTotal > 0" class="flex items-center justify-between px-5 py-3 bg-white/[0.02] rounded-xl border border-white/[0.04]">
      <div class="text-[11px] text-white/30 font-mono">共 {{ logsTotal }} 条 · 第 {{ logsPage }}/{{ totalPages }} 页</div>
      <div class="flex items-center gap-2">
        <button @click="handlePageChange(logsPage - 1)" :disabled="logsPage <= 1" class="text-[11px] font-semibold bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white/80 px-3 py-1.5 rounded-full border border-white/10 transition-all cursor-pointer focus:outline-none">上一页</button>
        <button @click="handlePageChange(logsPage + 1)" :disabled="logsPage >= totalPages" class="text-[11px] font-semibold bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white/80 px-3 py-1.5 rounded-full border border-white/10 transition-all cursor-pointer focus:outline-none">下一页</button>
      </div>
    </div>
  </div>
</template>
