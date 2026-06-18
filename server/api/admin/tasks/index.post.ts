import { z } from 'zod'
import { getDB } from '~~/server/utils/db'
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'
import { logAuditEvent } from '~~/server/utils/logger'

// @api-auth: admin

defineRouteMeta({
  openAPI: {
    tags: ['管理·运营-任务'],
    summary: '管理员：创建任务',
    description: '管理员创建任务，可选指定 tenant_id，默认使用管理员自身 tenantId。',
    security: [{ BearerAuth: [] }],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              tenant_id: { type: 'string', description: '可选，目标租户 ID' },
            },
            required: ['title'],
          },
        },
      },
    },
    responses: {
      201: { description: '任务创建成功' },
      500: { description: '数据库错误' },
    },
  } as any,
})

const adminCreateTaskSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty'),
  tenant_id: z.string().uuid().optional(),
})

export default defineEventHandler(async (event) => {
  const user = assertAdmin(event)
  const body = await readValidatedBody(event, adminCreateTaskSchema.parse)
  // 管理员可使用自身 tenantId 或手动指定目标租户
  const tenantId = body.tenant_id || user.tenantId
  const db = getDB(event)

  const { data, error } = await db.from('tasks').insert({
    title: body.title,
    tenant_id: tenantId,
  }).select('*')

  if (error) {
    await logAuditEvent(event, user, 'ADMIN_TASK_CREATE_FAILED', 'FAILED')
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to create task',
    })
  }

  await logAuditEvent(event, user, `ADMIN_TASK_CREATED: ${body.title}`, 'SUCCESS')

  return sendSuccess(event, data ? data[0] : null, 'Created task successfully', 201)
})
