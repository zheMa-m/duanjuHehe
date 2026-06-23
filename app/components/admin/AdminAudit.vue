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
  logsTotal: number
  logsPage: number
  logsPageSize: number
  category: string
  dateFrom: string
  dateTo: string
  isLoading: boolean
  stats: AuditStats | null
}>()

const emit = defineEmits<{
  refresh: []
  changePage: [page: number]
  changeCategory: [category: string]
  changeDateRange: [dateFrom: string, dateTo: string]
}>()

// ── 视图切换 ──
const viewMode = ref<'table' | 'timeline'>('table')
const logCategoryFilter = computed({
  get: () => props.category,
  set: (val: string) => emit('changeCategory', val),
})
const logSearchQuery = ref('')

// ── 日期筛选 ──
const dateFromLocal = ref(props.dateFrom)
const dateToLocal = ref(props.dateTo)
const showDateFilter = ref(false)

watch(() => props.dateFrom, (v) => { dateFromLocal.value = v })
watch(() => props.dateTo, (v) => { dateToLocal.value = v })

const applyDateFilter = () => {
  emit('changeDateRange', dateFromLocal.value, dateToLocal.value)
  showDateFilter.value = false
}
const clearDateFilter = () => {
  dateFromLocal.value = ''
  dateToLocal.value = ''
  emit('changeDateRange', '', '')
  showDateFilter.value = false
}
const hasDateFilter = computed(() => !!props.dateFrom || !!props.dateTo)

// ── 分页 ──
const totalPages = computed(() => Math.max(1, Math.ceil(props.logsTotal / props.logsPageSize)))
const handlePageChange = (page: number) => {
  if (page < 1 || page > totalPages.value) return
  emit('changePage', page)
}

// ── 客户端过滤（搜索） ──
const filteredLogs = computed(() => {
  if (!props.logs) return []
  const q = logSearchQuery.value.toLowerCase().trim()
  if (!q) return props.logs
  return props.logs.filter(log =>
    log.action.toLowerCase().includes(q) ||
    (log.metadata?.operator || '').toLowerCase().includes(q) ||
    (log.ip || '').toLowerCase().includes(q)
  )
})

// ── 聚合统计（由后端 stats API 提供全量数据，非当前页估算） ──
const todayStr = new Date().toISOString().slice(0, 10)
const categoryStats = computed<CategoryStat[]>(() => props.stats?.categoryDistribution || [])
const activeUsers = computed<UserStat[]>(() => props.stats?.topActiveUsers || [])
const todayOps = computed(() => props.stats?.todayCount ?? 0)

// ── 服务端全量导出 ──
const { isExporting, exportCSV } = useExport()
const handleExportFull = async () => {
  try {
    const params: Record<string, string> = {}
    if (props.category !== 'ALL') params.category = props.category
    if (props.dateFrom) params.dateFrom = props.dateFrom
    if (props.dateTo) params.dateTo = props.dateTo
    await exportCSV('/api/admin/audit-logs/export', params, `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`)
  } catch (err: any) {
    console.error('Export failed:', err)
  }
}

