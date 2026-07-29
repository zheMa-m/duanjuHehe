import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { getDB } from './db'

/**
 * Supabase Storage 服务端工具函数
 *
 * 使用 service_role key 操作 Storage，绕过 RLS。
 * 所有文件路径规范：{user_id}/{timestamp}_{filename}
 *
 * MOCK_DB=true 时走 getDB(event).storage mock 适配器。
 */

// ── Bucket 常量与类型 ─────────────────────────────────────────────

// 系统内置桶（不可删除）
export const DEFAULT_BUCKETS = ['campaign-assets', 'series-videos'] as const
export const DEFAULT_BUCKET_NAMES = new Set<string>(DEFAULT_BUCKETS)

// 动态桶模型：类型改为 string
export type StorageBucket = string

// 桶配置接口
export interface BucketConfig {
  public: boolean
  maxSize: number        // bytes
  allowedMime: string[] | null
  adminOnly: boolean
}

// 系统桶默认配置
export const DEFAULT_BUCKET_CONFIG: Record<string, BucketConfig> = {
  'campaign-assets': {
    public: true,
    maxSize: 10 * 1024 * 1024,      // 10 MB
    allowedMime: ['image/*', 'video/mp4'],
    adminOnly: true,
  },
  'series-videos': {
    public: true,
    maxSize: 50 * 1024 * 1024,      // 50 MB
    allowedMime: ['video/mp4', 'video/webm', 'image/*'],
    adminOnly: true,
  },
}

// 兼容旧引用
export const BUCKET_CONFIG = DEFAULT_BUCKET_CONFIG
export const STORAGE_BUCKETS = DEFAULT_BUCKETS

// 动态桶配置缓存（自定义桶配置从 Supabase 读取后缓存）
const bucketConfigCache = new Map<string, BucketConfig>()
let bucketCacheExpiry = 0
const BUCKET_CACHE_TTL = 60_000 // 1 分钟

// 服务端中转上传的大小阈值（超过此值应走 signed URL 直传）
export const SERVER_PROXY_MAX_SIZE = 5 * 1024 * 1024 // 5 MB

// Signed URL 默认过期时间（秒）
export const SIGNED_URL_EXPIRY = 300 // 5 分钟（仅用于上传）
export const SIGNED_DOWNLOAD_URL_EXPIRY = 3600 // 1 小时（下载链接）

// 缩略图默认尺寸（用于 Image Transformations）
export const THUMBNAIL_DEFAULTS = { width: 300, height: 300 }

let storageClient: SupabaseClient | null = null

/**
 * 获取 Storage 客户端
 * - Mock DB 模式：走 getDB(event).storage mock 适配器
 * - 真实环境：service_role 客户端（绕过 RLS）
 */
export function getStorage(event?: any): any {
  if (process.env.MOCK_DB === 'true' && event) {
    return getDB(event).storage
  }
  if (!storageClient) {
    storageClient = createClient(
      process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'
    )
  }
  // 返回 .storage 子命名空间，确保 listBuckets/createBucket/from 等 Storage API 可用
  return storageClient.storage
}

/**
 * 校验 bucket 名称格式合法性（slug 格式：小写字母/数字/连字符，3-50 字符）
 */
export function isValidBucketName(name: string): boolean {
  return /^[a-z][a-z0-9-]{2,49}$/.test(name)
}

/**
 * 校验 bucket 是否存在（动态查询，带缓存）
 */
export async function isValidBucket(bucket: string, event?: any): Promise<boolean> {
  if (DEFAULT_BUCKET_NAMES.has(bucket)) return true
  const buckets = await listBuckets(event)
  return buckets.some(b => b.name === bucket)
}

/**
 * 同步校验（仅检查系统桶，用于不需要异步的场景）
 */
export function isSystemBucket(bucket: string): boolean {
  return DEFAULT_BUCKET_NAMES.has(bucket)
}

/**
 * 获取桶配置（系统桶取默认，自定义桶从缓存/Supabase 读取）
 */
export function getBucketConfig(bucket: string): BucketConfig {
  if (DEFAULT_BUCKET_CONFIG[bucket]) return DEFAULT_BUCKET_CONFIG[bucket]
  return bucketConfigCache.get(bucket) || { public: false, maxSize: 50 * 1024 * 1024, allowedMime: null, adminOnly: true }
}

