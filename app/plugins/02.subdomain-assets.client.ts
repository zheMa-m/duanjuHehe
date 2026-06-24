/**
 * 子域名客户端资源修复 — _i18n / _ipx
 *
 * 子域名下 i18n 懒加载可能请求 /h5/{biz}/_i18n/...，
 * 重写为同域 /_i18n/... 由服务端 proxy 处理（避免跨域 CORS）。
 * ISR 缓存 HTML 中的 /_ipx/ 图片 URL 重写到直链静态资源。
 */
import { parseSubdomain } from '~/utils/subdomain'

function rewriteSubdomainAssetUrl(request: string, origin: string): string | null {
  const prefixedI18n = request.match(/^\/h5\/[^/]+\/_i18n\/(.+)$/)
  if (prefixedI18n) return `/_i18n/${prefixedI18n[1]}`

  const prefixedIpx = request.match(/^\/h5\/[^/]+\/_ipx\/[^/]+\/(.+)$/)
  if (prefixedIpx) return `${origin}/${prefixedIpx[1]}`

  const ipx = request.match(/^\/_ipx\/[^/]+\/(.+)$/)
  if (ipx) return `${origin}/${ipx[1]}`

  return null
}

function patchRequest<T extends (input: RequestInfo | URL, init?: object) => Promise<unknown>>(
  raw: T,
  origin: string,
): T {
  return ((input: RequestInfo | URL, init?: object) => {
    if (typeof input === 'string') {
      const rewritten = rewriteSubdomainAssetUrl(input, origin)
      if (rewritten) return raw(rewritten, init)
    }
    return raw(input, init)
  }) as T
}

export default defineNuxtPlugin({
  name: 'subdomain-assets',
  enforce: 'pre',
  setup() {
    const hostname = window.location.hostname
    const { subdomain, isLocal } = parseSubdomain(hostname)
    if (isLocal || !subdomain) return

    const origin = window.location.origin

    globalThis.$fetch = patchRequest(
      globalThis.$fetch as (input: RequestInfo | URL, init?: object) => Promise<unknown>,
      origin,
    ) as typeof globalThis.$fetch

    globalThis.fetch = patchRequest(globalThis.fetch.bind(globalThis), origin)
  },
})
