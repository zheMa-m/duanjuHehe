/**
 * POST /api/v1/auth/link — 匿名用户绑定邮箱/密码
 *
 * 将当前匿名用户的 identity 绑定到真实邮箱，
 * 绑定后 is_anonymous 更新为 false，auth_provider 更新为 email。
 */

// @api-auth: public
import { z } from 'zod'
import { H3Event } from 'h3'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { logAuditEvent } from '~~/server/utils/logger'
import { getClientRealIP } from '~~/server/utils/ip'

defineRouteMeta({
  openAPI: {
    tags: ['认证'],
    summary: '匿名用户绑定邮箱',
    description: '将匿名用户的 identity 绑定到真实邮箱/密码账户，绑定后 is_anonymous 变为 false。',
    security: [{ BearerAuth: [] }],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              email: { type: 'string', format: 'email' },
              password: { type: 'string' },
            },
            required: ['email', 'password'],
          },
        },
      },
    },
    responses: {
      200: { description: '账户绑定成功' },
      401: { description: '未认证' },
    },
  } as any,
})

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
})

export default defineEventHandler(async (event: H3Event) => {
  const ctxUser = event.context.user
  if (!ctxUser) {
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
  }

  const body = await readValidatedBody(event, (data) => schema.parse(data))
  const db = getDB(event)
  const ip = getClientRealIP(event)

  // 1. 调用 Supabase linkIdentity（真实模式）
  if (process.env.MOCK_DB !== 'true') {
    const { error: linkError } = await db.auth.updateUser({
      email: body.email,
      password: body.password,
    })

    if (linkError) {
      throw createError({ statusCode: 400, statusMessage: linkError.message || 'Account linking failed' })
    }
  }

  // 2. 更新 profiles：匿名 → 正式用户
  const { error: profileError } = await db
    .from('profiles')
    .update({
      username: body.email.split('@')[0],
      display_name: body.email.split('@')[0],
      auth_provider: 'email',
      is_anonymous: false,
      email_verified: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ctxUser.id)

  if (profileError) {
    throw createError({ statusCode: 400, statusMessage: profileError.message || 'Profile update failed' })
  }

  // 3. 记录关联日志
  await db.from('activity_logs').insert({
    category: 'auth',
    user_id: ctxUser.id,
    action: 'link_account',
    ip,
    metadata: { provider: 'email', user_agent: event.headers.get('user-agent') || '', success: true },
  })

  await logAuditEvent(event, ctxUser, 'ANONYMOUS_ACCOUNT_LINKED', 'SUCCESS')

  return sendSuccess(event, {
    id: ctxUser.id,
    email: body.email,
    is_anonymous: false,
  }, 'Account linked successfully')
})
