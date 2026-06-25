/**
 * 05.api-security.ts — 安全响应头 + API 安全策略执行中间件
 *
 * 在 04.auth-guard 之后执行。
 * ① 全局安全响应头注入（所有页面 + API + 静态资源均覆盖）
 * ②～⑨ API v1 安全策略链（仅 /api/v1/ 路径）：
 *   ② 快速放行系统路径
 *   ③ 全局短路（allDisabled）
 *   ④ IP 黑白名单（预编译 Set，O(1)）
 *   ⑤ 国家限制（预编译 Set + CDN 头，O(1)）
 *   ⑥ API Key 提取与验证（二级缓存）
 *   ⑦ 请求签名验证（HMAC-SHA256，per-key 可选）
 *   ⑧ 端点访问控制（预编译 Map，O(1)）
 *   ⑨ 速率限制（固定窗口计数器）
 */
// @api-auth: public
import { defineEventHandler, getHeader, readRawBody, setHeader } from 'h3'
import { getClientRealIP, getClientCountry } from '~~/server/utils/ip'
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

// ──────────────────────────────────────────────
// 全局安全响应头（所有响应统一注入，零额外开销）
// ──────────────────────────────────────────────
const SECURITY_HEADERS: Record<string, string> = {
  // 仅允许 HTTPS 访问（含子域名，HSTS 预加载候选）
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  // 禁止浏览器 MIME 类型嗅探
  'X-Content-Type-Options': 'nosniff',
  // 跨域不泄露完整 URL（仅同源发送 referrer）
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // 禁用浏览器功能策略（摄像头、麦克风、定位等默认关闭）
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

/**
 * 动态生成 iframe 嵌入策略（CSP frame-ancestors）
 * - 生产自定义域名：允许 *.rootdomain 嵌入（管理后台预览跨子域名）
 * - localhost / vercel.app：仅允许同源
 */
function resolveFrameAncestors(host: string): string {
  if (!host || host === 'localhost' || host.endsWith('.vercel.app')) {
    return "frame-ancestors 'self'"
  }
  // 提取根域名，允许所有子域名嵌入
  const parts = host.split('.')
  const root = parts.length > 2 ? parts.slice(-2).join('.') : host
  return `frame-ancestors 'self' https://*.${root}`
}

export default defineEventHandler(async (event) => {
  // ── 全局安全响应头（最先注入，覆盖所有页面 + API） ──
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    setHeader(event, key, value)
  }

  // ── 动态 iframe 嵌入策略（CSP frame-ancestors，支持跨子域名预览） ──
  const host = (getHeader(event, 'host') || '').split(':')[0] || ''
  setHeader(event, 'Content-Security-Policy', resolveFrameAncestors(host))

  const path = event.path

  // ── 动态 CORS 头（仅对 /api/v1/ 路径生效） ──
  if (path.startsWith('/api/v1/')) {
    try {
      const policy = await loadSecurityPolicy(event)
      if (policy.corsConfig) {
        const origin = getHeader(event, 'origin') || ''
        const cc = policy.corsConfig

        // 检查 origin 是否在允许列表中（支持通配符，含域名边界校验）
        const isAllowed = origin !== '' && cc.allowedOrigins.some(allowed => {
          if (allowed === '*') return true
          if (allowed.startsWith('*.')) {
            const suffix = allowed.slice(1) // '.example.com'
            try {
              const host = new URL(origin).hostname
              return host.endsWith(suffix) || host === suffix.slice(1)
            } catch { return false }
          }
          return origin === allowed
        })

        if (isAllowed) {
          setHeader(event, 'Access-Control-Allow-Origin', origin)
          setHeader(event, 'Access-Control-Allow-Methods', cc.allowedMethods.join(', '))
          setHeader(event, 'Access-Control-Allow-Headers', cc.allowedHeaders.join(', '))
          if (cc.allowCredentials) {
            setHeader(event, 'Access-Control-Allow-Credentials', 'true')
          }
          setHeader(event, 'Access-Control-Max-Age', cc.maxAge as any)
          // Vary: Origin 确保缓存正确区分不同 origin
          setHeader(event, 'Vary', 'Origin')

          // OPTIONS 预检请求快速返回（仅对合法 Origin）
          if (event.method === 'OPTIONS') {
            event.node.res.statusCode = 204
            event.node.res.end()
            return
          }
        }
      }
    } catch {
      // CORS 策略加载失败不阻断请求，回退到 nuxt.config.ts 的 routeRules
    }
  }

  // ── 仅对 /api/v1/ 路径生效以下安全检查 ──
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
    const _limitKey = apiKeyData
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
