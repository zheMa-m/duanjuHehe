
// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['Admin Tasks'],
    summary: '管理员：获取所有任务',
    description: '返回所有租户的全部任务，仅管理员可访问。',
    security: [{ BearerAuth: [] }],
    responses: {
      200: { description: '全量任务对象数组' },
      403: { description: '非管理员' },
    },
  } as any,
})

export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)

  const { data: tasks, error } = await db
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch tasks'
    })
  }

  return sendSuccess(event, tasks || [], 'Fetched all tasks successfully')
})
