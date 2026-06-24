/**
 * 构建版本响应头 + HTML 浏览器缓存策略
 *
 * - X-Build-Id：每次部署唯一，便于排查与客户端版本比对
 * - Cache-Control / CDN-Cache-Control 分离：浏览器不缓存 HTML，CDN 仍走 ISR
 * - 子域名剥离路径（/welcome）与 /h5/** 统一处理
 */
import { defineEventHandler, getHeader, setHeader, type H3Event } from 'h3'
import {
  BROWSER_HTML_CACHE,
  CDN_HTML_CACHE_H5,
  CDN_HTML_CACHE_SITE,
  resolveBuildId,
} from '~/utils/build-id'
import { parseSubdomain, SKIP_PATH_PREFIXES } from '~/utils/subdomain'

const BUILD_ID = resolveBuildId()

const SITE_PATHS = new Set(['/', '/architecture', '/help'])
const H5_PREFIXES = ['/h5/']

function isHtmlDocumentRequest(event: H3Event): boolean {
  const accept = getHeader(event, 'accept') || ''
  return accept.includes('text/html') || accept.includes('application/xhtml+xml')
}

function isSkippableAsset(path: string): boolean {
  return SKIP_PATH_PREFIXES.some((p) => path.startsWith(p))
}

function resolveCdnHtmlCache(path: string, subdomain: string | null): string | null {
  if (H5_PREFIXES.some((p) => path.startsWith(p))) return CDN_HTML_CACHE_H5

  // 子域名 H5（含 starpath.*/ 根路径）优先于主站 SITE_PATHS
  if (subdomain && subdomain !== 'admin' && subdomain !== 'api' && !isSkippableAsset(path)) {
    return CDN_HTML_CACHE_H5
  }

  if (SITE_PATHS.has(path)) return CDN_HTML_CACHE_SITE

  return null
}

export default defineEventHandler((event) => {
  setHeader(event, 'X-Build-Id', BUILD_ID)

  if (!isHtmlDocumentRequest(event)) return

  const path = event.path
  if (isSkippableAsset(path)) return

  const host = (getHeader(event, 'host') || '').split(':')[0] || ''
  const { subdomain } = parseSubdomain(host)

  const cdnCache = resolveCdnHtmlCache(path, subdomain)
  if (!cdnCache) return

  setHeader(event, 'Cache-Control', BROWSER_HTML_CACHE)
  setHeader(event, 'CDN-Cache-Control', cdnCache)
  setHeader(event, 'Pragma', 'no-cache')
})
