
// @api-auth: admin
import { z } from 'zod'
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess, throwError } from '~~/server/utils/response'
import { logAuditEvent } from '~~/server/utils/logger'
import { restoreFile } from '~~/server/utils/storage'

const schema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
})

defineRouteMeta({
  openAPI: {
    tags: ['管理·营销-媒体库'],
    summary: '管理员：批量还原回收站文件',
    security: [{ BearerAuth: [] }],
    requestBody: {
      content: { 'application/json': { schema: { type: 'object', required: ['ids'], properties: { ids: { type: 'array', items: { type: 'string' }, maxItems: 100 } } } } },
    },
    responses: {
      200: { description: '批量还原结果' },
    },
  } as any,
})

/**
 * 管理员：批量还原回收站文件
 * POST /api/admin/storage/trash/batch-restore
 */
export default defineEventHandler(async (event) => {
  const user = assertAdmin(event)
  const body = (await readBody(event)) || {}
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return throwError(400, parsed.error.issues[0]?.message || 'Invalid input')
  }

  const { ids } = parsed.data
  let restored = 0
  const errors: string[] = []

  for (const id of ids) {
    try {
      await restoreFile(id, event)
      restored++
    } catch (e: any) {
      errors.push(`${id}: ${e?.statusMessage || e?.message}`)
    }
  }

  await logAuditEvent(event, user, `STORAGE_TRASH_BATCH_RESTORED: ${restored}/${ids.length}`, 'SUCCESS')

  return sendSuccess(event, { restored, errors }, `Restored ${restored} of ${ids.length} files`)
})
