/**
 * PATCH /api/admin/security/policy — 更新全局 API 安全策略
 *
 * 更新后同步清除策略缓存，立即生效。
 */
// @api-auth: admin
import { z } from 'zod'
import { getDB } from '~~/server/utils/db'
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess, throwError } from '~~/server/utils/response'
import { logAuditEvent } from '~~/server/utils/logger'
import { invalidatePolicyCache, invalidateAllKeyCache } from '~~/server/utils/api-security'

const BodySchema = z.object({
  rate_limit: z.object({
    enabled: z.boolean(),
    window_seconds: z.number().int().min(1).max(86400),
    max_requests: z.number().int().min(1).max(100000),
    by_api_key: z.boolean(),
    by_ip: z.boolean(),
  }).optional(),
  ip_policy: z.object({
    mode: z.enum(['disabled', 'whitelist', 'blacklist']),
    whitelist: z.array(z.string()).optional(),
    blacklist: z.array(z.string()).optional(),
  }).optional(),
  country_policy: z.object({
    enabled: z.boolean(),
    mode: z.enum(['whitelist', 'blacklist']),
    countries: z.array(z.string().length(2)).optional(),
  }).optional(),
  signature_required: z.boolean().optional(),
  endpoint_overrides: z.record(z.object({
    enabled: z.boolean().optional(),
    rateLimit: z.number().int().min(1).optional(),
  })).optional(),
}).strict()

defineRouteMeta({
  openAPI: {
    tags: ['管理·系统-安全'],
    summary: '管理员：更新 API 安全策略配置',
    security: [{ BearerAuth: [] }],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              rate_limit: { type: 'object' },
              ip_policy: { type: 'object' },
              country_policy: { type: 'object' },
              signature_required: { type: 'boolean' },
              endpoint_overrides: { type: 'object' },
            },
          },
        },
      },
    },
    responses: {
      200: { description: '策略已更新' },
      400: { description: '参数校验失败' },
      403: { description: '非管理员' },
    },
  } as any,
})

export default defineEventHandler(async (event) => {
  const user = assertAdmin(event)
  const db = getDB(event)

  const body = await readBody(event)
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    throwError(400, 'Invalid policy configuration', parsed.error.flatten())
  }

  const updates: Record<string, any> = {}
  const data = parsed.data!

  if (data.rate_limit !== undefined) {
    updates.rate_limit = {
      enabled: data.rate_limit.enabled,
      window_seconds: data.rate_limit.window_seconds,
      max_requests: data.rate_limit.max_requests,
      by_api_key: data.rate_limit.by_api_key,
      by_ip: data.rate_limit.by_ip,
    }
  }
  if (data.ip_policy !== undefined) {
    updates.ip_policy = {
      mode: data.ip_policy.mode,
      whitelist: data.ip_policy.whitelist || [],
      blacklist: data.ip_policy.blacklist || [],
    }
  }
  if (data.country_policy !== undefined) {
    updates.country_policy = {
      enabled: data.country_policy.enabled,
      mode: data.country_policy.mode,
      countries: (data.country_policy.countries || []).map(c => c.toUpperCase()),
    }
  }
  if (data.signature_required !== undefined) {
    updates.signature_required = data.signature_required
  }
  if (data.endpoint_overrides !== undefined) {
    updates.endpoint_overrides = data.endpoint_overrides
  }

  updates.updated_by = user.id
  updates.updated_at = new Date().toISOString()

  // UPSERT：确保单行存在
  const { error } = await db
    .from('api_security_settings')
    .upsert({ id: true, ...updates })

  if (error) {
    throwError(500, 'Failed to update security policy')
  }

  // 同步清除策略缓存（立即生效）
  invalidatePolicyCache()
  // 若修改了签名要求或端点覆盖，同步清除所有 Key 缓存，确保 requireSignature 重算
  if (data.signature_required !== undefined || data.endpoint_overrides !== undefined) {
    invalidateAllKeyCache()
  }

  // 审计日志
  await logAuditEvent(event, user, `SECURITY_POLICY_UPDATE: ${Object.keys(updates).filter(k => k !== 'updated_by' && k !== 'updated_at').join(', ')}`)

  return sendSuccess(event, { updated: true }, 'Security policy updated successfully')
})
