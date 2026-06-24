/**
 * 官网 H5 营销页演示入口 — 路径与子域名双通道，适配换域名部署。
 */
import { getRootDomain } from '~/utils/subdomain'

export interface H5DemoEntry {
  id: 'v1' | 'v2' | 'starpath'
  labelKey: string
  path: string
  cardClass: 'v1' | 'v2' | 'starpath'
  /** 有子域名时优先用子域名访问（v2 模板仅路径入口） */
  subdomain?: string
}

export const H5_DEMO_ENTRIES: readonly H5DemoEntry[] = [
  { id: 'v1', labelKey: 'home.navH5_v1', path: '/h5/promo', cardClass: 'v1', subdomain: 'promo' },
  { id: 'v2', labelKey: 'home.navH5_v2', path: '/h5-v2/promo', cardClass: 'v2' },
  { id: 'starpath', labelKey: 'home.navH5_starpath', path: '/h5/starpath/welcome', cardClass: 'starpath', subdomain: 'starpath' },
]

function isLocalHost(hostname: string): boolean {
  return !hostname || hostname === 'localhost' || hostname.endsWith('.vercel.app')
}

/** 解析演示页完整 URL（新标签打开用） */
export function resolveH5DemoHref(entry: H5DemoEntry, origin: string): string {
  const normalizedOrigin = origin.replace(/\/$/, '')
  let hostname: string
  try {
    hostname = new URL(normalizedOrigin).hostname
  } catch {
    return `${normalizedOrigin}${entry.path}`
  }

  if (isLocalHost(hostname)) {
    return `${normalizedOrigin}${entry.path}`
  }

  const root = getRootDomain(hostname)
  if (entry.subdomain) {
    return `https://${entry.subdomain}.${root}/`
  }

  const wwwHost = hostname.startsWith('www.') ? hostname : `www.${root}`
  return `https://${wwwHost}${entry.path}`
}
