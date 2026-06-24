/**
 * 子域名路由中间件
 *
 * 负责：跳过静态资源、处理 api 子域名重定向。
 * 路径重写由 router.options.ts + 客户端插件完成。
 *
 * 规则：
 *   - www / 根域名 → 放行
 *   - api 子域名非 API 路径 → 301 重定向到 www
 *   - 其他子域名 → 放行（前端路由层处理）
 */
import { defineEventHandler, getHeader, sendRedirect } from 'h3'

// ── 纯函数（与服务端 app/utils/subdomain.ts 逻辑一致，避免跨构建目标导入）──

function getRootDomain(hostname: string): string {
  const parts = hostname.split('.')
  if (parts.length <= 2) return hostname
  return parts.slice(-2).join('.')
}

function isLocalEnv(hostname: string): boolean {
  return !hostname || hostname === 'localhost' || hostname.endsWith('.vercel.app')
}

const SKIP_PREFIXES = ['/_nuxt/', '/_ipx/', '/_payload', '/api/', '/__nuxt_error', '/favicon.ico']

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

  // admin / h5 子域名：放行，路由重写由 router.options.ts + 客户端插件完成
})
