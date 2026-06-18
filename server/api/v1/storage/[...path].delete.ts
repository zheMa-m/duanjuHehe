/**
 * DELETE /api/v1/storage/{bucket}/{user_id}/{filename} — 删除文件
 *
 * 校验路径前缀必须为当前用户 uid（除非管理员操作 campaign-assets）。
 * @api-auth: user
 */

// @api-auth: user
import { H3Event } from 'h3'
import { sendSuccess } from '~~/server/utils/response'
import { throwError } from '~~/server/utils/response'
import { assertUser } from '~~/server/utils/auth'
import { logAuditEvent } from '~~/server/utils/logger'
import { isValidBucket, deleteFile, type StorageBucket } from '~~/server/utils/storage'

defineRouteMeta({
  openAPI: {
    tags: ['存储'],
    summary: '删除存储文件',
    description: '删除指定路径的文件。用户仅可删除自己目录下的文件，管理员可操作 campaign-assets。',
    security: [{ BearerAuth: [] }],
    responses: {
      200: { description: '删除成功' },
      400: { description: '路径格式错误' },
      403: { description: '无权限删除该文件' },
    },
  } as any,
})

export default defineEventHandler(async (event: H3Event) => {
  const ctxUser = assertUser(event)

  // 从路由参数获取完整路径
  const fullPath = getRouterParam(event, 'path')
  if (!fullPath) {
    return throwError(400, 'Missing file path')
  }

  // 解析路径：{bucket}/{user_id}/{filename}
  const segments = fullPath.split('/')
  if (segments.length < 2) {
    return throwError(400, 'Invalid path format. Expected: {bucket}/{user_id}/{filename}')
  }

  const bucket = segments[0] || ''
  if (!(await isValidBucket(bucket, event))) {
    return throwError(400, `Invalid bucket: ${bucket}`)
  }

  const ownerId = segments[1]

  // 权限校验：用户只能删除自己目录下的文件，管理员可操作 campaign-assets
  if (bucket === 'campaign-assets') {
    if (ctxUser.role !== 'admin') {
      return throwError(403, 'Only admins can delete files from campaign-assets bucket')
    }
  } else {
    // 非管理员只能删除自己的文件
    if (ownerId !== ctxUser.id && ctxUser.role !== 'admin') {
      return throwError(403, 'You can only delete files in your own directory')
    }
  }

  // 执行删除
  await deleteFile(bucket as StorageBucket, segments.slice(1).join('/'), event)

  await logAuditEvent(event, ctxUser, 'STORAGE_DELETE', 'SUCCESS')

  return sendSuccess(event, null, 'File deleted successfully')
})
