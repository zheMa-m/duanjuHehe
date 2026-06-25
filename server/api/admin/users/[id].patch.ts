
// @api-auth: admin
import { z } from 'zod'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { assertAdmin } from '~~/server/utils/auth'
import { logAuditEvent } from '~~/server/utils/logger'

defineRouteMeta({
  openAPI: {
    tags: ['管理·营销-用户'],
    summary: '管理员：编辑用户信息',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: '用户 UUID' },
    ],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              role: { type: 'string', enum: ['user', 'admin'] },
              display_name: { type: 'string', maxLength: 100 },
            },
          },
        },
      },
    },
    responses: {
      200: { description: '用户已更新' },
      400: { description: '参数校验失败' },
      404: { description: '用户未找到' },
    },
  } as any,
})

const userUpdateSchema = z.object({
  role: z.enum(['user', 'admin']).optional(),
  display_name: z.string().max(100).optional(),
})

/**
 * 管理员：编辑用户角色、显示名称
 * PATCH /api/admin/users/:id
 */
export default defineEventHandler(async (event) => {
  const admin = assertAdmin(event)
  const id = getRouterParam(event, 'id')
  const body = await readValidatedBody(event, userUpdateSchema.parse)

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing user ID' })
  }

  const db = getDB(event)

  // ① 确认用户存在于 profiles 表
  const { data: profile, error: notFound } = await db.from('profiles').select('*').eq('id', id).single()
  if (notFound || !profile) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  // ② 更新 profiles 表
  const profileUpdate: Record<string, any> = {}
  if (body.role !== undefined) profileUpdate.role = body.role
  if (body.display_name !== undefined) profileUpdate.display_name = body.display_name

  if (Object.keys(profileUpdate).length > 0) {
    const { error: updateErr } = await db.from('profiles').update(profileUpdate).eq('id', id).select().single()
    if (updateErr) {
      throw createError({ statusCode: 500, statusMessage: 'Failed to update user profile' })
    }
  }

  // ③ 同步更新 Auth 用户的 user_metadata（display_name）
  if (body.display_name !== undefined) {
    await db.auth.admin.updateUserById(id, {
      user_metadata: { display_name: body.display_name },
    })
  }

  // ④ 审计日志
  const changes = Object.entries(body).map(([k, v]) => `${k}=${v}`).join(', ')
  await logAuditEvent(event, admin, `ADMIN_USER_UPDATE:${id}:${changes}`, 'SUCCESS')

  return sendSuccess(event, { id, ...body }, 'User updated successfully')
})
