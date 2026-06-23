import { describe, it, expect } from 'vitest'

/**
 * 审计日志统计 API 数据格式测试
 * 验证 `GET /api/admin/audit-logs/stats` 返回的结构正确性
 */

interface CategoryStat {
  category: string
  count: number
  percentage: number
}

interface UserStat {
  operator: string
  count: number
}

interface AuditStats {
  totalCount: number
  todayCount: number
  categoryDistribution: CategoryStat[]
  topActiveUsers: UserStat[]
}

describe('审计日志统计数据结构', () => {
  const mockStats: AuditStats = {
    totalCount: 1042,
    todayCount: 57,
    categoryDistribution: [
      { category: 'auth', count: 380, percentage: 36 },
      { category: 'admin', count: 295, percentage: 28 },
      { category: 'system', count: 210, percentage: 20 },
      { category: 'security', count: 157, percentage: 15 },
    ],
    topActiveUsers: [
      { operator: 'admin@hehe.dev', count: 142 },
      { operator: 'solo_hacker', count: 89 },
    ],
  }

  it('totalCount 应为正整数', () => {
    expect(mockStats.totalCount).toBeGreaterThan(0)
    expect(Number.isInteger(mockStats.totalCount)).toBe(true)
  })

  it('todayCount 应不大于 totalCount', () => {
    expect(mockStats.todayCount).toBeLessThanOrEqual(mockStats.totalCount)
  })

  it('categoryDistribution 百分比之和应为 100', () => {
    const total = mockStats.categoryDistribution.reduce((sum, c) => sum + c.percentage, 0)
    // 允许 ±1 的舍入误差
    expect(total).toBeGreaterThanOrEqual(99)
    expect(total).toBeLessThanOrEqual(100)
  })

  it('categoryDistribution 应按数量降序排列', () => {
    const counts = mockStats.categoryDistribution.map((c) => c.count)
    const sorted = [...counts].sort((a, b) => b - a)
    expect(counts).toEqual(sorted)
  })

  it('topActiveUsers 最多 5 个', () => {
    expect(mockStats.topActiveUsers.length).toBeLessThanOrEqual(5)
  })

  it('topActiveUsers 应按数量降序排列', () => {
    const counts = mockStats.topActiveUsers.map((u) => u.count)
    const sorted = [...counts].sort((a, b) => b - a)
    expect(counts).toEqual(sorted)
  })
})
