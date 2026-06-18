/**
 * GET /api/v1/auth/me — 获取当前用户 profile
 *
 * 从 event.context.user 读取已鉴权的用户信息，
 * 再从 profiles 表获取完整档案。
 */

// @api-auth: public
import { H3Event } from 'h3'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['认证'],
    summary: '获取当前用户信息',
    description: '返回已认证用户的完整档案信息（来自 profiles 表），若 profile 未创建则返回基本信息。',
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: '用户档案对象',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                data: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    email: { type: 'string', format: 'email' },
                    username: { type: 'string' },
                    display_name: { type: 'string' },
                    avatar_url: { type: 'string', nullable: true },
                    role: { type: 'string', enum: ['user', 'admin'] },
                    auth_provider: { type: 'string' },
                    is_anonymous: { type: 'boolean' },
                    email_verified: { type: 'boolean' },
                    phone: { type: 'string', nullable: true },
                    created_at: { type: 'string', format: 'date-time' },
                    updated_at: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
      401: { description: '未认证' },
    },
  } as any,
})

export default defineEventHandler(async (event: H3Event) => {
  const ctxUser = event.context.user

  if (!ctxUser) {
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
  }

  const db = getDB(event)

  // 从 profiles 表获取完整用户信息
  const { data: profile, error } = await db
    .from('profiles')
    .select('id, username, display_name, avatar_url, role, auth_provider, is_anonymous, email_verified, phone, created_at, updated_at')
    .eq('id', ctxUser.id)
    .single()

  if (error || !profile) {
    // 如果 profile 不存在（可能触发器未执行），返回基本信息
    return sendSuccess(event, {
      id: ctxUser.id,
      email: ctxUser.email || null,
      username: ctxUser.username,
      display_name: ctxUser.username,
      avatar_url: null,
      role: ctxUser.role || 'user',
      auth_provider: 'email',
      is_anonymous: false,
      email_verified: false,
      phone: null,
    })
  }

  return sendSuccess(event, {
    ...profile,
    email: ctxUser.email || null
  })
})
