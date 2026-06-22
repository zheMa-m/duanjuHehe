/**
 * API 安全策略工具模块
 *
 * 核心职责：
 *   1. 策略缓存加载器（60s TTL，预编译 Set/Map）
 *   2. API Key 二级验证缓存（30s TTL，最热路径零 DB 开销）
 *   3. HMAC-SHA256 请求签名验证（timing-safe 比对）
 *   4. 固定窗口速率限制器（内存 Map + 定期 GC）
 *   5. 缓存失效接口（管理后台写操作同步清除缓存）
 */
import { H3Event, getHeader } from 'h3'
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { getDB } from './db'
import { getClientRealIP } from './ip'

// ╔════════════════════════════════════════════════════════════════╗
// ║  类型定义                                                      ║
// ╚════════════════════════════════════════════════════════════════╝

export interface SecurityPolicy {
  allDisabled: boolean
  rateLimit: { enabled: boolean; windowSeconds: number; maxRequests: number; byApiKey: boolean; byIp: boolean }
  ipPolicy: { mode: 'disabled' | 'whitelist' | 'blacklist'; ipSet: Set<string> }
  countryPolicy: { enabled: boolean; mode: 'whitelist' | 'blacklist'; countrySet: Set<string> }
  signatureRequired: boolean
  endpointOverrides: Map<string, { enabled?: boolean; rateLimit?: number }>
}

export interface CachedKeyData {
  id: string
  name: string
  permissions: string[]
  allowedEndpoints: string[] | null
  rateLimitOverride: number | null
  signingSecret: string
  requireSignature: boolean
  expiresAt: number | null
  keyPrefix: string
  cachedAt: number
}

// ╔════════════════════════════════════════════════════════════════╗
// ║  1. 策略缓存加载器（Layer 1，60s TTL）                         ║
// ╚════════════════════════════════════════════════════════════════╝

const POLICY_CACHE_TTL = 60_000
let policyCache: { data: SecurityPolicy; expiresAt: number } | null = null

/** 全禁用的默认策略（首次部署 / 表为空时使用） */
const DEFAULT_POLICY: SecurityPolicy = {
  allDisabled: true,
  rateLimit: { enabled: false, windowSeconds: 60, maxRequests: 100, byApiKey: true, byIp: true },
  ipPolicy: { mode: 'disabled', ipSet: new Set() },
  countryPolicy: { enabled: false, mode: 'blacklist', countrySet: new Set() },
  signatureRequired: false,
  endpointOverrides: new Map(),
}

/**
 * 加载安全策略（缓存优先，过期时从 DB 刷新）
 * - 缓存命中：零 DB 开销，直接返回预编译策略
 * - 缓存过期：从 api_security_settings 单行表读取，JSONB 数组编译为 Set/Map
 * - 表为空：返回 allDisabled=true 默认策略
 */
export async function loadSecurityPolicy(event: H3Event): Promise<SecurityPolicy> {
  const now = Date.now()

  // 缓存命中检查
  if (policyCache && now < policyCache.expiresAt) {
    return policyCache.data
  }

  // 从 DB 加载
  try {
    const db = getDB(event)
    const { data, error } = await db
      .from('api_security_settings')
      .select('rate_limit, ip_policy, country_policy, signature_required, endpoint_overrides')
      .eq('id', true)
      .single()

    if (error || !data) {
      // 表不存在或为空 → 默认策略
      policyCache = { data: DEFAULT_POLICY, expiresAt: now + POLICY_CACHE_TTL }
      return DEFAULT_POLICY
    }

    const rl = data.rate_limit || {}
    const ip = data.ip_policy || {}
    const cp = data.country_policy || {}
    const eo = data.endpoint_overrides || {}

    const policy: SecurityPolicy = {
      rateLimit: {
        enabled: rl.enabled ?? false,
        windowSeconds: rl.window_seconds ?? 60,
        maxRequests: rl.max_requests ?? 100,
        byApiKey: rl.by_api_key ?? true,
        byIp: rl.by_ip ?? true,
      },
      ipPolicy: {
        mode: ip.mode ?? 'disabled',
        ipSet: new Set([...(ip.whitelist || []), ...(ip.blacklist || [])].length > 0
          ? (ip.mode === 'whitelist' ? ip.whitelist : ip.blacklist) || []
          : []),
      },
      countryPolicy: {
        enabled: cp.enabled ?? false,
        mode: cp.mode ?? 'blacklist',
        countrySet: new Set((cp.countries || []).map((c: string) => c.toUpperCase())),
      },
      signatureRequired: data.signature_required ?? false,
      endpointOverrides: new Map(Object.entries(eo).map(([k, v]: [string, any]) => [k, { enabled: v.enabled, rateLimit: v.rateLimit }])),
      allDisabled: false, // 先设 false，下面计算
    }

    // 计算 allDisabled 全局短路标志
    policy.allDisabled =
      !policy.rateLimit.enabled &&
      policy.ipPolicy.mode === 'disabled' &&
      !policy.countryPolicy.enabled &&
      !policy.signatureRequired &&
      policy.endpointOverrides.size === 0

    policyCache = { data: policy, expiresAt: now + POLICY_CACHE_TTL }
    return policy
  } catch (err) {
    // DB 异常时降级为默认策略，不阻断业务请求
    console.error('[API Security] Failed to load policy from DB:', (err as Error).message)
    policyCache = { data: DEFAULT_POLICY, expiresAt: now + POLICY_CACHE_TTL }
    return DEFAULT_POLICY
  }
}

