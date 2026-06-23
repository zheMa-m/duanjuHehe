
// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['管理端订阅'],
    summary: '管理员：获取订阅列表（分页 + 状态筛选）',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'query', name: 'page', schema: { type: 'integer', default: 1 }, description: '页码' },
      { in: 'query', name: 'pageSize', schema: { type: 'integer', default: 20 }, description: '每页条数（最大 100）' },
      { in: 'query', name: 'status', schema: { type: 'string', enum: ['active', 'trialing', 'past_due', 'canceled', 'unpaid'] }, description: '按订阅状态过滤' },
    ],
    responses: {
      200: { description: '分页订阅列表（含用户信息合并）' },
      403: { description: '非管理员' },
    },
  } as any,
})

/**
 * 管理员：获取订阅列表（分页，合并 profiles 用户信息）
 * GET /api/admin/subscriptions
 */
export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)

  const query = getQuery(event)
  const page = Math.min(Math.max(parseInt(query.page as string) || 1, 1), 100)
  const pageSize = Math.min(parseInt(query.pageSize as string) || 20, 100)
  const statusFilter = query.status as string | undefined
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let chain = db.from('subscriptions').select('*', { count: 'exact', head: false })

  if (statusFilter) {
    chain = chain.eq('status', statusFilter)
  }

  const { data: subscriptions, error, count } = await chain
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch subscriptions' })
  }

  const items = subscriptions || []

  // 批量查询 profiles + auth users 获取用户邮箱/显示名
  const userIds = [...new Set(items.map((s: any) => s.user_id).filter(Boolean))]
  let profilesMap: Record<string, any> = {}
  let authMap: Record<string, any> = {}

  if (userIds.length > 0) {
    // 并行查询 profiles + auth users（无依赖关系）
    const [profilesResult, authResult] = await Promise.all([
      db.from('profiles').select('*').in('id', userIds),
      db.auth.admin.listUsers({ page: 1, perPage: userIds.length }),
    ])
    const profiles = profilesResult.data
    if (profiles) {
      for (const p of profiles as any[]) {
        profilesMap[p.id] = p
      }
    }
    for (const au of (authResult?.users || [])) {
      authMap[au.id] = au
    }
  }

  // 合并订阅 + 用户信息
  const enriched = items.map((sub: any) => {
    const profile = profilesMap[sub.user_id] || {}
    const au = authMap[sub.user_id] || {}
    return {
      ...sub,
      user_email: au.email || null,
      user_display_name: profile.display_name || au.user_metadata?.display_name || au.user_metadata?.username || null,
    }
  })

  return sendSuccess(event, {
    items: enriched,
    pagination: {
      page,
      pageSize,
      total: count || 0,
    }
  }, 'Admin subscriptions retrieved successfully')
})
