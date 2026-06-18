
// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { assertAdmin, BUILTIN_ADMIN_UUID } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'
import { logAuditEvent } from '~~/server/utils/logger'

defineRouteMeta({
  openAPI: {
    tags: ['管理·营销-用户'],
    summary: '管理员：删除用户（级联清理 profile）',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: '用户 UUID' },
    ],
    responses: {
      200: { description: '用户已删除' },
      403: { description: '禁止删除内置管理员' },
      404: { description: '用户未找到' },
    },
  } as any,
})

/**
 * 管理员：删除 Supabase Auth 用户（profiles 表通过 FK CASCADE 自动清理）
 * DELETE /api/admin/users/:id
 */
export default defineEventHandler(async (event) => {
  const admin = assertAdmin(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'User ID is required' })
  }

  // 禁止删除内置管理员账号
  if (id === BUILTIN_ADMIN_UUID) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Cannot delete the built-in admin account'
    })
  }

  const db = getDB(event)

  // 确认用户存在，同时获取 auth 邮箱（profiles 表无 email 字段，仅用于审计日志）
  const [{ data: profile, error: notFound }, { data: authUser }] = await Promise.all([
    db.from('profiles').select('*').eq('id', id).single(),
    db.auth.admin.getUserById(id),
  ])
  if (notFound || !profile) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  // 删除 Auth 用户（profiles 表 FK ON DELETE CASCADE 自动清理）
  const { error: authErr } = await db.auth.admin.deleteUser(id)
  if (authErr) {
    await logAuditEvent(event, admin, `ADMIN_USER_DELETE_FAILED:${id}`, 'FAILED')
    throw createError({ statusCode: 500, statusMessage: 'Failed to delete auth user' })
  }

  // Mock 模式下 profiles 不会自动级联，手动清理
  if (process.env.MOCK_DB === 'true') {
    await db.from('profiles').delete().eq('id', id)
  }

  const userInfo = authUser?.user?.email || profile.username || id
  await logAuditEvent(event, admin, `ADMIN_USER_DELETED:${id}:${userInfo}`, 'SUCCESS')

  return sendSuccess(event, { id }, 'User deleted successfully')
})
