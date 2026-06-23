/**
 * 内存缓存工具 — 提供 SWR 风格的端点级缓存，用于高频读取、低频变更的数据。
 *
 * 使用场景：
 *   - 营销活动数据（H5 页面高频访问，admin 后台低频变更）
 *   - 支付配置（全站共用，极少变更）
 *
 * 缓存失效：管理后台写操作时调用对应的 invalidate* 函数。
 */

interface CacheEntry<T = any> {
  data: T
  expiresAt: number
}

// ── 营销活动缓存（5min TTL） ──────────────────────────
const CAMPAIGN_CACHE_TTL = 300_000
const campaignCache = new Map<string, CacheEntry>()

export function getCampaignCache(subdomain: string): CacheEntry | null {
  const entry = campaignCache.get(subdomain)
  if (entry && entry.expiresAt > Date.now()) return entry
  if (entry) campaignCache.delete(subdomain) // 过期清理
  return null
}

export function setCampaignCache(subdomain: string, data: any): void {
  campaignCache.set(subdomain, { data, expiresAt: Date.now() + CAMPAIGN_CACHE_TTL })
}

/** 管理后台变更活动时调用，传入 subdomain 精确失效，不传则清空全部 */
export function invalidateCampaignCache(subdomain?: string): void {
  if (subdomain) {
    campaignCache.delete(subdomain)
  } else {
    campaignCache.clear()
  }
}

// ── 支付配置缓存（5min TTL） ──────────────────────────
const PAYMENT_CONFIG_CACHE_TTL = 300_000
let paymentConfigCache: CacheEntry | null = null

export function getPaymentConfigCache(): CacheEntry | null {
  if (paymentConfigCache && paymentConfigCache.expiresAt > Date.now()) return paymentConfigCache
  paymentConfigCache = null
  return null
}

export function setPaymentConfigCache(data: any): void {
  paymentConfigCache = { data, expiresAt: Date.now() + PAYMENT_CONFIG_CACHE_TTL }
}

/** 管理后台变更支付配置时调用 */
export function invalidatePaymentConfigCache(): void {
  paymentConfigCache = null
}

// ── 产品列表缓存（60s TTL，per-tenant） ─────────────────
const PRODUCT_CACHE_TTL = 60_000
const productCache = new Map<string, CacheEntry>()

function productCacheKey(tenantId: string, page: number, pageSize: number): string {
  return `${tenantId}:${page}:${pageSize}`
}

export function getProductCache(tenantId: string, page: number, pageSize: number): CacheEntry | null {
  const key = productCacheKey(tenantId, page, pageSize)
  const entry = productCache.get(key)
  if (entry && entry.expiresAt > Date.now()) return entry
  if (entry) productCache.delete(key)
  return null
}

export function setProductCache(tenantId: string, page: number, pageSize: number, data: any): void {
  const key = productCacheKey(tenantId, page, pageSize)
  productCache.set(key, { data, expiresAt: Date.now() + PRODUCT_CACHE_TTL })
}

/** 管理后台变更产品时调用，按 tenantId 精确失效 */
export function invalidateProductCache(tenantId?: string): void {
  if (!tenantId) { productCache.clear(); return }
  for (const key of productCache.keys()) {
    if (key.startsWith(tenantId + ':')) productCache.delete(key)
  }
}
