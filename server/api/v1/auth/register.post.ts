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
    tags: ['认证'],
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

  // 跳过邮箱验证：自动确认用户邮箱，确保注册后可立即登录
  if (data.user?.id) {
    try {
      await db.auth.admin.updateUserById(data.user.id, { email_confirm: true })
    } catch (_) {
      // 如果 admin API 不可用（如 MOCK_DB 模式），忽略
    }
  }

  // 若 session 为空（开启了邮箱验证的项目），确认后重新登录获取 session
  let session = data.session
  if (!session && data.user?.id) {
    try {
      const signInRes = await db.auth.signInWithPassword({
        email: body.email,
        password: body.password,
      })
      if (signInRes.data?.session) {
        session = signInRes.data.session
      }
    } catch (_) {
      // sign in failed, return without session
    }
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
    session: session ? {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
    } : null,
  }, 'Registration successful')
})
