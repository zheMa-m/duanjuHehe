// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { assertAdmin } from '~~/server/utils/auth'

defineRouteMeta({
  openAPI: {
    tags: ['管理端反馈'],
    summary: '管理员获取用户反馈列表（分页 + 分类过滤）',
    description: '返回所有用户反馈，支持按类型过滤和分页。',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'query', name: 'page', schema: { type: 'integer', default: 1 }, description: '页码' },
      { in: 'query', name: 'pageSize', schema: { type: 'integer', default: 20 }, description: '每页条数（最大 100）' },
      { in: 'query', name: 'type', schema: { type: 'string', enum: ['review', 'bug', 'feature', 'general'] }, description: '反馈类型过滤' },
    ],
    responses: {
      200: { description: '分页反馈列表（含总数）' },
    },
  } as any,
})

/**
 * 管理员获取用户反馈列表
 * GET /api/admin/feedback
 */
export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)

  const query = getQuery(event)
  const page = Math.max(parseInt(query.page as string) || 1, 1)
  const pageSize = Math.min(parseInt(query.pageSize as string) || 20, 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const type = query.type as string || ''

  let q = db
    .from('feedbacks')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  // 类型过滤
  if (type && ['review', 'bug', 'feature', 'general'].includes(type)) {
    q = q.eq('type', type)
  }

  const { data, error, count } = await q

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch feedbacks',
    })
  }

  // 字段映射：DB 字段 → 前端期望字段
  const items = (data || []).map((f: Record<string, any>) => ({
    id: f.id,
    type: f.type,
    rating: f.rating || 0,
    content: f.comment || f.content || '',
    author_name: f.display_name || f.author_name || null,
    campaign_subdomain: f.campaign_subdomain || null,
    is_approved: f.is_approved ?? false,
    created_at: f.created_at,
  }))

  return sendSuccess(event, {
    items,
    pagination: { page, pageSize, total: count || 0 },
  })
})
