import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { assertAdmin } from '~~/server/utils/auth'

defineRouteMeta({
  openAPI: {
    tags: ['Admin Orders'],
    summary: '管理员：获取订单列表（分页）',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'query', name: 'page', schema: { type: 'integer', default: 1 }, description: '页码' },
      { in: 'query', name: 'pageSize', schema: { type: 'integer', default: 20 }, description: '每页条数（最大 100）' },
      { in: 'query', name: 'status', schema: { type: 'string' }, description: '按订单状态过滤' },
    ],
    responses: {
      200: { description: '分页订单列表（含总数）' },
    },
  } as any,
})

/**
 * 管理员：获取全部订单（分页，最大 100 条）
 * GET /api/admin/orders
 */
export default defineEventHandler(async (event) => {
  const user = assertAdmin(event)
  const db = getDB(event)

  const query = getQuery(event)
  const page = Math.min(Math.max(parseInt(query.page as string) || 1, 1), 100)
  const pageSize = Math.min(parseInt(query.pageSize as string) || 20, 100)
  const status = query.status as string | undefined

  let chain = db.from('orders').select('*', { count: 'exact', head: false })

  if (status) {
    chain = chain.eq('status', status)
  }

  const { data: orders, error, count } = await chain.order('created_at', { ascending: false })

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
  }, 'Admin orders retrieved')
})