/**
 * 校验 MIME 类型是否匹配 bucket 配置
 */
export function isMimeAllowed(bucket: string, mimeType: string): boolean {
  const config = getBucketConfig(bucket)
  if (!config.allowedMime) return true // 不限制

  return config.allowedMime.some(pattern => {
    if (pattern.endsWith('/*')) {
      return mimeType.startsWith(pattern.slice(0, -1))
    }
    return mimeType === pattern
  })
}

/**
 * 构建存储路径：{user_id}/{timestamp}_{filename}
 */
export function buildStoragePath(userId: string, filename: string): string {
  const ts = Date.now()
  // 清理文件名中的特殊字符
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  return `${userId}/${ts}_${safeName}`
}

/**
 * 服务端中转上传文件
 */
export async function uploadFile(
  bucket: StorageBucket,
  path: string,
  fileBody: Blob | ArrayBuffer | Uint8Array | File,
  contentType?: string,
  event?: any,
): Promise<{ path: string; publicUrl: string | null }> {
  const storage = getStorage(event)

  const { data, error } = await storage
    .from(bucket)
    .upload(path, fileBody, {
      contentType,
      upsert: false,
    })

  if (error) {
    throw createError({
      statusCode: 400,
      statusMessage: `Upload failed: ${error.message}`,
    })
  }

  // 获取公开 URL（仅 public bucket 有意义）
  const config = getBucketConfig(bucket)
  let publicUrl: string | null = null
  if (config.public) {
    const { data: urlData } = storage.from(bucket).getPublicUrl(data.path)
    publicUrl = urlData.publicUrl
  }

  return { path: data.path, publicUrl }
}

/**
 * 删除文件
 */
export async function deleteFile(
  bucket: StorageBucket,
  path: string,
  event?: any,
): Promise<void> {
  const storage = getStorage(event)

  const { error } = await storage
    .from(bucket)
    .remove([path])

  if (error) {
    throw createError({
      statusCode: 400,
      statusMessage: `Delete failed: ${error.message}`,
    })
  }
}

/**
 * 生成客户端直传的 signed upload URL
 */
export async function createSignedUploadUrl(
  bucket: StorageBucket,
  path: string,
  event?: any,
): Promise<{ signedUrl: string; path: string }> {
  const storage = getStorage(event)

  const { data, error } = await storage
    .from(bucket)
    .createSignedUploadUrl(path, {
      upsert: false,
    })

  if (error) {
    throw createError({
      statusCode: 400,
      statusMessage: `Create signed upload URL failed: ${error.message}`,
    })
  }

  return { signedUrl: data.signedUrl, path }
}

/**
 * 获取公开访问 URL（支持 Image Transformations）
 */
export function getPublicUrl(
  bucket: StorageBucket,
  path: string,
  event?: any,
  transform?: { width?: number; height?: number; quality?: number; resize?: 'cover' | 'contain' | 'fill' },
): string {
  const storage = getStorage(event)
  const opts: any = {}
  if (transform) opts.transform = transform
  const { data } = storage.from(bucket).getPublicUrl(path, opts)
  return data.publicUrl
}

/**
 * 获取图片缩略图 URL（利用 Supabase Image Transformations）
 *
 * - Public bucket: getPublicUrl(path, { transform: { width, height, resize: 'cover' } })
 * - Private bucket: createSignedUrl(path, expiry, { transform: { width, height } })
 * - 自动 WebP 优化（Supabase 根据浏览器 Accept 头自动转换）
 * - Pro Plan 及以上可用；自托管需配置 imgproxy
 * - 非图片文件返回 null
 */
export async function getThumbnailUrl(
  bucket: StorageBucket,
  path: string,
  options?: { width?: number; height?: number },
  event?: any,
): Promise<string | null> {
  const config = getBucketConfig(bucket)
  const w = options?.width ?? THUMBNAIL_DEFAULTS.width
  const h = options?.height ?? THUMBNAIL_DEFAULTS.height

  if (config.public) {
    return getPublicUrl(bucket, path, event, { width: w, height: h, resize: 'cover' })
  }

  // 私有 bucket 用 signed URL + transform
  const storage = getStorage(event)
  const { data, error } = await storage.from(bucket).createSignedUrl(path, SIGNED_DOWNLOAD_URL_EXPIRY, {
    transform: { width: w, height: h, resize: 'cover' },
  })
  if (error) return null
  return data.signedUrl
}

