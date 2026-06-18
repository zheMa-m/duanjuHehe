/**
 * GET /api/v1/feedback — 获取用户评价列表（公开接口，分页）
 *
 * 支持按 campaign_subdomain / type 过滤
 * 仅返回 is_approved=true 的评价
 */
import { z } from 'zod'
import { H3Event, setHeader } from 'h3'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['反馈'],
    summary: '获取已审批的用户评价列表（分页）',
    description: '返回公开已审批的评价列表及统计数据（总数、平均评分、评分分布），支持按子域名和类型过滤。',
    parameters: [
      { in: 'query', name: 'subdomain', schema: { type: 'string' }, description: '按营销活动子域名过滤' },
      { in: 'query', name: 'type', schema: { type: 'string', enum: ['review', 'bug', 'feature', 'general'] }, description: '按反馈类型过滤' },
      { in: 'query', name: 'page', schema: { type: 'integer', default: 1 }, description: '页码' },
      { in: 'query', name: 'pageSize', schema: { type: 'integer', default: 20 }, description: '每页条数（最大 100）' },
    ],
    responses: {
      200: {
        description: '分页评价列表及统计数据',
      },
    },
  } as any,
})

const querySchema = z.object({
  subdomain: z.string().optional(),
  type: z.enum(['review', 'bug', 'feature', 'general']).optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
})

// @api-auth: public
export default defineEventHandler(async (event: H3Event) => {
  setHeader(event, 'Cache-Control', 'public, max-age=15, stale-while-revalidate=30')

  const query = await getValidatedQuery(event, querySchema.parse)
  const db = getDB(event)

  const from = (query.page - 1) * query.pageSize
  const to = from + query.pageSize - 1

  let queryBuilder = db.from('feedbacks').select('*', { count: 'exact' })

  queryBuilder = queryBuilder.eq('is_approved', true)

  if (query.subdomain) {
    queryBuilder = queryBuilder.eq('campaign_subdomain', query.subdomain)
  }

  if (query.type) {
    queryBuilder = queryBuilder.eq('type', query.type)
  }

  queryBuilder = queryBuilder.order('created_at', { ascending: false })
    .range(from, to)

  const { data: feedbacks, error, count } = await queryBuilder

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message || 'Failed to fetch feedbacks' })
  }

  const items = feedbacks || []
  const total = count || 0

  // 评分统计（基于当前页数据）
  const avgRating = items.length > 0
    ? Math.round(items.reduce((sum: number, f: any) => sum + (f.rating || 0), 0) / items.length * 10) / 10
    : 0

  return sendSuccess(event, {
    items,
    pagination: { page: query.page, pageSize: query.pageSize, total },
    stats: {
      total,
      averageRating: avgRating,
      ratingDistribution: {
        5: items.filter((f: any) => f.rating === 5).length,
        4: items.filter((f: any) => f.rating === 4).length,
        3: items.filter((f: any) => f.rating === 3).length,
        2: items.filter((f: any) => f.rating === 2).length,
        1: items.filter((f: any) => f.rating === 1).length,
      },
    },
  }, 'Feedbacks retrieved successfully')
})
