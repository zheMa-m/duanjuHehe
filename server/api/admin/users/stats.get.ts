
// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['管理·营销-用户'],
    summary: '管理员：获取用户统计摘要',
    security: [{ BearerAuth: [] }],
    responses: {
      200: { description: '用户统计摘要（全局，非分页）' },
      403: { description: '非管理员' },
    },
  } as any,
})

/**
 * 管理员：获取用户统计摘要
 * GET /api/admin/users/stats
 */
export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)

  // ① 从 Auth API 获取总用户数
  const { data: authResult } = await db.auth.admin.listUsers({ page: 1, perPage: 1 })
  const totalUsers = authResult?.total || 0

  // ② 从 profiles 表聚合角色 / 认证方式 / 匿名 / 邮箱验证统计
  const { data: profiles } = await db.from('profiles').select('role, auth_provider, is_anonymous, email_verified')
  const allProfiles: any[] = profiles || []

  const byRole: Record<string, number> = { admin: 0, user: 0 }
  const byProvider: Record<string, number> = {}
  let anonymousCount = 0
  let verifiedCount = 0

  for (const p of allProfiles) {
    // 角色
    const role = p.role || 'user'
    byRole[role] = (byRole[role] || 0) + 1

    // 认证方式
    const provider = p.auth_provider || 'email'
    byProvider[provider] = (byProvider[provider] || 0) + 1

    // 匿名
    if (p.is_anonymous) anonymousCount++

    // 邮箱验证
    if (p.email_verified) verifiedCount++
  }

  // ③ 从 subscriptions + orders 表查询去重后的付费用户总数
  const [subsResult, ordersResult] = await Promise.all([
    db.from('subscriptions').select('user_id'),
    db.from('orders').select('user_id'),
  ])
  const paidUserIds = new Set([
    ...(subsResult.data || []).map((s: any) => s.user_id),
    ...(ordersResult.data || []).map((o: any) => o.user_id),
  ])
  const paidUserCount = paidUserIds.size

  return sendSuccess(event, {
    total: totalUsers,
    byRole,
    paidUserCount,
    byProvider,
    anonymousCount,
    verifiedCount,
  })
})
