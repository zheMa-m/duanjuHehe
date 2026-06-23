import { defineEventHandler, getHeader, sendRedirect } from 'h3'

/**
 * 从请求 Host 头动态提取根域名，无需环境变量。
 * 例: www.aihomeworkscan.com → aihomeworkscan.com
 *     admin.aihomeworkscan.com → aihomeworkscan.com
 *     localhost → localhost
 */
function getRootDomain(host: string): string {
  if (host === 'localhost' || host.startsWith('localhost:')) return 'localhost'
  const parts = host.split('.')
  if (parts.length <= 2) return host
  return parts.slice(-2).join('.')
}

/**
 * 子域名路由中间件
 *
 * ⚠️ h3 v1.15+ 的 createAppEventHandler 在路由匹配前计算 _reqPath，
 *    中间件中改写 event.node.req.url 或 event._path 都不会影响后续路由匹配。
 *    因此用 sendRedirect (302) 让浏览器重新请求正确路径，
 *    而非内部 URL 重写。
 *
 * 路由规则:
 *   www.aihomeworkscan.com/  → 保持原样 (官网首页)
 *   admin.aihomeworkscan.com/  → 302 → /admin/
 *   api.aihomeworkscan.com/非API路径  → 301 → https://www.aihomeworkscan.com/路径
 *   starpath.aihomeworkscan.com/  → 302 → /h5/starpath/
 *   其他子域名.aihomeworkscan.com/  → 302 → /h5/子域名/
 */
export default defineEventHandler((event) => {
  const hostWithPort = getHeader(event, 'host') || ''
  const host = hostWithPort.split(':')[0] || ''
  const path = event.path

  // 跳过静态资源与 Nitro 内部 API 路由
  if (
    path.startsWith('/_nuxt/') ||
    path.startsWith('/api/') ||
    path.startsWith('/__nuxt_error') ||
    path.startsWith('/favicon.ico')
  ) {
    return
  }

  const ROOT_DOMAIN = getRootDomain(host)

  // ── Vercel 预览 / 本地开发：不做子域名重定向 ──
  if (host.endsWith('.vercel.app') || host === 'localhost') {
    return
  }

  // ── 官网首页 (www / 根域名)：不重定向 ──
  if (host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}`) {
    return
  }

  // ── 后台管理子域名 → 302 重定向到 /admin/ ──
  if (host.startsWith('admin.')) {
    if (!path.startsWith('/admin')) {
      const target = `/admin${path === '/' ? '' : path}`
      return sendRedirect(event, target, 302)
    }
    return
  }

  // ── API 子域名：非 API 路径 301 重定向到主站 ──
  if (host.startsWith('api.')) {
    if (!path.startsWith('/api/v1/')) {
      const wwwUrl = `https://www.${ROOT_DOMAIN}${path}`
      return sendRedirect(event, wwwUrl, 301)
    }
    return
  }

  // ── 营销 H5 子域名 → 302 重定向到 /h5/${subdomain} ──
  const parts = host.split('.')
  if (parts.length >= 3) {
    const subdomain = parts[0] || ''
    if (subdomain && subdomain !== 'admin' && subdomain !== 'api' && subdomain !== 'www') {
      if (!path.startsWith(`/h5/${subdomain}`)) {
        const target = `/h5/${subdomain}${path === '/' ? '' : path}`
        return sendRedirect(event, target, 302)
      }
    }
  }
})
