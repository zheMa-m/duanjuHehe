/**
 * PATCH /api/v1/auth/profile — 更新用户 profile
 *
 * 允许更新：display_name, avatar_url, phone
 */

// @api-auth: public
import { z } from 'zod'
import { H3Event } from 'h3'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { logAuditEvent } from '~~/server/utils/logger'

defineRouteMeta({
  openAPI: {
    tags: ['Auth'],
    summary: '更新用户档案',
    description: '仅允许更新 display_name、avatar_url 和 phone 字段。',
    security: [{ BearerAuth: [] }],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              display_name: { type: 'string' },
              avatar_url: { type: 'string', format: 'uri', nullable: true },
              phone: { type: 'string', nullable: true },
            },
          },
        },
      },
    },
    responses: {
      200: { description: '档案更新成功' },
      401: { description: '未认证' },
    },
  } as any,
})

const schema = z.object({
  display_name: z.string().min(1).max(64).optional(),
  avatar_url: z.string().url().nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
})

export default defineEventHandler(async (event: H3Event) => {
  const ctxUser = event.context.user
  if (!ctxUser) {
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
  }

  const body = await readValidatedBody(event, (data) => schema.parse(data))
  const db = getDB(event)

  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  }

  if (body.display_name !== undefined) updateData.display_name = body.display_name
  if (body.avatar_url !== undefined) updateData.avatar_url = body.avatar_url
  if (body.phone !== undefined) updateData.phone = body.phone

  const { data: updated, error } = await db
    .from('profiles')
    .update(updateData)
    .eq('id', ctxUser.id)
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 400, statusMessage: error.message || 'Profile update failed' })
  }

  await logAuditEvent(event, ctxUser, 'PROFILE_UPDATE', 'SUCCESS')

  return sendSuccess(event, updated, 'Profile updated successfully')
})
