/**
 * GET /api/admin/security/keys/lifecycle — API Key 生命周期健康统计
 * @api-auth: admin
 * 聚合 Key 使用频率分级、过期分布、休眠检测
 */
// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['管理·系统-安全'],
    summary: '管理员：查询 API Key 生命周期健康统计',
    security: [{ BearerAuth: [] }],
    responses: {
      200: { description: 'Key 生命周期分布与过期统计' },
    },
  },
} as any)

export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)
  const now = Date.now()
  const thirtyDaysLater = new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString()
  const _sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()
  const _thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString()
  const nowISO = new Date().toISOString()

  // 查询所有活跃 Key
  const { data: activeKeys, error: activeErr } = await db
    .from('api_keys')
    .select('id, name, key_prefix, is_active, last_used_at, expires_at, created_at, last_rotated_at')
    .eq('is_active', true)

  // 查询所有 Key（含停用）
  const { data: allKeys, error: allErr } = await db
    .from('api_keys')
    .select('id, name, key_prefix, is_active, last_used_at, expires_at, created_at')

  if (activeErr || allErr) {
    return sendSuccess(event, { distribution: { active: 0, lowUsage: 0, dormant: 0, neverUsed: 0 }, expiringIn30d: [], expired: [] })
  }

  // 分级统计（仅针对活跃 Key）
  let active = 0, lowUsage = 0, dormant = 0, neverUsed = 0

  for (const key of (activeKeys || [])) {
    if (!key.last_used_at) {
      // 创建超过 7 天但从未使用 → 休眠
      if (new Date(key.created_at).getTime() < now - 7 * 24 * 60 * 60 * 1000) {
        dormant++
      } else {
        neverUsed++
      }
    } else {
      const lastUsedMs = new Date(key.last_used_at).getTime()
      if (lastUsedMs > now - 7 * 24 * 60 * 60 * 1000) {
        active++ // 7 天内使用过
      } else if (lastUsedMs > now - 30 * 24 * 60 * 60 * 1000) {
        lowUsage++ // 7-30 天内使用过
      } else {
        dormant++ // 超过 30 天未使用
      }
    }
  }

  // 即将过期（30 天内）
  const expiringIn30d = (activeKeys || [])
    .filter((k: any) => k.expires_at && k.expires_at > nowISO && k.expires_at <= thirtyDaysLater)
    .map((k: any) => ({ id: k.id, name: k.name, key_prefix: k.key_prefix, expires_at: k.expires_at }))

  // 已过期（仍然活跃）
  const expired = (activeKeys || [])
    .filter((k: any) => k.expires_at && k.expires_at <= nowISO)
    .map((k: any) => ({ id: k.id, name: k.name, key_prefix: k.key_prefix, expires_at: k.expires_at }))

  return sendSuccess(event, {
    distribution: { active, lowUsage, dormant, neverUsed },
    expiringIn30d,
    expired,
    totalActive: (activeKeys || []).length,
    totalAll: (allKeys || []).length,
  })
})
