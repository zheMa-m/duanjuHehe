/**
 * POST /api/admin/login — 管理后台内置管理员登录
 *
 * 使用 SITE_ADMIN_USERNAME / SITE_ADMIN_PASSWORD 环境变量进行用户名+密码认证。
 * 成功后在服务端设置 site-access Cookie，前端通过 Cookie + /api/v1/auth/me 获取管理员身份。
 *
 * 配置说明：
 *   - SITE_ADMIN_USERNAME: 管理员用户名（默认 'admin'）
 *   - SITE_ADMIN_PASSWORD: 管理员密码（留空则内置登录禁用）
 *   - 如果未配置 SITE_ADMIN_PASSWORD，回退到 SITE_ACCESS_PASSWORD（统一密码模式）
 */
// @api-auth: public
import { z } from 'zod'
import { H3Event } from 'h3'
import { sendSuccess } from '~~/server/utils/response'
import { getDB } from '~~/server/utils/db'
import { BUILTIN_ADMIN_UUID, ensureAdminAuthUser } from '~~/server/utils/auth'

defineRouteMeta({
  openAPI: {
    tags: ['Auth'],
    summary: '管理后台内置管理员登录',
    description: '使用 SITE_ADMIN_USERNAME/SITE_ADMIN_PASSWORD 环境变量进行管理后台登录。',
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              username: { type: 'string' },
              password: { type: 'string' },
            },
            required: ['username', 'password'],
          },
        },
      },
    },
    responses: {
      200: { description: '登录成功 — 返回管理员用户信息' },
      401: { description: '凭证无效' },
    },
  } as any,
})

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

export default defineEventHandler(async (event: H3Event) => {
  const body = await readValidatedBody(event, (data) => schema.parse(data))

  const adminUsername = process.env.SITE_ADMIN_USERNAME || 'admin'
  const adminPassword = process.env.SITE_ADMIN_PASSWORD || process.env.SITE_ACCESS_PASSWORD || ''

  if (!adminPassword) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Admin login is not configured. Set SITE_ADMIN_PASSWORD or SITE_ACCESS_PASSWORD.',
    })
  }

  if (body.username !== adminUsername || body.password !== adminPassword) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid username or password' })
  }

  // 登录成功 — 设置 site-access Cookie（与 05.access-guard 共享）
  const COOKIE_NAME = 'site-access'
  const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 天

  setCookie(event, COOKIE_NAME, adminPassword, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })

  // 确保 Supabase Auth 中存在内置管理员用户（首次自动创建，固定 UUID）。
  // Mock DB 模式下跳过：mock adapter 无 auth.admin API，且 mock 环境
  // 不涉及真实外键约束，直接使用 BUILTIN_ADMIN_UUID 即可（02.auth.ts
  // 中 mock 分支也硬编码了 mock-user-123 / mock-tenant-abc）。
  let adminUserId = BUILTIN_ADMIN_UUID
  if (process.env.MOCK_DB !== 'true') {
    try {
      const db = getDB(event)
      const adminUser = await ensureAdminAuthUser(db)
      adminUserId = adminUser.id
    } catch (err: any) {
      console.error('[Admin Login] Failed to ensure admin auth user:', err?.message)
      // 不阻断登录流程，继续使用固定 UUID（极端容错）
    }
  }

  // 返回管理员用户信息（由 auth composable 消费）
  return sendSuccess(event, {
    user: {
      id: adminUserId,
      username: adminUsername,
      display_name: 'Administrator',
      role: 'admin',
      email: 'admin@hehe.local',
      avatar_url: null,
      auth_provider: 'email',
      is_anonymous: false,
    },
  }, 'Admin login successful')
})
