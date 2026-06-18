/**
 * POST /api/admin/security/keys — 创建 API Key
 *
 * 返回一次性明文 API Key + 签名密钥，关闭窗口后不可再查。
 */
// @api-auth: admin
import { z } from 'zod'
import { randomBytes, createHash } from 'node:crypto'
import { getDB } from '~~/server/utils/db'
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess, throwError } from '~~/server/utils/response'
import { logAuditEvent } from '~~/server/utils/logger'

const BodySchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z.array(z.enum(['read', 'write', 'admin'])).min(1).optional(),
  allowed_endpoints: z.array(z.string()).optional().nullable(),
  rate_limit_override: z.number().int().min(1).optional().nullable(),
  require_signature: z.boolean().optional(),
  expires_at: z.string().datetime().optional().nullable(),
})

defineRouteMeta({
  openAPI: {
    tags: ['管理·系统-安全'],
    summary: '管理员：创建 API Key（一次性返回明文）',
    security: [{ BearerAuth: [] }],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['name'],
            properties: {
              name: { type: 'string' },
              permissions: { type: 'array', items: { type: 'string' } },
              allowed_endpoints: { type: 'array', items: { type: 'string' }, nullable: true },
              rate_limit_override: { type: 'integer', nullable: true },
              require_signature: { type: 'boolean' },
              expires_at: { type: 'string', format: 'date-time', nullable: true },
            },
          },
        },
      },
    },
    responses: {
      200: { description: 'API Key 已创建（一次性返回明文）' },
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

  const { name, permissions, allowed_endpoints, rate_limit_override, require_signature, expires_at } = parsed.data!

  // 生成 API Key: ak_live_ + 32 字节随机 hex = 72 字符
  const apiKey = `ak_live_${randomBytes(32).toString('hex')}`

  // 生成签名密钥: sk_live_ + 32 字节随机 hex = 72 字符
  const signingSecret = `sk_live_${randomBytes(32).toString('hex')}`

  // Key 哈希（DB 只存哈希，不存原文）
  const keyHash = createHash('sha256').update(apiKey).digest('hex')

  // Key 前缀（前 12 字符，用于管理后台脱敏展示）
  const keyPrefix = apiKey.substring(0, 12)

  const record = {
    name,
    key_prefix: keyPrefix,
    key_hash: keyHash,
    signing_secret: signingSecret,
    require_signature: require_signature ?? false,
    permissions: permissions || ['read'],
    allowed_endpoints: allowed_endpoints || null,
    rate_limit_override: rate_limit_override || null,
    is_active: true,
    expires_at: expires_at || null,
    created_by: user.id,
  }

  const { data, error } = await db
    .from('api_keys')
    .insert(record)
    .select('id, name, key_prefix, permissions, allowed_endpoints, rate_limit_override, require_signature, is_active, expires_at, created_at')
    .single()

  if (error) {
    throwError(500, 'Failed to create API key')
  }

  await logAuditEvent(event, user, `API_KEY_CREATED: ${name} (${keyPrefix}...)`)

  // 一次性返回明文 Key 和签名密钥
  return sendSuccess(event, {
    ...data,
    apiKey,          // 一次性明文，后续不可再查
    signingSecret,   // 一次性明文，后续不可再查
  }, 'API key created successfully. Please save the key and signing secret immediately — they will not be shown again.')
})
