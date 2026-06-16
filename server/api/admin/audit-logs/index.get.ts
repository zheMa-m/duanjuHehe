import { getDB } from '~~/server/utils/db'
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['Admin Activity'],
    summary: '管理员：获取活动日志',
    description: '返回所有活动日志条目（auth/admin/system 三类，按 created_at 降序排列）。',
    security: [{ BearerAuth: [] }],
    responses: {
      200: { description: '活动日志对象数组' },
    },
  } as any,
})

export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)

  const { data: logs, error } = await db
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch activity logs'
    })
  }

  return sendSuccess(event, logs || [], 'Fetched activity logs successfully')
})
