import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { assertUser } from '~~/server/utils/auth'

defineRouteMeta({
  openAPI: {
    tags: ['Orders'],
    summary: '获取用户订单列表',
    description: '返回当前用户的订单列表（分页），按 user_id 进行 RLS 隔离。',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'query', name: 'page', schema: { type: 'integer', default: 1 }, description: '页码（1–100）' },
      { in: 'query', name: 'pageSize', schema: { type: 'integer', default: 20 }, description: '每页条数（最大 100）' },
    ],
    responses: {
      200: { description: '分页订单列表 — { items, pagination: { page, pageSize, total } }' },
    },
  } as any,
})

/**
 * 获取当前用户的订单列表（RLS 隔离）
 * GET /api/v1/orders
 */
export default defineEventHandler(async (event) => {
  const user = assertUser(event)
  const db = getDB(event)

  const query = getQuery(event)
  const page = Math.min(Math.max(parseInt(query.page as string) || 1, 1), 100)
  const pageSize = Math.min(parseInt(query.pageSize as string) || 20, 100)

  const { data: orders, error, count } = await db
    .from('orders')
    .select('*', { count: 'exact', head: false })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch orders' })
  }

  return sendSuccess(event, {
    items: orders || [],
    pagination: {
      page,
      pageSize,
      total: count || (orders || []).length,
    }
  }, 'Orders retrieved')
})
