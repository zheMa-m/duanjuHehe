/**
 * 子域名 H5 前缀下的 i18n 懒加载兜底
 *
 * 客户端在 starpath.* 下请求 /h5/starpath/_i18n/... 时，
 * 代理到 www 主域名上由 @nuxtjs/i18n 注册的路由。
 */
import { defineEventHandler, getHeader, proxyRequest } from 'h3'

function getRootDomain(hostname: string): string {
  const parts = hostname.split('.')
  if (parts.length <= 2) return hostname
  return parts.slice(-2).join('.')
}

export default defineEventHandler((event) => {
  const host = (getHeader(event, 'host') || '').split(':')[0] || ''
  const rootDomain = getRootDomain(host)
  const suffix = event.path.replace(/^\/h5\/[^/]+\/_i18n/, '/_i18n')

  return proxyRequest(event, `https://www.${rootDomain}${suffix}`)
})
