import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getCampaignCache,
  setCampaignCache,
  invalidateCampaignCache,
  getPaymentConfigCache,
  setPaymentConfigCache,
  invalidatePaymentConfigCache,
  getProductCache,
  setProductCache,
  invalidateProductCache,
} from '../../../server/utils/cache'

describe('Campaign Cache', () => {
  beforeEach(() => {
    invalidateCampaignCache()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('设置后应能读取缓存', () => {
    const data = { title: '测试活动', subdomain: 'test' }
    setCampaignCache('test', data)

    const cached = getCampaignCache('test')
    expect(cached).not.toBeNull()
    expect(cached!.data).toEqual(data)
  })

  it('不存在的 subdomain 应返回 null', () => {
    const cached = getCampaignCache('nonexistent')
    expect(cached).toBeNull()
  })

  it('过期缓存应返回 null', () => {
    setCampaignCache('test', { title: 'test' })
    // 推进时间超过 5 分钟 TTL
    vi.advanceTimersByTime(301_000)

    const cached = getCampaignCache('test')
    expect(cached).toBeNull()
  })

  it('精确失效应只删除指定 subdomain', () => {
    setCampaignCache('a', { title: 'A' })
    setCampaignCache('b', { title: 'B' })

    invalidateCampaignCache('a')

    expect(getCampaignCache('a')).toBeNull()
    expect(getCampaignCache('b')).not.toBeNull()
  })

  it('全量清空应删除所有缓存', () => {
    setCampaignCache('a', { title: 'A' })
    setCampaignCache('b', { title: 'B' })

    invalidateCampaignCache()

    expect(getCampaignCache('a')).toBeNull()
    expect(getCampaignCache('b')).toBeNull()
  })
})

describe('Payment Config Cache', () => {
  beforeEach(() => {
    invalidatePaymentConfigCache()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('设置后应能读取支付配置', () => {
    const config = { stripe_key: 'sk_test_xxx', currency: 'usd' }
    setPaymentConfigCache(config)

    const cached = getPaymentConfigCache()
    expect(cached).not.toBeNull()
    expect(cached!.data).toEqual(config)
  })

  it('未设置时应返回 null', () => {
    expect(getPaymentConfigCache()).toBeNull()
  })

  it('过期后应返回 null', () => {
    setPaymentConfigCache({ key: 'test' })
    vi.advanceTimersByTime(301_000)

    expect(getPaymentConfigCache()).toBeNull()
  })

  it('失效后应返回 null', () => {
    setPaymentConfigCache({ key: 'test' })
    invalidatePaymentConfigCache()

    expect(getPaymentConfigCache()).toBeNull()
  })
})

describe('Product Cache', () => {
  const tenantId = 'tenant-1'

  beforeEach(() => {
    invalidateProductCache()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('设置后应能读取产品列表', () => {
    const products = [{ id: 1, name: '产品A' }]
    setProductCache(tenantId, 1, 10, products)

    const cached = getProductCache(tenantId, 1, 10)
    expect(cached).not.toBeNull()
    expect(cached!.data).toEqual(products)
  })

  it('不同分页参数应使用不同缓存', () => {
    setProductCache(tenantId, 1, 10, ['page1'])
    setProductCache(tenantId, 2, 10, ['page2'])

    expect(getProductCache(tenantId, 1, 10)!.data).toEqual(['page1'])
    expect(getProductCache(tenantId, 2, 10)!.data).toEqual(['page2'])
  })

  it('过期缓存应返回 null', () => {
    setProductCache(tenantId, 1, 10, ['data'])
    vi.advanceTimersByTime(61_000)

    expect(getProductCache(tenantId, 1, 10)).toBeNull()
  })

  it('按 tenant 失效后应清除该租户所有缓存', () => {
    setProductCache(tenantId, 1, 10, ['page1'])
    setProductCache(tenantId, 2, 10, ['page2'])
    setProductCache('other-tenant', 1, 10, ['other'])

    invalidateProductCache(tenantId)

    expect(getProductCache(tenantId, 1, 10)).toBeNull()
    expect(getProductCache(tenantId, 2, 10)).toBeNull()
    // 其他租户不受影响
    expect(getProductCache('other-tenant', 1, 10)).not.toBeNull()
  })

  it('全量失效应清除所有租户缓存', () => {
    setProductCache('t1', 1, 10, ['a'])
    setProductCache('t2', 2, 10, ['b'])

    invalidateProductCache()

    expect(getProductCache('t1', 1, 10)).toBeNull()
    expect(getProductCache('t2', 2, 10)).toBeNull()
  })
})
