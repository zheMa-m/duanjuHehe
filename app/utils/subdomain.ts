/**
 * 子域名路由 — 单一配置源
 *
 * 所有文件（中间件、router.options、客户端插件）共享此文件。
 * 纯函数，不依赖 Vue/Nuxt 上下文。
 *
 * 规则：
 *  - admin  → 固定映射 /admin
 *  - api    → 保留（中间件处理）
 *  - www    → 主站
 *  - 其他任意子域名 → 动态映射 /h5/{子域名}（无需手动注册）
 */

/** 固定映射（非默认 /h5/{子域名} 规则） */
const FIXED_SUBDOMAINS: Record<string, string> = {
  admin: '/admin',
  /** 新野兽派 V2 模板 — 活动 subdomain 与 DB 种子一致 */
  'h5-v2': '/h5-v2/h5-v2',
}

/** 保留子域名（不映射到 H5） */
const RESERVED_SUBDOMAINS = new Set(['www', 'api'])

/**
 * 根据子域名获取路径前缀
 * 例: getPrefix('admin')     → '/admin'         (固定)
 *     getPrefix('starpath')   → '/h5/starpath'   (动态 H5)
 *     getPrefix('h5-v2')      → '/h5-v2/h5-v2'   (固定 V2 模板)
 *     getPrefix('promo2024')  → '/h5/promo2024'  (动态 H5)
 *     getPrefix('api')        → null             (保留)
 *     getPrefix(null)         → null             (无子域名)
 */
export function getPrefix(subdomain: string | null): string | null {
  if (!subdomain || RESERVED_SUBDOMAINS.has(subdomain)) return null
  return FIXED_SUBDOMAINS[subdomain] ?? `/h5/${subdomain}`
}

// ── 域名解析（纯函数）──────────────────────────────────

/** 从 hostname 提取根域名 */
export function getRootDomain(hostname: string): string {
  const parts = hostname.split('.')
  if (parts.length <= 2) return hostname
  return parts.slice(-2).join('.')
}

/** 解析子域名 */
export function parseSubdomain(hostname: string): {
  subdomain: string | null
  isLocal: boolean
} {
  if (!hostname || hostname === 'localhost' || hostname.endsWith('.vercel.app')) {
    return { subdomain: null, isLocal: true }
  }
  const parts = hostname.split('.')
  if (parts.length <= 2) return { subdomain: null, isLocal: false } // 根域名
  if (parts[0] === 'www') return { subdomain: null, isLocal: false }
  return { subdomain: parts[0] || null, isLocal: false }
}

/** 去除路径前缀 */
export function stripPrefix(path: string, prefix: string): string {
  if (path.startsWith(prefix)) {
    return path.slice(prefix.length) || '/'
  }
  return path
}

// ── 常量 ──────────────────────────────────

/** 需要跳过子域名处理的路径前缀 */
export const SKIP_PATH_PREFIXES = [
  '/_nuxt/', '/_ipx/', '/_i18n/', '/_payload', '/api/', '/__nuxt_error', '/favicon.ico',
]

/** Nuxt 内部路由前缀（路由重写时必须透传，不能过滤） */
export const INTERNAL_ROUTE_PREFIXES = [
  '/_nuxt', '/_i18n', '/_ipx', '/_payload', '/__nuxt_error', '/api/',
]

/** 主站需要过滤掉的子应用路由前缀 */
export const MAIN_DOMAIN_EXCLUDE_PREFIXES = ['/admin', '/h5', '/h5-v2']

/** 主站 www 仍须暴露的 H5 演示路径（官网入口、换域名后路径访问） */
const MAIN_SITE_H5_ALLOWLIST = [
  /^\/h5\/promo(?:\/|$)/,
  /^\/h5\/starpath(?:\/|$)/,
  /^\/h5-v2\//,
]

export function isMainSitePublicH5Path(path: string): boolean {
  return MAIN_SITE_H5_ALLOWLIST.some((re) => re.test(path))
}

/** 主站路由表是否应排除该路径 */
export function shouldExcludeRouteFromMainSite(path: string): boolean {
  if (path.startsWith('/admin')) return true
  if (isMainSitePublicH5Path(path)) return false
  if (path.startsWith('/h5') || path.startsWith('/h5-v2')) return true
  return false
}

// ── 子域名入口 URL（官网链接、换域名部署）────────────────

export const ADMIN_SUBDOMAIN = 'admin'
export const ADMIN_LOCAL_PATH = '/admin'

function isLocalHost(hostname: string): boolean {
  return !hostname || hostname === 'localhost' || hostname.endsWith('.vercel.app')
}

/**
 * 解析子域名应用完整 URL。
 * 生产：https://{subdomain}.{root}/
 * 本地 / Vercel 预览：{origin}{localPath}
 */
export function resolveSubdomainHref(
  subdomain: string,
  localPath: string,
  origin: string,
): string {
  const normalizedOrigin = origin.replace(/\/$/, '')
  let hostname: string
  try {
    hostname = new URL(normalizedOrigin).hostname
  } catch {
    return `${normalizedOrigin}${localPath}`
  }

  if (isLocalHost(hostname)) {
    return `${normalizedOrigin}${localPath}`
  }

  const root = getRootDomain(hostname)
  return `https://${subdomain}.${root}/`
}

/** 管理后台入口 URL */
export function resolveAdminHref(origin: string): string {
  return resolveSubdomainHref(ADMIN_SUBDOMAIN, ADMIN_LOCAL_PATH, origin)
}
