/**
 * useStorage — 客户端 Storage Composable
 *
 * 混合上传策略：
 *   - 小文件（< 5MB）：服务端中转 → POST /api/v1/storage/upload
 *   - 大文件（>= 5MB）：客户端直传 → POST /api/v1/storage/signed-url → PUT signedUrl
 */

type StorageBucket = 'avatars' | 'campaign-assets' | 'uploads'

const SIZE_THRESHOLD = 5 * 1024 * 1024 // 5 MB

export function useStorage() {
  const config = useRuntimeConfig()

  /**
   * 通用上传（自动选择中转/直传）
   */
  async function upload(
    file: File,
    bucket: StorageBucket,
    options?: { path?: string },
  ): Promise<{ path: string; publicUrl: string | null }> {
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
    options?: { path?: string },
  ): Promise<{ path: string; publicUrl: string | null }> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('bucket', bucket)
    if (options?.path) {
      formData.append('path', options.path)
    }

    const res = await $fetch<{
      success: boolean
      data: { path: string; publicUrl: string | null }
    }>('/api/v1/storage/upload', {
      method: 'POST',
      body: formData,
    })

    return res.data
  }

  /**
   * 大文件：获取 signed URL 后直传
   */
  async function uploadViaSignedUrl(
    file: File,
    bucket: StorageBucket,
    _options?: { path?: string },
  ): Promise<{ path: string; publicUrl: string | null }> {
    // 1. 获取 signed upload URL
    const urlRes = await $fetch<{
      success: boolean
      data: { signedUrl: string; path: string }
    }>('/api/v1/storage/signed-url', {
      method: 'POST',
      body: {
        bucket,
        filename: file.name,
        contentType: file.type,
      },
    })

    const { signedUrl, path } = urlRes.data

    // 2. 直传文件到 Supabase Storage
    await $fetch(signedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    })

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
    const query: Record<string, string> = {}
    if (expires) query.expires = String(expires)

    const res = await $fetch<{
      success: boolean
      data: { signedUrl: string; expiresIn: number }
    }>(`/api/v1/storage/signed-url/${bucket}/${path}`, {
      params: query,
    })

    return res.data.signedUrl
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
