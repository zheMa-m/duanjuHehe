/**
 * 官网 H5 营销页演示入口 — 子域名访问，适配换域名部署。
 */
import { resolveSubdomainHref } from '~/utils/subdomain'

export interface H5DemoEntry {
  id: 'v1' | 'v2' | 'starpath'
  labelKey: string
  path: string
  cardClass: 'v1' | 'v2' | 'starpath'
  /** 生产环境子域名入口（与智能问卷一致） */
  subdomain: string
}

export const H5_DEMO_ENTRIES: readonly H5DemoEntry[] = [
  { id: 'v1', labelKey: 'home.navH5_v1', path: '/h5/promo', cardClass: 'v1', subdomain: 'promo' },
  { id: 'v2', labelKey: 'home.navH5_v2', path: '/h5-v2/h5-v2', cardClass: 'v2', subdomain: 'h5-v2' },
  { id: 'starpath', labelKey: 'home.navH5_starpath', path: '/h5/starpath/welcome', cardClass: 'starpath', subdomain: 'starpath' },
]

/** 解析演示页完整 URL（新标签打开用） */
export function resolveH5DemoHref(entry: H5DemoEntry, origin: string): string {
  return resolveSubdomainHref(entry.subdomain, entry.path, origin)
}
