
// @api-auth: admin
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'
import { logAuditEvent } from '~~/server/utils/logger'
import { permanentDeleteFile } from '~~/server/utils/storage'

defineRouteMeta({
  openAPI: {
    tags: ['管理·营销-媒体库'],
    summary: '管理员：永久删除回收站文件',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: '回收站记录 ID' },
    ],
    responses: {
      200: { description: '永久删除成功' },
      404: { description: '记录不存在' },
    },
  } as any,
})

/**
 * 管理员：永久删除回收站文件
 * DELETE /api/admin/storage/trash/[id]
 */
export default defineEventHandler(async (event) => {
  const user = assertAdmin(event)
  const id = getRouterParam(event, 'id')!

  await permanentDeleteFile(id, event)

  await logAuditEvent(event, user, `STORAGE_TRASH_DELETE: ${id}`, 'SUCCESS')

  return sendSuccess(event, { id }, 'File permanently deleted')
})
