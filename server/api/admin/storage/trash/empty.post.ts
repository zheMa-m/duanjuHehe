
// @api-auth: admin
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'
import { logAuditEvent } from '~~/server/utils/logger'
import { getDB } from '~~/server/utils/db'
import { deleteFile } from '~~/server/utils/storage'

defineRouteMeta({
  openAPI: {
    tags: ['管理·营销-媒体库'],
    summary: '管理员：清空回收站全部文件',
    security: [{ BearerAuth: [] }],
    responses: {
      200: { description: '清空结果' },
    },
  } as any,
})

/**
 * 管理员：清空回收站
 * POST /api/admin/storage/trash/empty
 */
export default defineEventHandler(async (event) => {
  const user = assertAdmin(event)
  const db = getDB(event)

  // 获取所有回收站记录
  const { data: items } = await db.from('storage_trash').select('*')
  const records = items || []

  let deleted = 0
  for (const item of records) {
    try {
      await deleteFile(item.original_bucket, item.trash_path, event)
      await db.from('storage_trash').delete().eq('id', item.id)
      deleted++
    } catch {
      // 跳过失败项继续清理
    }
  }

  await logAuditEvent(event, user, `STORAGE_TRASH_EMPTY: ${deleted} files`, 'SUCCESS')

  return sendSuccess(event, { deleted }, `Emptied ${deleted} files from trash`)
})
