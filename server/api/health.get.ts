// @api-auth: public
// 公开健康检查端点 — 用于负载均衡心跳、监控探针、Docker healthcheck

interface HealthCheckResult {
  status: 'ok' | 'degraded' | 'down'
  version: string
  uptime: number
  timestamp: string
  checks: {
    database: { status: 'healthy' | 'error'; latency_ms: number }
    storage: { status: 'healthy' | 'error' | 'mock'; message: string }
    memory: { used_gb: number; total_gb: number; percent: number }
  }
}

async function checkDatabase(): Promise<{ status: 'healthy' | 'error'; latency_ms: number }> {
  const start = Date.now()
  try {
    if (process.env.MOCK_DB === 'true') {
      return { status: 'healthy', latency_ms: Date.now() - start }
    }

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NUXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

    const { error } = await supabase.from('profiles').select('id', { count: 'exact', head: true })

    return { status: error ? 'error' : 'healthy', latency_ms: Date.now() - start }
  } catch {
    return { status: 'error', latency_ms: Date.now() - start }
  }
}

async function checkStorage(): Promise<{ status: 'healthy' | 'error' | 'mock'; message: string }> {
  try {
    if (process.env.MOCK_DB === 'true') {
      return { status: 'mock', message: 'Mock Storage 模式运行中' }
    }

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NUXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

    const { data, error } = await supabase.storage.listBuckets()

    if (error) {
      return { status: 'error', message: error.message }
    }

    return { status: 'healthy', message: `${data?.length || 0} 个存储桶` }
  } catch (err: any) {
    return { status: 'error', message: err?.message || '未知错误' }
  }
}

function checkMemory(): { used_gb: number; total_gb: number; percent: number } {
  const memoryUsage = process.memoryUsage()
  const usedGB = memoryUsage.heapUsed / 1024 / 1024 / 1024
  const totalGB = memoryUsage.heapTotal / 1024 / 1024 / 1024

  return {
    used_gb: Math.round(usedGB * 100) / 100,
    total_gb: Math.round(totalGB * 100) / 100,
    percent: totalGB > 0 ? Math.round((usedGB / totalGB) * 100) : 0,
  }
}

export default defineEventHandler(async (event) => {
  const [dbCheck, storageCheck] = await Promise.all([
    checkDatabase(),
    checkStorage(),
  ])

  const memoryCheck = checkMemory()

  // 综合判定状态
  let overallStatus: 'ok' | 'degraded' | 'down' = 'ok'
  if (dbCheck.status === 'error') {
    overallStatus = 'down'
  } else if (storageCheck.status === 'error' || memoryCheck.percent > 90) {
    overallStatus = 'degraded'
  }

  const result: HealthCheckResult = {
    status: overallStatus,
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    checks: {
      database: dbCheck,
      storage: storageCheck,
      memory: memoryCheck,
    },
  }

  // 设置响应状态码
  const statusCode = overallStatus === 'down' ? 503 : 200
  setResponseStatus(event, statusCode)

  return result
})
