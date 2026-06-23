
// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['管理·营销-用户'],
    summary: '管理员：获取用户列表（分页）',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'query', name: 'page', schema: { type: 'integer', default: 1 }, description: '页码' },
      { in: 'query', name: 'pageSize', schema: { type: 'integer', default: 20 }, description: '每页条数（最大 100）' },
      { in: 'query', name: 'role', schema: { type: 'string', enum: ['user', 'admin'] }, description: '按角色过滤' },
      { in: 'query', name: 'plan', schema: { type: 'string', enum: ['paid'] }, description: '按套餐过滤（paid = pro + enterprise）' },
      { in: 'query', name: 'provider', schema: { type: 'string' }, description: '按认证方式过滤' },
      { in: 'query', name: 'search', schema: { type: 'string' }, description: '按邮箱或显示名模糊搜索' },
    ],
    responses: {
      200: { description: '分页用户列表（Auth + Profiles 合并）' },
      403: { description: '非管理员' },
    },
  } as any,
})

/**
 * 管理员：获取所有用户列表（合并 Supabase Auth + profiles 表）
 * GET /api/admin/users
 */
export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)

  const query = getQuery(event)
  const page = Math.min(Math.max(parseInt(query.page as string) || 1, 1), 100)
  const pageSize = Math.min(parseInt(query.pageSize as string) || 20, 100)
  const roleFilter = query.role as string | undefined
  const planFilter = query.plan as string | undefined
  const providerFilter = query.provider as string | undefined
  const searchQuery = query.search as string | undefined

  let authUsers: any[] = []
  let total = 0
  let profilesMap: Record<string, any> = {}

  // ── 服务端筛选标记：role 或 plan 都需要以 profiles 为主表分页 ───
  const hasProfileFilter = roleFilter || planFilter

  if (hasProfileFilter) {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let profileQuery = db.from('profiles').select('*', { count: 'exact', head: false })
    if (roleFilter) profileQuery = profileQuery.eq('role', roleFilter)
    if (planFilter === 'paid') profileQuery = profileQuery.in('plan_status', ['pro', 'enterprise'])
    const { data: filteredProfiles, count } = await profileQuery
      .order('created_at', { ascending: false })
      .range(from, to)

    total = count || 0
    const profileRows = (filteredProfiles || []) as any[]

    if (profileRows.length > 0) {
      const pIds = profileRows.map((p: any) => p.id)

      // 从 Auth API 构建全量 ID map（分页遍历，避免 listUsers 按位置返回而非按 ID 匹配）
      const authMap: Record<string, any> = {}
      const batchSize = 100
      const MAX_AUTH_PAGES = 10 // 最多扫描 10 页（1000 用户），超过时停止以防止超长循环
      let authPage = 1
      let hasMore = true
      while (hasMore && authPage <= MAX_AUTH_PAGES) {
        const { data: batch } = await db.auth.admin.listUsers({ page: authPage, perPage: batchSize })
        for (const au of (batch?.users || [])) { authMap[au.id] = au }
        hasMore = (batch?.users || []).length === batchSize
        authPage++
      }

      // 按 profile ID 精确匹配，保持 profile 筛选的排序
      authUsers = pIds.map(id => authMap[id]).filter(Boolean)
      for (const p of profileRows) { profilesMap[p.id] = p }
    }
  } else {
    // ── 无筛选：以 Auth API 为主表分页 ─────────────────────
    const { data: authResult, error: authError } = await db.auth.admin.listUsers({
      page,
      perPage: pageSize,
    })

    if (authError) {
      throw createError({ statusCode: 500, statusMessage: 'Failed to list auth users' })
    }

    authUsers = authResult?.users || []
    total = authResult?.total || 0

    const userIds = authUsers.map((u: any) => u.id)
    if (userIds.length > 0) {
      const { data: profiles } = await db.from('profiles').select('*').in('id', userIds)
      if (profiles) {
        for (const p of profiles as any[]) {
          profilesMap[p.id] = p
        }
      }
    }
  }

  // ③ 合并 Auth + Profile 数据
  let items = authUsers.map((au: any) => {
    const profile = profilesMap[au.id] || {}
    return {
      id: au.id,
      email: au.email || profile.email || null,
      display_name: profile.display_name || au.user_metadata?.display_name || au.user_metadata?.username || '-',
      username: profile.username || au.user_metadata?.username || null,
      role: profile.role || 'user',
      plan_status: profile.plan_status || 'free',
      auth_provider: profile.auth_provider || au.app_metadata?.provider || 'email',
      is_anonymous: profile.is_anonymous || false,
      email_verified: profile.email_verified || !!au.email_confirmed_at,
      avatar_url: profile.avatar_url || null,
      phone: profile.phone || null,
      device_id: profile.device_id || null,
      last_sign_in_at: au.last_sign_in_at || null,
      created_at: au.created_at || profile.created_at || null,
      updated_at: profile.updated_at || null,
    }
  })

  // ④ provider 内存过滤（仅无 profiles 筛选时生效）
  if (providerFilter && !hasProfileFilter) {
    items = items.filter((u: any) => u.auth_provider === providerFilter)
  }

  // ⑤ search 关键词搜索（邮箱 + 显示名模糊匹配）
  if (searchQuery) {
    const lower = searchQuery.toLowerCase()
    items = items.filter((u: any) => {
      const email = (u.email || '').toLowerCase()
      const displayName = (u.display_name || '').toLowerCase()
      return email.includes(lower) || displayName.includes(lower)
    })
    // 搜索结果不信任原有 total，重新计算
    total = items.length
    // 对搜索结果做内存分页
    const from = (page - 1) * pageSize
    items = items.slice(from, from + pageSize)
  }

  return sendSuccess(event, {
    items,
    pagination: {
      page,
      pageSize,
      total,
    }
  }, 'Admin users retrieved successfully')
})
