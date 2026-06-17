/**
 * POST /api/v1/auth/register — 邮箱注册
 *
 * 调用 Supabase Auth signUp，自动创建 profiles 记录（由 DB 触发器处理）。
 */

// @api-auth: public
import { z } from 'zod'
import { H3Event } from 'h3'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { getClientRealIP } from '~~/server/utils/ip'

defineRouteMeta({
  openAPI: {
    tags: ['Auth'],
    summary: '邮箱注册',
    description: '通过 Supabase Auth signUp 创建新账户，profiles 记录由数据库触发器自动创建。',
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              email: { type: 'string', format: 'email' },
              password: { type: 'string' },
              username: { type: 'string' },
            },
            required: ['email', 'password'],
          },
        },
      },
    },
    responses: {
      200: { description: '注册成功 — 返回用户信息 + 会话' },
      400: { description: '注册失败' },
    },
  } as any,
})

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  username: z.string().min(2).max(32).optional(),
})

export default defineEventHandler(async (event: H3Event) => {
  const body = await readValidatedBody(event, (data) => schema.parse(data))
  const db = getDB(event)
  const ip = getClientRealIP(event)

  const { data, error } = await db.auth.signUp({
    email: body.email,
    password: body.password,
    options: {
      data: {
        username: body.username || body.email.split('@')[0],
        display_name: body.username || body.email.split('@')[0],
        provider: 'email',
        is_anonymous: false,
      }
    }
  })

  if (error) {
    throw createError({ statusCode: 400, statusMessage: error.message || 'Registration failed' })
  }

  // 记录注册日志
  await db.from('activity_logs').insert({
    category: 'auth',
    user_id: data.user?.id || null,
    action: 'register',
    ip,
    metadata: { provider: 'email', user_agent: event.headers.get('user-agent') || '', success: true },
  })

  return sendSuccess(event, {
    user: { id: data.user?.id, email: body.email },
    session: data.session ? {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    } : null,
  }, 'Registration successful')
})
