/**
 * POST /api/v1/storage/signed-url — 生成客户端直传的 Signed Upload URL
 *
 * 大文件（>= 5MB）场景由客户端主动调用，获取 signedUrl 后直接 PUT 上传。
 * @api-auth: user
 */
import { z } from 'zod'
import { H3Event } from 'h3'
import { sendSuccess } from '~~/server/utils/response'
import { throwError } from '~~/server/utils/response'
import { assertUser } from '~~/server/utils/auth'
import { logAuditEvent } from '~~/server/utils/logger'
import {
  isValidBucket,
  isMimeAllowed,
  buildStoragePath,
  createSignedUploadUrl,
  BUCKET_CONFIG,
} from '~~/server/utils/storage'

defineRouteMeta({
  openAPI: {
    tags: ['Storage'],
    summary: '生成客户端直传的 Signed Upload URL',
    description: '获取 signed URL 后客户端可直接 PUT 上传文件至 Supabase Storage，适合大文件（>= 5MB）场景。',
    security: [{ BearerAuth: [] }],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['bucket', 'filename'],
            properties: {
              bucket: { type: 'string', enum: ['avatars', 'campaign-assets', 'uploads'] },
              filename: { type: 'string', description: '原始文件名' },
              contentType: { type: 'string', description: '文件 MIME 类型' },
            },
          },
        },
      },
    },
    responses: {
      200: { description: 'Signed URL 生成成功' },
      400: { description: '参数错误' },
      403: { description: '无权限写入该 Bucket' },
    },
  } as any,
})

const schema = z.object({
  bucket: z.string().refine((v) => ['avatars', 'campaign-assets', 'uploads'].includes(v), {
    message: 'Invalid bucket. Must be one of: avatars, campaign-assets, uploads',
  }),
  filename: z.string().min(1).max(255),
  contentType: z.string().optional(),
})

export default defineEventHandler(async (event: H3Event) => {
  const ctxUser = assertUser(event)

  const body = await readValidatedBody(event, (data) => schema.parse(data))

  const bucket = body.bucket as 'avatars' | 'campaign-assets' | 'uploads'

  // campaign-assets 仅管理员可写入
  if (bucket === 'campaign-assets' && ctxUser.role !== 'admin') {
    return throwError(403, 'Only admins can upload to campaign-assets bucket')
  }

  // MIME 类型校验（如果提供了 contentType）
  if (body.contentType && !isMimeAllowed(bucket, body.contentType)) {
    return throwError(400, `MIME type ${body.contentType} is not allowed in bucket ${bucket}`)
  }

  // 构建存储路径
  const storagePath = buildStoragePath(ctxUser.id, body.filename)

  // 生成 signed upload URL
  const result = await createSignedUploadUrl(bucket, storagePath, event)

  await logAuditEvent(event, ctxUser, 'STORAGE_SIGNED_URL', 'SUCCESS')

  return sendSuccess(event, {
    signedUrl: result.signedUrl,
    path: storagePath,
  }, 'Signed upload URL created successfully')
})
