/**
 * useStorage — 客户端 Storage Composable
 *
 * 混合上传策略：
 *   - 小文件（< 5MB）：服务端中转 → POST /api/v1/storage/upload
 *   - 大文件（>= 5MB）：客户端直传 → POST /api/v1/storage/signed-url → PUT signedUrl
 */

type StorageBucket = string

interface UploadOptions {
  path?: string
  onProgress?: (percent: number) => void
}

interface UploadResult {
  path: string
  publicUrl: string | null
}

const SIZE_THRESHOLD = 5 * 1024 * 1024 // 5 MB

// 文件名安全清理
function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 255)
}

// EXIF 字段提取（仅图片文件）
async function extractExif(file: File): Promise<Record<string, any> | null> {
  if (!file.type.startsWith('image/')) return null
  try {
    const exifr = await import('exifr')
    const data = await exifr.default.parse(file, { gps: true, exif: true, ifd0: {} })
    if (!data) return null
    return {
      Make: data.Make || null,
      Model: data.Model || null,
      DateTimeOriginal: data.DateTimeOriginal?.toISOString?.() || data.DateTimeOriginal || null,
      ExposureTime: data.ExposureTime || null,
      FNumber: data.FNumber || null,
      ISO: data.ISO || null,
      FocalLength: data.FocalLength || null,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      ImageWidth: data.ImageWidth || null,
      ImageHeight: data.ImageHeight || null,
    }
  } catch {
    return null
  }
}

export function useStorage() {
  const config = useRuntimeConfig()

  /**
   * 通用上传（自动选择中转/直传）
   */
  async function upload(
    file: File,
    bucket: StorageBucket,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    if (file.size >= SIZE_THRESHOLD) {
      return uploadViaSignedUrl(file, bucket, options)
    }
    return uploadViaServer(file, bucket, options)
  }

  /**
   * 小文件：服务端中转上传
   */
  async function uploadViaServer(
    file: File,
    bucket: StorageBucket,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    const formData = new FormData()
    formData.append('file', file, sanitizeFileName(file.name))
    formData.append('bucket', bucket)
    if (options?.path) {
      formData.append('path', options.path)
    }
    // 提取 EXIF 数据（仅图片）
    const exif = await extractExif(file)
    if (exif) {
      formData.append('exif', JSON.stringify(exif))
    }

    try {
      const res = await $fetch<{
        success: boolean
        data: { path: string; publicUrl: string | null }
      }>('/api/v1/storage/upload', {
        method: 'POST',
        body: formData,
      })

      return res.data
    } catch (err: any) {
      const message = err?.data?.statusMessage || err?.message || 'Upload failed'
      throw new Error(message)
    }
  }

  /**
   * 大文件：获取 signed URL 后直传
   */
  async function uploadViaSignedUrl(
    file: File,
    bucket: StorageBucket,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    // 1. 获取 signed upload URL
    let signedUrl: string, path: string
    try {
      const urlRes = await $fetch<{
        success: boolean
        data: { signedUrl: string; path: string }
      }>('/api/v1/storage/signed-url', {
        method: 'POST',
        body: {
          bucket,
          filename: sanitizeFileName(file.name),
          contentType: file.type || 'application/octet-stream',
        },
      })

      signedUrl = urlRes.data.signedUrl
      path = urlRes.data.path
    } catch (err: any) {
      const message = err?.data?.statusMessage || err?.message || 'Failed to get signed upload URL'
      throw new Error(message)
    }

    // 2. 直传文件到 Supabase Storage（带进度回调）
    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', signedUrl)

        if (options?.onProgress) {
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              options.onProgress!(Math.round((e.loaded / e.total) * 100))
            }
          }
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve()
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`))
          }
        }

        xhr.onerror = () => reject(new Error('Network error during upload'))
        xhr.ontimeout = () => reject(new Error('Upload timed out'))

        xhr.timeout = 120000 // 2 分钟超时
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
        xhr.send(file)
      })
    } catch (err: any) {
      throw new Error(err.message || 'Direct upload failed')
    }

    // 3. 构建公开 URL（仅 public bucket 有意义）
    let publicUrl: string | null = null
    if (bucket === 'avatars' || bucket === 'campaign-assets') {
      const supabaseUrl = config.public.supabaseUrl as string
      if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
        publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`
      }
    }

    return { path, publicUrl }
  }

  /**
   * 删除文件
   */
  async function remove(bucket: StorageBucket, path: string): Promise<void> {
    await $fetch(`/api/v1/storage/${bucket}/${path}`, {
      method: 'DELETE',
    })
  }

  /**
   * 获取私有文件的临时访问 signed URL
   */
  async function getSignedUrl(
    bucket: StorageBucket,
    path: string,
    expires?: number,
  ): Promise<string> {
    try {
      const query: Record<string, string> = {}
      if (expires) query.expires = String(expires)

      const res = await $fetch<{
        success: boolean
        data: { signedUrl: string; expiresIn: number }
      }>(`/api/v1/storage/signed-url/${bucket}/${path}`, {
        params: query,
      })

      return res.data.signedUrl
    } catch (err: any) {
      const message = err?.data?.statusMessage || err?.message || 'Failed to get signed URL'
      throw new Error(message)
    }
  }

  /**
   * 获取公开文件的 URL（无需 API 请求）
   */
  function getPublicUrl(bucket: StorageBucket, path: string): string {
    const supabaseUrl = config.public.supabaseUrl as string
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      return `/mock-storage/${bucket}/${path}`
    }
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`
  }

  return {
    upload,
    uploadViaServer,
    uploadViaSignedUrl,
    remove,
    getSignedUrl,
    getPublicUrl,
  }
}
