
// @api-auth: admin
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'
import { logAuditEvent } from '~~/server/utils/logger'
import { updateBucket, DEFAULT_BUCKET_NAMES } from '~~/server/utils/storage'

defineRouteMeta({
  openAPI: {
    tags: ['管理·营销-媒体库'],
    summary: '管理员：更新自定义存储桶配置',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'path', name: 'name', required: true, schema: { type: 'string' }, description: '桶名' },
    ],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              public: { type: 'boolean' },
              maxSize: { type: 'integer' },
              allowedMime: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
    responses: {
      200: { description: '更新成功' },
      403: { description: '非管理员或系统桶' },
    },
  } as any,
})

/**
 * 管理员：更新自定义存储桶
 * PATCH /api/admin/storage/buckets/[name]
 */
export default defineEventHandler(async (event) => {
  const user = assertAdmin(event)
  const name = getRouterParam(event, 'name')!

  if (DEFAULT_BUCKET_NAMES.has(name)) {
    throw createError({ statusCode: 403, statusMessage: 'Cannot modify system bucket configuration.' })
  }

  const body = await readBody(event)

  await updateBucket(name, {
    public: body?.public,
    fileSizeLimit: body?.maxSize,
    allowedMimeTypes: body?.allowedMime,
  }, event)

  await logAuditEvent(event, user, `STORAGE_BUCKET_UPDATE: ${name}`, 'SUCCESS')

  return sendSuccess(event, { name }, 'Bucket updated successfully')
})
