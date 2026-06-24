/**
 * IPX 兜底路由 — 将遗留 /_ipx/ URL 重定向到 public 静态资源
 *
 * Vercel Serverless 函数内无法 readFile('./public')，静态资源由 CDN 托管。
 * ISR 缓存页面可能仍引用 <NuxtImg> 生成的 /_ipx/ URL。
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
