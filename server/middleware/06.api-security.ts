/**
 * 06.api-security.ts — API 安全策略执行中间件
 *
 * 在 05.access-guard 之后执行，仅对 /api/v1/ 路径生效。
 * 管理后台 /api/admin/* 完全跳过（有自己的 JWT + assertAdmin 体系）。
 *
 * 执行链：
 *   ① 快速放行系统路径
 *   ② 全局短路（allDisabled）
 *   ③ IP 黑白名单（预编译 Set，O(1)）
 *   ④ 国家限制（预编译 Set + CDN 头，O(1)）
 *   ⑤ API Key 提取与验证（二级缓存）
 *   ⑥ 请求签名验证（HMAC-SHA256，per-key 可选）
 *   ⑦ 端点访问控制（预编译 Map，O(1)）
 *   ⑧ 速率限制（固定窗口计数器）
 */
// @api-auth: public
import { defineEventHandler, getHeader, readRawBody, setHeader } from 'h3'
import { getClientRealIP } from '~~/server/utils/ip'
import { getClientCountry } from '~~/server/utils/ip'
import {
  loadSecurityPolicy,
  resolveApiKey,
  extractApiKey,
  verifyRequestSignature,
  checkRateLimit,
  logSecurityEvent,
  updateKeyLastUsed,
  type CachedKeyData,
} from '~~/server/utils/api-security'

/** 快速放行路径前缀（不做任何安全检查） */
const BYPASS_PREFIXES = [
  '/api/admin/',
  '/api/v1/auth/',
  '/api/v1/access/',
]

const BYPASS_EXACT = [
  '/api/v1/payments/webhook',
  '/api/v1/payments/confirm',
]

