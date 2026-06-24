/**
 * 子域名客户端资源修复 — _i18n / _ipx
 *
 * 子域名下 i18n 懒加载会请求 /h5/{biz}/_i18n/...（404），
 * ISR 缓存 HTML 仍含 /_ipx/ 图片 URL。
 * 在 $fetch 层将上述请求重写到正确地址。
 */
import { parseSubdomain, getRootDomain } from '~/utils/subdomain'

export default defineNuxtPlugin({
  name: 'subdomain-assets',
  enforce: 'pre',
  setup() {
    const hostname = window.location.hostname
    const { subdomain, isLocal } = parseSubdomain(hostname)
    if (isLocal || !subdomain) return

    const wwwOrigin = `https://www.${getRootDomain(hostname)}`
    const origin = window.location.origin
    const rawFetch = globalThis.$fetch

    globalThis.$fetch = ((request: RequestInfo, opts?: Parameters<typeof rawFetch>[1]) => {
      if (typeof request === 'string') {
        const i18n = request.match(/^(?:\/h5\/[^/]+)?(\/_i18n\/.+)$/)
        if (i18n) {
          return rawFetch(`${wwwOrigin}${i18n[1]}`, opts)
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
