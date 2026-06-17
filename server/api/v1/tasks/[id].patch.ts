
// @api-auth: user
import { z } from 'zod'
import { getDB } from '~~/server/utils/db'
import { assertUser } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'
import { logAuditEvent } from '~~/server/utils/logger'

defineRouteMeta({
  openAPI: {
    tags: ['Tasks'],
    summary: '切换任务完成状态',
    description: '更新任务的完成状态，限定在当前租户范围内。',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: '任务 ID' },
    ],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: { completed: { type: 'boolean' } },
            required: ['completed'],
          },
        },
      },
    },
    responses: {
      200: { description: '任务状态已更新' },
      400: { description: '缺少任务 ID' },
    },
  } as any,
})

const updateTaskSchema = z.object({
  completed: z.boolean()
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

  const body = await readValidatedBody(event, updateTaskSchema.parse)
  const db = getDB(event)
  const { error } = await db
    .from('tasks')
    .update({ completed: body.completed })
    .eq('id', id)
    .eq('tenant_id', user.tenantId)

  if (error) {
    await logAuditEvent(event, user, 'TASK_TOGGLE_FAILED', 'FAILED')
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to update task'
    })
  }

  await logAuditEvent(event, user, `TASK_TOGGLED: ${id} | Completed: ${body.completed}`, 'SUCCESS')

  return sendSuccess(event, { id, completed: body.completed }, 'Updated task status successfully')
})