/**
 * 获取私有文件的临时访问 signed URL
 */
export async function getSignedUrl(
  bucket: StorageBucket,
  path: string,
  expiresIn: number = SIGNED_DOWNLOAD_URL_EXPIRY,
  event?: any,
): Promise<{ signedUrl: string }> {
  const storage = getStorage(event)

  const { data, error } = await storage
    .from(bucket)
    .createSignedUrl(path, expiresIn)

  if (error) {
    throw createError({
      statusCode: 400,
      statusMessage: `Create signed URL failed: ${error.message}`,
    })
  }

  return { signedUrl: data.signedUrl }
}

// ── FileInfo 构建辅助 ───────────────────────────────────────────

export type FileKind = 'image' | 'video' | 'audio' | 'document' | 'other'

/**
 * 根据 MIME 类型派生文件分类
 */
export function classifyMime(mimeType: string): { kind: FileKind; isImage: boolean; isVideo: boolean } {
  const isImage = mimeType.startsWith('image/')
  const isVideo = mimeType.startsWith('video/')
  const isAudio = mimeType.startsWith('audio/')
  const isDocument = /^(application\/(pdf|msword|vnd\.(openxmlformats|ms-))|text\/)/.test(mimeType)
  const kind: FileKind = isImage ? 'image' : isVideo ? 'video' : isAudio ? 'audio' : isDocument ? 'document' : 'other'
  return { kind, isImage, isVideo }
}

/**
 * 格式化文件大小为人类可读字符串
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const val = bytes / Math.pow(1024, i)
  return `${val.toFixed(val < 10 && i > 0 ? 1 : 0)} ${units[i]}`
}

/**
 * 从文件名中提取扩展名（小写）
 */
export function extractExtension(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
}

/**
 * 从路径前缀提取上传者 user_id（路径规范：{user_id}/{timestamp}_{filename}）
 */
export function extractUploader(path: string): string | null {
  const slash = path.indexOf('/')
  return slash > 0 ? path.slice(0, slash) : null
}

/**
 * 去除文件名中的时间戳前缀（如 1718000000_filename.jpg → filename.jpg）
 */
export function stripTimestampPrefix(name: string): string {
  // 处理路径：只对最后一部分（文件名）去除时间戳前缀
  const lastSlash = name.lastIndexOf('/')
  if (lastSlash === -1) {
    return name.replace(/^\d+_/, '')
  }
  const dir = name.substring(0, lastSlash + 1)
  const file = name.substring(lastSlash + 1)
  return dir + file.replace(/^\d+_/, '')
}

/**
 * 列出目录下文件（增强版：支持分页/排序/搜索）
 *
 * 对齐 Supabase Storage JS SDK list() 原生能力：
 * - limit: 默认 100
 * - offset: 默认 0
 * - sortBy: name / created_at / updated_at（不支持 size）
 * - search: 文件名模糊搜索
 *
 * 注意：
 * - metadata 仅含系统字段：eTag、size、mimetype（不含自定义 metadata）
 * - 文件夹条目 id 为 null，需据此区分文件/文件夹
 */
