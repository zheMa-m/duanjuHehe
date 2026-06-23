
// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { assertAdmin } from '~~/server/utils/auth'

defineRouteMeta({
  openAPI: {
    tags: ['Admin 智能问卷'],
    summary: 'Admin: list 智能问卷-specific orders',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'query', name: 'page', schema: { type: 'integer', default: 1 }, description: 'Page number' },
      { in: 'query', name: 'pageSize', schema: { type: 'integer', default: 20 }, description: 'Items per page (max 100)' },
      { in: 'query', name: 'provider', schema: { type: 'string' }, description: 'Filter by payment provider' },
      { in: 'query', name: 'status', schema: { type: 'string' }, description: 'Filter by order status' },
    ],
    responses: {
      200: { description: 'Paginated 智能问卷 orders list' },
    },
  } as any,
})

/**
 * 管理员：获取 智能问卷 专属订单列表（通过 campaign_orders 关联表筛选）
 * GET /api/admin/starpath/orders
 */
export default defineEventHandler(async (event) => {
  const user = assertAdmin(event)
  const db = getDB(event)

  const query = getQuery(event)
  const page = Math.min(Math.max(parseInt(query.page as string) || 1, 1), 100)
  const pageSize = Math.min(parseInt(query.pageSize as string) || 20, 100)
  const provider = query.provider as string | undefined
  const status = query.status as string | undefined

  // 通过 campaign_orders 关联表获取智能问卷相关订单 ID
  const { data: coIds, error: coError } = await db
    .from('campaign_orders')
    .select('order_id')

  if (coError) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch 智能问卷 order mappings' })
  }

  const orderIds = (coIds || []).map((co: any) => co.order_id)
  if (orderIds.length === 0) {
    return sendSuccess(event, { items: [], pagination: { page, pageSize, total: 0 } }, '智能问卷 orders retrieved')
  }

  let chain = db
    .from('orders')
    .select('*', { count: 'exact', head: false })
    .in('id', orderIds)

  if (provider) {
    chain = chain.eq('payment_provider', provider)
  }

  if (status) {
    chain = chain.eq('status', status)
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data: orders, error, count } = await chain
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch 智能问卷 orders' })
  }

  return sendSuccess(event, {
    items: orders || [],
    pagination: {
      page,
      pageSize,
      total: count || (orders || []).length,
    },
  }, '智能问卷 orders retrieved')
})
