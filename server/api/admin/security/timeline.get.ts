/**
 * GET /api/admin/security/timeline — 安全事件时间线聚合
 * @api-auth: admin
 * Query: granularity=hour|day, days=7
 */
// @api-auth: admin
import { z } from 'zod'
import { getDB } from '~~/server/utils/db'
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess, throwError } from '~~/server/utils/response'

const QuerySchema = z.object({
  granularity: z.enum(['hour', 'day']).default('day'),
  days: z.coerce.number().int().min(1).max(90).default(7),
})

defineRouteMeta({
  openAPI: {
    tags: ['管理·系统-安全'],
    summary: '管理员：查询安全事件时间线（按小时/天聚合）',
    security: [{ BearerAuth: [] }],
    parameters: [
      { name: 'granularity', in: 'query', schema: { type: 'string', enum: ['hour', 'day'], default: 'day' } },
      { name: 'days', in: 'query', schema: { type: 'integer', default: 7 } },
    ],
    responses: {
      200: { description: '时间线聚合数据' },
    },
  },
} as any)

export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)

  const rawQuery = getQuery(event)
  const parsed = QuerySchema.safeParse(rawQuery)
  if (!parsed.success) {
    throwError(400, 'Invalid query parameters', parsed.error.flatten())
  }

  const { granularity, days } = parsed.data

  // 计算起始时间
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  startDate.setHours(0, 0, 0, 0)
  const startISO = startDate.toISOString()

  // 查询时间范围内的所有安全事件
  const { data, error } = await db
    .from('activity_logs')
    .select('action, created_at')
    .eq('category', 'system')
    .like('action', 'api_security_%')
    .gte('created_at', startISO)
    .order('created_at', { ascending: true })

  if (error) {
    throwError(500, 'Failed to query timeline data')
  }

  // 聚合到时间桶
  const bucketMap = new Map<string, { count: number; types: Record<string, number> }>()

  for (const row of (data || [])) {
    const d = new Date(row.created_at)
    let bucketKey: string

    if (granularity === 'hour') {
      d.setMinutes(0, 0, 0)
      bucketKey = d.toISOString()
    } else {
      bucketKey = d.toISOString().slice(0, 10) + 'T00:00:00.000Z'
    }

    if (!bucketMap.has(bucketKey)) {
      bucketMap.set(bucketKey, { count: 0, types: {} })
    }
    const entry = bucketMap.get(bucketKey)!
    entry.count++

    // 提取事件类型
    const eventType = (row.action || '').replace('api_security_', '').toUpperCase()
    entry.types[eventType] = (entry.types[eventType] || 0) + 1
  }

  const buckets = [...bucketMap.entries()]
    .map(([time, stats]) => ({ time, ...stats }))
    .sort((a, b) => a.time.localeCompare(b.time))

  return sendSuccess(event, { buckets, granularity, days })
})
