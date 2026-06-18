
// @api-auth: admin
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'
import { logAuditEvent } from '~~/server/utils/logger'
import { trashFile, isValidBucket } from '~~/server/utils/storage'

defineRouteMeta({
  openAPI: {
    tags: ['管理·营销-媒体库'],
    summary: '管理员：软删除文件到回收站',
    security: [{ BearerAuth: [] }],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['bucket', 'paths'],
            properties: {
              bucket: { type: 'string' },
              paths: { type: 'array', items: { type: 'string' }, maxItems: 50 },
            },
          },
        },
      },
    },
    responses: {
      200: { description: '软删除成功' },
      400: { description: '参数错误' },
      403: { description: '非管理员' },
    },
  } as any,
})

/**
 * 管理员：软删除文件到回收站
 * POST /api/admin/storage/trash
 */
export default defineEventHandler(async (event) => {
  const user = assertAdmin(event)
  const body = await readBody(event)

  const bucket = body?.bucket as string
  const paths = body?.paths as string[]

  if (!bucket || !(await isValidBucket(bucket, event))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid bucket.' })
  }

  if (!Array.isArray(paths) || paths.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'paths must be a non-empty array.' })
  }

  if (paths.length > 50) {
    throw createError({ statusCode: 400, statusMessage: 'Cannot trash more than 50 files at once.' })
  }

  const errors: { path: string; message: string }[] = []
  const trashed: string[] = []

  for (const p of paths) {
    try {
      await trashFile(bucket, p, user?.id || null, event)
      trashed.push(p)
    } catch (err: any) {
      errors.push({ path: p, message: err.statusMessage || err.message || 'Unknown error' })
    }
  }

  await logAuditEvent(event, user, `STORAGE_TRASH: ${bucket} [${trashed.length}/${paths.length}]`, 'SUCCESS')

  return sendSuccess(event, {
    trashed: trashed.length,
    requested: paths.length,
    errors,
  }, `Trashed ${trashed.length} of ${paths.length} files`)
})
