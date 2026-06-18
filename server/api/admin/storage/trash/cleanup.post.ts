
// @api-auth: admin
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'
import { logAuditEvent } from '~~/server/utils/logger'
import { cleanupExpiredTrash } from '~~/server/utils/storage'

defineRouteMeta({
  openAPI: {
    tags: ['管理·营销-媒体库'],
    summary: '管理员：清理过期回收站文件',
    security: [{ BearerAuth: [] }],
    responses: {
      200: { description: '清理结果' },
    },
  } as any,
})

/**
 * 管理员：清理过期回收站
 * POST /api/admin/storage/trash/cleanup
 */
export default defineEventHandler(async (event) => {
  const user = assertAdmin(event)

  const cleaned = await cleanupExpiredTrash(event)

  await logAuditEvent(event, user, `STORAGE_TRASH_CLEANUP: ${cleaned} files`, 'SUCCESS')

  return sendSuccess(event, { cleaned }, `Cleaned up ${cleaned} expired files`)
})
