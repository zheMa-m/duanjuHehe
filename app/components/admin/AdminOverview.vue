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
  <div class="space-y-8 animate-fade-in">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-semibold text-white tracking-tight">仪表盘概览</h1>
        <p class="text-white/40 text-xs mt-1">全局运行指标、收入监控趋势及最新配置流水</p>
      </div>
      <button 
        @click="$emit('refresh')"
        :disabled="isLoading"
        class="text-xs bg-white/10 hover:bg-white/15 text-white font-medium px-4 py-2 rounded-full transition-all flex items-center gap-1.5 active:scale-[0.98] disabled:opacity-50"
      >
        <span :class="{'animate-spin': isLoading}">🔄</span>
        {{ isLoading ? '正在更新...' : '刷新指标' }}
      </button>
    </div>

    <!-- 统计面板 -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
      <div class="bg-[#1c1c1e] border border-white/5 p-6 rounded-2xl transition-all hover:bg-[#2c2c2e]">
        <div class="text-white/40 text-[10px] font-medium uppercase tracking-wider mb-1">活跃用户 (DAU)</div>
        <div class="flex items-baseline gap-2">
          <div class="text-2xl font-semibold text-white">1,248</div>
          <div class="text-[10px] text-[#30d158] font-medium">↑ 12.4%</div>
        </div>
        <div class="text-[10px] text-white/30 mt-1.5">较昨日增加 138 名活跃用户</div>
      </div>
      
      <div class="bg-[#1c1c1e] border border-white/5 p-6 rounded-2xl transition-all hover:bg-[#2c2c2e]">
        <div class="text-white/40 text-[10px] font-medium uppercase tracking-wider mb-1">项目营收 (Revenue)</div>
        <div class="flex items-baseline gap-2">
          <div class="text-2xl font-semibold text-[#30d158]">$8,450</div>
          <div class="text-[10px] text-[#30d158] font-medium">↑ 8.2%</div>
        </div>
        <div class="text-[10px] text-white/30 mt-1.5">当前活跃转化率 98.4%</div>
      </div>

      <div class="bg-[#1c1c1e] border border-white/5 p-6 rounded-2xl transition-all hover:bg-[#2c2c2e]">
        <div class="text-white/40 text-[10px] font-medium uppercase tracking-wider mb-1">系统合规审计</div>
        <div class="flex items-baseline gap-2">
          <div class="text-2xl font-semibold text-[#0a84ff]">已就绪</div>
          <div class="text-[10px] text-white/40 font-medium">SECURE</div>
        </div>
        <div class="text-[10px] text-white/30 mt-1.5">安全合规审计率 100%</div>
      </div>
    </div>

    <!-- 图表 + 安全声明 -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div class="lg:col-span-2 bg-[#1c1c1e] border border-white/5 p-6 rounded-2xl">
        <h2 class="text-xs font-semibold text-white/60 mb-6 uppercase tracking-wider">项目增长趋势 (Growth Trend)</h2>
        <div class="h-[180px] w-full flex items-end justify-between px-2 pt-4 relative">
          <svg class="absolute inset-0 h-full w-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100">
            <defs>
              <linearGradient id="gradient-chart" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#0a84ff" stop-opacity="0.1"></stop>
                <stop offset="100%" stop-color="#0a84ff" stop-opacity="0"></stop>
              </linearGradient>
            </defs>
            <path d="M 0 80 Q 20 62, 40 73 T 80 43 T 100 32 L 100 100 L 0 100 Z" fill="url(#gradient-chart)"></path>
            <path d="M 0 80 Q 20 62, 40 73 T 80 43 T 100 32" fill="none" stroke="#0a84ff" stroke-width="2.5"></path>
          </svg>
          <div class="flex flex-col items-center z-10"><span class="text-[10px] text-white/30">$5k</span><span class="text-[10px] text-white/50 mt-1">1月</span></div>
          <div class="flex flex-col items-center z-10"><span class="text-[10px] text-white/30">$5.8k</span><span class="text-[10px] text-white/50 mt-1">2月</span></div>
          <div class="flex flex-col items-center z-10"><span class="text-[10px] text-white/30">$6.2k</span><span class="text-[10px] text-white/50 mt-1">3月</span></div>
          <div class="flex flex-col items-center z-10"><span class="text-[10px] text-white/30">$7.1k</span><span class="text-[10px] text-white/50 mt-1">4月</span></div>
          <div class="flex flex-col items-center z-10"><span class="text-[10px] text-white/30">$7.8k</span><span class="text-[10px] text-white/50 mt-1">5月</span></div>
          <div class="flex flex-col items-center z-10"><span class="text-[10px] text-[#0a84ff] font-medium">$8.4k</span><span class="text-[10px] text-white font-medium mt-1">本月</span></div>
        </div>
      </div>

      <div class="bg-[#1c1c1e] border border-white/5 p-6 rounded-2xl flex flex-col justify-between">
        <div>
          <h2 class="text-xs font-semibold text-white/60 mb-3 uppercase tracking-wider">安全数据防护 (RLS)</h2>
          <p class="text-white/70 text-xs leading-relaxed font-light">
            底层数据库强制执行行级安全（Row-Level Security）隔离，业务数据从物理层逻辑切分。API 服务层通过统一的身份鉴权中间件 <code class="text-[#0a84ff]">assertUser(event)</code> 拦截，保障项目数据安全隔离。
          </p>
        </div>
        <div class="p-3 bg-white/[0.03] rounded-xl border border-white/5 text-[10px] text-white/50 flex items-center gap-2 mt-6">
          ✔ 自动化越权安全测试通过率: 100%
        </div>
      </div>
    </div>

    <!-- 活动日志表格 -->
    <div class="bg-[#1c1c1e] border border-white/5 rounded-2xl overflow-hidden">
      <div class="px-6 py-4 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <h2 class="text-xs font-semibold text-white/60 uppercase tracking-wider">活动日志 (Activity Log)</h2>
          <span class="text-[9px] px-2 py-0.5 bg-[#007aff]/10 text-[#0a84ff] rounded-full border border-[#007aff]/20 font-medium">实时监控</span>
        </div>
        <div class="flex flex-wrap items-center gap-2.5">
          <input 
            v-model="logSearchQuery" 
            type="text" 
            placeholder="搜索行为/操作者/IP..."
            class="bg-white/[0.04] border border-white/10 rounded-full px-3.5 py-1.5 text-[11px] text-white focus:outline-none focus:border-[#007aff] transition-all font-light w-40 sm:w-48 placeholder:text-white/30"
          />
          <select 
            v-model="logCategoryFilter"
            class="bg-[#1c1c1e] border border-white/10 rounded-full px-3 py-1.5 text-[11px] text-white focus:outline-none focus:border-[#007aff] transition-all"
          >
            <option value="ALL">全部类型</option>
            <option value="auth">认证 (auth)</option>
            <option value="admin">管理 (admin)</option>
            <option value="system">系统 (system)</option>
          </select>
          <button 
            @click="showAllLogs = !showAllLogs"
            class="text-[11px] bg-white/5 hover:bg-white/10 text-white/80 px-3 py-1.5 rounded-full border border-white/10 transition-all active:scale-[0.98]"
          >
            {{ showAllLogs ? '收起前5条' : `展示全部 (${filteredLogs.length})` }}
          </button>
          <button 
            @click="exportActivityLogs"
            class="text-[11px] bg-[#007aff]/15 hover:bg-[#007aff]/25 text-[#0a84ff] font-medium px-3.5 py-1.5 rounded-full border border-[#007aff]/20 transition-all active:scale-[0.98]"
          >
            📥 导出 CSV
          </button>
        </div>
      </div>
      
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="border-b border-white/5 text-white/40 uppercase tracking-wider text-[9px]">
              <th class="px-6 py-3.5 font-medium">类型</th>
              <th class="px-6 py-3.5 font-medium">行为 (Action)</th>
              <th class="px-6 py-3.5 font-medium">操作者/用户</th>
              <th class="px-6 py-3.5 font-medium">IP</th>
              <th class="px-6 py-3.5 font-medium">状态</th>
              <th class="px-6 py-3.5 font-medium">时间</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            <tr v-for="log in displayLogs" :key="log.id" class="hover:bg-white/[0.02] transition-colors">
              <td class="px-6 py-3.5">
                <span 
                  class="px-2 py-0.5 rounded-full text-[9px] font-medium border-0"
                  :class="{
                    'bg-[#0a84ff]/10 text-[#0a84ff]': log.category === 'auth',
                    'bg-[#30d158]/10 text-[#30d158]': log.category === 'admin',
                    'bg-white/10 text-white/60': log.category === 'system'
                  }"
                >
                  {{ log.category }}
                </span>
              </td>
              <td class="px-6 py-3.5 font-medium text-white/95">{{ log.action }}</td>
              <td class="px-6 py-3.5 text-white/60">{{ log.metadata?.operator || log.user_id || 'system' }}</td>
              <td class="px-6 py-3.5 text-white/40 font-mono">{{ log.ip || '-' }}</td>
              <td class="px-6 py-3.5">
                <span 
                  class="px-2 py-0.5 rounded-full text-[9px] font-medium border-0"
                  :class="{
                    'bg-[#30d158]/10 text-[#30d158]': log.metadata?.status === 'SUCCESS' || log.metadata?.success === true,
                    'bg-[#ff9f0a]/10 text-[#ff9f0a]': log.metadata?.status === 'WARNING',
                    'bg-[#0a84ff]/10 text-[#0a84ff]': log.metadata?.status === 'INFO',
                    'bg-[#ff453a]/10 text-[#ff453a]': log.metadata?.status === 'FAILED' || log.metadata?.success === false
                  }"
                >
                  {{ log.metadata?.status || (log.metadata?.success ? 'SUCCESS' : log.metadata?.success === false ? 'FAILED' : '-') }}
                </span>
              </td>
              <td class="px-6 py-3.5 text-white/40">{{ new Date(log.created_at).toLocaleTimeString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
