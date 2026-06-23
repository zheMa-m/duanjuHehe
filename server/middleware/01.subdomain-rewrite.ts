import { defineEventHandler, getHeader, sendRedirect, setResponseHeader } from 'h3'

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

  // ── Vercel 预览 / 无子域名环境：不做 Host 重写 ──
  // Nuxt pages 直接通过路径匹配路由
  if (host.endsWith('.vercel.app') || host === 'localhost') {
    return
  }

  // ── 自定义域名环境：基于 Host 子域名重写 ──

  // 1. 官网首页路由重写
  if (host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}`) {
    if (!path.startsWith('/client')) {
      event.node.req.url = `/client${path === '/' ? '' : path}`
    }
    return
  }

  // 2. 后台管理路由重写
  if (host.startsWith('admin.')) {
    if (!path.startsWith('/admin')) {
      event.node.req.url = `/admin${path}`
    }
    // 告诉 CDN 按 Host 区分缓存，避免 admin 子域名被缓存的官网首页覆盖
    setResponseHeader(event, 'Vary', 'Host')
    return
  }

  // 3. API 域名拦截
  if (host.startsWith('api.')) {
    if (!path.startsWith('/api/v1/')) {
      // 非 API 路径重定向到主站，避免 404
      const wwwUrl = `https://www.${ROOT_DOMAIN}${path}`
      return sendRedirect(event, wwwUrl, 301)
    }
    return
  }

  // 4. 营销 H5 子域名重写 → 统一路由到 /h5/${subdomain}
  const parts = host.split('.')
  if (parts.length >= 3) {
    const subdomain = parts[0] || ''
    if (subdomain && subdomain !== 'admin' && subdomain !== 'api' && subdomain !== 'www') {
      if (!path.startsWith(`/h5/${subdomain}`)) {
        event.node.req.url = `/h5/${subdomain}${path === '/' ? '' : path}`
      }
      setResponseHeader(event, 'Vary', 'Host')
    }
  }
})
