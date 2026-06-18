
// @api-auth: admin
import { z } from 'zod'
import { getDB } from '~~/server/utils/db'
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'
import { logAuditEvent } from '~~/server/utils/logger'

defineRouteMeta({
  openAPI: {
    tags: ['管理·运营-任务'],
    summary: '管理员：切换任务完成状态',
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
    },
  } as any,
})

const updateTaskSchema = z.object({
  completed: z.boolean()
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

  const body = await readValidatedBody(event, updateTaskSchema.parse)
  const db = getDB(event)
  const { error } = await db.from('tasks').update({ completed: body.completed }).eq('id', id)

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
