
// @api-auth: admin
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'
import { logAuditEvent } from '~~/server/utils/logger'
import { moveFile, isValidBucket } from '~~/server/utils/storage'

defineRouteMeta({
  openAPI: {
    tags: ['管理·营销-媒体库'],
    summary: '管理员：移动/重命名文件（支持批量）',
    security: [{ BearerAuth: [] }],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['bucket'],
            properties: {
              bucket: { type: 'string', description: '源桶名' },
              fromPath: { type: 'string', description: '源路径（单文件模式）' },
              toPath: { type: 'string', description: '目标路径（单文件模式）' },
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: { from: { type: 'string' }, to: { type: 'string' } },
                },
                description: '批量移动列表',
              },
            },
          },
        },
      },
    },
    responses: {
      200: { description: '移动成功' },
      400: { description: '参数错误' },
      403: { description: '非管理员' },
    },
  } as any,
})

/**
 * 管理员：移动/重命名文件
 * POST /api/admin/storage/move
 *
 * 支持两种模式：
 * - 单文件：{ bucket, fromPath, toPath }
 * - 批量：{ bucket, items: [{ from, to }] }
 */
export default defineEventHandler(async (event) => {
  const user = assertAdmin(event)
  const body = await readBody(event)

  const bucket = body?.bucket as string
  if (!bucket || !(await isValidBucket(bucket, event))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid bucket.' })
  }

  const items = body?.items as Array<{ from: string; to: string }> | undefined

  // 批量模式
  if (Array.isArray(items) && items.length > 0) {
    if (items.length > 50) {
      throw createError({ statusCode: 400, statusMessage: 'Cannot move more than 50 files at once.' })
    }

    const errors: { from: string; message: string }[] = []
    let moved = 0

    for (const item of items) {
      try {
        await moveFile(bucket, item.from, item.to, event)
        moved++
      } catch (err: any) {
        errors.push({ from: item.from, message: err.statusMessage || err.message || 'Unknown error' })
      }
    }

    await logAuditEvent(event, user, `STORAGE_BATCH_MOVE: ${bucket} [${moved}/${items.length}]`, 'SUCCESS')

    return sendSuccess(event, { moved, requested: items.length, errors }, `Moved ${moved} of ${items.length} files`)
  }

  // 单文件模式
  const fromPath = body?.fromPath as string
  const toPath = body?.toPath as string

  if (!fromPath || !toPath) {
    throw createError({ statusCode: 400, statusMessage: 'Either items[] or fromPath+toPath is required.' })
  }

  const result = await moveFile(bucket, fromPath, toPath, event)

  await logAuditEvent(event, user, `STORAGE_MOVE: ${bucket} ${fromPath} -> ${toPath}`, 'SUCCESS')

  return sendSuccess(event, result, 'File moved successfully')
})
