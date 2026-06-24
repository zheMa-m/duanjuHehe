/**
 * 判断当前请求是否处于 H5 营销子应用上下文（含子域名剥离路径）
 */
import { parseSubdomain } from '~/utils/subdomain'

const RESERVED = new Set(['www', 'api', 'admin'])

export function isH5Host(hostname: string): boolean {
  const { subdomain, isLocal } = parseSubdomain(hostname)
  if (isLocal || !subdomain) return false
  return !RESERVED.has(subdomain)
}

export function isH5Path(path: string): boolean {
  return path.startsWith('/h5/') || path.startsWith('/h5-v2/')
}

export function isH5MarketingContext(hostname: string, path: string): boolean {
  return isH5Host(hostname) || isH5Path(path)
}
