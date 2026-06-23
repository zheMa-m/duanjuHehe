// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { assertAdmin } from '~~/server/utils/auth'
import { logAuditEvent } from '~~/server/utils/logger'

defineRouteMeta({
  openAPI: {
    tags: ['Admin 智能问卷'],
    summary: '获取 智能问卷 留资邮箱（分页）',
    description: '管理员查看所有 智能问卷 用户留资邮箱（来自 campaign_registrations），支持搜索和导出。',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
      { in: 'query', name: 'pageSize', schema: { type: 'integer', default: 20 } },
      { in: 'query', name: 'search', schema: { type: 'string' }, description: '搜索邮箱地址' },
    ],
    responses: {
      200: { description: '分页邮箱列表' },
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
  const searchTerm = query.search as string | undefined

  let chain = db
    .from('campaign_registrations')
    .select('*', { count: 'exact', head: false })
    .eq('source', 'starpath-email')
    .order('created_at', { ascending: false })

  if (searchTerm) {
    chain = chain.ilike('email', `%${searchTerm}%`)
  }

  const { data: items, error, count } = await chain.range(from, to)

  if (error) throw createError({ statusCode: 500, statusMessage: 'Failed to fetch registrations' })

  await logAuditEvent(event, user, 'STARPATH_ADMIN_LIST_EMAILS', 'SUCCESS')

  return sendSuccess(event, {
    items: items || [],
    pagination: { page, pageSize, total: count || 0 },
  }, 'Emails retrieved')
})
