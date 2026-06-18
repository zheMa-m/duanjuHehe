/**
 * POST /api/v1/storage/upload — 服务端中转上传文件
 *
 * 小文件（< 5MB）走服务端中转，大文件应走 /api/v1/storage/signed-url 直传。
 * @api-auth: user
 */

// @api-auth: user
import { H3Event } from 'h3'
import { sendSuccess } from '~~/server/utils/response'
import { throwError } from '~~/server/utils/response'
import { assertUser } from '~~/server/utils/auth'
import { logAuditEvent } from '~~/server/utils/logger'
import {
  isValidBucket,
  isMimeAllowed,
  buildStoragePath,
  uploadFile,
  getBucketConfig,
  SERVER_PROXY_MAX_SIZE,
} from '~~/server/utils/storage'

defineRouteMeta({
  openAPI: {
    tags: ['存储'],
    summary: '服务端中转上传文件',
    description: '小文件（< 5MB）通过服务端中转上传至 Supabase Storage。大文件请使用 signed-url 接口。',
    security: [{ BearerAuth: [] }],
    requestBody: {
      content: {
        'multipart/form-data': {
          schema: {
            type: 'object',
            required: ['file', 'bucket'],
            properties: {
              file: { type: 'string', format: 'binary', description: '上传文件' },
              bucket: { type: 'string', enum: ['avatars', 'campaign-assets', 'uploads'], description: '目标 Bucket' },
              path: { type: 'string', description: '自定义路径（可选，默认自动生成）' },
            },
          },
        },
      },
    },
    responses: {
      200: { description: '上传成功' },
      400: { description: '参数错误或文件超限' },
      403: { description: '无权限写入该 Bucket' },
    },
  } as any,
})

export default defineEventHandler(async (event: H3Event) => {
  const ctxUser = assertUser(event)

  // 读取 multipart form data
  const formData = await readMultipartFormData(event)
  if (!formData) {
    return throwError(400, 'No form data provided')
  }

  // 提取字段
  const bucketField = formData.find(f => f.name === 'bucket')
  const fileField = formData.find(f => f.name === 'file')
  const pathField = formData.find(f => f.name === 'path')
  const exifField = formData.find(f => f.name === 'exif')

  if (!bucketField || !bucketField.data) {
    return throwError(400, 'Missing required field: bucket')
  }
  if (!fileField || !fileField.data) {
    return throwError(400, 'Missing required field: file')
  }

  const bucket = bucketField.data.toString()
  if (!(await isValidBucket(bucket, event))) {
    return throwError(400, `Invalid bucket: ${bucket}`)
  }

  // campaign-assets 仅管理员可写入
  if (bucket === 'campaign-assets' && ctxUser.role !== 'admin') {
    return throwError(403, 'Only admins can upload to campaign-assets bucket')
  }

  const config = getBucketConfig(bucket)

  // 文件大小校验
  const fileSize = fileField.data.length
  if (fileSize > config.maxSize) {
    return throwError(400, `File size ${fileSize} bytes exceeds bucket limit ${config.maxSize} bytes`)
  }
  if (fileSize > SERVER_PROXY_MAX_SIZE) {
    return throwError(400, `File size ${fileSize} bytes exceeds server proxy limit ${SERVER_PROXY_MAX_SIZE} bytes. Use signed-url endpoint instead.`)
  }

  // MIME 类型校验
  const contentType = fileField.type || 'application/octet-stream'
  if (!isMimeAllowed(bucket, contentType)) {
    return throwError(400, `MIME type ${contentType} is not allowed in bucket ${bucket}`)
  }

  // 构建存储路径（自定义路径必须以当前用户 uid 开头，否则强制使用自动生成路径）
  const customPath = pathField?.data?.toString()
  let storagePath: string
  if (customPath && customPath.startsWith(`${ctxUser.id}/`)) {
    storagePath = customPath
  } else {
    storagePath = buildStoragePath(ctxUser.id, fileField.filename || 'file')
  }

  // 执行上传（将 Buffer 转换为 Uint8Array 以兼容 Supabase SDK）
  const fileData = new Uint8Array(fileField.data)
  const result = await uploadFile(bucket, storagePath, fileData, contentType, event)

  // 解析 EXIF 数据
  let exifData: Record<string, any> | null = null
  if (exifField?.data) {
    try {
      exifData = JSON.parse(exifField.data.toString())
    } catch {}
  }

  await logAuditEvent(event, ctxUser, 'STORAGE_UPLOAD', 'SUCCESS')

  return sendSuccess(event, {
    path: result.path,
    publicUrl: result.publicUrl,
    exif: exifData,
  }, 'File uploaded successfully')
})
