// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { assertAdmin } from '~~/server/utils/auth'

defineRouteMeta({
  openAPI: {
    tags: ['Admin 智能问卷'],
    summary: '获取 智能问卷 概览数据',
    description: '总会话数、完成率、报告数、留资数等核心指标。',
    security: [{ BearerAuth: [] }],
    responses: {
      200: { description: '概览统计数据' },
    },
  } as any,
})

export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)

  // 并行查询各项统计数据
  const [
    { count: totalSessions },
    { count: completedSessions },
    { count: totalReports },
    { count: completedReports },
    { count: totalEmails },
    { count: totalOrders },
    { count: paidOrders },
  ] = await Promise.all([
    // 总问卷会话数
    db.from('questionnaire_sessions').select('*', { count: 'exact', head: true }),
    // 已完成问卷数
    db.from('questionnaire_sessions').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    // 总报告数
    db.from('ai_reports').select('*', { count: 'exact', head: true }),
    // 已完成报告数
    db.from('ai_reports').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    // 邮箱留资数
    db.from('campaign_registrations').select('*', { count: 'exact', head: true }).eq('source', 'starpath-email'),
    // 总订单数（通过 campaign_orders 关联智能问卷订单）
    db.from('orders').select('id', { count: 'exact', head: true }).eq('purchase_type', 'one_time'),
    // 已付款订单数
    db.from('orders').select('id', { count: 'exact', head: true }).eq('purchase_type', 'one_time').eq('status', 'paid'),
  ])

  // 计算总收入（已付款一次性订单）
  const { data: revenueRows } = await db
    .from('orders')
    .select('amount')
    .eq('purchase_type', 'one_time')
    .eq('status', 'paid')

  const totalRevenue = (revenueRows || []).reduce((sum: number, r: any) => sum + (parseFloat(r.amount) || 0), 0)

  // 最近 5 条活动（问卷完成 + 报告生成）
  const { data: recentSessions } = await db
    .from('questionnaire_sessions')
    .select('id, full_name, status, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: recentReports } = await db
    .from('ai_reports')
    .select('id, session_id, status, generated_at, email_sent, email_sent_at, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  // 最近 5 条订单
  const { data: recentOrders } = await db
    .from('orders')
    .select('id, order_no, amount, currency, status, payment_provider, purchase_type, paid_at, created_at')
    .eq('purchase_type', 'one_time')
    .order('created_at', { ascending: false })
    .limit(5)

  return sendSuccess(event, {
    sessions: {
      total: totalSessions || 0,
      completed: completedSessions || 0,
      completionRate: totalSessions ? Math.round((completedSessions || 0) / totalSessions * 100) : 0,
    },
    reports: {
      total: totalReports || 0,
      completed: completedReports || 0,
    },
    emails: {
      total: totalEmails || 0,
    },
    orders: {
      total: totalOrders || 0,
      paid: paidOrders || 0,
      revenue: Number(totalRevenue.toFixed(2)),
      conversionRate: completedSessions ? Math.round((paidOrders || 0) / completedSessions * 100) : 0,
    },
    recentSessions: recentSessions || [],
    recentReports: recentReports || [],
    recentOrders: recentOrders || [],
  }, 'Overview retrieved')
})
