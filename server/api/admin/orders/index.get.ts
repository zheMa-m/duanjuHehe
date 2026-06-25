
// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { assertAdmin } from '~~/server/utils/auth'

defineRouteMeta({
  openAPI: {
    tags: ['管理·运营-订单'],
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

  // 🔒 P1-5: 自动将超时 pending 订单标记为 expired
  await db.from('orders').update({
    status: 'expired',
    updated_at: new Date().toISOString(),
  }).eq('status', 'pending').lt('expires_at', new Date().toISOString())

  const query = getQuery(event)
  const page = Math.min(Math.max(parseInt(query.page as string) || 1, 1), 100)
  const pageSize = Math.min(parseInt(query.pageSize as string) || 20, 100)
  const status = query.status as string | undefined

  let chain = db.from('orders').select('*', { count: 'exact', head: false })

  if (status) {
    chain = chain.eq('status', status)
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data: orders, error, count } = await chain
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch orders' })
  }

  // 批量合并用户信息（email + display_name）
  let items = orders || []
  if (items.length > 0) {
    const userIds = [...new Set(items.map((o: any) => o.user_id).filter(Boolean))] as string[]
    if (userIds.length > 0) {
      const { data: profiles } = await db.from('profiles')
        .select('id, email, display_name')
        .in('id', userIds)
      const userMap: Record<string, any> = {}
      for (const p of (profiles || []) as any[]) {
        userMap[p.id] = p
      }
      items = items.map((o: any) => ({
        ...o,
        user_email: userMap[o.user_id]?.email || null,
        user_display_name: userMap[o.user_id]?.display_name || null,
      }))
    }
  }

  return sendSuccess(event, {
    items: items,
    pagination: {
      page,
      pageSize,
      total: count || (orders || []).length,
    }
  }, 'Admin orders retrieved')
})
