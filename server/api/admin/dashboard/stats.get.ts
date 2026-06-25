// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { assertAdmin } from '~~/server/utils/auth'

defineRouteMeta({
  openAPI: {
    tags: ['管理·仪表盘'],
    summary: '工作台聚合统计',
    description: '一次性返回工作台所需的多维统计：订单、收入、用户、支付渠道状态、7日趋势。',
    security: [{ BearerAuth: [] }],
    responses: {
      200: { description: '仪表盘聚合统计数据' },
    },
  } as any,
})

/**
 * 工作台聚合统计 API
 * GET /api/admin/dashboard/stats
 */
export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)

  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]

  // ── 7 天起始 ──
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  // ── 30 天起始（用于环比） ──
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const prevThirtyDaysAgo = new Date(thirtyDaysAgo)
  prevThirtyDaysAgo.setDate(prevThirtyDaysAgo.getDate() - 30)

  // ── 并行查询 ──
  const [
    { data: todayOrdersData },
    { data: recentOrders },
    { data: prevPeriodOrders },
    { data: activeSubsData },
    { data: newUsersToday },
    { data: paymentConfigs },
  ] = await Promise.all([
    // 今日订单
    db.from('orders').select('amount, payment_provider').eq('status', 'paid').gte('created_at', `${todayStr}T00:00:00Z`),
    // 近 30 天订单（用于趋势 + 总收入）
    db.from('orders').select('amount, created_at, payment_provider').eq('status', 'paid').gte('created_at', thirtyDaysAgo.toISOString()),
    // 上一个 30 天（用于环比）
    db.from('orders').select('amount').eq('status', 'paid').gte('created_at', prevThirtyDaysAgo.toISOString()).lt('created_at', thirtyDaysAgo.toISOString()),
    // 活跃订阅
    db.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    // 今日新注册
    db.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', `${todayStr}T00:00:00Z`),
    // 支付渠道状态
    db.from('payment_configs').select('provider, is_enabled'),
  ])

  // ── 今日统计 ──
  const todayOrders = todayOrdersData || []
  const todayOrderCount = todayOrders.length
  const todayRevenue = todayOrders.reduce((sum: number, o: any) => sum + (Number(o.amount) || 0), 0)

  // ── 30 天收入 ──
  const orders30d = recentOrders || []
  const totalRevenue30d = orders30d.reduce((sum: number, o: any) => sum + (Number(o.amount) || 0), 0)

  // ── 环比增长率 ──
  const prevRevenue = (prevPeriodOrders || []).reduce((sum: number, o: any) => sum + (Number(o.amount) || 0), 0)
  const growthPct = prevRevenue > 0
    ? Math.round(((totalRevenue30d - prevRevenue) / prevRevenue) * 100)
    : (totalRevenue30d > 0 ? 100 : 0)

  // ── 7 天趋势 ──
  const trendMap = new Map<string, number>()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    trendMap.set(d.toISOString().split('T')[0]!, 0)
  }
  for (const order of orders30d) {
    const date = ((order as any).created_at || '').split('T')[0] as string
    if (date && trendMap.has(date)) {
      trendMap.set(date, (trendMap.get(date) || 0) + (Number((order as any).amount) || 0))
    }
  }
  const revenueTrend = Array.from(trendMap.entries()).map(([date, amount]) => ({
    date,
    amount: Math.round(amount * 100) / 100,
  }))

  // ── 渠道收入占比（近 30 天） ──
  const channelMap = new Map<string, number>()
  for (const order of orders30d) {
    const ch = (order as any).payment_provider || 'unknown'
    channelMap.set(ch, (channelMap.get(ch) || 0) + (Number((order as any).amount) || 0))
  }
  const channelShare = Array.from(channelMap.entries())
    .map(([channel, revenue]) => ({ channel, revenue: Math.round(revenue * 100) / 100 }))
    .sort((a, b) => b.revenue - a.revenue)

  // ── 支付渠道健康状态 ──
  const configs = paymentConfigs || []
  const enabledChannels = configs.filter((c: any) => c.is_enabled).length
  const totalChannels = configs.filter((c: any) => c.provider !== 'manual').length

  return sendSuccess(event, {
    // 核心 KPI
    todayOrderCount,
    todayRevenue: Math.round(todayRevenue * 100) / 100,
    totalRevenue30d: Math.round(totalRevenue30d * 100) / 100,
    growthPct,
    activeSubscriptions: (activeSubsData as any)?.length ?? 0,
    newUsersToday: (newUsersToday as any)?.length ?? 0,

    // 支付渠道
    paymentChannels: { enabled: enabledChannels, total: totalChannels },

    // 趋势
    revenueTrend,
    channelShare,
  }, 'Dashboard stats retrieved')
})
