<script setup lang="ts">
interface ApmAlert {
  id: string
  type: string
  message: string
  timestamp: string
  level: 'warning' | 'critical'
}

interface ApmMetric {
  path: string
  method: string
  status: number
  duration: number
  timestamp: string
}

interface ApmData {
  summary: {
    totalRequests: number
    averageDuration: number
    p95Duration: number
    p99Duration: number
    errorRate: number
  }
  system: {
    memoryUsage: number
    cpuLoad: number
    freeMemGb: number
    totalMemGb: number
    uptime: number
  }
  metrics: ApmMetric[]
  alerts: ApmAlert[]
}

const props = defineProps<{
  apmData: ApmData | null
  isLoading: boolean
  isSimulating: boolean
}>()

const emit = defineEmits<{
  refresh: []
  simulate: [level: 'warning' | 'critical', message: string]
}>()

// 健康状态计算
const healthStatus = computed(() => {
  const data = props.apmData
  if (!data) return 'HEALTHY'
  const hasError = data.summary.errorRate > 5
  const hasCritical = data.alerts.some(a => a.level === 'critical')
  const hasWarning = data.summary.errorRate > 0 || data.alerts.length > 0
  if (hasError || hasCritical) return 'CRITICAL'
  if (hasWarning) return 'WARNING'
  return 'HEALTHY'
})

const healthClass = computed(() => ({
  'bg-[#30d158]/10 text-[#30d158] border-[#30d158]/20': healthStatus.value === 'HEALTHY',
  'bg-[#ff9f0a]/10 text-[#ff9f0a] border-[#ff9f0a]/20': healthStatus.value === 'WARNING',
  'bg-[#ff453a]/10 text-[#ff453a] border-[#ff453a]/20': healthStatus.value === 'CRITICAL',
}))