export async function listFiles(
  bucket: StorageBucket,
  prefix: string,
  options?: {
    limit?: number
    offset?: number
    sortBy?: 'created_at' | 'updated_at' | 'name'
    order?: 'asc' | 'desc'
    search?: string
    recursive?: boolean  // 管理后台专用：递归列出所有子目录文件
  },
  event?: any,
): Promise<{
  files: { name: string; id: string | null; created_at: string | null; updated_at: string | null; metadata: Record<string, any> | null }[]
  folders: string[]
}> {
  const storage = getStorage(event)
  const limit = options?.limit ?? 100
  const offset = options?.offset ?? 0
  const sortBy = options?.sortBy ?? 'created_at'
  const order = options?.order ?? 'desc'
  const recursive = options?.recursive ?? false

  // 递归模式：收集所有子目录的文件（管理后台使用）
  if (recursive && !prefix) {
    const allFiles: any[] = []
    const allFolders: string[] = []

    async function walk(currentPrefix: string) {
      const listOpts: any = { limit: 1000, offset: 0 }
      const { data, error } = await storage.from(bucket).list(currentPrefix, listOpts)
      if (error || !data) return

      for (const f of data) {
        if (f.id === null) {
          // 文件夹：记录并递归
          const folderName = currentPrefix ? `${currentPrefix}/${f.name}` : f.name
          allFolders.push(folderName)
          await walk(folderName)
        } else {
          allFiles.push({
            name: currentPrefix ? `${currentPrefix}/${f.name}` : f.name,  // 递归模式下 name 包含完整路径
            id: f.id,
            created_at: f.created_at || null,
            updated_at: f.updated_at || null,
            metadata: (f.metadata as Record<string, any>) || null,
          })
        }
      }
    }

    await walk('')

    // 排序
    allFiles.sort((a, b) => {
      const aVal = a[sortBy] || ''
      const bVal = b[sortBy] || ''
      return order === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    })

    // 搜索过滤
    let filtered = allFiles
    if (options?.search) {
      const search = options.search.toLowerCase()
      filtered = allFiles.filter(f => f.name.toLowerCase().includes(search))
    }

    // 分页
    const paged = filtered.slice(offset, offset + limit)

    return { files: paged, folders: allFolders }
  }

  // 普通模式：仅列当前层级
  const listOpts: any = {
    limit,
    offset,
    sortBy: { column: sortBy, order },
  }
  if (options?.search) {
    listOpts.search = options.search
  }

  const { data, error } = await storage
    .from(bucket)
    .list(prefix || '', listOpts)

  if (error) {
    throw createError({
      statusCode: 400,
      statusMessage: `List files failed: ${error.message}`,
    })
  }

  const items = data || []
  const files: any[] = []
  const folders: string[] = []

  for (const f of items) {
    if (f.id === null) {
      // 文件夹条目
      folders.push(f.name)
    } else {
      files.push({
        name: f.name,
        id: f.id,
        created_at: f.created_at || null,
        updated_at: f.updated_at || null,
        metadata: (f.metadata as Record<string, any>) || null,
      })
    }
  }

  return { files, folders }
}

/**
 * 列出 bucket 全部文件（用于统计，递归所有前缀）
 * 注意：仅用于管理后台统计，不对外暴露
 */
export async function countBucketFiles(
  bucket: StorageBucket,
  event?: any,
): Promise<{ totalFiles: number; totalSize: number }> {
  const storage = getStorage(event)
  let totalFiles = 0
  let totalSize = 0

  // 递归列出所有文件
  async function walk(prefix: string) {
    const { data } = await storage.from(bucket).list(prefix, { limit: 1000, offset: 0 })
    if (!data) return
    for (const f of data) {
      if (f.id === null) {
        // 文件夹，递归
        await walk(prefix ? `${prefix}/${f.name}` : f.name)
      } else {
        totalFiles++
        totalSize += f.metadata?.size || f.metadata?.contentLength || 0
      }
    }
  }

  await walk('')
  return { totalFiles, totalSize }
}

// ── Bucket CRUD ──────────────────────────────────────────────────

/**
 * 列出所有桶（系统 + 自定义）
 */
export async function listBuckets(event?: any): Promise<Array<{
  name: string
  public: boolean
  file_size_limit: number | null
  allowed_mime_types: string[] | null
  created_at: string
  isSystem: boolean
}>> {
  const storage = getStorage(event)

  // Mock 模式
  if (storage.listBuckets) {
    const { data } = await storage.listBuckets()
    return (data || []).map((b: any) => ({
      name: b.name,
      public: b.public ?? false,
      file_size_limit: b.file_size_limit ?? null,
      allowed_mime_types: b.allowed_mime_types ?? null,
      created_at: b.created_at || '',
      isSystem: DEFAULT_BUCKET_NAMES.has(b.name),
    }))
  }

  // 真实 Supabase
  const { data, error } = await storage.listBuckets()
  if (error) throw createError({ statusCode: 500, statusMessage: `List buckets failed: ${error.message}` })

  return (data || []).map((b: any) => ({
    name: b.name,
    public: b.public ?? false,
    file_size_limit: b.file_size_limit ?? null,
    allowed_mime_types: b.allowed_mime_types ?? null,
    created_at: b.created_at || '',
    isSystem: DEFAULT_BUCKET_NAMES.has(b.name),
  }))
}

