/**
 * GET /api/admin/security/policy — 读取当前 API 安全策略配置
 */
// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['管理·系统-安全'],
    summary: '管理员：读取 API 安全策略配置',
    security: [{ BearerAuth: [] }],
    responses: {
      200: { description: '当前安全策略配置（含缓存状态）' },
      403: { description: '非管理员' },
    },
  } as any,
})

export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)

  const { data, error } = await db
    .from('api_security_settings')
    .select('*')
    .eq('id', true)
    .single()

  if (error || !data) {
    // 表不存在或为空 → 返回默认配置
    return sendSuccess(event, {
      rate_limit: { enabled: false, window_seconds: 60, max_requests: 100, by_api_key: true, by_ip: true },
      ip_policy: { mode: 'disabled', whitelist: [], blacklist: [] },
      country_policy: { enabled: false, mode: 'blacklist', countries: [] },
      signature_required: false,
      endpoint_overrides: {},
      updated_at: null,
    }, 'Default security policy (not yet configured)')
  }

  return sendSuccess(event, {
    rate_limit: data.rate_limit,
    ip_policy: data.ip_policy,
    country_policy: data.country_policy,
    signature_required: data.signature_required,
    endpoint_overrides: data.endpoint_overrides,
    updated_at: data.updated_at,
  }, 'Security policy retrieved successfully')
})
