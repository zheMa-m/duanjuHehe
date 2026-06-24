/**
 * IPX 兜底路由 — 将遗留 /_ipx/ URL 代理到 CDN 静态资源
 *
 * Vercel 上 public 文件由 CDN 托管，Serverless 内无法 readFile。
 * ISR 缓存 HTML 中的 <img src="/_ipx/..."> 不走客户端 $fetch 拦截。
 */
import { defineEventHandler, getRequestURL, proxyRequest } from 'h3'

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

  const url = getRequestURL(event)
  url.pathname = `/${filePath}`
  return proxyRequest(event, url.toString())
})