const formatUptime = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}小时 ${m}分钟`
}
</script>

<template>
  <div class="space-y-8 animate-fade-in text-white">
    <!-- 标题栏 -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
          系统健康监控
          <span
            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium border"
            :class="healthClass"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse"></span>
            {{ healthStatus }}
          </span>
        </h1>
        <p class="text-white/40 text-xs mt-1">实时分析 Node.js 服务端性能、硬件负荷及异常警报（3秒自轮询）</p>
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

    <!-- P95 / P99 / 错误率卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-5">
      <div class="bg-[#1c1c1e] border border-white/5 p-5 rounded-2xl">
        <div class="text-white/40 text-[10px] font-medium uppercase tracking-wider mb-1">平均响应时长</div>
        <div class="text-2xl font-semibold text-white">
          {{ apmData?.summary?.averageDuration ? apmData.summary.averageDuration.toFixed(1) + ' ms' : '0.0 ms' }}
        </div>
        <div class="text-[10px] text-white/30 mt-1.5">基于最近 100 次 API 数据</div>
      </div>

      <div class="bg-[#1c1c1e] border border-white/5 p-5 rounded-2xl">
        <div class="text-white/40 text-[10px] font-medium uppercase tracking-wider mb-1">P95 响应时延</div>
        <div class="text-2xl font-semibold text-[#0a84ff]">
          {{ apmData?.summary?.p95Duration ? apmData.summary.p95Duration.toFixed(1) + ' ms' : '0.0 ms' }}
        </div>
        <div class="text-[10px] text-white/30 mt-1.5">95% 的请求低于此值</div>
      </div>

      <div class="bg-[#1c1c1e] border border-white/5 p-5 rounded-2xl">
        <div class="text-white/40 text-[10px] font-medium uppercase tracking-wider mb-1">P99 响应时延</div>
        <div class="text-2xl font-semibold text-[#8b5cf6]">
          {{ apmData?.summary?.p99Duration ? apmData.summary.p99Duration.toFixed(1) + ' ms' : '0.0 ms' }}
        </div>
        <div class="text-[10px] text-white/30 mt-1.5">极值时延表现指标</div>
      </div>

      <div class="bg-[#1c1c1e] border border-white/5 p-5 rounded-2xl">
        <div class="text-white/40 text-[10px] font-medium uppercase tracking-wider mb-1">系统报错率</div>
        <div class="text-2xl font-semibold" :class="(apmData?.summary?.errorRate ?? 0) > 0 ? 'text-[#ff453a]' : 'text-[#30d158]'">
          {{ apmData?.summary?.errorRate ? apmData.summary.errorRate.toFixed(1) + '%' : '0.0%' }}
        </div>
        <div class="text-[10px] text-white/30 mt-1.5">状态码 >= 400 占比</div>
      </div>
    </div>

    <!-- 硬件负荷 + 告警控制台 -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <!-- CPU & 内存 -->
      <div class="lg:col-span-1 bg-[#1c1c1e] border border-white/5 p-6 rounded-2xl flex flex-col justify-between">
        <div class="space-y-6">
          <h3 class="text-xs font-semibold text-white/60 uppercase tracking-wider pl-1">硬件负荷指标 (Hardware)</h3>
          
          <!-- CPU -->
          <div class="space-y-2">
            <div class="flex justify-between text-xs font-light">
              <span class="text-white/70">CPU 负载比例</span>
              <span class="text-white font-medium">{{ apmData?.system?.cpuLoad }}%</span>
            </div>
            <div class="h-2.5 w-full bg-white/[0.03] border border-white/5 rounded-full overflow-hidden">
              <div 
                class="h-full rounded-full transition-all duration-500" 
                :class="{
                  'bg-[#30d158]': (apmData?.system?.cpuLoad ?? 0) <= 70,
                  'bg-[#ff9f0a]': (apmData?.system?.cpuLoad ?? 0) > 70 && (apmData?.system?.cpuLoad ?? 0) <= 90,
                  'bg-[#ff453a]': (apmData?.system?.cpuLoad ?? 0) > 90
                }"
                :style="{ width: (apmData?.system?.cpuLoad ?? 0) + '%' }"
              ></div>
            </div>
          </div>

          <!-- Memory -->
          <div class="space-y-2">
            <div class="flex justify-between text-xs font-light">
              <span class="text-white/70">物理内存占用</span>
              <span class="text-white font-medium">{{ apmData?.system?.memoryUsage }}%</span>
            </div>
            <div class="h-2.5 w-full bg-white/[0.03] border border-white/5 rounded-full overflow-hidden">
              <div 
                class="h-full rounded-full transition-all duration-500" 
                :class="{
                  'bg-[#30d158]': (apmData?.system?.memoryUsage ?? 0) <= 80,
                  'bg-[#ff9f0a]': (apmData?.system?.memoryUsage ?? 0) > 80 && (apmData?.system?.memoryUsage ?? 0) <= 95,
                  'bg-[#ff453a]': (apmData?.system?.memoryUsage ?? 0) > 95
                }"
                :style="{ width: (apmData?.system?.memoryUsage ?? 0) + '%' }"
              ></div>
            </div>
            <div class="text-[10px] text-white/30 flex justify-between">
              <span>共 {{ apmData?.system?.totalMemGb }} GB</span>
              <span>可用 {{ apmData?.system?.freeMemGb }} GB</span>
            </div>
          </div>
        </div>

        <div class="pt-6 border-t border-white/5 text-[10px] text-white/40 flex justify-between items-center mt-6">
          <span>Node.js 开机时长:</span>
          <span class="font-mono text-white/70">{{ formatUptime(apmData?.system?.uptime ?? 0) }}</span>
        </div>
      </div>

      <!-- 告警清单 -->
      <div class="lg:col-span-2 bg-[#1c1c1e] border border-white/5 p-6 rounded-2xl flex flex-col justify-between">
        <div>
          <div class="flex justify-between items-center mb-4 pl-1">
            <h3 class="text-xs font-semibold text-white/60 uppercase tracking-wider">异常告警中心 (Alerting)</h3>
            <span class="text-[9px] px-2 py-0.5 bg-white/5 text-white/40 rounded-full border border-white/5">规则即时计算</span>
          </div>

          <div class="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
            <div 
              v-for="alert in apmData?.alerts" 
              :key="alert.id"
              class="p-3 rounded-xl border text-xs flex justify-between items-center transition-all"
              :class="{
                'bg-[#ff453a]/10 border-[#ff453a]/25 text-white': alert.level === 'critical',
                'bg-[#ff9f0a]/10 border-[#ff9f0a]/25 text-white/90': alert.level === 'warning'
              }"
            >
              <div class="flex items-center gap-2">
                <span>{{ alert.level === 'critical' ? '🔴' : '🟡' }}</span>
                <div>
                  <div class="font-medium text-[11px] uppercase tracking-wide opacity-50">{{ alert.type }}</div>
                  <div class="font-light text-[11px] mt-0.5">{{ alert.message }}</div>
                </div>
              </div>
              <span class="text-[9px] opacity-40 font-mono">{{ new Date(alert.timestamp).toLocaleTimeString() }}</span>
            </div>

            <div v-if="!apmData?.alerts || apmData.alerts.length === 0" class="py-10 text-center text-xs text-white/30 flex flex-col items-center gap-2">
              <span class="text-xl">✔</span>
              暂无活动告警，服务器运行平稳。
            </div>
          </div>
        </div>

        <!-- 模拟测试 -->
        <div class="pt-4 border-t border-white/5 mt-4 flex items-center justify-between gap-3">
          <span class="text-[10px] text-white/30">模拟报警联动测试:</span>
          <div class="flex gap-2">
            <button 
              @click="$emit('simulate', 'warning', '数据库连接出现瞬时抖动 (APM 模拟)')"
              :disabled="isSimulating"
              class="text-[10px] font-medium bg-[#ff9f0a]/10 hover:bg-[#ff9f0a]/20 text-[#ff9f0a] px-3 py-1.5 rounded-full border border-[#ff9f0a]/20 transition-all active:scale-[0.96] disabled:opacity-50"
            >
              ⚠️ WARNING 警报
            </button>
            <button 
              @click="$emit('simulate', 'critical', '服务器物理磁盘剩余可用空间不足 5%！(APM 模拟)')"
              :disabled="isSimulating"
              class="text-[10px] font-medium bg-[#ff453a]/10 hover:bg-[#ff453a]/20 text-[#ff453a] px-3 py-1.5 rounded-full border border-[#ff453a]/20 transition-all active:scale-[0.96] disabled:opacity-50"
            >
              🚨 CRITICAL 警报
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- API 请求追踪表 -->
    <div class="bg-[#1c1c1e] border border-white/5 rounded-2xl overflow-hidden">
      <div class="px-6 py-4 border-b border-white/5 flex justify-between items-center">
        <h2 class="text-xs font-semibold text-white/60 uppercase tracking-wider">实时 API 请求流追踪 (Trace Metrics)</h2>
        <span class="text-[9px] px-2 py-0.5 bg-white/5 text-white/40 rounded-full border border-white/5">最近 100 次</span>
      </div>
      
      <div class="overflow-x-auto max-h-[300px] overflow-y-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="border-b border-white/5 text-white/40 uppercase tracking-wider text-[9px] sticky top-0 bg-[#1c1c1e] z-10">
              <th class="px-6 py-3">请求路径 (Path)</th>
              <th class="px-6 py-3">方法</th>
              <th class="px-6 py-3">状态码</th>
              <th class="px-6 py-3">性能耗时</th>
              <th class="px-6 py-3">触发时间</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            <tr v-for="metric in apmData?.metrics" :key="metric.timestamp + metric.path" class="hover:bg-white/[0.02] transition-colors">
              <td class="px-6 py-3 font-mono text-[11px] text-white/80">{{ metric.path }}</td>
              <td class="px-6 py-3">
                <span class="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono"
                  :class="{
                    'bg-[#0a84ff]/10 text-[#0a84ff]': metric.method === 'GET',
                    'bg-[#30d158]/10 text-[#30d158]': metric.method === 'POST',
                    'bg-[#ff9f0a]/10 text-[#ff9f0a]': metric.method === 'PATCH',
                    'bg-[#ff453a]/10 text-[#ff453a]': metric.method === 'DELETE'
                  }"
                >
                  {{ metric.method }}
                </span>
              </td>
              <td class="px-6 py-3">
                <span class="font-mono font-medium" :class="metric.status >= 400 ? 'text-[#ff453a]' : 'text-[#30d158]'">
                  {{ metric.status }}
                </span>
              </td>
              <td class="px-6 py-3 font-mono" :class="{
                'text-[#ff453a] font-medium': metric.duration > 800,
                'text-white/60': metric.duration <= 800
              }">
                {{ metric.duration.toFixed(1) }} ms
              </td>
              <td class="px-6 py-3 text-white/40 font-mono text-[10px]">{{ new Date(metric.timestamp).toLocaleTimeString() }}</td>
            </tr>
            <tr v-if="!apmData?.metrics || apmData.metrics.length === 0">
              <td colspan="5" class="py-12 text-center text-xs text-white/30">
                ⌛ 暂未捕获到接口流量，请尝试在其他标签页进行操作触发 API。
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
