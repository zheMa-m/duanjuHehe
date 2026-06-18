/**
 * GET /api/admin/security/logs — 安全事件日志（最近 200 条）
 *
 * 查询 activity_logs 中 category='system' AND action LIKE 'api_security_%' 的记录。
 */
// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['管理·系统-安全'],
    summary: '管理员：查询安全事件日志（最近 200 条）',
    security: [{ BearerAuth: [] }],
    responses: {
      200: { description: '安全事件日志列表' },
      403: { description: '非管理员' },
    },
  } as any,
})

export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)

  const { data, error } = await db
    .from('activity_logs')
    .select('id, category, action, user_id, ip, metadata, created_at')
    .eq('category', 'system')
    .like('action', 'api_security_%')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    return sendSuccess(event, [], 'No security events found')
  }

  return sendSuccess(event, data || [], 'Security event logs retrieved successfully')
})
