
// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['管理·系统-审计'],
    summary: '管理员：获取活动日志（分页）',
    description: '返回所有活动日志条目（分页，按 created_at 降序排列）。支持按类别和日期范围筛选。',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'query', name: 'page', schema: { type: 'integer', default: 1 }, description: '页码' },
      { in: 'query', name: 'pageSize', schema: { type: 'integer', default: 20 }, description: '每页条数（最大 100）' },
      { in: 'query', name: 'category', schema: { type: 'string' }, description: '筛选类别（ALL 为全部）' },
      { in: 'query', name: 'dateFrom', schema: { type: 'string', format: 'date' }, description: '起始日期 (YYYY-MM-DD)' },
      { in: 'query', name: 'dateTo', schema: { type: 'string', format: 'date' }, description: '结束日期 (YYYY-MM-DD)' },
    ],
    responses: {
      200: { description: '分页活动日志列表（含总数）' },
    },
  } as any,
})

export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)

  const query = getQuery(event)
  const page = Math.max(parseInt(query.page as string) || 1, 1)
  const pageSize = Math.min(parseInt(query.pageSize as string) || 20, 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let dbQuery = db.from('activity_logs').select('*', { count: 'exact' })

  // 类别筛选
  const category = query.category as string
  if (category && category !== 'ALL') {
    dbQuery = dbQuery.eq('category', category)
  }

  // 日期范围筛选
  const dateFrom = query.dateFrom as string
  const dateTo = query.dateTo as string
  if (dateFrom) {
    dbQuery = dbQuery.gte('created_at', `${dateFrom}T00:00:00Z`)
  }
  if (dateTo) {
    dbQuery = dbQuery.lte('created_at', `${dateTo}T23:59:59Z`)
  }

  const { data: logs, error, count } = await dbQuery
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch activity logs' })
  }

  return sendSuccess(event, {
    items: logs || [],
    pagination: { page, pageSize, total: count || 0 },
  }, 'Fetched activity logs successfully')
})
