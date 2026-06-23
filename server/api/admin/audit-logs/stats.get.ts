
// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['管理·系统-审计'],
    summary: '管理员：获取审计日志聚合统计',
    description: '根据筛选条件返回全量的分类分布、活跃用户 Top 5、今日操作数和总日志数。',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'query', name: 'category', schema: { type: 'string' }, description: '筛选类别（ALL 为全部）' },
      { in: 'query', name: 'dateFrom', schema: { type: 'string', format: 'date' }, description: '起始日期 (YYYY-MM-DD)' },
      { in: 'query', name: 'dateTo', schema: { type: 'string', format: 'date' }, description: '结束日期 (YYYY-MM-DD)' },
    ],
    responses: {
      200: { description: '聚合统计数据' },
    },
  } as any,
})

export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)

  const query = getQuery(event)
  const category = query.category as string
  const dateFrom = query.dateFrom as string
  const dateTo = query.dateTo as string

  // 获取全量日志（不分页，仅用于统计）
  let dbQuery = db.from('activity_logs').select('*', { count: 'exact' })

  if (category && category !== 'ALL') {
    dbQuery = dbQuery.eq('category', category)
  }
  if (dateFrom) {
    dbQuery = dbQuery.gte('created_at', `${dateFrom}T00:00:00Z`)
  }
  if (dateTo) {
    dbQuery = dbQuery.lte('created_at', `${dateTo}T23:59:59Z`)
  }

  const { data: allLogs, error, count } = await dbQuery.order('created_at', { ascending: false })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch audit stats' })
  }

  const logs = allLogs || []
  const totalCount = count || 0

  // 今日操作数（基于UTC日期）
  const todayStr = new Date().toISOString().slice(0, 10)
  let todayCount = 0

  // 分类分布
  const categoryMap = new Map<string, number>()
  // 活跃用户
  const userMap = new Map<string, number>()

  for (const log of logs) {
    if (log.created_at?.startsWith(todayStr)) {
      todayCount++
    }
    const cat = log.category || 'unknown'
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1)

    const operator = log.metadata?.operator || log.user_id || 'system'
    userMap.set(operator, (userMap.get(operator) || 0) + 1)
  }

  const categoryDistribution = Array.from(categoryMap.entries())
    .map(([cat, cnt]) => ({
      category: cat,
      count: cnt,
      percentage: logs.length ? Math.round((cnt / logs.length) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)

  const topActiveUsers = Array.from(userMap.entries())
    .map(([operator, cnt]) => ({ operator, count: cnt }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return sendSuccess(event, {
    totalCount,
    todayCount,
    categoryDistribution,
    topActiveUsers,
  }, 'Fetched audit stats successfully')
})
