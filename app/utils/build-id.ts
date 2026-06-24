/**
 * 构建版本 ID — 每次 Vercel 部署唯一，用于 HTML 缓存失效与客户端热更新检测。
 *
 * 优先级：VERCEL_DEPLOYMENT_ID > VERCEL_GIT_COMMIT_SHA > 本地 dev 标识
 */
export function resolveBuildId(): string {
  return process.env.VERCEL_DEPLOYMENT_ID
    || process.env.VERCEL_GIT_COMMIT_SHA
    || `dev-${process.env.NODE_ENV || 'development'}`
}

/** 浏览器侧 HTML：禁止本地磁盘缓存，每次须向源站验证 */
export const BROWSER_HTML_CACHE = 'private, no-cache, must-revalidate'

/** H5 页面 CDN ISR */
export const CDN_HTML_CACHE_H5 = 'public, s-maxage=600, stale-while-revalidate=600'

/** 主站营销页 CDN ISR */
export const CDN_HTML_CACHE_SITE = 'public, s-maxage=3600, stale-while-revalidate=86400'
