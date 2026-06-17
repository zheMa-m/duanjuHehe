/**
 * POST /api/v1/auth/logout — 用户登出
 *
 * 调用 Supabase signOut 使 session 失效，清理客户端 cookie。
 */

// @api-auth: public
import { H3Event } from 'h3'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['Auth'],
    summary: '用户登出',
    description: '通过 Supabase signOut 使当前会话失效并清除认证 cookie。',
    responses: {
      200: { description: '登出成功' },
    },
  } as any,
})

export default defineEventHandler(async (event: H3Event) => {
  const ctxUser = event.context.user
  const db = getDB(event)

  // 调用 Supabase signOut（仅真实模式有效）
  if (process.env.MOCK_DB !== 'true') {
    await db.auth.signOut().catch(() => { /* ignore */ })
  }

  // 清理 cookie（通过 Set-Cookie header 过期，带上安全属性）
  const expired = 'Thu, 01 Jan 1970 00:00:00 GMT'
  const secureFlag = process.env.NODE_ENV === 'production' ? ';Secure' : ''
  setResponseHeader(event, 'Set-Cookie', [
    `sb-access-token=;expires=${expired};path=/;SameSite=Strict${secureFlag}`,
    `sb-refresh-token=;expires=${expired};path=/;SameSite=Strict${secureFlag}`,
  ].join(', '))

  return sendSuccess(event, null, 'Logout successful')
})
