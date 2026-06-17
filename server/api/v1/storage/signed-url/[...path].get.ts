/**
 * GET /api/v1/storage/signed-url/{bucket}/{user_id}/{filename} — 获取私有文件临时访问 URL
 *
 * 仅允许访问自己的文件（或管理员访问任意文件）。
 * @api-auth: user
 */

// @api-auth: user
import { H3Event } from 'h3'
import { sendSuccess } from '~~/server/utils/response'
import { throwError } from '~~/server/utils/response'
import { assertUser } from '~~/server/utils/auth'
import { logAuditEvent } from '~~/server/utils/logger'
import { isValidBucket, getSignedUrl, type StorageBucket } from '~~/server/utils/storage'

defineRouteMeta({
  openAPI: {
    tags: ['Storage'],
    summary: '获取私有文件临时访问 URL',
    description: '为私有 Bucket 中的文件生成临时 signed URL，默认 1 小时有效。用户仅可访问自己目录下的文件。',
    security: [{ BearerAuth: [] }],
    responses: {
      200: { description: 'Signed URL 生成成功' },
      400: { description: '路径格式错误' },
      403: { description: '无权限访问该文件' },
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
  if (!isValidBucket(bucket)) {
    return throwError(400, `Invalid bucket: ${bucket}`)
  }

  const ownerId = segments[1] || ''

  // 权限校验：用户只能访问自己的文件，管理员可访问任意文件
  if (ownerId !== ctxUser.id && ctxUser.role !== 'admin') {
    return throwError(403, 'You can only access files in your own directory')
  }

  // 查询参数中可指定有效期（秒），默认 3600（1 小时）
  const query = getQuery(event)
  const expiresIn = typeof query.expires === 'string' ? parseInt(query.expires, 10) : 3600
  // 限制有效期范围：60 秒 ~ 86400 秒（24 小时）
  const clampedExpires = Math.max(60, Math.min(86400, isNaN(expiresIn) ? 3600 : expiresIn))

  // 生成 signed URL
  const result = await getSignedUrl(bucket as StorageBucket, segments.slice(1).join('/'), clampedExpires, event)

  await logAuditEvent(event, ctxUser, 'STORAGE_SIGNED_URL_ACCESS', 'SUCCESS')

  return sendSuccess(event, {
    signedUrl: result.signedUrl,
    expiresIn: clampedExpires,
  }, 'Signed URL created successfully')
})
