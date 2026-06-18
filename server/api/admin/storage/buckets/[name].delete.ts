
// @api-auth: admin
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'
import { logAuditEvent } from '~~/server/utils/logger'
import { deleteBucket, DEFAULT_BUCKET_NAMES } from '~~/server/utils/storage'

defineRouteMeta({
  openAPI: {
    tags: ['管理·营销-媒体库'],
    summary: '管理员：删除自定义存储桶（必须为空）',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'path', name: 'name', required: true, schema: { type: 'string' }, description: '桶名' },
    ],
    responses: {
      200: { description: '删除成功' },
      403: { description: '非管理员或系统桶' },
      409: { description: '桶非空' },
    },
  } as any,
})

/**
 * 管理员：删除自定义存储桶
 * DELETE /api/admin/storage/buckets/[name]
 */
export default defineEventHandler(async (event) => {
  const user = assertAdmin(event)
  const name = getRouterParam(event, 'name')!

  if (DEFAULT_BUCKET_NAMES.has(name)) {
    throw createError({ statusCode: 403, statusMessage: 'Cannot delete system bucket.' })
  }

  await deleteBucket(name, event)

  await logAuditEvent(event, user, `STORAGE_BUCKET_DELETE: ${name}`, 'SUCCESS')

  return sendSuccess(event, { name }, 'Bucket deleted successfully')
})
