
// @api-auth: admin
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'
import { listBuckets, countBucketFiles, formatFileSize, DEFAULT_BUCKET_NAMES } from '~~/server/utils/storage'

defineRouteMeta({
  openAPI: {
    tags: ['管理·营销-媒体库'],
    summary: '管理员：列出所有存储桶（系统 + 自定义）',
    security: [{ BearerAuth: [] }],
    responses: {
      200: { description: '桶列表 + 文件统计' },
      403: { description: '非管理员' },
    },
  } as any,
})

/**
 * 管理员：列出所有存储桶
 * GET /api/admin/storage/buckets
 */
export default defineEventHandler(async (event) => {
  assertAdmin(event)

  const buckets = await listBuckets(event)

  // 为每个桶补充文件统计
  const enriched = await Promise.all(
    buckets.map(async (b) => {
      let fileCount = 0
      let totalSize = 0
      try {
        const stats = await countBucketFiles(b.name, event)
        fileCount = stats.totalFiles
        totalSize = stats.totalSize
      } catch {
        // 统计失败不阻塞
      }
      return {
        ...b,
        fileCount,
        totalSize,
        totalSizeFormatted: formatFileSize(totalSize),
        isSystem: DEFAULT_BUCKET_NAMES.has(b.name),
      }
    })
  )

  return sendSuccess(event, enriched, 'Buckets retrieved successfully')
})
