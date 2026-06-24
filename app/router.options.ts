/**
 * 子域名路由配置 — 动态路由重写（SSR + 客户端通用）
 *
 * 内部 URL 重写，保证地址栏不变。
 * router.push 前缀剥离由 plugins/01.subdomain-router.client.ts 全局处理。
 *
 * 规则：
 *   www/根域名 → 暴露主站路由，过滤 /admin /h5
 *   admin.*    → 仅暴露 /admin 路由，去除前缀
 *   其他任意子域名 → 动态映射 /h5/{子域名} 路由，去除前缀
 */
import type { RouterConfig } from '@nuxt/schema'
import type { RouteRecordRaw } from 'vue-router'
import {
  getRootDomain,
  parseSubdomain,
  getPrefix,
  MAIN_DOMAIN_EXCLUDE_PREFIXES,
} from '~/utils/subdomain'

// ── 获取当前 hostname ──
function getHostname(): string {
  if (import.meta.server) {
    try {
      return (useRequestHeaders(['host']).host || '').split(':')[0] || ''
    } catch {
      return ''
    }
  }
  return window.location.hostname
}

// ── 重写子域名路由 ──
// 匹配前缀的所有路由 + i18n 语言前缀（/en/h5/starpath/welcome → /en/welcome）
function buildSubdomainRoutes(
  _routes: readonly RouteRecordRaw[],
  prefix: string,
): RouteRecordRaw[] {
  const escaped = prefix.replace(/\//g, '\\/')
  const regex = new RegExp(`^(?:/([a-z]{2}))?${escaped}(.*)$`)
  const result: RouteRecordRaw[] = []

  for (const route of _routes) {
    const match = route.path.match(regex)
    if (!match) continue

    const lang = match[1]             // e.g. 'en'
    const rest = match[2] || ''       // e.g. '/welcome'

    let target = rest
    if (target === '/index' || target === '') target = '/'

    const finalPath = lang
      ? `/${lang}${target === '/' ? '' : target}`
      : target

    const newRoute: RouteRecordRaw = { ...route, path: finalPath || '/' }

    // 首页路由加根路径别名
    if (rest === '/welcome') {
      const rootAlias = lang ? `/${lang}` : '/'
      newRoute.alias = Array.isArray(route.alias)
        ? [...route.alias, rootAlias]
        : [rootAlias]
    }

    result.push(newRoute)
  }

  return result
}

// ── RouterConfig ──
export default <RouterConfig>{
  routes: (_routes) => {
    const hostname = getHostname()
    const { subdomain, isLocal } = parseSubdomain(hostname)

    if (isLocal) return _routes as RouteRecordRaw[]

    const rootDomain = getRootDomain(hostname)

    // 主站：过滤子应用路由
    if (hostname === rootDomain || hostname === `www.${rootDomain}`) {
      return _routes.filter((r) =>
        MAIN_DOMAIN_EXCLUDE_PREFIXES.every((p) => !r.path.startsWith(p)),
      ) as RouteRecordRaw[]
    }

    // 子域名：动态计算前缀 → 重写路由
    const prefix = getPrefix(subdomain)
    if (prefix) return buildSubdomainRoutes(_routes, prefix)

    // 保留子域名 (如 api)：回退全量路由（中间件层处理重定向）
    return _routes as RouteRecordRaw[]
  },
}
