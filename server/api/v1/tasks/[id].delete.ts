
// @api-auth: user
import { getDB } from '~~/server/utils/db'
import { assertUser } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'
import { logAuditEvent } from '~~/server/utils/logger'

defineRouteMeta({
  openAPI: {
    tags: ['Tasks'],
    summary: '删除任务',
    description: '永久删除指定任务，限定在当前租户范围内。',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: '任务 ID' },
    ],
    responses: {
      200: { description: '任务已删除 — 返回 { id }' },
      400: { description: '缺少任务 ID' },
    },
  } as any,
})

export default defineEventHandler(async (event) => {
  const user = assertUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Task ID is required'
    })
  }

  const db = getDB(event)
  const { error } = await db
    .from('tasks')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenantId)

  if (error) {
    await logAuditEvent(event, user, 'TASK_DELETE_FAILED', 'FAILED')
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to delete task'
    })
  }

  await logAuditEvent(event, user, `TASK_DELETED: ${id}`, 'SUCCESS')

  return sendSuccess(event, { id }, 'Deleted task successfully')
})