/**
 * 创建自定义桶
 */
export async function createBucket(
  name: string,
  opts: { public?: boolean; fileSizeLimit?: number; allowedMimeTypes?: string[] },
  event?: any,
): Promise<{ name: string }> {
  if (!isValidBucketName(name)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid bucket name. Must be 3-50 chars, lowercase alphanumeric with hyphens.' })
  }
  if (DEFAULT_BUCKET_NAMES.has(name)) {
    throw createError({ statusCode: 409, statusMessage: `System bucket "${name}" already exists.` })
  }

  const storage = getStorage(event)
  const { error } = await storage.createBucket(name, {
    public: opts.public ?? false,
    fileSizeLimit: opts.fileSizeLimit ?? 50 * 1024 * 1024,
    allowedMimeTypes: opts.allowedMimeTypes ?? undefined,
  })
  if (error) throw createError({ statusCode: 400, statusMessage: `Create bucket failed: ${error.message}` })

  // 更新缓存
  bucketConfigCache.set(name, {
    public: opts.public ?? false,
    maxSize: opts.fileSizeLimit ?? 50 * 1024 * 1024,
    allowedMime: opts.allowedMimeTypes ?? null,
    adminOnly: true,
  })
  bucketCacheExpiry = 0 // 强制刷新

  return { name }
}

/**
 * 更新桶配置
 */
export async function updateBucket(
  name: string,
  opts: { public?: boolean; fileSizeLimit?: number; allowedMimeTypes?: string[] },
  event?: any,
): Promise<void> {
  if (DEFAULT_BUCKET_NAMES.has(name)) {
    throw createError({ statusCode: 403, statusMessage: 'Cannot modify system bucket configuration.' })
  }

  const storage = getStorage(event)
  const { error } = await storage.updateBucket(name, {
    public: opts.public,
    fileSizeLimit: opts.fileSizeLimit,
    allowedMimeTypes: opts.allowedMimeTypes,
  })
  if (error) throw createError({ statusCode: 400, statusMessage: `Update bucket failed: ${error.message}` })

  // 更新缓存
  const existing = bucketConfigCache.get(name) || { public: false, maxSize: 50 * 1024 * 1024, allowedMime: null, adminOnly: true }
  bucketConfigCache.set(name, {
    ...existing,
    public: opts.public ?? existing.public,
    maxSize: opts.fileSizeLimit ?? existing.maxSize,
    allowedMime: opts.allowedMimeTypes !== undefined ? opts.allowedMimeTypes : existing.allowedMime,
  })
}

/**
 * 删除桶（必须为空）
 */
export async function deleteBucket(name: string, event?: any): Promise<void> {
  if (DEFAULT_BUCKET_NAMES.has(name)) {
    throw createError({ statusCode: 403, statusMessage: 'Cannot delete system bucket.' })
  }

  // 检查是否为空
  const stats = await countBucketFiles(name, event)
  if (stats.totalFiles > 0) {
    throw createError({ statusCode: 409, statusMessage: 'Bucket is not empty. Delete all files first.' })
  }

  const storage = getStorage(event)
  const { error } = await storage.deleteBucket(name)
  if (error) throw createError({ statusCode: 400, statusMessage: `Delete bucket failed: ${error.message}` })

  bucketConfigCache.delete(name)
  bucketCacheExpiry = 0
}

// ── 文件移动 / 重命名 ─────────────────────────────────────────────

/**
 * 移动 / 重命名文件（支持桶内和跨桶）
 */
