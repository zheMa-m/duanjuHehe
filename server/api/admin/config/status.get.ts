// @api-auth: admin
/**
 * GET /api/admin/config/status — 运行时配置与服务健康状态
 *
 * 返回数据库连接、Storage 可用性、运行时信息等，
 * 用于管理后台「系统配置」页面的实时状态展示。
 */
import { defineEventHandler } from 'h3'
import { assertAdmin } from '~~/server/utils/auth'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['管理·系统-监控'],
    summary: '管理员：获取系统配置与服务健康状态',
    description: '返回数据库连接状态、Storage 可用性、Node.js 运行时信息及环境变量配置状态（不暴露实际值）。',
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: '系统状态对象',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                data: {
                  type: 'object',
                  properties: {
                    services: {
                      type: 'object',
                      properties: {
                        database: { type: 'object', properties: { status: { type: 'string' }, latency_ms: { type: 'number' } } },
                        storage: { type: 'object', properties: { status: { type: 'string' }, latency_ms: { type: 'number' } } },
                      },
                    },
                    runtime: {
                      type: 'object',
                      properties: {
                        node_version: { type: 'string' },
                        platform: { type: 'string' },
                        uptime_seconds: { type: 'integer' },
                        mock_db: { type: 'boolean' },
                      },
                    },
                    env_config: { type: 'object' },
                  },
                },
              },
            },
          },
        },
      },
    },
  } as any,
})

export default defineEventHandler(async (event) => {
  assertAdmin(event)

  const config = useRuntimeConfig()
  const isMockDB = process.env.MOCK_DB === 'true'

  // ── 数据库健康检查 ──────────────────────────────────────
  let dbStatus: { status: string; latency_ms: number } = { status: 'unknown', latency_ms: 0 }
  try {
    const db = getDB(event)
    const start = Date.now()
    const { error } = await db.from('profiles').select('id', { count: 'exact', head: true }).limit(1)
    const latency = Date.now() - start
    dbStatus = { status: error ? 'error' : 'healthy', latency_ms: latency }
  } catch {
    dbStatus = { status: 'unreachable', latency_ms: 0 }
  }

  // ── Storage 健康检查 ────────────────────────────────────
  let storageStatus: { status: string; latency_ms: number } = { status: 'unknown', latency_ms: 0 }
  if (!isMockDB) {
    try {
      const db = getDB(event)
      const start = Date.now()
      const { data, error } = await db.storage.listBuckets()
      const latency = Date.now() - start
      storageStatus = {
        status: error ? 'error' : (data && data.length > 0 ? 'healthy' : 'empty'),
        latency_ms: latency,
      }
    } catch {
      storageStatus = { status: 'unreachable', latency_ms: 0 }
    }
  } else {
    storageStatus = { status: 'mock', latency_ms: 0 }
  }

  // ── 运行时信息 ──────────────────────────────────────────
  const runtime = {
    node_version: process.version,
    platform: process.platform,
    uptime_seconds: Math.floor(process.uptime()),
    mock_db: isMockDB,
  }

  // ── 环境变量配置状态（仅标记是否已配置，不暴露值）────────
  const envKeys = [
    'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
    'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET',
  ]
  const envConfig: Record<string, boolean> = {}
  for (const key of envKeys) {
    envConfig[key] = !!process.env[key]
  }

  return sendSuccess(event, {
    services: {
      database: dbStatus,
      storage: storageStatus,
    },
    runtime,
    env_config: envConfig,
    timestamp: new Date().toISOString(),
  }, 'System status retrieved')
})
