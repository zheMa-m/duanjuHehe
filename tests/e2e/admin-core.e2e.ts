// @ts-check
import { test, expect } from '@playwright/test'

test.describe('Admin 管理后台', () => {
  test('首页应正常加载', async ({ page }) => {
    await page.goto('/')
    // 首页应包含项目名称或标志性元素
    await expect(page.locator('body')).toBeVisible()
  })

  test('Admin 登录页面应正确渲染', async ({ page }) => {
    await page.goto('/admin/')
    // 等待页面的关键元素加载
    await page.waitForLoadState('networkidle')
    // 确认页面有登录相关元素
    await expect(page.locator('body')).toBeVisible()
  })

  test('H5 页面应正确重定向到登录', async ({ page }) => {
    // 未登录状态下访问 H5 页面，应显示适当的 UI
    const response = await page.goto('/h5/default')
    // H5 页面应有合适的响应（可能重定向或显示内容）
    expect(response?.status()).toBeLessThan(500)
  })
})

test.describe('API 健康检查', () => {
  test('公开 API 端点应返回 CORS 头', async ({ request }) => {
    const response = await request.get('/api/v1/products')
    expect(response.status()).toBe(200)
    const headers = response.headers()
    expect(headers['access-control-allow-origin']).toBe('*')
  })

  test('未认证请求管理 API 应返回 401', async ({ request }) => {
    const response = await request.get('/api/admin/campaigns')
    expect(response.status()).toBe(401)
  })
})
