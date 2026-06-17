import { H3Event } from 'h3'

/**
 * 内置管理员的固定 Supabase Auth UUID（v4 标准格式）。
 * 全项目唯一，不依赖 .env 配置，保证 tasks/activity_logs 等表的外键约束一致。
 */
export const BUILTIN_ADMIN_UUID = '9e638ba2-41aa-4434-a68b-6bd9f7ed0963'

/**
 * 确保 Supabase Auth 中存在内置管理员用户。
 * 
 * 首次调用时通过 service_role Admin API 创建固定 UUID 的管理员用户。
 * 后续调用直接返回已有用户（幂等，内存缓存 + getUserById 双重检查）。
 * 
 * ⚠️ 仅在真实 Supabase 环境下调用（MOCK_DB=false）。
 *    Mock DB 模式：02.auth.ts 直接返回 mock-user-123 / mock-tenant-abc，
 *    admin/login.post.ts 跳过此函数，直接使用 BUILTIN_ADMIN_UUID。
 */
let adminUserCache: { user: any } | null = null

export async function ensureAdminAuthUser(db: any): Promise<{ id: string }> {
  if (adminUserCache) return adminUserCache.user

  try {
    // 尝试获取已有管理员用户
    const { data: existing } = await db.auth.admin.getUserById(BUILTIN_ADMIN_UUID)
    if (existing?.user) {
      adminUserCache = existing
      return existing.user
    }
  } catch {
    // 用户不存在，继续创建
  }

  // 创建内置管理员 Auth 用户（固定 UUID，随机密码不用于登录）
  const password = `${crypto.randomUUID()}${crypto.randomUUID()}`
  const { data: created, error } = await db.auth.admin.createUser({
    id: BUILTIN_ADMIN_UUID,
    email: 'admin@hehe.local',
    password,
    email_confirm: true,
    user_metadata: {
      username: 'admin',
      display_name: 'Administrator',
      provider: 'email',
    },
  })

  if (error || !created?.user) {
    console.error('[Admin Seed] Failed to create built-in admin user:', error?.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to initialize admin user',
    })
  }

  // 确保 profiles 表中 role = 'admin'（handle_new_user 触发器默认 role='user'）
  try {
    await db.from('profiles').upsert({
      id: BUILTIN_ADMIN_UUID,
      username: 'admin',
      display_name: 'Administrator',
      role: 'admin',
      plan_status: 'pro',
      auth_provider: 'email',
      is_anonymous: false,
      email_verified: true,
    })
  } catch (err: any) {
    console.error('[Admin Seed] Failed to upsert admin profile:', err?.message)
  }

  adminUserCache = created
  console.log('[Admin Seed] Built-in admin user initialized:', BUILTIN_ADMIN_UUID)
  return created.user
}

// assertUser: 验证用户已登录，并返回用户信息
export function assertUser(event: H3Event) {
  const user = event.context.user
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: Session missing or expired'
    })
  }
  return user
}

// assertAdmin: 确保是管理员身份，否则抛出 403
// 
// ✅ 性能优化：不再重复查询 profiles 表。
//    02.auth.ts 中间件在每次请求时已完整解析 JWT 并将 role 写入
//    event.context.user，此处直接读取即可，无需二次 DB round-trip。
export function assertAdmin(event: H3Event) {
  const user = assertUser(event)

  if (user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Admin Access Forbidden'
    })
  }
  return user
}


