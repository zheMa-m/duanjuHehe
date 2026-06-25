
// @api-auth: admin
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'
import {
  isValidBucket,
  listBuckets,
  listFiles,
  countBucketFiles,
  getPublicUrl,
  classifyMime,
  formatFileSize,
  extractExtension,
  extractUploader,
  stripTimestampPrefix,
  SIGNED_DOWNLOAD_URL_EXPIRY,
  getStorage,
} from '~~/server/utils/storage'

defineRouteMeta({
  openAPI: {
    tags: ['管理·营销-媒体库'],
    summary: '管理员：获取媒体库文件列表（分页/搜索/筛选）',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'query', name: 'bucket', required: true, schema: { type: 'string' }, description: '目标 Bucket' },
      { in: 'query', name: 'prefix', schema: { type: 'string', default: '' }, description: '目录前缀（文件夹导航）' },
      { in: 'query', name: 'limit', schema: { type: 'integer', default: 20 }, description: '每页条数（最大 100）' },
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
  const limit = Math.min(Math.max(parseInt(q.limit as string) || 20, 1), 100)
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
  // 使用 Supabase 实际 bucket 状态（而非硬编码配置）判断 public/private
  const allBuckets = await listBuckets(event)
  const isPublicBucket = allBuckets.find(b => b.name === bucket)?.public ?? false
  const storage = getStorage(event)

  const rawItems = files
    .map((f) => {
      const meta = f.metadata || {}
      const mimeType = meta.mimetype || meta.mimeType || 'application/octet-stream'
      const size = meta.size || meta.contentLength || 0
      const { kind, isImage, isVideo } = classifyMime(mimeType)
      const fullPath = prefix ? `${prefix}/${f.name}` : f.name

      // 提取纯文件名（用于显示）
      const lastSlash = f.name.lastIndexOf('/')
      const displayName = lastSlash === -1 ? f.name : f.name.substring(lastSlash + 1)

      return {
        id: f.id || '',
        name: stripTimestampPrefix(displayName),
        path: fullPath,
        bucket,
        size,
        sizeFormatted: formatFileSize(size),
        mimeType,
        extension: extractExtension(displayName),
        kind,
        isImage,
        isVideo,
        publicUrl: null as string | null,
        thumbnailUrl: null as string | null,
        width: null as number | null,
        height: null as number | null,
        uploadedBy: extractUploader(fullPath),
        createdAt: f.created_at || '',
        updatedAt: f.updated_at || '',
        exif: (meta.exif as Record<string, any>) || null,
        _fullPath: fullPath, // 内部用，生成 URL 后移除
      }
    })
    .filter((item) => {
      if (!kindFilter) return true
      return item.kind === kindFilter
    })

  // ── 生成预览 URL（public bucket 用公开 URL，private bucket 用签名 URL）────
  const items = await Promise.all(
    rawItems.map(async (item) => {
      const { _fullPath, ...rest } = item

      if (isPublicBucket) {
        // 公开桶：使用 public URL + Image Transformations 缩略图
        rest.publicUrl = getPublicUrl(bucket, _fullPath, event)
        if (item.isImage) {
          rest.thumbnailUrl = getPublicUrl(bucket, _fullPath, event, { width: 300, height: 300, resize: 'cover' })
        }
      } else if (item.isImage) {
        // 私有桶图片：生成 1 小时签名 URL（预览 + 缩略图）
        try {
          const { data } = await storage.from(bucket).createSignedUrl(_fullPath, SIGNED_DOWNLOAD_URL_EXPIRY)
          rest.publicUrl = data?.signedUrl ?? null
        } catch { /* 签名失败保持 null */ }
        try {
          const { data } = await storage.from(bucket).createSignedUrl(_fullPath, SIGNED_DOWNLOAD_URL_EXPIRY, {
            transform: { width: 300, height: 300, resize: 'cover' },
          })
          rest.thumbnailUrl = data?.signedUrl ?? null
        } catch { /* 签名失败保持 null */ }
      }

      return rest
    })
  )

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
