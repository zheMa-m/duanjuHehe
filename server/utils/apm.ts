import os from 'os'

export interface ApmMetric {
  path: string
  method: string
  status: number
  duration: number
  timestamp: string
}

export interface ApmAlert {
  id: string
  type: string
  message: string
  timestamp: string
  level: 'warning' | 'critical'
}

// 在全局保存 APM 统计，避免热更新时数据清空
const globalRef = globalThis as any
if (!globalRef.__apm_metrics) {
  globalRef.__apm_metrics = []
}
if (!globalRef.__apm_alerts) {
  globalRef.__apm_alerts = []
}

const MAX_METRICS = 100
const MAX_ALERTS = 50

export function recordMetric(path: string, method: string, status: number, duration: number) {
  // 忽略 APM 本身的 API 请求，避免环形监控
  if (path.includes('/api/admin/apm')) return

  const metric: ApmMetric = {
    path,
    method,
    status,
    duration,
    timestamp: new Date().toISOString()
  }

  globalRef.__apm_metrics.push(metric)
  if (globalRef.__apm_metrics.length > MAX_METRICS) {
    globalRef.__apm_metrics.shift()
  }

  // 触发警报条件判断
  checkAlert(metric)
}

function checkAlert(metric: ApmMetric) {
  // 1. 响应慢警告 (> 800ms warning, > 2000ms critical)
  if (metric.duration > 2000) {
    triggerAlert('SLOWNESS', `API ${metric.method} ${metric.path} 响应时间极长: ${metric.duration.toFixed(1)}ms`, 'critical')
  } else if (metric.duration > 800) {
    triggerAlert('SLOWNESS', `API ${metric.method} ${metric.path} 响应时间偏长: ${metric.duration.toFixed(1)}ms`, 'warning')
  }

  // 2. 发生服务端 5xx 错误
  if (metric.status >= 500) {
    triggerAlert('SERVER_ERROR', `API ${metric.method} ${metric.path} 响应状态异常 [Status ${metric.status}]`, 'critical')
  }
}

export function triggerAlert(type: string, message: string, level: 'warning' | 'critical') {
  const alertItem: ApmAlert = {
    id: Math.random().toString(36).substring(2, 9),
    type,
    message,
    timestamp: new Date().toISOString(),
    level
  }

  globalRef.__apm_alerts.push(alertItem)
  if (globalRef.__apm_alerts.length > MAX_ALERTS) {
    globalRef.__apm_alerts.shift()
  }

  // 🚨 模拟警报输出至 Node.js 终端后台
  const timeStr = new Date().toLocaleTimeString()
  const colorCode = level === 'critical' ? '\x1b[31m' : '\x1b[33m'
  const resetCode = '\x1b[0m'
  console.log(`${colorCode}🚨 [APM ALERT - ${level.toUpperCase()}] [${timeStr}] ${message}${resetCode}`)
}

export function getApmStats() {
  const metrics = (globalRef.__apm_metrics || []) as ApmMetric[]
  const alerts = (globalRef.__apm_alerts || []) as ApmAlert[]

  // 计算基本汇总
  const recentCount = metrics.length
  let totalDuration = 0
  let errorCount = 0
  let p95Duration = 0
  let p99Duration = 0

  if (recentCount > 0) {
    const sortedDurations = [...metrics].map(m => m.duration).sort((a, b) => a - b)
    totalDuration = sortedDurations.reduce((sum, d) => sum + d, 0)
    errorCount = metrics.filter(m => m.status >= 400).length
    
    // 计算 P95 & P99
    p95Duration = sortedDurations[Math.floor(recentCount * 0.95)] ?? sortedDurations[recentCount - 1] ?? 0
    p99Duration = sortedDurations[Math.floor(recentCount * 0.99)] ?? sortedDurations[recentCount - 1] ?? 0
  }

  // 获取 CPU / 内存指标
  const freeMem = os.freemem()
  const totalMem = os.totalmem()
  const memoryUsagePercent = totalMem > 0 ? ((totalMem - freeMem) / totalMem) * 100 : 0
  const cpuLoad = os.loadavg() // [1, 5, 15] 分钟负载

  // 简单的 CPU 占用率换算（在单核或多核下均乘以系数模拟百分比）
  const loadAvg1Min = cpuLoad[0] ?? 0
  const cpuCount = os.cpus()?.length || 1
  const cpuPercent = Math.min(Math.round((loadAvg1Min / cpuCount) * 100), 100)

  return {
    summary: {
      totalRequests: metrics.length,
      averageDuration: recentCount > 0 ? totalDuration / recentCount : 0,
      p95Duration,
      p99Duration,
      errorRate: recentCount > 0 ? (errorCount / recentCount) * 100 : 0,
    },
    system: {
      memoryUsage: Math.round(memoryUsagePercent * 10) / 10,
      cpuLoad: Math.max(cpuPercent, 5), // 设定底限 5% 让进度条有显示
      freeMemGb: Math.round((freeMem / 1024 / 1024 / 1024) * 100) / 100,
      totalMemGb: Math.round((totalMem / 1024 / 1024 / 1024) * 100) / 100,
      uptime: Math.round(os.uptime())
    },
    metrics: metrics.slice().reverse(),
    alerts: alerts.slice().reverse()
  }
}
