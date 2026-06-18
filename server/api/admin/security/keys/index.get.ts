/**
 * GET /api/admin/security/keys — 列出所有 API Key（脱敏展示，分页 + 搜索）
 *
 * Query params:
 *   page     - 页码，默认 1
 *   pageSize - 每页条数，默认 50，最大 100
 *   search   - 按名称模糊搜索
 */
// @api-auth: admin
import { z } from 'zod'
import { getDB } from '~~/server/utils/db'
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().optional(),
})

defineRouteMeta({
  openAPI: {
    tags: ['管理·系统-安全'],
    summary: '管理员：列出所有 API Key（脱敏，分页 + 搜索）',
    security: [{ BearerAuth: [] }],
    parameters: [
      { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
      { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 50 } },
      { name: 'search', in: 'query', schema: { type: 'string' } },
    ],
    responses: {
      200: { description: 'API Key 分页列表（仅展示 key_prefix，不暴露原文）' },
      403: { description: '非管理员' },
    },
  } as any,
})

export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)

  const rawQuery = getQuery(event)
  const parsed = QuerySchema.safeParse(rawQuery)
  if (!parsed.success) {
    return sendSuccess(event, { items: [], pagination: { page: 1, pageSize: 50, total: 0 } }, 'Invalid query parameters')
  }

  const { page, pageSize, search } = parsed.data
  const offset = (page - 1) * pageSize

  let query = db
    .from('api_keys')
    .select('id, name, key_prefix, permissions, allowed_endpoints, rate_limit_override, require_signature, is_active, last_used_at, expires_at, created_at, updated_at', { count: 'exact' })
    .order('created_at', { ascending: false })

  // 按名称模糊搜索
  if (search) {
    query = query.ilike('name', `%${search}%`)
  }

  const { data, error, count } = await query.range(offset, offset + pageSize - 1)

  if (error) {
    return sendSuccess(event, { items: [], pagination: { page, pageSize, total: 0 } }, 'No API keys found')
  }

  return sendSuccess(event, {
    items: data || [],
    pagination: { page, pageSize, total: count ?? 0 },
  }, 'API keys retrieved successfully')
})
