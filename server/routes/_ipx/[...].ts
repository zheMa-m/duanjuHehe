/**
 * IPX 兜底路由 — 处理 Vercel 生产环境中的遗留 _ipx 请求
 *
 * 背景：早期版本的页面使用 <NuxtImg> 生成 _ipx/ URL，这些 URL 被 ISR 缓存。
 * 当前生产环境 image provider 为 'vercel'，不会处理 _ipx 路由，导致 404。
 * 代码已修复（改为原生 <img>），但这个兜底路由确保缓存页面中的旧 URL 也能正常加载。
 *
 * IPX URL 格式: /_ipx/{modifiers}/{original-path}
 * 例如: /_ipx/f_webp/starpath/images/page-0-logo.webp
 *        → 原始文件: starpath/images/page-0-logo.webp
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

  // 从 IPX 路径中提取原始文件路径：跳过第一个 modifiers 段
  // /_ipx/f_webp/starpath/images/foo.webp → starpath/images/foo.webp
  const match = path.match(/^\/_ipx\/[^/]+\/(.+)$/)
  if (!match?.[1]) {
    return new Response('Invalid IPX path', { status: 400 })
  }

  const filePath = match[1]

  // 安全检查：防止目录遍历攻击
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
