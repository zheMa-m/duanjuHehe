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

// 合法的 bucket 名称常量
export const STORAGE_BUCKETS = ['avatars', 'campaign-assets', 'uploads'] as const
export type StorageBucket = typeof STORAGE_BUCKETS[number]

// 各 bucket 的配置
export const BUCKET_CONFIG: Record<StorageBucket, {
  public: boolean
  maxSize: number      // bytes
  allowedMime: string[] | null
  adminOnly: boolean
}> = {
  'avatars': {
    public: true,
    maxSize: 2 * 1024 * 1024,       // 2 MB
    allowedMime: ['image/*'],
    adminOnly: false,
  },
  'campaign-assets': {
    public: true,
    maxSize: 10 * 1024 * 1024,      // 10 MB
    allowedMime: ['image/*', 'video/mp4'],
    adminOnly: true,
  },
  'uploads': {
    public: false,
    maxSize: 50 * 1024 * 1024,      // 50 MB
    allowedMime: null,               // 不限制
    adminOnly: false,
  },
}

// 服务端中转上传的大小阈值（超过此值应走 signed URL 直传）
export const SERVER_PROXY_MAX_SIZE = 5 * 1024 * 1024 // 5 MB

// Signed URL 默认过期时间（秒）
export const SIGNED_URL_EXPIRY = 300 // 5 分钟（仅用于上传）
export const SIGNED_DOWNLOAD_URL_EXPIRY = 3600 // 1 小时（下载链接）

let storageClient: SupabaseClient | null = null

/**
 * 获取 Storage 客户端
 * - Mock DB 模式：走 getDB(event).storage mock 适配器
 * - 真实环境：service_role 客户端（绕过 RLS）
 */
function getStorage(event?: any): any {
  if (process.env.MOCK_DB === 'true' && event) {
    return getDB(event).storage
  }
  if (!storageClient) {
    storageClient = createClient(
      process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'
    )
  }
  return storageClient
}

/**
 * 校验 bucket 名称合法性
 */
export function isValidBucket(bucket: string): bucket is StorageBucket {
  return STORAGE_BUCKETS.includes(bucket as StorageBucket)
}

/**
 * 校验 MIME 类型是否匹配 bucket 配置
 */
export function isMimeAllowed(bucket: StorageBucket, mimeType: string): boolean {
  const config = BUCKET_CONFIG[bucket]
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
  const config = BUCKET_CONFIG[bucket]
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
 * 获取公开访问 URL
 */
export function getPublicUrl(bucket: StorageBucket, path: string, event?: any): string {
  const storage = getStorage(event)
  const { data } = storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
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

/**
 * 列出目录下文件
 */
export async function listFiles(
  bucket: StorageBucket,
  prefix: string,
  event?: any,
): Promise<{ name: string; id: string; updated_at: string; metadata: Record<string, any> }[]> {
  const storage = getStorage(event)

  const { data, error } = await storage
    .from(bucket)
    .list(prefix, {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' },
    })

  if (error) {
    throw createError({
      statusCode: 400,
      statusMessage: `List files failed: ${error.message}`,
    })
  }

  return (data || []).map((f: any) => ({
    name: f.name,
    id: f.id || '',
    updated_at: f.updated_at || '',
    metadata: f.metadata as Record<string, any> || {},
  }))
}
