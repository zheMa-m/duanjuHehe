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

/** 固定映射（非 H5 子域名） */
const FIXED_SUBDOMAINS: Record<string, string> = {
  admin: '/admin',
}

/** 保留子域名（不映射到 H5） */
const RESERVED_SUBDOMAINS = new Set(['www', 'api'])

/**
 * 根据子域名获取路径前缀
 * 例: getPrefix('admin')     → '/admin'         (固定)
 *     getPrefix('starpath')   → '/h5/starpath'   (动态 H5)
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
  '/_nuxt/', '/_ipx/', '/_payload', '/api/', '/__nuxt_error', '/favicon.ico',
]

/** Nuxt 内部路由前缀（路由重写时必须透传，不能过滤） */
export const INTERNAL_ROUTE_PREFIXES = [
  '/_nuxt', '/_i18n', '/_ipx', '/_payload', '/__nuxt_error', '/api/',
]

/** 主站需要过滤掉的子应用路由前缀 */
export const MAIN_DOMAIN_EXCLUDE_PREFIXES = ['/admin', '/h5', '/h5-v2']