export async function moveFile(
  bucket: string,
  fromPath: string,
  toPath: string,
  event?: any,
): Promise<{ path: string }> {
  const storage = getStorage(event)

  // 冲突预检：检查目标路径是否已存在同名文件
  if (fromPath !== toPath) {
    const toDir = toPath.includes('/') ? toPath.substring(0, toPath.lastIndexOf('/')) : ''
    const toName = toPath.includes('/') ? toPath.substring(toPath.lastIndexOf('/') + 1) : toPath
    const { data: existing } = await storage.from(bucket).list(toDir, { search: toName, limit: 10 })
    const conflict = existing?.find((f: any) => f.name === toName)
    if (conflict) {
      throw createError({ statusCode: 409, statusMessage: `File already exists at destination: ${toPath}` })
    }
  }

  const { data, error } = await storage.from(bucket).move(fromPath, toPath)
  if (error) throw createError({ statusCode: 400, statusMessage: `Move failed: ${error.message}` })
  return { path: data.path }
}

// ── 回收站（软删除）─────────────────────────────────────────────────

const TRASH_PREFIX = '__trash__'
const TRASH_EXPIRY_DAYS = 30

/**
 * 软删除：移动文件到 trash 前缀 + 写入 DB 记录
 */
export async function trashFile(
  bucket: string,
  path: string,
  userId: string | null,
  event?: any,
): Promise<string> {
  const db = getDB(event)
  const ts = Date.now()
  const trashPath = `${TRASH_PREFIX}${bucket}/${ts}_${path}`

  // 移动文件到 trash 前缀
  await moveFile(bucket, path, trashPath, event)

  // 提取文件信息
  const fileName = path.split('/').pop() || path
  const ext = extractExtension(fileName)

  // 写入 DB
  const { data, error } = await db
    .from('storage_trash')
    .insert({
      original_bucket: bucket,
      original_path: path,
      trash_path: trashPath,
      file_name: fileName,
      mime_type: ext ? `application/octet-stream` : null,
      file_size: 0,
      deleted_by: userId,
      expires_at: new Date(Date.now() + TRASH_EXPIRY_DAYS * 86400000).toISOString(),
    })
    .select('id')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: `Trash record failed: ${error.message}` })
  return data.id
}

/**
 * 还原文件：从 trash 移回原路径 + 删除 DB 记录
 */
export async function restoreFile(trashId: string, event?: any): Promise<void> {
  const db = getDB(event)

  const { data: trash, error } = await db
    .from('storage_trash')
    .select('*')
    .eq('id', trashId)
    .single()

  if (error || !trash) throw createError({ statusCode: 404, statusMessage: 'Trash record not found' })

  // 移回原路径
  await moveFile(trash.original_bucket, trash.trash_path, trash.original_path, event)

  // 删除 DB 记录
  await db.from('storage_trash').delete().eq('id', trashId)
}

/**
 * 永久删除回收站文件
 */
export async function permanentDeleteFile(trashId: string, event?: any): Promise<void> {
  const db = getDB(event)

  const { data: trash, error } = await db
    .from('storage_trash')
    .select('*')
    .eq('id', trashId)
    .single()

  if (error || !trash) throw createError({ statusCode: 404, statusMessage: 'Trash record not found' })

  // 真正删除文件
  await deleteFile(trash.original_bucket, trash.trash_path, event)

  // 删除 DB 记录
  await db.from('storage_trash').delete().eq('id', trashId)
}

/**
 * 获取回收站列表
 */
export async function getTrashList(
  options?: { limit?: number; offset?: number },
  event?: any,
): Promise<{ items: any[]; total: number }> {
  const db = getDB(event)
  const limit = options?.limit ?? 50
  const offset = options?.offset ?? 0

  const { data, error, count } = await db
    .from('storage_trash')
    .select('*', { count: 'exact', head: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw createError({ statusCode: 500, statusMessage: `Trash list failed: ${error.message}` })

  return { items: data || [], total: count ?? 0 }
}

/**
 * 清理过期回收站文件
 */
export async function cleanupExpiredTrash(event?: any): Promise<number> {
  const db = getDB(event)
  const now = new Date().toISOString()

  const { data: expired } = await db
    .from('storage_trash')
    .select('*')
    .lte('expires_at', now)

  if (!expired || expired.length === 0) return 0

  let cleaned = 0
  for (const item of expired) {
    try {
      await deleteFile(item.original_bucket, item.trash_path, event)
      await db.from('storage_trash').delete().eq('id', item.id)
      cleaned++
    } catch {
      // 单个文件失败不影响其他
    }
  }
  return cleaned
}