/** 管理后台更新策略时同步清除缓存（立即生效），同时清除 Overview 聚合缓存 */
export function invalidatePolicyCache(): void {
  policyCache = null
  // 清除 Overview 聚合缓存（跨模块，通过挂载到 process 共享）
  ;(globalThis as any).__securityOverviewCache = null
}

// ╔════════════════════════════════════════════════════════════════╗
// ║  2. API Key 二级验证缓存（Layer 2，30s TTL）                   ║
// ╚════════════════════════════════════════════════════════════════╝

const KEY_CACHE_TTL = 30_000
const keyCache = new Map<string, CachedKeyData>()

/** SHA-256 哈希工具 */
export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}

/**
 * 解析并验证 API Key（缓存优先）
 *
 * 流程：
 *   1. SHA256(rawKey) → keyHash
 *   2. 查 keyCache：命中且未过期 → 直接返回（跳过 DB）
 *   3. 未命中 → 查 DB（api_keys WHERE key_hash=? AND is_active=true）
 *   4. 检查 expires_at → 过期返回 null
 *   5. 缓存结果并返回
 */
export async function resolveApiKey(event: H3Event, rawKey: string): Promise<CachedKeyData | null> {
  const keyHash = sha256(rawKey)
  const now = Date.now()

  // Layer 2 缓存命中
  const cached = keyCache.get(keyHash)
  if (cached && (now - cached.cachedAt) < KEY_CACHE_TTL) {
    // 检查 key 本身的过期时间
    if (cached.expiresAt && cached.expiresAt < now) return null
    return cached
  }

  // DB 查询
  try {
    const db = getDB(event)
    const { data, error } = await db
      .from('api_keys')
      .select('id, name, key_prefix, signing_secret, require_signature, permissions, allowed_endpoints, rate_limit_override, expires_at')
      .eq('key_hash', keyHash)
      .eq('is_active', true)
      .single()

    if (error || !data) {
      // 无效 Key，清除可能存在的旧缓存
      keyCache.delete(keyHash)
      return null
    }

    // 检查 Key 过期时间
    const expiresAt = data.expires_at ? new Date(data.expires_at).getTime() : null
    if (expiresAt && expiresAt < now) return null

    const keyData: CachedKeyData = {
      id: data.id,
      name: data.name,
      keyPrefix: data.key_prefix,
      permissions: data.permissions || ['read'],
      allowedEndpoints: data.allowed_endpoints || null,
      rateLimitOverride: data.rate_limit_override || null,
      signingSecret: data.signing_secret,
      requireSignature: data.require_signature ?? false,
      expiresAt,
      cachedAt: now,
    }

    // 写入缓存
    keyCache.set(keyHash, keyData)
    return keyData
  } catch (err) {
    console.error('[API Security] Failed to resolve API key:', (err as Error).message)
    return null
  }
}

/** 管理后台吊销 Key 时同步清除缓存 */
export function invalidateKeyCache(keyHash: string): void {
  keyCache.delete(keyHash)
}

/** 批量清除所有 Key 缓存 */
export function invalidateAllKeyCache(): void {
  keyCache.clear()
}

// ╔════════════════════════════════════════════════════════════════╗
// ║  3. HMAC-SHA256 请求签名验证                                   ║
// ╚════════════════════════════════════════════════════════════════╝

const SIGNATURE_MAX_AGE_SECONDS = 300 // 5 分钟

/**
 * 验证 HMAC-SHA256 请求签名
 *
 * 签名协议：
 *   StringToSign = METHOD + "\n" + PATH + "\n" + TIMESTAMP + "\n" + SHA256_HEX(BODY)
 *   Signature = HMAC-SHA256(StringToSign, signing_secret) → hex
 *
 * @returns true = 签名有效
 */
export function verifyRequestSignature(
  method: string,
  path: string,
  timestamp: string,
  body: string,
  signingSecret: string,
  providedSignature: string,
): boolean {
  // 1. 时间戳有效性（±300s 防重放）
  const ts = parseInt(timestamp, 10)
  if (isNaN(ts)) return false
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - ts) > SIGNATURE_MAX_AGE_SECONDS) return false

  // 2. 计算 StringToSign
  const bodyHash = createHash('sha256').update(body || '').digest('hex')
  const stringToSign = `${method}\n${path}\n${timestamp}\n${bodyHash}`

  // 3. 计算预期签名
  const expectedSig = createHmac('sha256', signingSecret).update(stringToSign).digest('hex')

  // 4. timing-safe 比对（防侧信道攻击）
  if (expectedSig.length !== providedSignature.length) return false
  try {
    return timingSafeEqual(Buffer.from(expectedSig, 'hex'), Buffer.from(providedSignature, 'hex'))
  } catch {
    return false
  }
}

