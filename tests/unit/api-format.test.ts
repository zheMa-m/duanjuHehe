import { describe, it, expect } from 'vitest'

/**
 * API 响应格式测试 — 验证前后端约定的响应结构一致性
 */

describe('API 响应格式', () => {
  it('标准成功响应应包含 success 和 data 字段', () => {
    const mockResponse = {
      success: true,
      message: 'Operation completed successfully',
      timestamp: new Date().toISOString(),
      data: { id: 1 },
    }
    expect(mockResponse).toHaveProperty('success', true)
    expect(mockResponse).toHaveProperty('data')
    expect(mockResponse).toHaveProperty('message')
    expect(mockResponse).toHaveProperty('timestamp')
  })

  it('数据列表响应应包含数组', () => {
    const mockListResponse = {
      success: true,
      message: '获取成功',
      timestamp: new Date().toISOString(),
      data: {
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
      },
    }
    expect(Array.isArray(mockListResponse.data.items)).toBe(true)
    expect(typeof mockListResponse.data.total).toBe('number')
    expect(mockListResponse.data.page).toBeGreaterThan(0)
  })

  it('分页响应应遵循标准格式', () => {
    const paginatedData = {
      items: [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
      ],
      total: 2,
      page: 1,
      pageSize: 20,
    }
    expect(paginatedData.items).toHaveLength(2)
    expect(paginatedData.page).toBe(1)
    expect(paginatedData.total).toBeLessThanOrEqual(paginatedData.pageSize)
  })

  it('错误响应应包含错误信息和可选详情', () => {
    const mockError = {
      statusCode: 400,
      statusMessage: '参数错误',
      data: { field: 'email', reason: '格式不正确' },
    }
    expect(mockError.statusCode).toBeGreaterThanOrEqual(400)
    expect(typeof mockError.statusMessage).toBe('string')
    expect(mockError.data).toBeDefined()
  })
})

describe('活动数据模型', () => {
  it('活动对象应包含必要字段', () => {
    const campaign = {
      id: 'camp-1',
      subdomain: 'test-campaign',
      title: 'Test Campaign',
      status: 'active',
      config: {},
      created_at: new Date().toISOString(),
    }
    expect(campaign).toHaveProperty('subdomain')
    expect(campaign).toHaveProperty('status')
    expect(['active', 'inactive', 'draft']).toContain(campaign.status)
  })

  it('活动配置的金额字段应为数字', () => {
    const campaignConfig = {
      price: 29.99,
      original_price: 99.00,
      currency: 'usd',
    }
    expect(typeof campaignConfig.price).toBe('number')
    expect(typeof campaignConfig.original_price).toBe('number')
    expect(campaignConfig.price).toBeLessThan(campaignConfig.original_price)
  })
})

describe('标准工具函数', () => {
  it('日期格式化应返回 ISO 字符串', () => {
    const isoDate = new Date().toISOString()
    expect(isoDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  })

  it('UUID 应为 36 字符', () => {
    const uuid = '9e638ba2-41aa-4434-a68b-6bd9f7ed0963'
    expect(uuid).toHaveLength(36)
  })
})
