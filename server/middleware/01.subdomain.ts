/**
 * 子域名路由中间件
 *
 * 负责：跳过静态资源、处理 api 子域名重定向、子域名完整前缀路径 301 剥离、
 * 服务端路径重写（确保子域名请求命中 routeRules 的 ssr:false / ISR）。
 *
 * 规则：
 *   - www / 根域名 → 放行
 *   - api 子域名非 API 路径 → 301 重定向到 www
 *   - 其他子域名完整前缀路径 → 301 剥离前缀
 *   - 其他子域名 → 服务端路径重写到内部前缀（admin→/admin, h5→/h5/{sd}）
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

  // 旧路径 /h5-v2/* → /h5/*（V2 已合并至 /h5/h5-v2）
  if (path.startsWith('/h5-v2/')) {
    return sendRedirect(event, path.replace(/^\/h5-v2/, '/h5'), 301)
  }

  if (isLocalEnv(host)) {
    // 本地开发：子域名路径重写（确保命中 routeRules）
    // admin.localhost:3000/ → /admin   (命中 ssr: false)
    // starpath.localhost:3000/ → /h5/starpath  (命中 ISR)
    const parts = host.split('.')
    if (parts.length > 2 || host.endsWith('.localhost')) {
      const sd = parts[0]
      if (sd && sd !== 'www' && sd !== 'api') {
        const prefix = getPrefix(sd)
        if (prefix && path === '/') {
          event.node.req.url = prefix
          event._path = prefix
        }
      }
    }
    return
  }

  const rootDomain = getRootDomain(host)

  // www / 根域名：/admin 路径 301 到 admin 子域名
  if (host === rootDomain || host === `www.${rootDomain}`) {
    if (path === '/admin' || path.startsWith('/admin/')) {
      const subPath = path.slice('/admin'.length) || '/'
      return sendRedirect(event, `https://admin.${rootDomain}${subPath}`, 301)
    }
    return
  }

  // api 子域名：非 API 路径 301 到主站
  if (host.startsWith('api.')) {
    if (!path.startsWith('/api/v1/')) {
      return sendRedirect(event, `https://www.${rootDomain}${path}`, 301)
    }
    return
  }

  // 子域名下访问完整前缀路径 → 301 剥离前缀
  // h5-v1.aihomeworkscan.com/h5/h5-v1 → /
  // h5-v2.aihomeworkscan.com/h5/h5-v2 → /
  const parts = host.split('.')
  if (parts.length > 2) {
    const sd = parts[0]
    if (sd && sd !== 'www' && sd !== 'api') {
      const prefix = getPrefix(sd)
      if (prefix) {
        if (path === prefix || path.startsWith(prefix + '/')) {
          return sendRedirect(event, path.slice(prefix.length) || '/', 301)
        }
        // 服务端路径重写：确保命中 routeRules（ssr:false / ISR）
        // admin.domain.com/ → /admin  |  starpath.domain.com/welcome → /h5/starpath/welcome
        // 必须同时更新 event._path（H3 的 event.path getter 优先读取缓存的 _path 属性）
        // 若只改 node.req.url，Nitro 渲染器仍会按原始路径匹配 routeRules，导致 SSR。
        const rewritten = path === '/' ? prefix : prefix + path
        event.node.req.url = rewritten
        event._path = rewritten
        // admin 子域名强制 SPA 模式：直接设置 noSSR 标记，绕过 routeRules 缓存问题
        // （Nitro 的 createRouteRulesHandler 在中间件之前运行，已用原始路径缓存了规则）
        if (sd === 'admin') {
          event.context.nuxt = event.context.nuxt || {}
          event.context.nuxt.noSSR = true
        }
      }
    }
  }
})
