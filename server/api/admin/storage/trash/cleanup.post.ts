
// @api-auth: admin
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'
import { logAuditEvent } from '~~/server/utils/logger'
import { cleanupExpiredTrash } from '~~/server/utils/storage'

defineRouteMeta({
  openAPI: {
    tags: ['管理·营销-媒体库'],
    summary: '管理员/定时器：清理过期回收站文件',
    description: '清理所有 expires_at 已到期的回收站文件（物理删除存储 + DB 记录）。支持管理员手动触发和 pg_cron 定时自动触发。',
    security: [{ BearerAuth: [] }],
    responses: {
      200: { description: '清理结果' },
    },
  } as any,
})

/**
 * 管理员/定时器：清理过期回收站
 * POST /api/admin/storage/trash/cleanup
 */
export default defineEventHandler(async (event) => {
  // 双重鉴权：支持管理员手动触发 + pg_cron 定时触发
  const cronSecretHeader = getHeader(event, 'x-cron-secret')
  const envCronSecret = process.env.ARCHIVE_CRON_SECRET || 'hehe_archive_cron_secret_placeholder'

  let isCronTrigger = false
  if (cronSecretHeader && cronSecretHeader === envCronSecret) {
    isCronTrigger = true
  } else {
    assertAdmin(event)
  }

  const cleaned = await cleanupExpiredTrash(event)

  // 记录审计日志（cron 触发时 user 为 null）
  const operatorUser = isCronTrigger ? null : (event.context.user || null)
  if (cleaned > 0) {
    await logAuditEvent(event, operatorUser, `STORAGE_TRASH_CLEANED: ${cleaned} files`, 'SUCCESS')
  }

  return sendSuccess(event, { cleaned }, `Cleaned up ${cleaned} expired files`)
})