// ── 类别标签样式 ──
const getCategoryStyle = (cat: string) => {
  switch (cat) {
    case 'auth': return { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' }
    case 'admin': return { bg: 'bg-[#30d158]/10', text: 'text-[#30d158]', border: 'border-[#30d158]/20' }
    case 'system': return { bg: 'bg-white/5', text: 'text-white/50', border: 'border-white/10' }
    case 'security': return { bg: 'bg-[#ff9f0a]/10', text: 'text-[#ff9f0a]', border: 'border-[#ff9f0a]/20' }
    default: return { bg: 'bg-white/[0.03]', text: 'text-white/40', border: 'border-white/10' }
  }
}

const getStatusStyle = (log: ActivityLog) => {
  const s = log.metadata?.status
  if (s === 'SUCCESS' || log.metadata?.success === true) return { bg: 'bg-[#30d158]/10', text: 'text-[#30d158]', border: 'border-[#30d158]/20', dot: 'bg-[#30d158]' }
  if (s === 'FAILED' || log.metadata?.success === false) return { bg: 'bg-[#ff453a]/10', text: 'text-[#ff453a]', border: 'border-[#ff453a]/20', dot: 'bg-[#ff453a]' }
  if (s === 'WARNING') return { bg: 'bg-[#ff9f0a]/10', text: 'text-[#ff9f0a]', border: 'border-[#ff9f0a]/20', dot: 'bg-[#ff9f0a]' }
  return { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20', dot: 'bg-indigo-400' }
}

const getCategoryIcon = (cat: string) => {
  switch (cat) {
    case 'auth': return 'i-lucide-shield'
    case 'admin': return 'i-lucide-settings'
    case 'system': return 'i-lucide-server'
    case 'security': return 'i-lucide-lock'
    default: return 'i-lucide-activity'
  }
}

const formatTime = (ts: string) => {
  const d = new Date(ts)
  return d.toLocaleTimeString(undefined, { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
const formatDate = (ts: string) => {
  const d = new Date(ts)
  return d.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' })
}
const isToday = (ts: string) => ts?.startsWith(todayStr)
</script>

<template>
  <div class="space-y-8 animate-fade-in text-white">
    <!-- ─── 头部 ─── -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-[28px] font-bold text-white tracking-tight">审计日志</h1>
        <p class="text-white/40 text-sm mt-1">全模块操作链路审计流水，支持时间线/表格双视图、筛选与全量导出</p>
      </div>
      <div class="flex items-center gap-3">
        <!-- 视图切换 -->
        <div class="flex bg-white/[0.03] rounded-full p-0.5 border border-white/[0.06]">
          <button
            @click="viewMode = 'table'"
            class="px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer"
            :class="viewMode === 'table' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/70'"
          >
            <span class="i-lucide-table text-[11px] mr-1" />表格
          </button>
          <button
            @click="viewMode = 'timeline'"
            class="px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer"
            :class="viewMode === 'timeline' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/70'"
          >
            <span class="i-lucide-align-left text-[11px] mr-1" />时间线
          </button>
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
    </div>

    <!-- ─── 聚合统计卡片 ─── -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-5">
      <div class="bg-white/[0.04] p-6 rounded-2xl relative overflow-hidden shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/25 transition-all group">
        <div class="absolute -top-12 -left-12 w-24 h-24 rounded-full bg-blue-500/8 blur-2xl"></div>
        <div class="text-white/40 text-[11px] font-semibold uppercase tracking-widest mb-2 font-mono">日志总量</div>
        <div class="text-4xl font-bold tracking-tight text-white font-mono relative z-10">{{ logsTotal }}</div>
        <div class="text-xs text-white/30 mt-2 flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-[#30d158] animate-pulse"></span>
          审计日志总量
        </div>
      </div>
      <div class="bg-white/[0.04] p-6 rounded-2xl relative overflow-hidden shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/25 transition-all group">
        <div class="absolute -top-12 -left-12 w-24 h-24 rounded-full bg-emerald-500/8 blur-2xl"></div>
        <div class="text-white/40 text-[11px] font-semibold uppercase tracking-widest mb-2 font-mono">今日操作</div>
        <div class="text-4xl font-bold tracking-tight text-[#30d158] font-mono relative z-10">{{ todayOps }}</div>
        <div class="text-xs text-white/30 mt-2 flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-[#30d158]"></span>
          全量统计
        </div>
      </div>
      <div class="bg-white/[0.04] p-6 rounded-2xl relative overflow-hidden shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/25 transition-all group">
        <div class="absolute -top-12 -left-12 w-24 h-24 rounded-full bg-purple-500/8 blur-2xl"></div>
        <div class="text-white/40 text-[11px] font-semibold uppercase tracking-widest mb-2 font-mono">日志分类</div>
        <div class="text-4xl font-bold tracking-tight text-[#8b5cf6] font-mono relative z-10">{{ categoryStats.length }}</div>
        <div class="text-xs text-white/30 mt-2 flex flex-wrap gap-1.5">
          <span v-for="s in categoryStats" :key="s.category"
            class="px-1.5 py-0.5 rounded text-[10px] font-mono border"
            :class="[getCategoryStyle(s.category).bg, getCategoryStyle(s.category).text, getCategoryStyle(s.category).border]"
          >{{ s.category }} {{ s.percentage }}%</span>
        </div>
      </div>
      <div class="bg-white/[0.04] p-6 rounded-2xl relative overflow-hidden shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/25 transition-all group">
        <div class="absolute -top-12 -left-12 w-24 h-24 rounded-full bg-amber-500/8 blur-2xl"></div>
        <div class="text-white/40 text-[11px] font-semibold uppercase tracking-widest mb-2 font-mono">活跃操作者 Top 5</div>
        <div class="relative z-10 space-y-1 mt-1">
          <div v-for="u in activeUsers" :key="u.operator" class="flex items-center justify-between text-xs">
            <span class="text-white/70 truncate max-w-[100px]">{{ u.operator }}</span>
            <span class="text-white/40 font-mono ml-2">{{ u.count }} 次</span>
          </div>
          <div v-if="!activeUsers.length" class="text-xs text-white/25">暂无数据</div>
        </div>
      </div>
    </div>

    <!-- ─── 筛选栏 ─── -->
    <div class="bg-white/[0.04] rounded-2xl shadow-xl shadow-black/20">
      <div class="px-6 py-4 border-b border-white/[0.06] flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white/[0.01]">
        <div class="flex items-center gap-3">
          <h2 class="text-xs font-semibold text-white/60 uppercase tracking-widest font-mono">系统审计日志</h2>
          <span v-if="hasDateFilter" class="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20 font-medium">已筛选</span>
          <span v-else class="text-[10px] px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-full border border-indigo-500/20 font-medium animate-pulse">实时流</span>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <input
            v-model="logSearchQuery"
            type="text"
            placeholder="搜索行为/操作者/IP..."
            class="bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] rounded-full px-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/40 transition-all font-light w-36 sm:w-44 placeholder:text-white/20"
          />
          <select
            v-model="logCategoryFilter"
            class="bg-[#141416] border border-white/[0.08] hover:border-white/20 rounded-full px-3 py-2 text-xs text-white/80 focus:outline-none focus:border-indigo-500/40 transition-all font-light cursor-pointer"
          >
            <option value="ALL">全部类型</option>
            <option value="auth">认证 (auth)</option>
            <option value="admin">管理 (admin)</option>
            <option value="system">系统 (system)</option>
            <option value="security">安全 (security)</option>
          </select>

          <!-- 日期筛选 -->
          <div class="relative">
            <button
              @click="showDateFilter = !showDateFilter"
              class="text-xs bg-white/[0.03] hover:bg-white/[0.06] text-white/60 px-3 py-2 rounded-full border border-white/[0.08] transition-all cursor-pointer flex items-center gap-1.5"
              :class="{ 'border-indigo-500/40 text-indigo-400 bg-indigo-500/5': hasDateFilter }"
            >
              <span class="i-lucide-calendar text-[11px]" />
              <span>{{ hasDateFilter ? `${props.dateFrom || '起始'} ~ ${props.dateTo || '结束'}` : '日期筛选' }}</span>
              <span v-if="hasDateFilter" @click.stop="clearDateFilter" class="i-lucide-x text-[10px] ml-1 hover:text-white cursor-pointer"></span>
            </button>
            <Transition name="dropdown">
              <div v-if="showDateFilter" class="absolute right-0 top-full mt-2 z-50 bg-[#0e0e11] border border-white/[0.08] rounded-xl p-4 shadow-xl shadow-black/40 min-w-[240px]">
                <div class="space-y-3">
                  <div>
                    <label class="text-[10px] text-white/40 font-mono block mb-1">起始日期</label>
                    <input v-model="dateFromLocal" type="date" class="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/40" />
                  </div>
                  <div>
                    <label class="text-[10px] text-white/40 font-mono block mb-1">结束日期</label>
                    <input v-model="dateToLocal" type="date" class="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/40" />
                  </div>
                  <div class="flex gap-2 pt-1">
                    <button @click="clearDateFilter" class="flex-1 text-xs bg-white/[0.04] hover:bg-white/[0.08] text-white/60 py-2 rounded-lg transition-all cursor-pointer">清除</button>
                    <button @click="applyDateFilter" class="flex-1 text-xs bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 py-2 rounded-lg transition-all cursor-pointer font-medium">应用</button>
                  </div>
                </div>
              </div>
            </Transition>
          </div>

          <!-- 导出按钮 -->
          <button
            @click="handleExportFull"
            :disabled="isExporting"
            class="text-xs bg-gradient-to-r from-indigo-600/10 to-indigo-500/10 hover:from-indigo-600/20 hover:to-indigo-500/20 text-indigo-400 font-semibold px-4 py-2 rounded-full border border-indigo-500/25 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            <span :class="isExporting ? 'i-lucide-loader animate-spin' : 'i-lucide-download'" class="text-xs mr-1"></span>
            {{ isExporting ? '导出中...' : '导出 CSV' }}
          </button>
        </div>
      </div>

      <!-- ─── 表格视图 ─── -->
      <div v-if="viewMode === 'table'" class="overflow-x-auto overflow-y-auto max-h-[60vh]">
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
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border inline-flex items-center gap-1"
                  :class="[getCategoryStyle(log.category).bg, getCategoryStyle(log.category).text, getCategoryStyle(log.category).border]">
                  <span :class="getCategoryIcon(log.category)" class="text-[9px]" />
                  {{ log.category }}
                </span>
              </td>
              <td class="px-6 py-5 font-medium text-white/90 font-mono text-xs">{{ log.action }}</td>
              <td class="px-6 py-5 text-white/60 font-light">{{ log.metadata?.operator || log.user_id || 'system' }}</td>
              <td class="px-6 py-5 text-white/30 font-mono text-xs">{{ log.ip || '-' }}</td>
              <td class="px-6 py-5">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-semibold border inline-flex items-center"
                  :class="[getStatusStyle(log).bg, getStatusStyle(log).text, getStatusStyle(log).border]">
                  <span class="w-1 h-1 rounded-full mr-1.5" :class="getStatusStyle(log).dot"></span>
                  {{ log.metadata?.status || (log.metadata?.success ? 'SUCCESS' : log.metadata?.success === false ? 'FAILED' : '-') }}
                </span>
              </td>
              <td class="px-6 py-5 text-white/40 font-mono text-xs">
                <span :class="{ 'text-[#30d158]': isToday(log.created_at) }">{{ formatDate(log.created_at) }} {{ formatTime(log.created_at) }}</span>
              </td>
            </tr>
            <tr v-if="!filteredLogs.length">
              <td colspan="6" class="py-12 text-center text-xs text-white/25 font-light">
                <span class="i-lucide-inbox text-xl mb-2 block opacity-30"></span>
                暂无任何匹配的活动审计日志
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ─── 时间线视图 ─── -->
      <div v-else class="max-h-[60vh] overflow-y-auto p-6 space-y-2">
        <div v-if="filteredLogs.length === 0" class="py-12 text-center text-xs text-white/25 font-light">
          <span class="i-lucide-inbox text-xl mb-2 block opacity-30"></span>
          暂无任何匹配的活动审计日志
        </div>
        <template v-for="(log, idx) in filteredLogs" :key="log.id">
          <div class="relative flex gap-4 group">
            <!-- 时间线竖线 + 节点 -->
            <div class="flex flex-col items-center flex-shrink-0">
              <div
                class="w-2.5 h-2.5 rounded-full border-2 z-10 mt-1.5 transition-all group-hover:scale-125"
                :class="{
                  'border-indigo-400 bg-indigo-500/20': log.category === 'auth',
                  'border-[#30d158] bg-[#30d158]/20': log.category === 'admin',
                  'border-white/30 bg-white/10': log.category === 'system',
                  'border-[#ff9f0a] bg-[#ff9f0a]/20': log.category === 'security',
                }"
              ></div>
              <div v-if="idx < filteredLogs.length - 1" class="w-px flex-1 min-h-[20px] bg-white/[0.06] group-hover:bg-white/10 transition-colors"></div>
            </div>
            <!-- 内容卡片 -->
            <div class="flex-1 pb-6">
              <div class="bg-white/[0.03] hover:bg-white/[0.05] rounded-xl p-4 border border-white/[0.04] hover:border-white/[0.08] transition-all cursor-default">
                <div class="flex items-start justify-between gap-3">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold border inline-flex items-center gap-1 flex-shrink-0"
                      :class="[getCategoryStyle(log.category).bg, getCategoryStyle(log.category).text, getCategoryStyle(log.category).border]">
                      <span :class="getCategoryIcon(log.category)" class="text-[9px]" />
                      {{ log.category }}
                    </span>
                    <span class="font-mono text-xs font-medium text-white/90 truncate">{{ log.action }}</span>
                  </div>
                  <div class="flex items-center gap-2 flex-shrink-0">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold border inline-flex items-center"
                      :class="[getStatusStyle(log).bg, getStatusStyle(log).text, getStatusStyle(log).border]">
                      <span class="w-1 h-1 rounded-full mr-1" :class="getStatusStyle(log).dot"></span>
                      {{ log.metadata?.status || (log.metadata?.success ? 'SUCCESS' : '-') }}
                    </span>
                  </div>
                </div>
                <div class="flex items-center gap-4 mt-2 text-xs text-white/35">
                  <span class="flex items-center gap-1">
                    <span class="i-lucide-user text-[10px]" />
                    {{ log.metadata?.operator || log.user_id || 'system' }}
                  </span>
                  <span v-if="log.ip" class="flex items-center gap-1">
                    <span class="i-lucide-globe text-[10px]" />
                    {{ log.ip }}
                  </span>
                  <span class="flex items-center gap-1 ml-auto">
                    <span class="i-lucide-clock text-[10px]" />
                    <span :class="{ 'text-[#30d158]': isToday(log.created_at) }">{{ formatDate(log.created_at) }} {{ formatTime(log.created_at) }}</span>
                  </span>
                </div>
                <!-- 展开元数据 -->
                <div v-if="log.metadata && Object.keys(log.metadata).length > 0" class="mt-2 pt-2 border-t border-white/[0.04]">
                  <details class="group">
                    <summary class="text-[10px] text-white/25 hover:text-white/50 cursor-pointer flex items-center gap-1 font-mono">
                      <span class="i-lucide-chevron-right text-[10px] transition-transform group-open:rotate-90"></span>
                      元数据
                    </summary>
                    <pre class="mt-1 text-[10px] text-white/30 font-mono overflow-x-auto whitespace-pre-wrap">{{ JSON.stringify(log.metadata, null, 2) }}</pre>
                  </details>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- ─── 分页控制栏 ─── -->
    <div v-if="logsTotal > 0" class="flex items-center justify-between px-5 py-3 bg-white/[0.02] rounded-xl border border-white/[0.04]">
      <div class="text-[11px] text-white/30 font-mono">共 {{ logsTotal }} 条 · 第 {{ logsPage }}/{{ totalPages }} 页</div>
      <div class="flex items-center gap-2">
        <button @click="handlePageChange(logsPage - 1)" :disabled="logsPage <= 1" class="text-[11px] font-semibold bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white/80 px-3 py-1.5 rounded-full border border-white/10 transition-all cursor-pointer focus:outline-none">上一页</button>
        <button @click="handlePageChange(logsPage + 1)" :disabled="logsPage >= totalPages" class="text-[11px] font-semibold bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white/80 px-3 py-1.5 rounded-full border border-white/10 transition-all cursor-pointer focus:outline-none">下一页</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dropdown-enter-active { transition: opacity 0.15s ease, transform 0.15s cubic-bezier(0.16,1,0.3,1); }
.dropdown-leave-active { transition: opacity 0.1s ease, transform 0.1s ease; }
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: translateY(-4px) scale(0.97); }
</style>
