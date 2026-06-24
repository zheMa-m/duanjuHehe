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
  'bg-[#30d158]/10 text-[#30d158] border-[#30d158]/30 shadow-[0_0_15px_rgba(48,209,88,0.15)]': healthStatus.value === 'HEALTHY',
  'bg-[#ff9f0a]/10 text-[#ff9f0a] border-[#ff9f0a]/30 shadow-[0_0_15px_rgba(255,159,10,0.15)]': healthStatus.value === 'WARNING',
  'bg-[#ff453a]/10 text-[#ff453a] border-[#ff453a]/30 shadow-[0_0_15px_rgba(255,69,58,0.15)]': healthStatus.value === 'CRITICAL',
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
    <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
      <div>
        <h1 class="text-[28px] font-bold text-white tracking-tight flex items-center gap-3">
          系统健康监控
          <span
            class="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold border transition-all duration-300 animate-pulse-glow"
            :class="healthClass"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-current mr-1.5"></span>
            {{ healthStatus }}
          </span>
        </h1>
        <p class="text-white/40 text-sm mt-1">实时分析 Node.js 服务端性能、硬件负荷及异常警报（3秒自轮询）</p>
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

    <!-- P95 / P99 / 错误率卡片 (Bento Panel) -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-5">
      <div class="bg-white/[0.04] p-5 rounded-2xl shadow-lg shadow-black/20 transition-all hover:bg-white/[0.06]">
        <div class="text-white/40 text-[11px] font-semibold uppercase tracking-widest mb-1.5 font-mono">平均延迟</div>
        <div class="text-3xl font-bold text-white font-mono">
          {{ apmData?.summary?.averageDuration ? apmData.summary.averageDuration.toFixed(1) + ' ms' : '0.0 ms' }}
        </div>
        <div class="text-xs text-white/25 mt-1 font-light">基于最近 100 次 API 数据</div>
      </div>

      <div class="bg-white/[0.04] p-5 rounded-2xl shadow-lg shadow-black/20 transition-all hover:bg-white/[0.06]">
        <div class="text-white/40 text-[11px] font-semibold uppercase tracking-widest mb-1.5 font-mono">P95 延迟</div>
        <div class="text-3xl font-bold text-indigo-400 font-mono">
          {{ apmData?.summary?.p95Duration ? apmData.summary.p95Duration.toFixed(1) + ' ms' : '0.0 ms' }}
        </div>
        <div class="text-xs text-white/25 mt-1 font-light">95% 的请求响应低于此值</div>
      </div>

      <div class="bg-white/[0.04] p-5 rounded-2xl shadow-lg shadow-black/20 transition-all hover:bg-white/[0.06]">
        <div class="text-white/40 text-[11px] font-semibold uppercase tracking-widest mb-1.5 font-mono">P99 延迟</div>
        <div class="text-3xl font-bold text-[#bf5af2] font-mono">
          {{ apmData?.summary?.p99Duration ? apmData.summary.p99Duration.toFixed(1) + ' ms' : '0.0 ms' }}
        </div>
        <div class="text-xs text-white/25 mt-1 font-light">系统极限时延表现指标</div>
      </div>

      <div class="bg-white/[0.04] p-5 rounded-2xl shadow-lg shadow-black/20 transition-all hover:bg-white/[0.06]">
        <div class="text-white/40 text-[11px] font-semibold uppercase tracking-widest mb-1.5 font-mono">错误率</div>
        <div class="text-2xl font-bold font-mono" :class="(apmData?.summary?.errorRate ?? 0) > 0 ? 'text-[#ff453a]' : 'text-[#30d158]'">
          {{ apmData?.summary?.errorRate ? apmData.summary.errorRate.toFixed(1) + '%' : '0.0%' }}
        </div>
        <div class="text-xs text-white/25 mt-1 font-light">状态码 >= 400 请求占比</div>
      </div>
    </div>

    <!-- 硬件负荷 + 告警控制台 -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <!-- CPU & 内存 (高品质毛玻璃卡片) -->
      <div class="lg:col-span-1 bg-white/[0.04] p-6 rounded-2xl flex flex-col justify-between shadow-lg shadow-black/20 transition-all hover:bg-white/[0.06] relative group overflow-hidden">
        <div class="absolute -top-12 -left-12 w-24 h-24 rounded-full bg-indigo-500/[0.04] blur-2xl"></div>
        
        <div class="space-y-6 relative z-10">
          <h3 class="text-sm font-semibold text-white/50 uppercase tracking-widest pl-1 font-mono">硬件负荷</h3>
          
          <!-- CPU -->
          <div class="space-y-2">
            <div class="flex justify-between text-sm font-light">
              <span class="text-white/70 tracking-wide">CPU 负载比例</span>
              <span class="text-white font-semibold font-mono">{{ apmData?.system?.cpuLoad }}%</span>
            </div>
            <!-- 加宽呼吸外框与扫光背景 -->
            <div class="h-3 w-full bg-white/[0.02] border border-white/[0.06] rounded-full overflow-hidden relative">
              <div 
                class="h-full rounded-full transition-all duration-500 relative progress-bar-shimmer" 
                :class="{
                  'bg-gradient-to-r from-emerald-500 to-blue-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]': (apmData?.system?.cpuLoad ?? 0) <= 70,
                  'bg-gradient-to-r from-amber-500 to-orange-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]': (apmData?.system?.cpuLoad ?? 0) > 70 && (apmData?.system?.cpuLoad ?? 0) <= 90,
                  'bg-gradient-to-r from-red-600 to-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]': (apmData?.system?.cpuLoad ?? 0) > 90
                }"
                :style="{ width: (apmData?.system?.cpuLoad ?? 0) + '%' }"
              ></div>
            </div>
          </div>

          <!-- Memory -->
          <div class="space-y-2">
            <div class="flex justify-between text-sm font-light">
              <span class="text-white/70 tracking-wide">物理内存占用</span>
              <span class="text-white font-semibold font-mono">{{ apmData?.system?.memoryUsage }}%</span>
            </div>
            <div class="h-3 w-full bg-white/[0.02] border border-white/[0.06] rounded-full overflow-hidden relative">
              <div 
                class="h-full rounded-full transition-all duration-500 relative progress-bar-shimmer" 
                :class="{
                  'bg-gradient-to-r from-emerald-500 to-blue-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]': (apmData?.system?.memoryUsage ?? 0) <= 80,
                  'bg-gradient-to-r from-amber-500 to-orange-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]': (apmData?.system?.memoryUsage ?? 0) > 80 && (apmData?.system?.memoryUsage ?? 0) <= 95,
                  'bg-gradient-to-r from-red-600 to-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]': (apmData?.system?.memoryUsage ?? 0) > 95
                }"
                :style="{ width: (apmData?.system?.memoryUsage ?? 0) + '%' }"
              ></div>
            </div>
            <div class="text-xs text-white/30 flex justify-between font-mono">
              <span>共 {{ apmData?.system?.totalMemGb }} GB</span>
              <span>可用 {{ apmData?.system?.freeMemGb }} GB</span>
            </div>
          </div>
        </div>

        <div class="pt-5 border-t border-white/[0.06] text-xs text-white/40 flex justify-between items-center mt-6 relative z-10">
          <span class="tracking-wide">Node.js 服务已运行:</span>
          <span class="font-mono text-white/80 font-medium">{{ formatUptime(apmData?.system?.uptime ?? 0) }}</span>
        </div>
      </div>

      <!-- 告警清单 (双列高透卡片) -->
      <div class="lg:col-span-2 bg-white/[0.04] p-6 rounded-2xl flex flex-col justify-between shadow-lg shadow-black/20 transition-all hover:bg-white/[0.06] relative group overflow-hidden">
        <div class="absolute -top-12 -right-12 w-24 h-24 rounded-full bg-indigo-500/[0.03] blur-2xl"></div>
        
        <div class="relative z-10">
          <div class="flex justify-between items-center mb-4 pl-1">
            <h3 class="text-sm font-semibold text-white/50 uppercase tracking-widest font-mono">告警中心</h3>
            <span class="text-[10px] px-2.5 py-0.5 bg-white/5 text-white/40 rounded-full border border-white/[0.05] font-mono">实时检测</span>
          </div>

          <div class="space-y-3 max-h-[170px] overflow-y-auto pr-1 scrollbar-none">
            <div 
              v-for="alert in apmData?.alerts" 
              :key="alert.id"
              class="p-3.5 rounded-xl border text-sm flex justify-between items-center transition-all shadow-sm"
              :class="{
                'bg-[#ff453a]/5 border-[#ff453a]/20 text-white': alert.level === 'critical',
                'bg-[#ff9f0a]/5 border-[#ff9f0a]/20 text-white/90': alert.level === 'warning'
              }"
            >
              <div class="flex items-center gap-3">
                <span class="relative flex h-2 w-2">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" :class="alert.level === 'critical' ? 'bg-[#ff453a]' : 'bg-[#ff9f0a]'"></span>
                  <span class="relative inline-flex rounded-full h-2 w-2" :class="alert.level === 'critical' ? 'bg-[#ff453a]' : 'bg-[#ff9f0a]'"></span>
                </span>
                <div>
                  <div class="font-bold text-xs uppercase tracking-widest opacity-40 font-mono">{{ alert.type }}</div>
                  <div class="font-light text-[11px] mt-1 tracking-wide leading-relaxed">{{ alert.message }}</div>
                </div>
              </div>
              <span class="text-[10px] opacity-40 font-mono font-medium">{{ new Date(alert.timestamp).toLocaleTimeString() }}</span>
            </div>

            <div v-if="!apmData?.alerts || apmData.alerts.length === 0" class="py-10 text-center text-sm text-white/20 flex flex-col items-center gap-2 font-light">
              <span class="text-2xl text-emerald-500">✔</span>
              暂无活动告警，服务器状态表现极其平稳。
            </div>
          </div>
        </div>

        <!-- 模拟测试 -->
        <div class="pt-4 border-t border-white/[0.06] mt-4 flex items-center justify-between gap-3 relative z-10">
          <span class="text-[10px] text-white/30 uppercase font-semibold font-mono tracking-widest">模拟测试:</span>
          <div class="flex gap-2.5">
            <button 
              @click="$emit('simulate', 'warning', '数据库连接出现瞬时抖动 (APM 模拟)')"
              :disabled="isSimulating"
              class="text-[11px] font-semibold bg-[#ff9f0a]/10 hover:bg-[#ff9f0a]/20 text-[#ff9f0a] px-4 py-2 rounded-full border border-[#ff9f0a]/20 transition-all active:scale-[0.96] disabled:opacity-50 cursor-pointer focus:outline-none"
            >
              WARNING 警报
            </button>
            <button 
              @click="$emit('simulate', 'critical', '服务器物理磁盘剩余可用空间不足 5%！(APM 模拟)')"
              :disabled="isSimulating"
              class="text-[11px] font-semibold bg-[#ff453a]/10 hover:bg-[#ff453a]/20 text-[#ff453a] px-4 py-2 rounded-full border border-[#ff453a]/20 transition-all active:scale-[0.96] disabled:opacity-50 cursor-pointer focus:outline-none"
            >
              🚨 CRITICAL 警报
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- API 请求追踪表 (高奢暗黑卡片) -->
    <div class="bg-white/[0.04] rounded-2xl overflow-hidden shadow-xl shadow-black/20">
      <div class="px-6 py-5 border-b border-white/[0.06] flex justify-between items-center bg-white/[0.005]">
        <h2 class="text-sm font-semibold text-white/50 uppercase tracking-widest font-mono">实时追踪指标</h2>
        <span class="text-[10px] px-2.5 py-0.5 bg-white/5 text-white/40 rounded-full border border-white/[0.05] font-mono">最新 100 条</span>
      </div>
      
      <div class="overflow-x-auto max-h-[300px] overflow-y-auto scrollbar-none">
        <table class="w-full text-left text-sm border-collapse">
          <thead>
            <tr class="border-b border-white/[0.05] text-white/40 uppercase tracking-widest text-[10px] sticky top-0 bg-[#0d0d0f] z-10">
              <th class="px-6 py-4 font-semibold font-mono">请求路径 (Path)</th>
              <th class="px-6 py-4 font-semibold font-mono">方法</th>
              <th class="px-6 py-4 font-semibold font-mono">状态码</th>
              <th class="px-6 py-4 font-semibold font-mono">性能耗时</th>
              <th class="px-6 py-4 font-semibold font-mono">触发时间</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.04]">
            <tr v-for="metric in apmData?.metrics" :key="metric.timestamp + metric.path" class="hover:bg-white/[0.02] transition-colors duration-200">
              <td class="px-6 py-5 font-mono text-xs text-white/80 tracking-wide">{{ metric.path }}</td>
              <td class="px-6 py-5">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold font-mono border"
                  :class="{
                    'bg-indigo-500/10 text-indigo-400 border-indigo-500/15': metric.method === 'GET',
                    'bg-[#30d158]/10 text-[#30d158] border-[#30d158]/15': metric.method === 'POST',
                    'bg-[#ff9f0a]/10 text-[#ff9f0a] border-[#ff9f0a]/15': metric.method === 'PATCH',
                    'bg-[#ff453a]/10 text-[#ff453a] border-[#ff453a]/15': metric.method === 'DELETE'
                  }"
                >
                  {{ metric.method }}
                </span>
              </td>
              <td class="px-6 py-5">
                <span class="font-mono font-bold text-sm" :class="metric.status >= 400 ? 'text-[#ff453a]' : 'text-[#30d158]'">
                  {{ metric.status }}
                </span>
              </td>
              <td class="px-6 py-5 font-mono text-sm" :class="{
                'text-[#ff453a] font-bold filter drop-shadow-[0_0_4px_rgba(255,69,58,0.2)]': metric.duration > 800,
                'text-white/60 font-light': metric.duration <= 800
              }">
                {{ metric.duration.toFixed(1) }} ms
              </td>
              <td class="px-6 py-5 text-white/40 font-mono text-xs">{{ new Date(metric.timestamp).toLocaleTimeString() }}</td>
            </tr>
            <tr v-if="!apmData?.metrics || apmData.metrics.length === 0">
              <td colspan="5" class="py-12 text-center text-sm text-white/20 font-light">
                ⌛ 暂未捕获到接口流量，请尝试在其他面板操作或刷新页面。
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 进度条扫光 shimmer 扫掠动效 */
@keyframes shimmer-move {
  0% { background-position: -200px 0; }
  100% { background-position: 200px 0; }
}

.progress-bar-shimmer::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-image: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.15) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  background-size: 200px 100%;
  background-repeat: no-repeat;
  animation: shimmer-move 2s linear infinite;
  pointer-events: none;
}

/* 呼吸点动画 */
@keyframes pulse-glow {
  0%, 100% { filter: drop-shadow(0 0 1px currentColor); opacity: 0.7; }
  50% { filter: drop-shadow(0 0 5px currentColor); opacity: 1; }
}
.animate-pulse-glow {
  animation: pulse-glow 2s ease-in-out infinite;
}
.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
</style>
