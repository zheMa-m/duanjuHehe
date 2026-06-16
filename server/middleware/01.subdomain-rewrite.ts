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

  const ROOT_DOMAIN = process.env.ROOT_DOMAIN || 'yourdomain.localhost'

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
    return
  }

  // 3. API 域名拦截
  if (host.startsWith('api.')) {
    if (!path.startsWith('/api/v1/')) {
      throw createError({ statusCode: 404, statusMessage: 'API Not Found' })
    }
    return
  }

  // 4. 营销 H5 子域名重写
  const parts = host.split('.')
  if (parts.length >= 3) {
    const subdomain = parts[0]
    // 排除 admin / api / www 等子域名
    if (subdomain !== 'admin' && subdomain !== 'api' && subdomain !== 'www') {
      if (!path.startsWith(`/h5/${subdomain}`)) {
        event.node.req.url = `/h5/${subdomain}${path === '/' ? '' : path}`
      }
    }
  }
})
