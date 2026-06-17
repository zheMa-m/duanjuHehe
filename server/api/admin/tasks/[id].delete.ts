
// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'
import { logAuditEvent } from '~~/server/utils/logger'

defineRouteMeta({
  openAPI: {
    tags: ['Admin Tasks'],
    summary: '管理员：删除任务',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: '任务 ID' },
    ],
    responses: {
      200: { description: '任务已删除' },
    },
  } as any,
})

export default defineEventHandler(async (event) => {
  const user = assertAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Task ID is required'
    })
  }

  const db = getDB(event)
  const { error } = await db.from('tasks').delete().eq('id', id)

  if (error) {
    await logAuditEvent(event, user, 'TASK_RECOVERY_FAILED', 'FAILED')
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to delete task'
    })
  }

  await logAuditEvent(event, user, `TASK_RECOVERED: ${id}`, 'SUCCESS')

  return sendSuccess(event, { id }, 'Task deleted successfully')
})
