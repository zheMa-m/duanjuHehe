/**
 * IPX 兜底路由 — 将遗留 /_ipx/ URL 301 重定向到 public 静态资源
 *
 * ISR 旧 HTML 可能仍含 <NuxtImg> 生成的 /_ipx/ URL。
 * 静态文件由 Vercel CDN 托管，直接重定向即可。
 */
import { defineEventHandler, sendRedirect } from 'h3'

export default defineEventHandler((event) => {
  const path = event.path

  const match = path.match(/^\/_ipx\/[^/]+\/(.+)$/)
  if (!match?.[1]) {
    return new Response('Invalid IPX path', { status: 400 })
  }

  const filePath = match[1]

  if (filePath.includes('..') || filePath.includes('~')) {
    return new Response('Forbidden', { status: 403 })
  }

  return sendRedirect(event, `/${filePath}`, 301)
})
