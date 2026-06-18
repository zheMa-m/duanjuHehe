
// @api-auth: admin
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'
import { logAuditEvent } from '~~/server/utils/logger'
import { createBucket, isValidBucketName } from '~~/server/utils/storage'

defineRouteMeta({
  openAPI: {
    tags: ['管理·营销-媒体库'],
    summary: '管理员：创建自定义存储桶',
    security: [{ BearerAuth: [] }],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['name'],
            properties: {
              name: { type: 'string', pattern: '^[a-z][a-z0-9-]{2,49}$', description: '桶名（slug 格式）' },
              public: { type: 'boolean', default: false },
              maxSize: { type: 'integer', default: 52428800, description: '单文件大小限制（bytes）' },
              allowedMime: { type: 'array', items: { type: 'string' }, description: '允许的 MIME 类型' },
            },
          },
        },
      },
    },
    responses: {
      200: { description: '创建成功' },
      400: { description: '参数错误' },
      403: { description: '非管理员' },
      409: { description: '桶已存在' },
    },
  } as any,
})

/**
 * 管理员：创建自定义存储桶
 * POST /api/admin/storage/buckets
 */
export default defineEventHandler(async (event) => {
  const user = assertAdmin(event)

  const body = await readBody(event)
  const name = body?.name as string

  if (!name || !isValidBucketName(name)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid bucket name. Must be 3-50 chars, lowercase alphanumeric with hyphens.' })
  }

  const result = await createBucket(name, {
    public: body?.public ?? false,
    fileSizeLimit: body?.maxSize ?? 50 * 1024 * 1024,
    allowedMimeTypes: body?.allowedMime ?? undefined,
  }, event)

  await logAuditEvent(event, user, `STORAGE_BUCKET_CREATE: ${name}`, 'SUCCESS')

  return sendSuccess(event, result, 'Bucket created successfully')
})
