/**
 * GET /api/admin/security/logs — 安全事件日志（分页 + 筛选）
 *
 * Query params:
 *   page        - 页码，默认 1
 *   pageSize    - 每页条数，默认 30，最大 100
 *   eventType   - 事件类型筛选（如 IP_BLOCKED, RATE_LIMITED, INVALID_API_KEY 等）
 *   from        - 起始时间 ISO 8601
 *   to          - 结束时间 ISO 8601
 */
// @api-auth: admin
import { z } from 'zod'
import { getDB } from '~~/server/utils/db'
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
  eventType: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
})

defineRouteMeta({
  openAPI: {
    tags: ['管理·系统-安全'],
    summary: '管理员：查询安全事件日志（分页 + 筛选）',
    security: [{ BearerAuth: [] }],
    parameters: [
      { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
      { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 30 } },
      { name: 'eventType', in: 'query', schema: { type: 'string' } },
      { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' } },
      { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' } },
    ],
    responses: {
      200: { description: '安全事件日志分页列表' },
      403: { description: '非管理员' },
    },
  } as any,
})

/** 所有可用的安全事件类型 */
const EVENT_TYPES = [
  'IP_BLOCKED', 'IP_NOT_ALLOWED',
  'COUNTRY_BLOCKED', 'COUNTRY_NOT_ALLOWED',
  'INVALID_API_KEY', 'ENDPOINT_NOT_ALLOWED', 'ENDPOINT_DISABLED',
  'SIGNATURE_MISSING', 'INVALID_SIGNATURE',
  'RATE_LIMITED',
] as const

export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)

  const rawQuery = getQuery(event)
  const parsed = QuerySchema.safeParse(rawQuery)
  if (!parsed.success) {
    return sendSuccess(event, { items: [], pagination: { page: 1, pageSize: 30, total: 0 } }, 'Invalid query parameters')
  }

  const { page, pageSize, eventType, from, to } = parsed.data
  const offset = (page - 1) * pageSize

  // 构建查询
  let query = db
    .from('activity_logs')
    .select('id, category, action, user_id, ip, metadata, created_at', { count: 'exact' })
    .eq('category', 'system')
    .like('action', 'api_security_%')
    .order('created_at', { ascending: false })

  // 事件类型筛选
  if (eventType && EVENT_TYPES.includes(eventType as any)) {
    query = query.like('action', `api_security_${eventType.toLowerCase()}%`)
  }

  // 时间范围筛选
  if (from) {
    query = query.gte('created_at', from)
  }
  if (to) {
    query = query.lte('created_at', to)
  }

  // 分页
  const { data, error, count } = await query.range(offset, offset + pageSize - 1)

  if (error) {
    return sendSuccess(event, { items: [], pagination: { page, pageSize, total: 0 } }, 'No security events found')
  }

  return sendSuccess(event, {
    items: data || [],
    pagination: { page, pageSize, total: count ?? 0 },
  }, 'Security event logs retrieved successfully')
})
