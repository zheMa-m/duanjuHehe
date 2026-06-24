/**
 * IPX 兜底路由 — 处理生产环境中的遗留 _ipx 请求
 *
 * ISR 缓存页面可能仍引用 <NuxtImg> 生成的 /_ipx/ URL。
 * Vercel 环境 image provider 为 'vercel'，不会处理 _ipx 路由。
 * 当前页面已改用原生 <img>，此路由确保缓存中的旧 URL 仍可加载。
 *
 * IPX URL: /_ipx/{modifiers}/{original-path}
 * 例: /_ipx/f_webp/starpath/images/page-0-logo.webp → public/starpath/images/page-0-logo.webp
 */
import { defineEventHandler } from 'h3'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const MIME_TYPES: Record<string, string> = {
  webp: 'image/webp',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  svg: 'image/svg+xml',
  gif: 'image/gif',
  ico: 'image/x-icon',
}

export default defineEventHandler(async (event) => {
  const path = event.path

  const match = path.match(/^\/_ipx\/[^/]+\/(.+)$/)
  if (!match?.[1]) {
    return new Response('Invalid IPX path', { status: 400 })
  }

  const filePath = match[1]

  if (filePath.includes('..') || filePath.includes('~')) {
    return new Response('Forbidden', { status: 403 })
  }

  const fullPath = resolve('./public', filePath)

  try {
    const content = await readFile(fullPath)
    const ext = filePath.split('.').pop()?.toLowerCase() || ''
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'

    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return new Response('Not Found', { status: 404 })
  }
})
