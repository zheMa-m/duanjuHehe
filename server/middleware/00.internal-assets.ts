/**
 * 子域名内部资源代理 — _i18n / _ipx
 *
 * 子域名下 /_i18n 会被应用层 302 到 /h5/{biz}/_i18n（不存在），
 * 在最早阶段将请求代理到 www 主域名的对应路径。
 * /_ipx 遗留 URL 直接 301 到 public 静态资源（同域，无需跨域 proxy）。
 */
import { defineEventHandler, getHeader, proxyRequest, sendRedirect } from 'h3'

function getRootDomain(hostname: string): string {
  const parts = hostname.split('.')
  if (parts.length <= 2) return hostname
  return parts.slice(-2).join('.')
}

function isWwwOrApex(host: string, rootDomain: string): boolean {
  return host === rootDomain || host === `www.${rootDomain}`
}

const PREFIXED_I18N = /^\/h5\/[^/]+\/_i18n\/(.*)$/
const PREFIXED_IPX = /^\/h5\/[^/]+\/_ipx\/[^/]+\/(.+)$/
const BARE_IPX = /^\/_ipx\/[^/]+\/(.+)$/

function safeStaticPath(filePath: string): string | null {
  if (filePath.includes('..') || filePath.includes('~')) return null
  return `/${filePath}`
}

export default defineEventHandler((event) => {
  const host = (getHeader(event, 'host') || '').split(':')[0] || ''
  const path = event.path

  if (!host || host === 'localhost' || host.endsWith('.vercel.app')) return

  const rootDomain = getRootDomain(host)
  if (isWwwOrApex(host, rootDomain)) return

  const wwwBase = `https://www.${rootDomain}`

  if (path.startsWith('/_i18n/')) {
    return proxyRequest(event, `${wwwBase}${path}`)
  }

  const i18nMatch = path.match(PREFIXED_I18N)
  if (i18nMatch?.[1]) {
    return proxyRequest(event, `${wwwBase}/_i18n/${i18nMatch[1]}`)
  }

  const bareIpx = path.match(BARE_IPX)
  if (bareIpx?.[1]) {
    const target = safeStaticPath(bareIpx[1])
    if (target) return sendRedirect(event, target, 301)
  }

  const ipxMatch = path.match(PREFIXED_IPX)
  if (ipxMatch?.[1]) {
    const target = safeStaticPath(ipxMatch[1])
    if (target) return sendRedirect(event, target, 301)
  }
})
