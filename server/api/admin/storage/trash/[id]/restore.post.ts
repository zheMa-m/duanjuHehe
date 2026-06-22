
// @api-auth: admin
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'
import { logAuditEvent } from '~~/server/utils/logger'
import { restoreFile } from '~~/server/utils/storage'

defineRouteMeta({
  openAPI: {
    tags: ['管理·营销-媒体库'],
    summary: '管理员：从回收站还原文件',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: '回收站记录 ID' },
    ],
    responses: {
      200: { description: '还原成功' },
      404: { description: '记录不存在' },
    },
  } as any,
})

/**
 * 管理员：还原回收站文件
 * POST /api/admin/storage/trash/[id]/restore
 */
export default defineEventHandler(async (event) => {
  const user = assertAdmin(event)
  const id = getRouterParam(event, 'id')!

  await restoreFile(id, event)

  await logAuditEvent(event, user, `STORAGE_TRASH_RESTORED: ${id}`, 'SUCCESS')

  return sendSuccess(event, { id }, 'File restored successfully')
})
