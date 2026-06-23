// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { assertAdmin } from '~~/server/utils/auth'
import { logAuditEvent } from '~~/server/utils/logger'

defineRouteMeta({
  openAPI: {
    tags: ['Admin 智能问卷'],
    summary: '获取 智能问卷 问卷答案（分页 + Session 聚合）',
    description: '管理员查看所有 智能问卷 问卷 session，支持按状态和搜索过滤。',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
      { in: 'query', name: 'pageSize', schema: { type: 'integer', default: 20 } },
      { in: 'query', name: 'status', schema: { type: 'string' }, description: 'started | in_progress | completed | abandoned' },
      { in: 'query', name: 'search', schema: { type: 'string' }, description: '搜索 session_key 或 full_name' },
    ],
    responses: {
      200: { description: '分页 session 列表（含答案统计）' },
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
  const searchTerm = query.search as string | undefined

  let chain = db
    .from('questionnaire_sessions')
    .select('*, questionnaire_answers(count)', { count: 'exact', head: false })
    .order('created_at', { ascending: false })

  if (statusFilter) {
    chain = chain.eq('status', statusFilter)
  }
  if (searchTerm) {
    chain = chain.or(
      `session_key.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`
    )
  }

  const { data: sessions, error, count } = await chain.range(from, to)

  if (error) throw createError({ statusCode: 500, statusMessage: 'Failed to fetch questionnaire sessions' })

  await logAuditEvent(event, user, 'STARPATH_ADMIN_LIST_ANSWERS', 'SUCCESS')

  return sendSuccess(event, {
    items: sessions || [],
    pagination: { page, pageSize, total: count || 0 },
  }, 'Sessions retrieved')
})
