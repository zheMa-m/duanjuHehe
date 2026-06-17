/**
 * GET /api/v1/feedback — 获取用户评价列表（公开接口）
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
    tags: ['Feedback'],
    summary: '获取已审批的用户评价列表',
    description: '返回公开已审批的评价列表及统计数据（总数、平均评分、评分分布），支持按子域名和类型过滤。',
    parameters: [
      { in: 'query', name: 'subdomain', schema: { type: 'string' }, description: '按营销活动子域名过滤' },
      { in: 'query', name: 'type', schema: { type: 'string', enum: ['review', 'bug', 'feature', 'general'] }, description: '按反馈类型过滤' },
      { in: 'query', name: 'limit', schema: { type: 'integer', default: 20 }, description: '最大返回条数（1–100）' },
    ],
    responses: {
      200: { description: '{ feedbacks: [...], stats: { total, averageRating, ratingDistribution } }' },
    },
  } as any,
})

const querySchema = z.object({
  subdomain: z.string().optional(),
  type: z.enum(['review', 'bug', 'feature', 'general']).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
})

// @api-auth: public
export default defineEventHandler(async (event: H3Event) => {
  // 增加边缘缓存响应头：15秒浏览器与CDN缓存，30秒SWR异步刷新时间，降低DB并发载荷
  setHeader(event, 'Cache-Control', 'public, max-age=15, stale-while-revalidate=30')

  const query = await getValidatedQuery(event, querySchema.parse)
  const db = getDB(event)

  let queryBuilder = db.from('feedbacks').select('*')

  // 仅返回已审批的评价
  queryBuilder = queryBuilder.eq('is_approved', true)

  if (query.subdomain) {
    queryBuilder = queryBuilder.eq('campaign_subdomain', query.subdomain)
  }

  if (query.type) {
    queryBuilder = queryBuilder.eq('type', query.type)
  }

  queryBuilder = queryBuilder.order('created_at', { ascending: false })

  const { data: feedbacks, error } = await queryBuilder

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message || 'Failed to fetch feedbacks' })
  }

  // 截取 limit 条
  const limited = (feedbacks || []).slice(0, query.limit)

  // 计算汇总统计
  const totalCount = limited.length
  const avgRating = totalCount > 0
    ? Math.round(limited.reduce((sum: number, f: any) => sum + (f.rating || 0), 0) / totalCount * 10) / 10
    : 0

  return sendSuccess(event, {
    feedbacks: limited,
    stats: {
      total: totalCount,
      averageRating: avgRating,
      ratingDistribution: {
        5: limited.filter((f: any) => f.rating === 5).length,
        4: limited.filter((f: any) => f.rating === 4).length,
        3: limited.filter((f: any) => f.rating === 3).length,
        2: limited.filter((f: any) => f.rating === 2).length,
        1: limited.filter((f: any) => f.rating === 1).length,
      },
    },
  }, 'Feedbacks retrieved successfully')
})
