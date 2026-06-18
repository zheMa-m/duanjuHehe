/**
 * GET /api/admin/security/keys — 列出所有 API Key（脱敏展示）
 */
// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['管理·系统-安全'],
    summary: '管理员：列出所有 API Key（脱敏）',
    security: [{ BearerAuth: [] }],
    responses: {
      200: { description: 'API Key 列表（仅展示 key_prefix，不暴露原文）' },
      403: { description: '非管理员' },
    },
  } as any,
})

export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)

  const { data, error } = await db
    .from('api_keys')
    .select('id, name, key_prefix, permissions, allowed_endpoints, rate_limit_override, require_signature, is_active, last_used_at, expires_at, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (error) {
    return sendSuccess(event, [], 'No API keys found')
  }

  return sendSuccess(event, data || [], 'API keys retrieved successfully')
})
