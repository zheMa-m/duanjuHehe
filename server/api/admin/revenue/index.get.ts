
// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { assertAdmin } from '~~/server/utils/auth'

defineRouteMeta({
  openAPI: {
    tags: ['管理·运营-收入'],
    summary: '管理员：收入分析',
    description: '支付收入数据分析，包含每日明细、渠道分布、增长率与客单价。',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'query', name: 'days', schema: { type: 'integer', default: 30 }, description: '回溯天数（最大 365）' },
    ],
    responses: {
      200: { description: '收入分析：totalPaymentRevenue、dailyBreakdown、channelBreakdown、growthPct' },
    },
  } as any,
})

/**
 * 管理员：收入分析（增强版）
 * GET /api/admin/revenue
 */
export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)

  const query = getQuery(event)
  const days = Math.min(parseInt(query.days as string) || 30, 365)

  // 仅查询回溯范围内的已支付订单
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data: orders } = await db
    .from('orders')
    .select('*')
    .eq('status', 'paid')
    .gte('created_at', startDate.toISOString())

  const paidOrders = (orders || [])
  const paymentRevenue = paidOrders.reduce((sum: number, o: any) => sum + (Number(o.amount) || 0), 0)

  // ── 今日数据 ──
  const todayStr = new Date().toISOString().split('T')[0]
  const todayOrders = paidOrders.filter((o: any) => (o.created_at || '').startsWith(todayStr))
  const todayRevenue = todayOrders.reduce((sum: number, o: any) => sum + (Number(o.amount) || 0), 0)

  // ── 环比增长率（当期 vs 上一周期） ──
  const prevStartDate = new Date(startDate)
  prevStartDate.setDate(prevStartDate.getDate() - days)
  const { data: prevOrders } = await db
    .from('orders')
    .select('amount')
    .eq('status', 'paid')
    .gte('created_at', prevStartDate.toISOString())
    .lt('created_at', startDate.toISOString())
  const prevRevenue = (prevOrders || []).reduce((sum: number, o: any) => sum + (Number(o.amount) || 0), 0)
  const growthPct = prevRevenue > 0 ? Math.round(((paymentRevenue - prevRevenue) / prevRevenue) * 100) : (paymentRevenue > 0 ? 100 : 0)

  // ── 按渠道分组 ──
  const channelMap = new Map<string, { revenue: number; count: number }>()
  for (const order of paidOrders) {
    const channel = (order as any).payment_provider || (order as any).provider || 'unknown'
    const existing = channelMap.get(channel) || { revenue: 0, count: 0 }
    existing.revenue += Number((order as any).amount) || 0
    existing.count += 1
    channelMap.set(channel, existing)
  }
  const channelBreakdown = Array.from(channelMap.entries())
    .map(([channel, data]) => ({ channel, ...data }))
    .sort((a, b) => b.revenue - a.revenue)

  // ── 按天分组 ──
  const dailyMap = new Map<string, { payments: number; count: number }>()
  for (const order of paidOrders) {
    const date = (order as any).created_at?.split('T')[0] || 'unknown'
    const existing = dailyMap.get(date) || { payments: 0, count: 0 }
    existing.payments += Number((order as any).amount) || 0
    existing.count += 1
    dailyMap.set(date, existing)
  }
  const dailyBreakdown = Array.from(dailyMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, days)

  // ── 客单价 ──
  const avgOrderValue = paidOrders.length > 0 ? Math.round((paymentRevenue / paidOrders.length) * 100) / 100 : 0

  return sendSuccess(event, {
    totalPaymentRevenue: Math.round(paymentRevenue * 100) / 100,
    totalRevenue: Math.round(paymentRevenue * 100) / 100,
    todayRevenue: Math.round(todayRevenue * 100) / 100,
    todayOrderCount: todayOrders.length,
    orderCount: paidOrders.length,
    avgOrderValue,
    growthPct,
    channelBreakdown,
    dailyBreakdown,
  }, 'Revenue data retrieved')
})
