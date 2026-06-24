import type { RouterConfig } from '@nuxt/schema'
import type { RouteRecordRaw } from 'vue-router'

// 🚀 动态子域名路由重写，用内部 URL 重写替代 302/301 重定向，保证地址栏不变
export default <RouterConfig>{
  routes: (_routes) => {
    let host = ''
    if (import.meta.server) {
      const headers = useRequestHeaders(['host'])
      host = headers.host || ''
    } else if (import.meta.client) {
      host = window.location.hostname
    }

    // 提取子域名，剥离端口号（如 localhost:3000 -> localhost）
    const hostname = host.split(':')[0] || ''

    // 如果是 localhost 或 vercel.app 预览域名，则不做过滤和重写，返回全部路由
    if (hostname === 'localhost' || hostname.endsWith('.vercel.app') || !hostname) {
      return _routes
    }

    // 动态提取根域名
    // 例如：www.aihomeworkscan.com -> aihomeworkscan.com
    const domainParts = hostname.split('.')
    let rootDomain = hostname
    if (domainParts.length > 2) {
      rootDomain = domainParts.slice(-2).join('.')
    }

    // 判断子域名
    // 如果是主站域名（如 www.aihomeworkscan.com 或 aihomeworkscan.com）
    if (hostname === rootDomain || hostname === `www.${rootDomain}`) {
      // 主站过滤掉 /admin 和 /h5 开头的路由，防止主域名越界访问子应用
      return _routes.filter((route) => {
        const path = route.path
        return !path.startsWith('/admin') && !path.startsWith('/h5') && !path.startsWith('/h5-v2')
      })
    }

    // 如果是后台管理域名（如 admin.aihomeworkscan.com）
    if (hostname.startsWith('admin.')) {
      const adminRoutes: RouteRecordRaw[] = []
      for (const route of _routes) {
        if (route.path.startsWith('/admin')) {
          // 重写路由路径：去掉 /admin 前缀
          // /admin -> /
          // /admin/users -> /users
          let newPath = route.path.replace(/^\/admin/, '')
          if (!newPath) newPath = '/'

          // 克隆并重写 path
          const newRoute = { ...route, path: newPath }
          adminRoutes.push(newRoute)
        }
      }
      return adminRoutes
    }

    // 如果是 H5 营销子域名
    // 例如 starpath.aihomeworkscan.com -> 对应 /h5/starpath
    // 其他子域名.aihomeworkscan.com -> 对应 /h5/子域名
    const subdomain = hostname.split('.')[0] || ''
    if (subdomain && subdomain !== 'admin' && subdomain !== 'api') {
      const h5Routes: RouteRecordRaw[] = []

      for (const route of _routes) {
        // H5 营销页面可能有 i18n 自动生成的带语言前缀的路由，比如 /en/h5/starpath/...
        // 我们用正则来识别并剥离 /h5/starpath 路径：
        // 模式: ^(?:\/([a-z]{2}))?\/h5\/([^/]+)(.*)
        const match = route.path.match(/^(?:\/([a-z]{2}))?\/h5\/([^/]+)(.*)$/)
        if (match) {
          const lang = match[1] // 'en' 或者是 undefined
          const routeSubdomain = match[2] // 例如 'starpath'
          const remainingPath = match[3] || '' // 例如 '/welcome'

          if (routeSubdomain === subdomain) {
            // 重写路径：把 /h5/subdomain/welcome 变成 /welcome
            let targetPath = remainingPath
            if (targetPath === '/index' || targetPath === '') targetPath = '/'

            let finalPath = ''
            if (lang) {
              finalPath = `/${lang}` + (targetPath === '/' ? '' : targetPath)
            } else {
              finalPath = targetPath === '' ? '/' : targetPath
            }

            if (!finalPath) finalPath = '/'

            const newRoute = { ...route, path: finalPath }

            // 如果是 welcome 路由，为了在子域名根路径也能匹配，我们给它加上 '/' 的别名
            if (remainingPath === '/welcome') {
              const rootPath = lang ? `/${lang}` : '/'
              newRoute.alias = Array.isArray(newRoute.alias) ? [...newRoute.alias, rootPath] : [rootPath]
            }

            h5Routes.push(newRoute)
          }
        }
      }
      return h5Routes
    }

    return _routes
  },
}
