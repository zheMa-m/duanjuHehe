/**
 * 安全概览聚合接口
 * @api-auth: admin
 * 返回基于 DB 真实聚合的安全态势数据：评分、拦截统计、Key 状态、近期威胁
 */
// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'

// Overview 聚合缓存（30s TTL，策略变更时通过 invalidatePolicyCache 联动清除）
const OVERVIEW_CACHE_TTL = 30_000

const getCache = (): { data: any; expiresAt: number } | null =>
  (globalThis as any).__securityOverviewCache ?? null
const setCache = (data: any) => {
  (globalThis as any).__securityOverviewCache = { data, expiresAt: Date.now() + OVERVIEW_CACHE_TTL }
}

defineRouteMeta({
  openAPI: {
    tags: ['Admin Security'],
    summary: '安全概览聚合',
    description: '返回安全评分、拦截统计、API Key 状态、近期威胁等聚合数据',
    responses: {
      '200': { description: '安全概览聚合数据' },
    },
  },
} as any)

export default defineEventHandler(async (event) => {
  assertAdmin(event)

  // 缓存命中直接返回（策略变更时 invalidatePolicyCache 会清除）
  const cached = getCache()
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data
  }

  const db = getDB(event)

  // ── 1. 安全策略配置 ──────────────────────────────────
  const { data: policy } = await db
    .from('api_security_settings')
    .select('*')
    .limit(1)
    .single()

  // ── 2. 今日安全事件统计（activity_logs） ─────────────
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  // 今日拦截总数
  const { count: todayBlocked } = await db
    .from('activity_logs')
    .select('*', { count: 'exact', head: true })
    .eq('category', 'system')
    .like('action', 'api_security_%')
    .gte('created_at', todayStart.toISOString())

  // 排除速率限制的非限流威胁数
  const { count: threatsCount } = await db
    .from('activity_logs')
    .select('*', { count: 'exact', head: true })
    .eq('category', 'system')
    .like('action', 'api_security_%')
    .not('action', 'like', '%rate_limited%')
    .gte('created_at', todayStart.toISOString())

  // 近期威胁 Top 5（非限流）
  const { data: recentThreats } = await db
    .from('activity_logs')
    .select('id, action, ip, metadata, created_at')
    .eq('category', 'system')
    .like('action', 'api_security_%')
    .not('action', 'like', '%rate_limited%')
    .gte('created_at', todayStart.toISOString())
    .order('created_at', { ascending: false })
    .limit(5)

  // ── 3. API Key 统计 ─────────────────────────────────
  const { count: totalKeys } = await db
    .from('api_keys')
    .select('*', { count: 'exact', head: true })

  const { count: activeKeys } = await db
    .from('api_keys')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  // 已过期 Key
  const now = new Date().toISOString()
  const { data: expiredKeysData } = await db
    .from('api_keys')
    .select('id, name, key_prefix, expires_at')
    .eq('is_active', true)
    .lt('expires_at', now)

  // 7天内到期 Key
  const sevenDaysLater = new Date()
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)
  const sevenDaysLaterISO = sevenDaysLater.toISOString()

  const { data: expiringKeysData } = await db
    .from('api_keys')
    .select('id, name, key_prefix, expires_at')
    .eq('is_active', true)
    .gte('expires_at', now)
    .lt('expires_at', sevenDaysLaterISO)

  // ── 4. 安全评分计算 ─────────────────────────────────
  let score = 100
  const scoreDetails: string[] = []

  if (policy) {
    if (!policy.rate_limit?.enabled) {
      score -= 20
      scoreDetails.push('速率限制未启用')
    }
    if (!policy.ip_policy || policy.ip_policy.mode === 'disabled') {
      score -= 15
      scoreDetails.push('IP 访问控制未配置')
    }
    if (!policy.country_policy?.enabled) {
      score -= 15
      scoreDetails.push('国家限制未启用')
    }
    if (!policy.signature_required) {
      score -= 20
      scoreDetails.push('全局请求签名未启用')
    }
  } else {
    score = 0
    scoreDetails.push('安全策略未初始化')
  }

  if (activeKeys === 0) {
    score = Math.max(0, score - 10)
    scoreDetails.push('无活跃 API Key')
  }

  score = Math.max(0, score)

  const grade = score >= 80 ? 'excellent' : score >= 60 ? 'good' : 'needs_improvement'
  const gradeLabel = grade === 'excellent' ? '优秀' : grade === 'good' ? '良好' : '需改进'

  // ── 5. 配置状态概览 ─────────────────────────────────
  const configStatus = {
    rate_limit: policy?.rate_limit?.enabled ?? false,
    ip_policy_mode: policy?.ip_policy?.mode ?? 'disabled',
    country_policy: policy?.country_policy?.enabled ?? false,
    signature_required: policy?.signature_required ?? false,
    endpoint_overrides_count: Object.keys(policy?.endpoint_overrides || {}).length,
  }

  // ── 6. 限流 Top IP / Key（今日） ─────────────────────
  const { data: rateEvents } = await db
    .from('activity_logs')
    .select('ip, metadata')
    .eq('category', 'system')
    .like('action', '%rate_limited%')
    .gte('created_at', todayStart.toISOString())
    .limit(200)

  // 按 IP 聚合
  const ipCountMap = new Map<string, number>()
  const keyCountMap = new Map<string, number>()
  ;(rateEvents || []).forEach((e: any) => {
    const ip = e.ip || 'unknown'
    ipCountMap.set(ip, (ipCountMap.get(ip) || 0) + 1)
    if (e.metadata?.keyPrefix) {
      const kp = e.metadata.keyPrefix
      keyCountMap.set(kp, (keyCountMap.get(kp) || 0) + 1)
    }
  })

  const topIps = [...ipCountMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([ip, count]) => ({ ip, count }))

  const topKeys = [...keyCountMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([keyPrefix, count]) => ({ keyPrefix, count }))

  const result = sendSuccess(event, {
    score,
    grade,
    gradeLabel,
    scoreDetails,
    stats: {
      todayBlocked: todayBlocked ?? 0,
      activeThreats: threatsCount ?? 0,
      totalKeys: totalKeys ?? 0,
      activeKeys: activeKeys ?? 0,
    },
    configStatus,
    keys: {
      expired: (expiredKeysData || []).map((k: any) => ({
        id: k.id, name: k.name, key_prefix: k.key_prefix, expires_at: k.expires_at,
      })),
      expiringSoon: (expiringKeysData || []).map((k: any) => ({
        id: k.id, name: k.name, key_prefix: k.key_prefix, expires_at: k.expires_at,
      })),
    },
    recentThreats: (recentThreats || []).map((log: any) => ({
      id: log.id,
      action: log.action,
      ip: log.ip,
      metadata: log.metadata,
      created_at: log.created_at,
    })),
    rateLimitTop: { topIps, topKeys },
  })

  // 缓存聚合结果（30s TTL），策略变更时 invalidatePolicyCache 联动清除
  setCache(result)

  return result
})
