/**
 * POST /api/admin/security/keys/batch-revoke — 批量吊销 API Key
 *
 * 接收 ID 数组，批量物理删除并同步清除缓存。
 * 返回每个 ID 的操作结果（成功/失败）。
 */
// @api-auth: admin
import { z } from 'zod'
import { getDB } from '~~/server/utils/db'
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess, throwError } from '~~/server/utils/response'
import { logAuditEvent } from '~~/server/utils/logger'
import { invalidateKeyCache } from '~~/server/utils/api-security'

const BodySchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
})

defineRouteMeta({
  openAPI: {
    tags: ['Admin Security'],
    summary: '管理员：批量吊销 API Key',
    security: [{ BearerAuth: [] }],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['ids'],
            properties: { ids: { type: 'array', items: { type: 'string', format: 'uuid' }, maxItems: 100 } },
          },
        },
      },
    },
    responses: {
      200: { description: '批量吊销结果' },
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
    throwError(400, 'Invalid request body', parsed.error.flatten())
  }

  const { ids } = parsed.data!
  const results: { id: string; name: string; success: boolean; error?: string }[] = []

  // 先批量查出所有 Key（获取 key_hash 以清缓存）
  const { data: keys, error: findErr } = await db
    .from('api_keys')
    .select('id, name, key_hash, key_prefix')
    .in('id', ids)

  if (findErr) {
    throwError(500, 'Failed to query API keys for batch revoke', findErr)
  }

  const keyMap = new Map((keys || []).map((k: any) => [k.id, k]))

  for (const id of ids) {
    const key = keyMap.get(id)
    if (!key) {
      results.push({ id, name: 'unknown', success: false, error: 'Key not found' })
      continue
    }

    const { error } = await db
      .from('api_keys')
      .delete()
      .eq('id', id)

    if (error) {
      results.push({ id, name: key.name, success: false, error: error.message || 'Delete failed' })
      continue
    }

    invalidateKeyCache(key.key_hash)
    await logAuditEvent(event, user, `API_KEY_REVOKED: ${key.name} (${key.key_prefix}...) [batch]`)

    results.push({ id, name: key.name, success: true })
  }

  const successCount = results.filter(r => r.success).length
  const failCount = results.filter(r => !r.success).length

  return sendSuccess(event, {
    total: ids.length,
    successCount,
    failCount,
    results,
  }, `Batch revoke completed: ${successCount} succeeded, ${failCount} failed`)
})
