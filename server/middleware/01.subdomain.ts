/**
 * 子域名路由中间件
 *
 * 负责：跳过静态资源、处理 api 子域名重定向、子域名完整前缀路径 301 剥离。
 * 路由重写由 router.options.ts + 客户端插件完成。
 *
 * 规则：
 *   - www / 根域名 → 放行
 *   - api 子域名非 API 路径 → 301 重定向到 www
 *   - 其他子域名完整前缀路径 → 301 剥离前缀
 *   - 其余放行（前端路由层处理）
 */
import { defineEventHandler, getHeader, sendRedirect } from 'h3'
import { getPrefix, getRootDomain } from '~/utils/subdomain'

function isLocalEnv(hostname: string): boolean {
  return !hostname || hostname === 'localhost' || hostname.endsWith('.vercel.app')
}

const SKIP_PREFIXES = ['/_nuxt/', '/_ipx/', '/_i18n/', '/_payload', '/api/', '/__nuxt_error', '/favicon.ico']

// ── 中间件 ──

export default defineEventHandler((event) => {
  const hostWithPort = getHeader(event, 'host') || ''
  const host = hostWithPort.split(':')[0] || ''
  const path = event.path

  if (SKIP_PREFIXES.some((p) => path.startsWith(p))) return

  if (isLocalEnv(host)) return

  const rootDomain = getRootDomain(host)

  // www / 根域名：放行
  if (host === rootDomain || host === `www.${rootDomain}`) return

  // api 子域名：非 API 路径 301 到主站
  if (host.startsWith('api.')) {
    if (!path.startsWith('/api/v1/')) {
      return sendRedirect(event, `https://www.${rootDomain}${path}`, 301)
    }
    return
  }

  // 子域名下访问完整前缀路径 → 301 剥离前缀
  // promo.aihomeworkscan.com/h5/promo → /
  // h5-v2.aihomeworkscan.com/h5-v2/h5-v2 → /
  const parts = host.split('.')
  if (parts.length > 2) {
    const sd = parts[0]
    if (sd && sd !== 'www' && sd !== 'api') {
      const prefix = getPrefix(sd)
      if (prefix && (path === prefix || path.startsWith(prefix + '/'))) {
        return sendRedirect(event, path.slice(prefix.length) || '/', 301)
      }
    }
  }

  // admin / h5 子域名：放行，路由重写由 router.options.ts + 客户端插件完成
})
