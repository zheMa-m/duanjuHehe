/**
 * PATCH /api/admin/security/keys/[id] — 更新 API Key
 *
 * 可更新：名称、权限、状态、签名要求、端点白名单、速率限制覆盖、过期时间。
 * 更新后同步清除该 Key 的缓存条目（立即生效）。
 */
// @api-auth: admin
import { z } from 'zod'
import { getDB } from '~~/server/utils/db'
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess, throwError } from '~~/server/utils/response'
import { logAuditEvent } from '~~/server/utils/logger'
import { invalidateKeyCache } from '~~/server/utils/api-security'

const BodySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  permissions: z.array(z.enum(['read', 'write', 'admin'])).min(1).optional(),
  allowed_endpoints: z.array(z.string()).optional().nullable(),
  rate_limit_override: z.number().int().min(1).optional().nullable(),
  require_signature: z.boolean().optional(),
  is_active: z.boolean().optional(),
  expires_at: z.string().datetime().optional().nullable(),
}).strict()

defineRouteMeta({
  openAPI: {
    tags: ['管理·系统-安全'],
    summary: '管理员：更新 API Key 配置',
    security: [{ BearerAuth: [] }],
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
    ],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              permissions: { type: 'array', items: { type: 'string' } },
              allowed_endpoints: { type: 'array', items: { type: 'string' }, nullable: true },
              rate_limit_override: { type: 'integer', nullable: true },
              require_signature: { type: 'boolean' },
              is_active: { type: 'boolean' },
              expires_at: { type: 'string', format: 'date-time', nullable: true },
            },
          },
        },
      },
    },
    responses: {
      200: { description: 'API Key 已更新' },
      400: { description: '参数校验失败' },
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

  const body = await readBody(event)
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    throwError(400, 'Invalid request body', parsed.error.flatten())
  }

  // 先查出旧记录（用于获取 key_hash 以清缓存）
  const { data: existing, error: findErr } = await db
    .from('api_keys')
    .select('id, name, key_hash, key_prefix')
    .eq('id', id)
    .single()

  if (findErr || !existing) {
    throwError(404, 'API key not found')
  }

  const updates: Record<string, any> = {}
  const data = parsed.data!

  if (data.name !== undefined) updates.name = data.name
  if (data.permissions !== undefined) updates.permissions = data.permissions
  if (data.allowed_endpoints !== undefined) updates.allowed_endpoints = data.allowed_endpoints
  if (data.rate_limit_override !== undefined) updates.rate_limit_override = data.rate_limit_override
  if (data.require_signature !== undefined) updates.require_signature = data.require_signature
  if (data.is_active !== undefined) updates.is_active = data.is_active
  if (data.expires_at !== undefined) updates.expires_at = data.expires_at

  if (Object.keys(updates).length === 0) {
    return sendSuccess(event, existing, 'No changes detected')
  }

  updates.updated_at = new Date().toISOString()

  const { data: updated, error } = await db
    .from('api_keys')
    .update(updates)
    .eq('id', id)
    .select('id, name, key_prefix, permissions, allowed_endpoints, rate_limit_override, require_signature, is_active, last_used_at, expires_at, created_at, updated_at')
    .single()

  if (error) {
    throwError(500, 'Failed to update API key')
  }

  // 同步清除该 Key 的缓存条目（立即生效）
  invalidateKeyCache(existing.key_hash)

  await logAuditEvent(event, user, `API_KEY_UPDATED: ${existing.name} (${existing.key_prefix}...) — fields: ${Object.keys(updates).filter(k => k !== 'updated_at').join(', ')}`)

  return sendSuccess(event, updated, 'API key updated successfully')
})