// ╔════════════════════════════════════════════════════════════════╗
// ║  4. 滑动窗口速率限制器（Layer 3，内存 Map + GC）               ║
// ╚════════════════════════════════════════════════════════════════╝

const GC_INTERVAL = 300_000 // 5 分钟
let lastGC = Date.now()

interface RateWindowEntry {
  count: number         // 当前窗口计数
  windowStart: number   // 当前窗口起始时间戳
  previousCount: number // 上一个完整窗口的计数（滑动加权用）
}

const rateLimitStore = new Map<string, RateWindowEntry>()

/**
 * 检查速率限制（滑动窗口计数器算法）
 *
 * 相比固定窗口，滑动窗口在当前窗口计数上叠加前一个窗口的加权剩余计数：
 *   estimated = currentCount + previousCount × (windowMs - elapsedInWindow) / windowMs
 *
 * 这有效消除了固定窗口在边界处的「双倍突发」漏洞：
 *   例：100 req/60s → 固定窗口在 T=59s + T=61s 可接收 200 req
 *   滑动窗口：T=59s 已用 99 → T=61s 估算 ≈ 99×0.97 + 1 ≈ 97，拒绝
 *
 * 内存开销：每个条目 3 个 number（24 字节），定期 GC 清理 >2 窗口未活跃的条目
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()

  // ── 定期 GC：清除超过 2 个窗口未活跃的条目 ──
  if (now - lastGC > GC_INTERVAL) {
    lastGC = now
    const threshold = now - windowMs * 2
    for (const [k, v] of rateLimitStore) {
      if (v.windowStart < threshold) {
        rateLimitStore.delete(k)
      }
    }
  }

  let entry = rateLimitStore.get(key)

  if (!entry) {
    // 首次请求 → 创建新窗口
    entry = { count: 1, windowStart: now, previousCount: 0 }
    rateLimitStore.set(key, entry)
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs }
  }

  const elapsed = now - entry.windowStart

  if (elapsed >= windowMs) {
    // 进入新窗口 → 当前窗口变为 previous，重置 count
    const windowsPassed = Math.floor(elapsed / windowMs)

    if (windowsPassed >= 2) {
      // 超过 2 个窗口无活动 → 完全重置
      entry.count = 1
      entry.windowStart = now
      entry.previousCount = 0
    } else {
      // 恰好跨 1 个窗口 → 滑动
      entry.previousCount = entry.count
      entry.count = 1
      entry.windowStart += windowMs
    }
  } else {
    // 同一窗口内 → 累加
    entry.count++
  }

  // ── 滑动窗口加权估算 ──
  const elapsedInWindow = now - entry.windowStart
  const overlapRatio = Math.max(0, (windowMs - elapsedInWindow) / windowMs)
  const estimatedCount = entry.count + entry.previousCount * overlapRatio

  const resetAt = entry.windowStart + windowMs
  const allowed = estimatedCount <= limit
  const remaining = Math.max(0, Math.floor(limit - estimatedCount))

  return { allowed, remaining, resetAt }
}

// ╔════════════════════════════════════════════════════════════════╗
// ║  5. 辅助工具                                                   ║
// ╚════════════════════════════════════════════════════════════════╝

/**
 * 从请求中提取 API Key 原文
 *
 * 来源优先级：
 *   1. X-Api-Key header
 *   2. Authorization: Bearer ak_live_...
 */
export function extractApiKey(event: H3Event): string | null {
  const xApiKey = getHeader(event, 'x-api-key')
  if (xApiKey && xApiKey.startsWith('ak_live_')) return xApiKey

  const auth = getHeader(event, 'authorization') || ''
  if (auth.startsWith('Bearer ak_live_')) return auth.substring(7)

  return null
}

/**
 * 异步安全事件日志（fire-and-forget，不阻塞响应）
 */
export function logSecurityEvent(
  event: H3Event,
  code: string,
  details: Record<string, any>,
): void {
  // 使用 setImmediate 延迟执行，不阻塞当前请求
  setImmediate(async () => {
    try {
      const db = getDB(event)
      await db.from('activity_logs').insert({
        category: 'system',
        action: `api_security_${code.toLowerCase()}`,
        user_id: null,
        ip: getClientRealIP(event),
        metadata: { code, ...details, status: 'BLOCKED' },
      })
    } catch (err) {
      // 审计系统自身异常静默处理
      console.error('[API Security] Failed to log security event:', (err as Error).message)
    }
  })
}

/**
 * 异步更新 Key 最后使用时间（fire-and-forget）
 */
export function updateKeyLastUsed(event: H3Event, keyId: string): void {
  setImmediate(async () => {
    try {
      const db = getDB(event)
      await db.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', keyId)
    } catch { /* 静默处理 */ }
  })
}
