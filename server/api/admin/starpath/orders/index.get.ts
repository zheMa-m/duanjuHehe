
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
      { in: 'query', name: 'search', schema: { type: 'string' }, description: 'Search by order number' },
      { in: 'query', name: 'platform', schema: { type: 'string' }, description: 'Filter by platform (ios/android/web)' },
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
  const search = query.search as string | undefined
  const platform = query.platform as string | undefined

  // 直接查询 purchase_type = 'one_time' 的智能问卷订单
  let chain = db
    .from('orders')
    .select('*', { count: 'exact', head: false })
    .eq('purchase_type', 'one_time')

  if (provider) {
    chain = chain.eq('payment_provider', provider)
  }

  if (status) {
    chain = chain.eq('status', status)
  }

  if (search) {
    chain = chain.ilike('order_no', `%${search}%`)
  }

  // 按平台筛选（通过 campaign_orders 关联表，需预查询 order_id 列表）
  if (platform) {
    const { data: platformOrderIds } = await db
      .from('campaign_orders')
      .select('order_id')
      .eq('platform', platform)
    const ids = (platformOrderIds || []).map((r: any) => r.order_id)
    if (ids.length === 0) {
      return sendSuccess(event, { items: [], pagination: { page, pageSize, total: 0 } }, '智能问卷 orders retrieved')
    }
    chain = chain.in('id', ids)
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data: orders, error, count } = await chain
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch 智能问卷 orders' })
  }

  // 批量获取 campaign_orders 关联信息（session_id, report_id, plan）
  const orderIds = (orders || []).map((o: any) => o.id)
  let campaignOrderMap: Record<string, any> = {}
  if (orderIds.length > 0) {
    const { data: coData } = await db
      .from('campaign_orders')
      .select('order_id, session_id, report_id, plan, platform')
      .in('order_id', orderIds)

    campaignOrderMap = (coData || []).reduce((map: Record<string, any>, co: any) => {
      map[co.order_id] = co
      return map
    }, {})
  }

  // 合并订单与关联信息
  const enriched = (orders || []).map((o: any) => ({
    ...o,
    campaign_order: campaignOrderMap[o.id] || null,
  }))

  return sendSuccess(event, {
    items: enriched,
    pagination: {
      page,
      pageSize,
      total: count || (orders || []).length,
    },
  }, '智能问卷 orders retrieved')
})
