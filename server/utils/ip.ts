import { H3Event, getHeader, getRequestIP } from 'h3'

/**
 * 获取客户端真实 IP 地址
 *
 * 优先级：CF-Connecting-IP > X-Forwarded-For > 直连 IP > 回退 127.0.0.1
 *
 * 必须使用此函数替代 getRequestIP() 或手动读取 header，
 * 以确保在 Cloudflare 代理 / Vercel Edge / 直连三种部署模式下均能正确获取客户端 IP。
 */
export function getClientRealIP(event: H3Event): string {
  // Cloudflare 代理模式下，CF-Connecting-IP 是最可靠的客户端真实 IP
  const cfIP = getHeader(event, 'cf-connecting-ip')
  if (cfIP) return cfIP

  // X-Forwarded-For 可能包含多个代理节点 IP，取第一个（最接近客户端的）
  const xff = getHeader(event, 'x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }

  // 直连模式（本地开发或非代理部署）
  const directIP = getRequestIP(event, { xForwardedFor: false })
  if (directIP) return directIP

  return '127.0.0.1'
}

/**
 * 获取客户端国家/地区代码（ISO 3166-1 alpha-2）
 *
 * 优先级：cf-ipcountry（Cloudflare）> x-vercel-ip-country（Vercel）> 回退 'XX'（未知）
 *
 * Cloudflare 和 Vercel 均在边缘节点自动注入此头，零额外依赖。
 * 本地开发时无此头，返回 'XX'。
 */
export function getClientCountry(event: H3Event): string {
  const cfCountry = getHeader(event, 'cf-ipcountry')
  if (cfCountry && cfCountry !== 'XX') return cfCountry.toUpperCase()

  const vercelCountry = getHeader(event, 'x-vercel-ip-country')
  if (vercelCountry && vercelCountry !== 'XX') return vercelCountry.toUpperCase()

  return 'XX'
}
