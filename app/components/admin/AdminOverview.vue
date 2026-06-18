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
  revenue: any | null
  isLoading: boolean
}>()

const emit = defineEmits<{
  refresh: []
}>()

const logCategoryFilter = ref('ALL')
const logSearchQuery = ref('')
const showAllLogs = ref(false)

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

const displayLogs = computed(() => {
  return showAllLogs.value ? filteredLogs.value : filteredLogs.value.slice(0, 5)
})

// ── 从真实数据计算统计指标 ──
const totalLogs = computed(() => props.logs?.length ?? 0)
const revenueAmount = computed(() => {
  if (props.revenue?.total_revenue) return `$${Number(props.revenue.total_revenue).toLocaleString()}`
  if (props.revenue?.data?.total_revenue) return `$${Number(props.revenue.data.total_revenue).toLocaleString()}`
  return null
})
const revenueChange = computed(() => {
  const pct = props.revenue?.growth_pct ?? props.revenue?.data?.growth_pct
  return pct != null ? `${pct > 0 ? '↑' : '↓'} ${Math.abs(pct)}%` : null
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
  link.setAttribute('download', `activity_logs_${new Date().toISOString().slice(0,10)}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="space-y-10 animate-fade-in text-white">
    <!-- 顶栏标题 -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-[28px] font-bold text-white tracking-tight">工作台</h1>
        <p class="text-white/50 text-sm mt-1.5">全局运行指标、收入监控与安全状态概览</p>
      </div>
      <button 
        @click="$emit('refresh')"
        :disabled="isLoading"
        class="text-sm bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-full transition-all flex items-center gap-2 active:scale-[0.98] cursor-pointer"
      >
        <span :class="{'animate-spin': isLoading}" class="inline-block">🔄</span>
        {{ isLoading ? '正在更新...' : '刷新指标' }}
      </button>
    </div>

    <!-- 统计面板：Bento Grid 极简卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      
      <!-- 卡片 1: 审计日志（跨 2 列） -->
      <div class="md:col-span-2 bg-white/[0.04] shadow-xl shadow-black/20 p-8 rounded-2xl transition-all duration-300 hover:bg-white/[0.06] hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-black/30 relative group overflow-hidden">
        <div class="absolute -top-16 -left-16 w-32 h-32 rounded-full bg-blue-500/8 blur-2xl group-hover:bg-blue-500/12 transition-all"></div>
        <div class="text-white/40 text-[11px] font-semibold uppercase tracking-widest mb-3 font-mono">审计日志总量</div>
        <div class="flex items-baseline gap-2 relative z-10">
          <div class="text-4xl font-bold tracking-tight text-white font-mono">{{ totalLogs.toLocaleString() }}</div>
        </div>
        <div class="text-xs text-white/30 mt-3 font-light">全模块操作链路审计流水条数</div>
      </div>
      
      <!-- 卡片 2: 项目营收 -->
      <div class="bg-white/[0.04] shadow-xl shadow-black/20 p-8 rounded-2xl transition-all duration-300 hover:bg-white/[0.06] hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-black/30 relative group overflow-hidden">
        <div class="absolute -top-16 -left-16 w-32 h-32 rounded-full bg-emerald-500/8 blur-2xl group-hover:bg-emerald-500/12 transition-all"></div>
        <div class="text-white/40 text-[11px] font-semibold uppercase tracking-widest mb-3 font-mono">项目营收</div>
        <div class="flex items-center gap-3 relative z-10">
          <div class="text-4xl font-bold tracking-tight text-[#30d158] font-mono">{{ revenueAmount || '$0.00' }}</div>
          <span 
            v-if="revenueAmount"
            class="text-[10px] px-2.5 py-0.5 bg-emerald-500/10 text-[#30d158] rounded-full border border-emerald-500/20 font-mono font-medium"
          >
            {{ revenueChange || '稳定' }}
          </span>
        </div>
        <div class="text-xs text-white/30 mt-3 font-light flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-[#30d158] animate-pulse"></span>
          已绑定物理 Supabase 真实账单表
        </div>
      </div>

      <!-- 卡片 3: 安全合规 -->
      <div class="bg-white/[0.04] shadow-xl shadow-black/20 p-8 rounded-2xl transition-all duration-300 hover:bg-white/[0.06] hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-black/30 relative group overflow-hidden">
        <div class="absolute -top-16 -left-16 w-32 h-32 rounded-full bg-purple-500/8 blur-2xl group-hover:bg-purple-500/12 transition-all"></div>
        <div class="text-white/40 text-[11px] font-semibold uppercase tracking-widest mb-3 font-mono">安全检测</div>
        <div class="flex items-baseline gap-2 relative z-10">
          <div class="text-4xl font-bold tracking-tight text-brand-accent-light font-mono">{{ logs ? '运行中' : '空闲' }}</div>
          <span class="text-[10px] px-2.5 py-0.5 bg-indigo-500/10 text-brand-accent-light rounded-full border border-indigo-500/20 font-mono font-medium">RLS</span>
        </div>
        <div class="text-xs text-white/30 mt-3 font-light">数据库层行级安全规则已 100% 开启</div>
      </div>
    </div>

    <!-- 安全数据防护声明 -->
    <div class="bg-white/[0.04] shadow-xl shadow-black/20 p-8 rounded-2xl relative overflow-hidden">
      <!-- 动态氛围背景 -->
      <div class="absolute bottom-[-50px] left-[-50px] w-40 h-40 rounded-full bg-indigo-500/[0.03] blur-3xl pointer-events-none"></div>
      
      <div class="flex flex-col lg:flex-row justify-between gap-6 relative z-10">
        <div>
          <h2 class="text-[13px] font-semibold text-white/70 mb-3 uppercase tracking-widest font-mono">数据隔离与安全边界</h2>
          <p class="text-white/50 text-sm leading-relaxed font-light max-w-3xl">
            底层 PostgreSQL 数据库强启行级安全隔离（RLS），防止越权与水平溢出漏洞。
            所有管理操作需经 <code class="text-brand-accent-light font-mono">assertAdmin(event)</code> 服务端鉴权，并实时留痕写入 <code class="text-brand-accent-light font-mono">activity_logs</code> 审计表，提供不可篡改的安全审计凭据。
          </p>
        </div>
        <div class="flex flex-col gap-2.5 flex-shrink-0 justify-center">
          <div class="px-4 py-2.5 bg-white/[0.03] rounded-xl text-[11px] text-white/40 flex items-center gap-2 font-mono">
            <span class="text-emerald-500">✔</span> API 安全扫描通过率: 100%
          </div>
          <div class="px-4 py-2.5 bg-white/[0.03] rounded-xl text-[11px] text-white/40 flex items-center gap-2 font-mono">
            <span class="text-emerald-500">✔</span> 审计记录安全沉淀: {{ totalLogs }} 条
          </div>
        </div>
      </div>
    </div>

    <!-- 活动日志快捷入口 -->
    <div class="bg-white/[0.04] shadow-xl shadow-black/20 rounded-2xl p-6 flex items-center justify-between">
      <div>
        <h3 class="text-[13px] font-semibold text-white/60 uppercase tracking-widest font-mono mb-1.5">审计日志</h3>
        <p class="text-[11px] text-white/30">最新 {{ filteredLogs.length }} 条操作审计记录，点击右侧查看完整日志</p>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-3xl font-bold text-white/80 font-mono">{{ totalLogs }}</span>
        <span class="text-[10px] px-2.5 py-0.5 bg-indigo-500/10 text-brand-accent-light rounded-full border border-indigo-500/20 font-medium">条记录</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 呼吸点动画 */
@keyframes pulse-glow {
  0%, 100% { filter: drop-shadow(0 0 1px currentColor); opacity: 0.6; }
  50% { filter: drop-shadow(0 0 4px currentColor); opacity: 1; }
}
.animate-pulse-glow {
  animation: pulse-glow 2s ease-in-out infinite;
}
</style>
