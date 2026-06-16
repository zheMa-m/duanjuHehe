// @api-auth: admin
import { defineEventHandler } from 'h3'
import { z } from 'zod'
import { assertAdmin } from '~~/server/utils/auth'
import { getDB } from '~~/server/utils/db'
import { logAuditEvent } from '~~/server/utils/logger'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['Admin Profile'],
    summary: '管理员：修改密码',
    description: '通过 Supabase Admin API 更新管理员密码。',
    security: [{ BearerAuth: [] }],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: { password: { type: 'string' } },
            required: ['password'],
          },
        },
      },
    },
    responses: {
      200: { description: '密码更新成功' },
    },
  } as any,
})

const passwordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters')
})

export default defineEventHandler(async (event) => {
  const user = assertAdmin(event)
  const body = await readValidatedBody(event, passwordSchema.parse)

  // 非 Mock 环境时，调用 Supabase Admin API 真实修改密码
  if (process.env.MOCK_DB !== 'true') {
    const db = getDB(event)
    const { error } = await db.auth.admin.updateUserById(user.id, {
      password: body.password
    })
    if (error) {
      throw createError({
        statusCode: 400,
        statusMessage: error.message || 'Failed to update password'
      })
    }
  }

  // 记录操作审计日志
  await logAuditEvent(event, user, 'ADMIN_PASSWORD_CHANGED', 'SUCCESS')

  return sendSuccess(event, null, 'Password updated successfully')
})
