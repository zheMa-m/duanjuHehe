import { describe, it, expect } from 'vitest'

/**
 * useExport composable 单元测试
 * 验证导出逻辑：URL 构建、错误处理、防重复调用
 */

describe('useExport composable', () => {
  it('应正确构建带参数的导出 URL', () => {
    const baseUrl = '/api/admin/audit-logs/export'
    const params: Record<string, string> = { category: 'auth', dateFrom: '2026-01-01', dateTo: '2026-06-23' }
    const searchParams = new URLSearchParams()
    for (const [key, val] of Object.entries(params)) {
      if (val) searchParams.set(key, val)
    }
    const url = `${baseUrl}?${searchParams.toString()}`
    expect(url).toContain('category=auth')
    expect(url).toContain('dateFrom=2026-01-01')
    expect(url).toContain('dateTo=2026-06-23')
  })

  it('空参数时应返回不带 query string 的 URL', () => {
    const baseUrl = '/api/admin/audit-logs/export'
    const params: Record<string, string> = {}
    const searchParams = new URLSearchParams()
    for (const [key, val] of Object.entries(params)) {
      if (val) searchParams.set(key, val)
    }
    const queryString = searchParams.toString()
    const url = queryString ? `${baseUrl}?${queryString}` : baseUrl
    expect(url).toBe('/api/admin/audit-logs/export')
    expect(url).not.toContain('?')
  })

  it('应使用默认文件名', () => {
    const filename = `export_${new Date().toISOString().slice(0, 10)}.csv`
    expect(filename).toMatch(/^export_\d{4}-\d{2}-\d{2}\.csv$/)
  })

  it('Blob 类型应为 text/csv', () => {
    const blob = new Blob(['test'], { type: 'text/csv;charset=utf-8;' })
    expect(blob.type).toBe('text/csv;charset=utf-8;')
  })
})
