// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['管理·安全-2FA'],
    summary: '管理员：获取 2FA 状态',
    description: '返回当前管理员的 2FA 启用状态和验证时间。不会返回密钥。',
    security: [{ BearerAuth: [] }],
    responses: {
      200: { description: '2FA 状态信息' },
    },
  } as any,
})

export default defineEventHandler(async (event) => {
  const user = assertAdmin(event)
  const db = getDB(event)

  const { data, error } = await db
    .from('admin_2fa')
    .select('is_enabled, verified_at, created_at')
    .eq('user_id', user.id)
    .single()

  // single() 在无数据时返回 error：Supabase 返回 PGRST116，Mock 返回 'Not Found'
  if (error && data === null) {
    // 2FA 尚未设置 — 正常状态，不报错
  } else if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch 2FA status' })
  }

  return sendSuccess(event, {
    enabled: data?.is_enabled || false,
    verifiedAt: data?.verified_at || null,
    createdAt: data?.created_at || null,
  }, '2FA status fetched')
})