export default defineEventHandler(async (event) => {
  const path = event.path

  // ── 仅对 /api/v1/ 路径生效 ──
  if (!path.startsWith('/api/v1/')) return

  // ── ① 快速放行系统路径 ──
  if (BYPASS_EXACT.includes(path)) return
  if (BYPASS_PREFIXES.some(p => path.startsWith(p))) return

  // ── ② 加载策略 + 全局短路 ──
  const policy = await loadSecurityPolicy(event)
  if (policy.allDisabled) return

  const ip = getClientRealIP(event)
  const country = getClientCountry(event)
  const method = (event.method || 'GET').toUpperCase()

  // ── ③ IP 黑白名单 ──
  if (policy.ipPolicy.mode !== 'disabled' && policy.ipPolicy.ipSet.size > 0) {
    if (policy.ipPolicy.mode === 'blacklist') {
      if (policy.ipPolicy.ipSet.has(ip)) {
        logSecurityEvent(event, 'IP_BLOCKED', { ip, country, path, method })
        throw createError({
          statusCode: 403,
          statusMessage: 'Access denied: IP address is blocked.',
          data: { code: 'IP_BLOCKED' },
        })
      }
    } else if (policy.ipPolicy.mode === 'whitelist') {
      if (!policy.ipPolicy.ipSet.has(ip)) {
        logSecurityEvent(event, 'IP_NOT_ALLOWED', { ip, country, path, method })
        throw createError({
          statusCode: 403,
          statusMessage: 'Access denied: IP address is not in the allowed list.',
          data: { code: 'IP_NOT_ALLOWED' },
        })
      }
    }
  }

  // ── ④ 国家限制 ──
  if (policy.countryPolicy.enabled && policy.countryPolicy.countrySet.size > 0 && country !== 'XX') {
    if (policy.countryPolicy.mode === 'blacklist') {
      if (policy.countryPolicy.countrySet.has(country)) {
        logSecurityEvent(event, 'COUNTRY_BLOCKED', { ip, country, path, method })
        throw createError({
          statusCode: 403,
          statusMessage: 'Access denied: requests from this country are not allowed.',
          data: { code: 'COUNTRY_BLOCKED' },
        })
      }
    } else if (policy.countryPolicy.mode === 'whitelist') {
      if (!policy.countryPolicy.countrySet.has(country)) {
        logSecurityEvent(event, 'COUNTRY_NOT_ALLOWED', { ip, country, path, method })
        throw createError({
          statusCode: 403,
          statusMessage: 'Access denied: requests from this country are not allowed.',
          data: { code: 'COUNTRY_NOT_ALLOWED' },
        })
      }
    }
  }

  // ── ⑤ API Key 提取与验证 ──
  const rawKey = extractApiKey(event)
  let apiKeyData: CachedKeyData | null = null
  const endpointKey = `${method}:${path}`
  const endpointOverride = policy.endpointOverrides.get(endpointKey)

  if (rawKey) {
    apiKeyData = await resolveApiKey(event, rawKey)

    if (!apiKeyData) {
      logSecurityEvent(event, 'INVALID_API_KEY', { ip, country, path, method })
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid or inactive API key.',
        data: { code: 'INVALID_API_KEY' },
      })
    }

    // 检查 Key 端点白名单
    if (apiKeyData.allowedEndpoints && apiKeyData.allowedEndpoints.length > 0) {
      if (!apiKeyData.allowedEndpoints.includes(endpointKey)) {
        logSecurityEvent(event, 'ENDPOINT_NOT_ALLOWED', { ip, country, path, method, keyPrefix: apiKeyData.keyPrefix })
        throw createError({
          statusCode: 403,
          statusMessage: 'API key does not have permission to access this endpoint.',
          data: { code: 'ENDPOINT_NOT_ALLOWED' },
        })
      }
    }

    // 将 Key 信息附加到 event context（供后续 handler 使用）
    event.context.apiKey = apiKeyData

    // 异步更新 last_used_at（fire-and-forget）
    updateKeyLastUsed(event, apiKeyData.id)

    // ── ⑥ 请求签名验证（per-key 可选） ──
    const needSignature = apiKeyData.requireSignature || policy.signatureRequired
    if (needSignature) {
      const timestamp = getHeader(event, 'x-api-timestamp') || ''
      const signature = getHeader(event, 'x-api-signature') || ''

      if (!timestamp || !signature) {
        logSecurityEvent(event, 'SIGNATURE_MISSING', { ip, country, path, method, keyPrefix: apiKeyData.keyPrefix })
        throw createError({
          statusCode: 403,
          statusMessage: 'Request signature is required. Provide X-Api-Timestamp and X-Api-Signature headers.',
          data: { code: 'SIGNATURE_MISSING' },
        })
      }

      // 读取请求体（用于签名验证）
      const rawBody = await readRawBody(event, false).catch(() => '') || ''
      const body = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf-8')

      const isValid = verifyRequestSignature(
        method, path, timestamp, body,
        apiKeyData.signingSecret, signature,
      )

      if (!isValid) {
        logSecurityEvent(event, 'INVALID_SIGNATURE', { ip, country, path, method, keyPrefix: apiKeyData.keyPrefix })
        throw createError({
          statusCode: 403,
          statusMessage: 'Invalid request signature or expired timestamp.',
          data: { code: 'INVALID_SIGNATURE' },
        })
      }
    }
  } else {
    // 未携带 API Key
    // 检查端点是否强制要求 Key
    if (endpointOverride && endpointOverride.enabled === false) {
      // 端点被禁用（无论有无 Key）
      logSecurityEvent(event, 'ENDPOINT_DISABLED', { ip, country, path, method })
      throw createError({
        statusCode: 403,
        statusMessage: 'This endpoint is currently disabled.',
        data: { code: 'ENDPOINT_DISABLED' },
      })
    }
  }

  // ── ⑦ 端点访问控制 ──
  if (endpointOverride && endpointOverride.enabled === false) {
    logSecurityEvent(event, 'ENDPOINT_DISABLED', { ip, country, path, method, keyPrefix: apiKeyData?.keyPrefix })
    throw createError({
      statusCode: 403,
      statusMessage: 'This endpoint is currently disabled.',
      data: { code: 'ENDPOINT_DISABLED' },
    })
  }

  // ── ⑧ 速率限制 ──
  if (policy.rateLimit.enabled) {
    const limitKey = apiKeyData
      ? (policy.rateLimit.byApiKey ? `key:${apiKeyData.id}` : `ip:${ip}`)
      : `ip:${ip}`

    // 确定速率上限（Key 独立覆盖 > 全局配置）
    const overrideLimit = apiKeyData?.rateLimitOverride
    const endpointLimit = endpointOverride?.rateLimit
    const maxRequests = overrideLimit ?? endpointLimit ?? policy.rateLimit.maxRequests
    const windowMs = policy.rateLimit.windowSeconds * 1000

    if (policy.rateLimit.byIp && !apiKeyData) {
      // 无 Key 时按 IP 限流
      const result = checkRateLimit(`ip:${ip}`, maxRequests, windowMs)
      setHeader(event, 'X-RateLimit-Limit', String(maxRequests))
      setHeader(event, 'X-RateLimit-Remaining', String(result.remaining))
      setHeader(event, 'X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)))

      if (!result.allowed) {
        const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000)
        setHeader(event, 'Retry-After', Math.max(1, retryAfter) as any)
        logSecurityEvent(event, 'RATE_LIMITED', { ip, country, path, method })
        throw createError({
          statusCode: 429,
          statusMessage: 'Rate limit exceeded. Please try again later.',
          data: { code: 'RATE_LIMITED', retryAfter: Math.max(1, retryAfter) },
        })
      }
    } else if (apiKeyData) {
      // 有 Key 时按 Key 限流
      const result = checkRateLimit(`key:${apiKeyData.id}`, maxRequests, windowMs)
      setHeader(event, 'X-RateLimit-Limit', String(maxRequests))
      setHeader(event, 'X-RateLimit-Remaining', String(result.remaining))
      setHeader(event, 'X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)))

      if (!result.allowed) {
        const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000)
        setHeader(event, 'Retry-After', Math.max(1, retryAfter) as any)
        logSecurityEvent(event, 'RATE_LIMITED', { ip, country, path, method, keyPrefix: apiKeyData.keyPrefix })
        throw createError({
          statusCode: 429,
          statusMessage: 'Rate limit exceeded for this API key.',
          data: { code: 'RATE_LIMITED', retryAfter: Math.max(1, retryAfter) },
        })
      }
    }
  }
})
