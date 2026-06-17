
// @api-auth: user
import { getDB } from '~~/server/utils/db'
import { assertUser } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['Tasks'],
    summary: '获取租户任务列表',
    description: '返回当前租户的所有任务，按 created_at 降序排列。',
    security: [{ BearerAuth: [] }],
    responses: {
      200: { description: '任务对象数组' },
    },
  } as any,
})

export default defineEventHandler(async (event) => {
  const user = assertUser(event)
  const db = getDB(event)

  const { data: tasks, error } = await db
    .from('tasks')
    .select('*')
    .eq('tenant_id', user.tenantId)
    .order('created_at', { ascending: false })

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch tasks'
    })
  }

  return sendSuccess(event, tasks || [], 'Fetched tasks successfully')
})
