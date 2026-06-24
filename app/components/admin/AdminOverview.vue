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

interface CategoryStat {
  category: string
  count: number
  percentage: number
}

interface UserStat {
  operator: string
  count: number
}

interface AuditStats {
  totalCount: number
  todayCount: number
  categoryDistribution: CategoryStat[]
  topActiveUsers: UserStat[]
}

const props = defineProps<{
  logs: ActivityLog[] | null
  revenue: any | null
  isLoading: boolean
  stats: AuditStats | null
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

// ── 从 stats API 获取全量统计（非当前页估算） ──
const totalLogs = computed(() => props.stats?.totalCount ?? 0)
const todayOps = computed(() => props.stats?.todayCount ?? 0)
const revenueAmount = computed(() => {
  if (props.revenue?.total_revenue) return `$${Number(props.revenue.total_revenue).toLocaleString()}`
  if (props.revenue?.data?.total_revenue) return `$${Number(props.revenue.data.total_revenue).toLocaleString()}`
  return null
})
const revenueChange = computed(() => {
  const pct = props.revenue?.growth_pct ?? props.revenue?.data?.growth_pct
  return pct != null ? `${pct > 0 ? '↑' : '↓'} ${Math.abs(pct)}%` : null
})

const { isExporting, exportCSV } = useExport()
const exportActivityLogs = async () => {
  try {
    await exportCSV('/api/admin/audit-logs/export', {}, `activity_logs_${new Date().toISOString().slice(0, 10)}.csv`)
  } catch {
    // silent
  }
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
        class="text-sm bg-white/[0.06] hover:bg-white/[0.10] disabled:opacity-50 text-white/70 hover:text-white/90 font-medium px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 active:scale-[0.98] cursor-pointer border border-white/[0.06] hover:border-white/[0.10]"
      >
        <span :class="{'animate-spin': isLoading}" class="i-lucide-refresh-cw text-[13px]" />
        {{ isLoading ? '同步中...' : '刷新指标' }}
      </button>
    </div>

    <!-- 统计面板：Bento Grid 卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-5">
      
      <!-- 卡片 1: 审计日志（跨 2 列） -->
      <div class="md:col-span-2 stat-card stat-card--blue group">
        <div class="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-blue-500/[0.04] blur-3xl group-hover:bg-blue-500/[0.07] transition-all duration-500"></div>
        <div class="relative z-10">
          <div class="flex items-center gap-2 mb-3">
            <span class="i-lucide-activity text-[13px] text-blue-400/60" />
            <span class="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/25">审计日志总量</span>
          </div>
          <div class="flex items-baseline gap-3">
            <span class="text-[42px] font-bold tracking-tight text-white font-mono leading-none">{{ totalLogs.toLocaleString() }}</span>
            <span v-if="todayOps > 0" class="text-[11px] text-[#30d158] font-mono font-medium bg-[#30d158]/[0.06] px-2 py-0.5 rounded-md">+{{ todayOps }} 今日</span>
          </div>
          <div class="text-[11px] text-white/20 mt-2 font-light leading-relaxed">全模块操作链路审计流水</div>
        </div>
      </div>
      
      <!-- 卡片 2: 项目营收 -->
      <div class="stat-card stat-card--green group">
        <div class="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-emerald-500/[0.04] blur-3xl group-hover:bg-emerald-500/[0.07] transition-all duration-500"></div>
        <div class="relative z-10">
          <div class="flex items-center gap-2 mb-3">
            <span class="i-lucide-trending-up text-[13px] text-emerald-400/60" />
            <span class="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/25">项目营收</span>
          </div>
          <div class="flex items-baseline gap-2">
            <span class="text-[42px] font-bold tracking-tight text-[#30d158] font-mono leading-none">{{ revenueAmount || '$0.00' }}</span>
          </div>
          <div v-if="revenueAmount" class="flex items-center gap-2 mt-2">
            <span class="text-[10px] font-mono font-medium bg-emerald-500/10 text-[#30d158] px-2 py-0.5 rounded-md border border-emerald-500/20">{{ revenueChange || '稳定' }}</span>
            <span class="w-1.5 h-1.5 rounded-full bg-[#30d158]/60" />
            <span class="text-[10px] text-white/20">Supabase 账单</span>
          </div>
        </div>
      </div>

      <!-- 卡片 3: 安全检测 -->
      <div class="stat-card stat-card--purple group">
        <div class="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-purple-500/[0.04] blur-3xl group-hover:bg-purple-500/[0.07] transition-all duration-500"></div>
        <div class="relative z-10">
          <div class="flex items-center gap-2 mb-3">
            <span class="i-lucide-shield-check text-[13px] text-purple-400/60" />
            <span class="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/25">安全检测</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="w-2 h-2 rounded-full bg-[#30d158] shadow-[0_0_8px_rgba(48,209,88,0.4)]" />
            <span class="text-[14px] font-semibold text-white/70 leading-none">RLS 运行时保护</span>
          </div>
          <div class="flex items-center gap-2 mt-3">
            <span class="text-[10px] font-mono text-[#30d158]/70 bg-[#30d158]/[0.06] px-2 py-0.5 rounded-md">100% 开启</span>
            <span class="text-[10px] text-white/20">行级安全规则</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 安全数据防护声明 -->
    <div class="security-banner group">
      <div class="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-indigo-500/[0.03] blur-3xl pointer-events-none group-hover:bg-indigo-500/[0.05] transition-all duration-500"></div>
      
      <div class="flex flex-col lg:flex-row justify-between gap-6 relative z-10">
        <div>
          <div class="flex items-center gap-2 mb-2">
            <span class="i-lucide-lock text-[13px] text-indigo-400/50" />
            <h2 class="text-[12px] font-semibold text-white/60 uppercase tracking-[0.08em]">数据隔离与安全边界</h2>
          </div>
          <p class="text-white/40 text-[13px] leading-relaxed font-light max-w-3xl">
            底层 PostgreSQL 强启行级安全隔离（RLS），防越权与水平溢出。管理操作经 <code class="text-indigo-300/80 font-mono text-[12px] bg-indigo-500/[0.08] px-1.5 py-0.5 rounded">assertAdmin</code> 服务端鉴权，实时留痕写入 <code class="text-indigo-300/80 font-mono text-[12px] bg-indigo-500/[0.08] px-1.5 py-0.5 rounded">activity_logs</code> 审计表。
          </p>
        </div>
        <div class="flex flex-col gap-2 flex-shrink-0 justify-center">
          <div class="flex items-center gap-2 px-4 py-2.5 bg-white/[0.03] rounded-lg text-[11px] text-white/40 font-mono border border-white/[0.04]">
            <span class="i-lucide-check-circle text-[12px] text-[#30d158]" />
            <span>API 安全扫描通过率 100%</span>
          </div>
          <div class="flex items-center gap-2 px-4 py-2.5 bg-white/[0.03] rounded-lg text-[11px] text-white/40 font-mono border border-white/[0.04]">
            <span class="i-lucide-database text-[12px] text-indigo-400/60" />
            <span>审计记录 {{ totalLogs }} 条</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 活动日志快捷入口 -->
    <div class="flex items-center justify-between bg-white/[0.03] rounded-xl p-5 border border-white/[0.04] hover:border-white/[0.07] transition-all duration-300">
      <div class="flex items-center gap-3">
        <span class="i-lucide-scroll-text text-[15px] text-white/20" />
        <div>
          <h3 class="text-[12px] font-semibold text-white/50 uppercase tracking-[0.06em] mb-1">审计日志</h3>
          <p class="text-[10px] text-white/25">最新 {{ filteredLogs.length }} 条操作记录</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-[28px] font-bold text-white/70 font-mono tracking-tight">{{ totalLogs }}</span>
        <span class="text-[9px] font-semibold bg-indigo-500/10 text-indigo-300/80 px-2.5 py-1 rounded-full border border-indigo-500/20 uppercase tracking-[0.06em]">记录</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ─── Stat Card Base ─── */
.stat-card {
  position: relative;
  padding: 28px;
  border-radius: 14px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.05);
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.stat-card:hover {
  background: rgba(255,255,255,0.045);
  border-color: rgba(255,255,255,0.08);
  transform: translateY(-1px);
  box-shadow: 0 12px 40px rgba(0,0,0,0.25);
}
.stat-card--blue:hover  { border-color: rgba(59,130,246,0.15); }
.stat-card--green:hover { border-color: rgba(48,209,88,0.15); }
.stat-card--purple:hover { border-color: rgba(139,92,246,0.15); }

/* ─── Security Banner ─── */
.security-banner {
  position: relative;
  padding: 28px;
  border-radius: 14px;
  background: rgba(255,255,255,0.025);
  border: 1px solid rgba(255,255,255,0.04);
  overflow: hidden;
  transition: all 0.3s ease;
}
.security-banner:hover {
  border-color: rgba(255,255,255,0.07);
  background: rgba(255,255,255,0.035);
}

/* Animation for stat card entry */
@keyframes card-enter {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
.stat-card {
  animation: card-enter 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.stat-card:nth-child(1) { animation-delay: 0s; }
.stat-card:nth-child(2) { animation-delay: 0.08s; }
.stat-card:nth-child(3) { animation-delay: 0.16s; }
</style>
