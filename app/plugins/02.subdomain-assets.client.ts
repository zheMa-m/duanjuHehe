/**
 * 子域名客户端资源修复 — _i18n / _ipx
 *
 * 子域名下 i18n 懒加载可能请求 /h5/{biz}/_i18n/...，
 * 重写为同域 /_i18n/... 由服务端 proxy 处理（避免跨域 CORS）。
 * ISR 缓存 HTML 中的 /_ipx/ 图片 URL 重写到直链静态资源。
 */
import { parseSubdomain } from '~/utils/subdomain'

export default defineNuxtPlugin({
  name: 'subdomain-assets',
  enforce: 'pre',
  setup() {
    const hostname = window.location.hostname
    const { subdomain, isLocal } = parseSubdomain(hostname)
    if (isLocal || !subdomain) return

    const origin = window.location.origin
    const rawFetch = globalThis.$fetch

    globalThis.$fetch = ((request: RequestInfo, opts?: Parameters<typeof rawFetch>[1]) => {
      if (typeof request === 'string') {
        const prefixedI18n = request.match(/^\/h5\/[^/]+\/_i18n\/(.+)$/)
        if (prefixedI18n) {
          return rawFetch(`/_i18n/${prefixedI18n[1]}`, opts)
        }

        const ipx = request.match(/^\/_ipx\/[^/]+\/(.+)$/)
        if (ipx) {
          return rawFetch(`${origin}/${ipx[1]}`, opts)
        }
      }
      return rawFetch(request, opts)
    }) as typeof globalThis.$fetch
  },
})
