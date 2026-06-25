/**
 * GET /api/admin/security/alerts — 实时威胁告警（最近 5 分钟高严重度事件）
 * @api-auth: admin
 * 前端 30s 轮询此接口，展示应用内告警横幅
 */
// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['管理·系统-安全'],
    summary: '管理员：查询最近 5 分钟高严重度安全告警',
    security: [{ BearerAuth: [] }],
    responses: {
      200: { description: '高严重度告警列表' },
    },
  },
} as any)

/** 高严重度事件类型 */
const HIGH_SEVERITY_ACTIONS = [
  'api_security_invalid_signature',
  'api_security_signature_missing',
  'api_security_ip_blocked',
  'api_security_ip_not_allowed',
  'api_security_country_blocked',
]

export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)

  // 最近 5 分钟
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

  // 并行查询：高严重度事件 + 总计数
  const [alertsResult, countResult] = await Promise.all([
    db.from('activity_logs')
      .select('id, action, ip, metadata, created_at')
      .eq('category', 'system')
      .in('action', HIGH_SEVERITY_ACTIONS)
      .gte('created_at', fiveMinAgo)
      .order('created_at', { ascending: false })
      .limit(10),
    db.from('activity_logs')
      .select('*', { count: 'exact', head: true })
      .eq('category', 'system')
      .in('action', HIGH_SEVERITY_ACTIONS)
      .gte('created_at', fiveMinAgo),
  ])

  const alerts = (alertsResult.data || []).map((row: any) => ({
    id: row.id,
    action: row.action,
    ip: row.ip,
    path: row.metadata?.path || '-',
    country: row.metadata?.country || '-',
    keyPrefix: row.metadata?.keyPrefix || null,
    created_at: row.created_at,
  }))

  return sendSuccess(event, {
    alerts,
    total: countResult.count ?? 0,
    window: '5m',
    polledAt: new Date().toISOString(),
  })
})
