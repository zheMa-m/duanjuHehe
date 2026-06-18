
// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { assertAdmin } from '~~/server/utils/auth'

defineRouteMeta({
  openAPI: {
    tags: ['管理·运营-收入'],
    summary: '管理员：收入分析',
    description: '支付收入数据分析，包含每日明细与收入快照。',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'query', name: 'days', schema: { type: 'integer', default: 30 }, description: '回溯天数（最大 365）' },
    ],
    responses: {
      200: { description: '收入分析：totalPaymentRevenue、totalRevenue、dailyBreakdown' },
    },
  } as any,
})

/**
 * 管理员：收入分析（支付 + 广告）
 * GET /api/admin/revenue
 */
export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)

  const query = getQuery(event)
  const days = Math.min(parseInt(query.days as string) || 30, 365)

  // 优化：仅查询回溯范围内的已支付订单，避免全表扫描
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data: orders } = await db
    .from('orders')
    .select('*')
    .eq('status', 'paid')
    .gte('created_at', startDate.toISOString())
  const paidOrders = (orders || [])
  const paymentRevenue = paidOrders.reduce((sum: number, o: any) => sum + (Number(o.amount) || 0), 0)

  // 按天分组订单数据
  const dailyMap = new Map<string, { payments: number }>()
  for (const order of paidOrders) {
    const date = order.created_at?.split('T')[0] || 'unknown'
    const existing = dailyMap.get(date) || { payments: 0 }
    existing.payments += Number(order.amount) || 0
    dailyMap.set(date, existing)
  }

  const dailyBreakdown = Array.from(dailyMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, days)

  return sendSuccess(event, {
    totalPaymentRevenue: Math.round(paymentRevenue * 100) / 100,
    totalRevenue: Math.round(paymentRevenue * 100) / 100,
    dailyBreakdown,
    orderCount: paidOrders.length,
  }, 'Revenue data retrieved')
})
