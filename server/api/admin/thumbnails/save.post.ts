/**
 * 缩略图保存 API
 *
 * 浏览器端捕获视频帧后，通过此接口上传到 Supabase Storage。
 * Vercel 兼容：不依赖本地文件系统。
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { name, data } = body // data: base64 PNG string

  if (!name || !data) {
    throw createError({ statusCode: 400, statusMessage: 'name and data required' })
  }

  // 安全检查：只允许 PNG 文件名
  if (!/^[a-zA-Z0-9_-]+\.png$/.test(name)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid filename' })
  }

  const base64 = data.replace(/^data:image\/png;base64,/, '')
  const buffer = Buffer.from(base64, 'base64')

  // 上传到 Supabase Storage
  const db = getDB(event)
  const { data: uploadResult, error } = await db.storage
    .from('series-videos')
    .upload(`thumbnails/${name}`, buffer, {
      contentType: 'image/png',
      upsert: true,
      cacheControl: 'public, max-age=31536000, immutable',
    })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: `Upload failed: ${error.message}` })
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
  const url = `${supabaseUrl}/storage/v1/object/public/series-videos/thumbnails/${name}`

  return { success: true, path: url }
})
