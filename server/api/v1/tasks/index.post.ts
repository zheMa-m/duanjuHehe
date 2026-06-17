
// @api-auth: user
import { z } from 'zod'
import { getDB } from '~~/server/utils/db'
import { assertUser } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'
import { logAuditEvent } from '~~/server/utils/logger'
import { checkTenantLimit } from '~~/server/utils/limits'

defineRouteMeta({
  openAPI: {
    tags: ['Tasks'],
    summary: '创建任务',
    description: '创建新任务，免费计划有配额限制（由服务端强制执行）。',
    security: [{ BearerAuth: [] }],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: { title: { type: 'string' } },
            required: ['title'],
          },
        },
      },
    },
    responses: {
      201: { description: '任务创建成功' },
      500: { description: '数据库错误或配额超限' },
    },
  } as any,
})

export const tasksSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty')
})

export default defineEventHandler(async (event) => {
  const user = assertUser(event)

  // 资源配额校验 (Free 计划限制任务总量，防止资源溢出)
  await checkTenantLimit(event, user, 'tasks')

  const body = await readValidatedBody(event, tasksSchema.parse)
  const db = getDB(event)

  const { data, error } = await db.from('tasks').insert({
    title: body.title,
    tenant_id: user.tenantId
  }).select('*')

  if (error) {
    await logAuditEvent(event, user, 'TASK_CREATE_FAILED', 'FAILED')
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to create task'
    })
  }

  await logAuditEvent(event, user, `TASK_CREATED: ${body.title}`, 'SUCCESS')

  return sendSuccess(event, data ? data[0] : null, 'Created task successfully', 201)
})
