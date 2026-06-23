// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { assertAdmin } from '~~/server/utils/auth'
import { logAuditEvent } from '~~/server/utils/logger'

defineRouteMeta({
  openAPI: {
    tags: ['Admin 智能问卷'],
    summary: '获取 AI 占星报告（分页）',
    description: '管理员查看所有已生成的 智能问卷 AI 报告，支持状态过滤。',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
      { in: 'query', name: 'pageSize', schema: { type: 'integer', default: 20 } },
      { in: 'query', name: 'status', schema: { type: 'string' }, description: 'pending | generating | completed | failed' },
    ],
    responses: {
      200: { description: '分页报告列表' },
    },
  } as any,
})

export default defineEventHandler(async (event) => {
  const user = assertAdmin(event)
  const db = getDB(event)

  const query = getQuery(event)
  const page = Math.min(Math.max(parseInt(query.page as string) || 1, 1), 100)
  const pageSize = Math.min(parseInt(query.pageSize as string) || 20, 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const statusFilter = query.status as string | undefined

  let chain = db
    .from('ai_reports')
    .select('*', { count: 'exact', head: false })
    .order('created_at', { ascending: false })

  if (statusFilter) {
    chain = chain.eq('status', statusFilter)
  }

  const { data: items, error, count } = await chain.range(from, to)

  if (error) throw createError({ statusCode: 500, statusMessage: 'Failed to fetch reports' })

  await logAuditEvent(event, user, 'STARPATH_ADMIN_LIST_REPORTS', 'SUCCESS')

  return sendSuccess(event, {
    items: items || [],
    pagination: { page, pageSize, total: count || 0 },
  }, 'Reports retrieved')
})
