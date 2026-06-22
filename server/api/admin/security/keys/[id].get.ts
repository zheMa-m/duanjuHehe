/**
 * GET /api/admin/security/keys/[id] — 查看单个 API Key 详情
 *
 * 返回脱敏后的 Key 完整配置（不含 key_hash、signing_secret）。
 * 不返回明文 API Key（创建时一次性返回，此后不可再查）。
 */
// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess, throwError } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['Admin Security'],
    summary: '管理员：查看单个 API Key 详情',
    security: [{ BearerAuth: [] }],
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
    ],
    responses: {
      200: { description: 'API Key 详情（脱敏）' },
      403: { description: '非管理员' },
      404: { description: 'API Key 不存在' },
    },
  } as any,
})

export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throwError(400, 'Missing key ID')
  }

  const { data: key, error } = await db
    .from('api_keys')
    .select('id, name, key_prefix, permissions, allowed_endpoints, rate_limit_override, require_signature, is_active, last_used_at, expires_at, created_by, created_at, updated_at')
    .eq('id', id)
    .single()

  if (error || !key) {
    throwError(404, 'API key not found')
  }

  // 不返回 key_hash 和 signing_secret（安全原则：明文仅在创建时一次性返回）
  return sendSuccess(event, key, 'API key detail retrieved')
})
