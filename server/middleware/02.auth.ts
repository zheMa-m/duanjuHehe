import { defineEventHandler, getHeader, parseCookies, setResponseHeader } from 'h3'
import { getDB } from '~~/server/utils/db'
import { ensureAdminAuthUser } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  // 仅针对 /api/ 接口路径处理鉴权状态，跳过静态页面渲染
  if (!event.path.startsWith('/api/')) return

  // Stripe Webhook 端点跳过 Auth 中间件（使用 Stripe 签名验证替代 JWT）
  if (event.path === '/api/v1/payments/webhook') return

  // OAuth 回调端点跳过 Auth（正在交换 token）
  if (event.path === '/api/v1/auth/callback') return

  // 1. Mock DB 离线开发沙盒环境
  //    ⚠️ 安全防线：x-mock-unauthorized 旁路头部严格限定在 MOCK_DB=true 时才生效。
  //    生产部署时 process.env.MOCK_DB 必须为 'false' 或不设置，此分支将被完全跳过。
  if (process.env.MOCK_DB === 'true') {
    // 危险配置警告：在非开发环境检测到 MOCK_DB=true 时输出醒目告警
    if (process.env.NODE_ENV !== 'development') {
      console.warn(
        '\x1b[41m\x1b[1m ⚠️  [SECURITY WARNING] \x1b[0m' +
        '\x1b[33m MOCK_DB=true 在非 development 环境中运行！' +
        ' x-mock-unauthorized 旁路处于激活状态，这是严重安全风险。' +
        ' 请立即将 MOCK_DB 设置为 false。\x1b[0m'
      )
    }

    const isMockUnauthorized = getHeader(event, 'x-mock-unauthorized') === 'true'
    if (isMockUnauthorized) {
      event.context.user = null
      return
    }

    // 默认赋予管理员权限与项目数据隔离标识
    event.context.user = {
      id: 'mock-user-123',
      username: 'solo_hacker',
      role: 'admin',
      tenantId: 'mock-tenant-abc'
    }
    return
  }

  // 2. 真实部署环境（Supabase 真实凭据解析）
  try {
    // ── 内置管理员检测：通过 site-access Cookie 识别 ──
    const cookies = parseCookies(event)
    const siteAccessCookie = cookies['site-access']
    if (siteAccessCookie) {
      const adminPassword = process.env.SITE_ADMIN_PASSWORD || process.env.SITE_ACCESS_PASSWORD || ''
      if (adminPassword && siteAccessCookie === adminPassword) {
        // 确保 Supabase Auth 中存在内置管理员用户（首次自动创建，固定 UUID）
        // 这样 tasks/activity_logs 等表的 tenant_id/user_id 外键约束才能通过
        const db = getDB(event)
        const adminUser = await ensureAdminAuthUser(db)
        
        event.context.user = {
          id: adminUser.id,                                        // ✅ 真实 Supabase Auth UUID
          username: process.env.SITE_ADMIN_USERNAME || 'admin',
          role: 'admin',
          tenantId: adminUser.id,                                  // ✅ 真实 UUID，满足 FK
          isAnonymous: false,
        }
        return
      }
    }

    // Token 来源优先级：Bearer header > Cookie
    let token: string | null = null

    const authHeader = getHeader(event, 'authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    } else {
      // 从 Cookie 中提取 access_token
      token = cookies['sb-access-token'] || null
    }

    if (token) {
      const db = getDB(event)
      const { data: { user }, error: authError } = await db.auth.getUser(token)

      if (authError || !user) {
        // JWT 无效或过期，设置 context 为 null（不抛异常，让 04.auth-guard 决定是否拦截）
        // 同时清除无效的 cookie（如果存在），避免重复验证
        if (authError?.message?.includes('expired') || authError?.message?.includes('invalid')) {
          const expired = 'Thu, 01 Jan 1970 00:00:00 GMT'
          setResponseHeader(event, 'Set-Cookie', `sb-access-token=;expires=${expired};path=/;SameSite=Strict`)
        }
        event.context.user = null
        return
      }

      // 获取当前用户的 profiles 属性以确认身份角色
      const { data: profile, error: profileError } = await db
        .from('profiles')
        .select('email, role, username, display_name, avatar_url, auth_provider, is_anonymous')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        event.context.user = {
          id: user.id,
          username: user.email || 'anonymous',
          role: 'user',
          tenantId: user.id
        }
      } else {
        event.context.user = {
          id: user.id,
          username: profile.username || user.email || 'anonymous',
          role: profile.role || 'user',
          tenantId: user.id,
          isAnonymous: profile.is_anonymous || false,
        }
      }
    } else {
      // 无 token：检查是否有 device_id cookie（匿名用户标识）
      const cookies = parseCookies(event)
      const deviceId = cookies['device-id']
      if (deviceId) {
        event.context.user = {
          id: `anon-${deviceId}`,
          username: 'anonymous',
          role: 'anonymous',
          tenantId: deviceId,
          isAnonymous: true,
        }
      } else {
        event.context.user = null
      }
    }
  } catch (error: any) {
    console.error('🚨 [Auth Middleware Error]:', error.message || error)
    event.context.user = null
  }
})
