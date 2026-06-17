/**
 * GET /api/v1/auth/callback — OAuth 回调处理
 *
 * Supabase OAuth 回调时，URL 中包含 code 或 fragment token。
 * 此端点提取 token 并重定向回前端页面，设置 cookie。
 */

// @api-auth: public
import { H3Event } from 'h3'
import { getDB } from '~~/server/utils/db'
import { getClientRealIP } from '~~/server/utils/ip'

defineRouteMeta({
  openAPI: {
    tags: ['Auth'],
    summary: 'OAuth 回调处理',
    description: '处理 Supabase OAuth 回调，交换 code 获取会话令牌并重定向至前端设置 cookie。',
    parameters: [
      { in: 'query', name: 'code', schema: { type: 'string' }, description: 'OAuth 授权码' },
      { in: 'query', name: 'provider', schema: { type: 'string' }, description: 'OAuth 提供者名称' },
    ],
    responses: {
      302: { description: '重定向至前端并携带认证令牌' },
    },
  } as any,
})

export default defineEventHandler(async (event: H3Event) => {
  const query = getQuery(event)
  const db = getDB(event)
  const ip = getClientRealIP(event)
  const userAgent = event.headers.get('user-agent') || ''

  // Mock 模式：直接重定向到首页
  if (process.env.MOCK_DB === 'true' || query.mock === 'true') {
    const provider = query.provider || 'google'
    // Mock 环境：创建模拟 session
    const mockToken = `mock-oauth-${Date.now()}`
    const mockRefresh = `mock-oauth-refresh-${Date.now()}`

    // 记录登录日志
    await db.from('activity_logs').insert({
      category: 'auth',
      user_id: 'mock-user-123',
      action: 'login',
      ip,
      metadata: { provider, user_agent: userAgent, success: true },
    })

    // 重定向到首页并携带 token（前端 JS 提取后写入 cookie）
    const redirectUrl = `/?auth_token=${mockToken}&refresh_token=${mockRefresh}&provider=${provider}`
    return sendRedirect(event, redirectUrl)
  }

  // 真实模式：Supabase Auth 在 detectSessionInUrl=true 时自动处理
  // 但服务端回调仍需交换 code 为 token
  const code = query.code as string
  if (!code) {
    // 没有 code 参数，可能是 error 回调
    const error = query.error_description || query.error || 'Unknown OAuth error'
    return sendRedirect(event, `/?auth_error=${encodeURIComponent(String(error))}`)
  }

  // 使用 Supabase exchangeCodeForSession（需要服务端 SDK）
  // 注意：此处使用 service role 客户端交换 code
  const { data, error } = await db.auth.exchangeCodeForSession(code)

  if (error || !data.session) {
    await db.from('activity_logs').insert({
      category: 'auth',
      user_id: null,
      action: 'login',
      ip,
      metadata: { provider: query.provider as string || 'unknown', user_agent: userAgent, success: false, error_msg: error?.message || 'Token exchange failed' },
    })
    return sendRedirect(event, `/?auth_error=token_exchange_failed`)
  }

  // 记录成功登录
  await db.from('activity_logs').insert({
    category: 'auth',
    user_id: data.user.id,
    action: 'login',
    ip,
    metadata: { provider: (data.user.app_metadata?.provider as string) || 'oauth', user_agent: userAgent, success: true },
  })

  // 重定向到前端，携带 token（前端 JS 提取后写入 cookie）
  const redirectUrl = `/?auth_token=${data.session.access_token}&refresh_token=${data.session.refresh_token}`
  return sendRedirect(event, redirectUrl)
})
