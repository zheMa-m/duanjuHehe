
// @api-auth: admin
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'
import { logAuditEvent } from '~~/server/utils/logger'
import { isValidBucket, deleteFile } from '~~/server/utils/storage'

defineRouteMeta({
  openAPI: {
    tags: ['管理·营销-媒体库'],
    summary: '管理员：批量删除媒体库文件',
    security: [{ BearerAuth: [] }],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['bucket', 'paths'],
            properties: {
              bucket: { type: 'string', enum: ['avatars', 'campaign-assets', 'uploads'], description: '目标 Bucket' },
              paths: { type: 'array', items: { type: 'string' }, maxItems: 50, description: '文件路径列表（最多 50 个）' },
            },
          },
        },
      },
    },
    responses: {
      200: { description: '批量删除结果' },
      400: { description: '参数错误' },
      403: { description: '非管理员' },
    },
  } as any,
})

/**
 * 管理员：批量删除媒体库文件
 * POST /api/admin/storage/batch-delete
 */
export default defineEventHandler(async (event) => {
  const user = assertAdmin(event)

  const body = await readBody(event)

  const bucket = body?.bucket as string
  const paths = body?.paths as string[]

  if (!bucket || !(await isValidBucket(bucket, event))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid bucket. Bucket does not exist.' })
  }

  if (!Array.isArray(paths) || paths.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'paths must be a non-empty array' })
  }

  if (paths.length > 50) {
    throw createError({ statusCode: 400, statusMessage: 'Cannot delete more than 50 files at once' })
  }

  // 逐文件删除（Supabase Storage remove 支持批量，但需完整路径）
  const errors: { path: string; message: string }[] = []
  let deleted = 0

  for (const p of paths) {
    try {
      await deleteFile(bucket as StorageBucket, p, event)
      deleted++
    } catch (err: any) {
      errors.push({ path: p, message: err.statusMessage || err.message || 'Unknown error' })
    }
  }

  await logAuditEvent(event, user, `STORAGE_BATCH_DELETED: ${bucket} [${deleted}/${paths.length}]`, 'SUCCESS')

  return sendSuccess(event, {
    deleted,
    requested: paths.length,
    errors,
  }, `Deleted ${deleted} of ${paths.length} files`)
})
