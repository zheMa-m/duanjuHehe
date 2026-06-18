/**
 * DELETE /api/admin/security/keys/[id] — 吊销 API Key
 *
 * 物理删除 + 同步清除该 Key 缓存条目（立即生效）。
 */
// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess, throwError } from '~~/server/utils/response'
import { logAuditEvent } from '~~/server/utils/logger'
import { invalidateKeyCache } from '~~/server/utils/api-security'

defineRouteMeta({
  openAPI: {
    tags: ['管理·系统-安全'],
    summary: '管理员：吊销 API Key（物理删除）',
    security: [{ BearerAuth: [] }],
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
    ],
    responses: {
      200: { description: 'API Key 已吊销' },
      403: { description: '非管理员' },
      404: { description: 'API Key 不存在' },
    },
  } as any,
})

export default defineEventHandler(async (event) => {
  const user = assertAdmin(event)
  const db = getDB(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throwError(400, 'Missing key ID')
  }

  // 先查出记录（获取 key_hash 以清缓存）
  const { data: existing, error: findErr } = await db
    .from('api_keys')
    .select('id, name, key_hash, key_prefix')
    .eq('id', id)
    .single()

  if (findErr || !existing) {
    throwError(404, 'API key not found')
  }

  // 物理删除
  const { error } = await db
    .from('api_keys')
    .delete()
    .eq('id', id)

  if (error) {
    throwError(500, 'Failed to revoke API key')
  }

  // 同步清除该 Key 的缓存条目（立即生效）
  invalidateKeyCache(existing.key_hash)

  await logAuditEvent(event, user, `API_KEY_REVOKED: ${existing.name} (${existing.key_prefix}...)`)

  return sendSuccess(event, { id, revoked: true }, 'API key revoked successfully')
})
