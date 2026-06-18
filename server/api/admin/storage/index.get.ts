
// @api-auth: admin
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'
import {
  isValidBucket,
  listFiles,
  countBucketFiles,
  getPublicUrl,
  getBucketConfig,
  classifyMime,
  formatFileSize,
  extractExtension,
  extractUploader,
  stripTimestampPrefix,
} from '~~/server/utils/storage'

defineRouteMeta({
  openAPI: {
    tags: ['管理·营销-媒体库'],
    summary: '管理员：获取媒体库文件列表（分页/搜索/筛选）',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'query', name: 'bucket', required: true, schema: { type: 'string', enum: ['avatars', 'campaign-assets', 'uploads'] }, description: '目标 Bucket' },
      { in: 'query', name: 'prefix', schema: { type: 'string', default: '' }, description: '目录前缀（文件夹导航）' },
      { in: 'query', name: 'limit', schema: { type: 'integer', default: 40 }, description: '每页条数（最大 100）' },
      { in: 'query', name: 'offset', schema: { type: 'integer', default: 0 }, description: '分页偏移' },
      { in: 'query', name: 'search', schema: { type: 'string' }, description: '文件名模糊搜索（Supabase 原生）' },
      { in: 'query', name: 'kind', schema: { type: 'string', enum: ['image', 'video', 'audio', 'document', 'other'] }, description: '按文件类型筛选' },
      { in: 'query', name: 'sort', schema: { type: 'string', enum: ['updated_at', 'created_at', 'name'], default: 'updated_at' }, description: '排序字段' },
      { in: 'query', name: 'order', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }, description: '排序方向' },
    ],
    responses: {
      200: { description: '文件列表 + 存储统计' },
      400: { description: '参数错误' },
      403: { description: '非管理员' },
    },
  } as any,
})

/**
 * 管理员：获取媒体库文件列表
 * GET /api/admin/storage
 */
export default defineEventHandler(async (event) => {
  assertAdmin(event)

  const q = getQuery(event)

  // ── 参数解析 ─────────────────────────────────────────────────
  const bucket = q.bucket as string
  if (!bucket || !(await isValidBucket(bucket, event))) {
    throw createError({ statusCode: 400, statusMessage: `Invalid bucket. Bucket does not exist.` })
  }

  const prefix = (q.prefix as string) || ''
  const limit = Math.min(Math.max(parseInt(q.limit as string) || 40, 1), 100)
  const offset = Math.max(parseInt(q.offset as string) || 0, 0)
  const search = (q.search as string) || undefined
  const kindFilter = q.kind as string | undefined
  const sortBy = (['updated_at', 'created_at', 'name'].includes(q.sort as string) ? q.sort : 'updated_at') as 'updated_at' | 'created_at' | 'name'
  const order = (q.order === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc'

  // ── 获取文件列表 ─────────────────────────────────────────────
  // 管理后台使用递归模式：当 prefix 为空时，递归列出所有子目录的文件
  const { files, folders } = await listFiles(bucket, prefix, {
    limit,
    offset,
    sortBy,
    order,
    search,
    recursive: !prefix,  // 仅在根目录时递归
  }, event)

  // ── 构建 FileInfo ────────────────────────────────────────────
  const bucketConfig = getBucketConfig(bucket)
  const items = files
    .map((f) => {
      const meta = f.metadata || {}
      const mimeType = meta.mimetype || meta.mimeType || 'application/octet-stream'
      const size = meta.size || meta.contentLength || 0
      const { kind, isImage, isVideo } = classifyMime(mimeType)
      const fullPath = prefix ? `${prefix}/${f.name}` : f.name

      // 提取纯文件名（用于显示）
      const lastSlash = f.name.lastIndexOf('/')
      const displayName = lastSlash === -1 ? f.name : f.name.substring(lastSlash + 1)

      // 公开 URL（仅 public bucket）
      let publicUrl: string | null = null
      if (bucketConfig.public) {
        publicUrl = getPublicUrl(bucket, fullPath, event)
      }

      // 缩略图 URL（仅图片 + public bucket，利用 Image Transformations）
      let thumbnailUrl: string | null = null
      if (isImage && bucketConfig.public) {
        thumbnailUrl = getPublicUrl(bucket, fullPath, event, { width: 300, height: 300, resize: 'cover' })
      }

      return {
        id: f.id || '',
        name: stripTimestampPrefix(displayName),  // 显示用：纯文件名，去除时间戳
        path: fullPath,  // 操作用：完整路径
        bucket,
        size,
        sizeFormatted: formatFileSize(size),
        mimeType,
        extension: extractExtension(displayName),
        kind,
        isImage,
        isVideo,
        publicUrl,
        thumbnailUrl,
        width: null as number | null,
        height: null as number | null,
        uploadedBy: extractUploader(fullPath),
        createdAt: f.created_at || '',
        updatedAt: f.updated_at || '',
        exif: (meta.exif as Record<string, any>) || null,
      }
    })
    // kind 筛选（Supabase list 不支持按 MIME 筛选，需内存过滤）
    .filter((item) => {
      if (!kindFilter) return true
      return item.kind === kindFilter
    })

  // ── 存储统计（异步，不阻塞响应） ───────────────────────────
  let storageStats = { bucket, totalFiles: 0, totalSizeFormatted: '0 B', fileCount: items.length }
  try {
    const stats = await countBucketFiles(bucket, event)
    storageStats.totalFiles = stats.totalFiles
    storageStats.totalSizeFormatted = formatFileSize(stats.totalSize)
  } catch {
    // 统计失败不阻塞列表返回
  }

  // 无筛选时用 bucket 总数，有筛选时用 items.length 估算
  const total = (!kindFilter && !search) ? storageStats.totalFiles : items.length >= limit ? offset + items.length + 1 : offset + items.length

  return sendSuccess(event, {
    items,
    folders,
    total,
    storageStats,
  }, 'Storage files retrieved successfully')
})
