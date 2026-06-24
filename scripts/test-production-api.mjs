#!/usr/bin/env node
/**
 * 生产环境 REST API 开放测试
 *
 * 对 api.aihomeworkscan.com 执行一轮无认证的综合冒烟测试：
 *   1. 公开 GET 端点 — 验证 200 + 响应结构
 *   2. 鉴权防护 — 受保护端点必须返回 401/403（无越权）
 *   3. Auth 端点 — 输入校验与匿名行为
 *   4. 子域名路由 — api 子域名非 API 路径 301 → www
 *   5. OpenAPI 文档 — /_openapi.json /_scalar /_swagger 可访问
 *   6. Starpath 端点 — 输入校验
 *   7. 健康检查 — 数据库/存储/内存状态
 *   8. CORS 跨域配置
 *
 * 用法: node scripts/test-production-api.mjs
 *       BASE_URL=https://api.example.com node scripts/test-production-api.mjs
 */

import { c, ok, fail, warn, info, section, counts } from './_shared.mjs'

// ─── 配置 ──────────────────────────────────────────────
const BASE_URL = process.env.BASE_URL || 'https://api.aihomeworkscan.com'
const WWW_URL = BASE_URL.replace('://api.', '://www.')
const SLOW_THRESHOLD_MS = 3000
const TIMEOUT_MS = 15000

// ─── HTTP 请求封装 ─────────────────────────────────────
async function req(method, path, { body, headers = {}, expectRedirect = false, baseUrl = BASE_URL } = {}) {
  const url = baseUrl + path
  const start = Date.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body ? JSON.stringify(body) : undefined,
      redirect: expectRedirect ? 'manual' : 'follow',
      signal: controller.signal,
    })
    const elapsed = Date.now() - start
    clearTimeout(timer)

    let responseBody = null
    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      responseBody = await response.json()
    } else {
      responseBody = await response.text()
    }

    return { status: response.status, ok: response.ok, elapsed, body: responseBody, headers: response.headers, url }
  } catch (err) {
    clearTimeout(timer)
    const elapsed = Date.now() - start
    return { status: 0, ok: false, elapsed, error: err.message, url }
  }
}

// ─── 断言辅助 ──────────────────────────────────────────
function assertStatus(result, expected, label) {
  if (result.status === expected) {
    const slow = result.elapsed > SLOW_THRESHOLD_MS
    ok(`${label} → ${result.status} (${result.elapsed}ms)${slow ? ' ⚠ 慢' : ''}`)
    return true
  }
  fail(`${label} → 期望 ${expected}，实际 ${result.status} (${result.elapsed}ms)`)
  return false
}

function assertRange(result, min, max, label) {
  if (result.status >= min && result.status <= max) {
    const slow = result.elapsed > SLOW_THRESHOLD_MS
    ok(`${label} → ${result.status} (${result.elapsed}ms)${slow ? ' ⚠ 慢' : ''}`)
    return true
  }
  fail(`${label} → 期望 ${min}-${max}，实际 ${result.status} (${result.elapsed}ms)`)
  return false
}

function assertJsonField(obj, field, label) {
  if (obj && typeof obj === 'object' && field in obj) {
    ok(`${label} — 响应包含 "${field}"`)
    return true
  }
  fail(`${label} — 响应缺少 "${field}" 字段: ${JSON.stringify(obj).substring(0, 80)}`)
  return false
}

// ─── 主流程 ────────────────────────────────────────────
async function main() {
  section(`生产环境 API 开放测试 — ${BASE_URL}`)
  info(`慢端点阈值: ${SLOW_THRESHOLD_MS}ms | 超时: ${TIMEOUT_MS}ms`)
  console.log()

  // ═══════════════════════════════════════════════════════
  // 1. 公开 GET 端点（期望 200）
  // ═══════════════════════════════════════════════════════
  section('1. 公开 GET 端点 — 响应正常性')

  // 1.1 构建版本 — sendSuccess 包裹在 data.buildId
  let r = await req('GET', '/api/v1/meta/build')
  assertStatus(r, 200, 'GET  /api/v1/meta/build')
  if (r.status === 200) {
    assertJsonField(r.body, 'data', '    response.data')
    if (r.body?.data) assertJsonField(r.body.data, 'buildId', '    data.buildId')
  }

  // 1.2 埋点配置
  r = await req('GET', '/api/v1/analytics/config')
  assertStatus(r, 200, 'GET  /api/v1/analytics/config')

  // 1.3 用户评价列表 (PUBLIC_PREFIXES 包含 /api/v1/feedback/)
  r = await req('GET', '/api/v1/feedback')
  assertRange(r, 200, 404, 'GET  /api/v1/feedback')

  // 1.4 营销活动（按子域名查询，PUBLIC_PREFIXES 包含 /api/v1/campaigns/）
  r = await req('GET', '/api/v1/campaigns/starpath')
  assertRange(r, 200, 404, 'GET  /api/v1/campaigns/starpath')

  // 1.5 OpenAPI 元数据
  r = await req('GET', '/api/v1/_openapi-meta')
  assertStatus(r, 200, 'GET  /api/v1/_openapi-meta')

  console.log()

  // ═══════════════════════════════════════════════════════
  // 2. 鉴权防护 — 受保护端点拒绝匿名访问
  //    04.auth-guard.ts AUTH_REQUIRED_PREFIXES:
  //    /api/v1/payments/ /api/v1/orders/ /api/v1/auth/profile
  //    /api/v1/auth/me /api/v1/auth/link /api/v1/auth/logout /api/v1/storage/
  // ═══════════════════════════════════════════════════════
  section('2. 鉴权防护 — 未认证请求被拒（401/403）')

  const protectedEndpoints = [
    { method: 'GET',  path: '/api/v1/user/profile' },
    { method: 'GET',  path: '/api/v1/orders' },
    { method: 'GET',  path: '/api/v1/products' },
    { method: 'POST', path: '/api/v1/products', body: { name: 'test', price: 9.99 } },
    { method: 'POST', path: '/api/v1/feedback', body: { content: 'test' } },
    // payments/ 前缀全部需要认证（含 config/confirm/webhook）
    { method: 'GET',  path: '/api/v1/payments/config' },
    { method: 'GET',  path: '/api/v1/payments/confirm' },
    { method: 'GET',  path: '/api/v1/payments/non-existent-id' },
    { method: 'POST', path: '/api/v1/payments/create', body: { product_id: 'test' } },
    { method: 'POST', path: '/api/v1/payments/webhook', body: {} },
    { method: 'POST', path: '/api/v1/storage/upload', body: {} },
    { method: 'POST', path: '/api/v1/storage/signed-url', body: { filename: 'test.jpg' } },
    // auth 需认证端点
    { method: 'GET',  path: '/api/v1/auth/me' },
    { method: 'POST', path: '/api/v1/auth/logout' },
    { method: 'PATCH',path: '/api/v1/auth/profile', body: {} },
  ]

  for (const ep of protectedEndpoints) {
    r = await req(ep.method, ep.path, { body: ep.body })
    const label = `${ep.method.padEnd(6)} ${ep.path}`
    if (r.status === 401 || r.status === 403) {
      ok(`${label} → ${r.status} ✓ 已拦截`)
    } else if (r.status === 400) {
      warn(`${label} → 400 参数校验先于鉴权（可接受）`)
    } else if (r.status === 200 || r.status === 201) {
      fail(`${label} → ${r.status} 越权漏洞! ${JSON.stringify(r.body).substring(0, 60)}`)
    } else {
      warn(`${label} → ${r.status} 非预期状态码`)
    }
  }

  console.log()

  // ═══════════════════════════════════════════════════════
  // 3. Auth 公开端点 — 输入校验
  //    PUBLIC_PREFIXES: /api/v1/auth/login /api/v1/auth/register /api/v1/auth/callback
  // ═══════════════════════════════════════════════════════
  section('3. Auth 公开端点 — 输入校验')

  // 3.1 登录 — 无效入参应 400
  r = await req('POST', '/api/v1/auth/login', { body: {} })
  assertStatus(r, 400, 'POST /api/v1/auth/login (空入参 → 400)')

  // 3.2 登录 — 无效凭据应 401
  r = await req('POST', '/api/v1/auth/login', {
    body: { email: 'test-noexist@example.com', password: 'wrong-pass-123' },
  })
  assertRange(r, 400, 401, 'POST /api/v1/auth/login (无效凭据 → 401)')

  // 3.3 注册 — 无效入参应 400
  r = await req('POST', '/api/v1/auth/register', { body: {} })
  assertStatus(r, 400, 'POST /api/v1/auth/register (空入参 → 400)')

  console.log()

  // ═══════════════════════════════════════════════════════
  // 4. 子域名路由 — api 子域名行为验证
  //    /api/ 前缀路径在 SKIP_PREFIXES 中，中间件跳过 → 直接处理（不 301）
  //    非 /api/ 路径 → 301 重定向到 www
  // ═══════════════════════════════════════════════════════
  section('4. 子域名路由 — 301 重定向（非 API 路径）')

  const redirectCases = [
    { path: '/',                     desc: '根路径' },
    { path: '/admin',                desc: 'admin 路径' },
    { path: '/h5/starpath/welcome',  desc: 'H5 营销页' },
    { path: '/architecture',         desc: '主站页面' },
  ]

  for (const tc of redirectCases) {
    r = await req('GET', tc.path, { expectRedirect: true })
    const label = `GET  ${tc.path.padEnd(30)} (${tc.desc})`
    if (r.status === 301) {
      const location = r.headers?.get('location') || ''
      if (location.includes('www.')) {
        ok(`${label} → 301 → www`)
      } else {
        warn(`${label} → 301 但目标异常: ${location}`)
      }
    } else {
      fail(`${label} → 期望 301，实际 ${r.status}`)
    }
  }

  console.log()

  // ═══════════════════════════════════════════════════════
  // 4b. API 路径在 api 子域名直接可访问（不重定向）
  // ═══════════════════════════════════════════════════════
  section('4b. API 路径在 api 子域名直接可访问（不 301）')

  const directApiCases = [
    { path: '/api/health',                          expected: 200,  desc: '健康检查' },
    { path: '/api/v1/meta/build',                   expected: 200,  desc: '构建版本' },
    { path: '/api/starpath/report?id=invalid-test', expected: 404,  desc: 'starpath 报告' },
  ]

  for (const tc of directApiCases) {
    r = await req('GET', tc.path, { expectRedirect: true })
    const label = `GET  ${tc.path.padEnd(40)} (${tc.desc})`
    if (r.status === tc.expected) {
      ok(`${label} → ${r.status} (未重定向)`)
    } else if (r.status === 301) {
      fail(`${label} → 不应重定向，但返回 301`)
    } else {
      warn(`${label} → ${r.status} (期望 ${tc.expected})`)
    }
  }

  console.log()

  // ═══════════════════════════════════════════════════════
  // 5. OpenAPI 文档 — 在 www 域名可访问
  // ═══════════════════════════════════════════════════════
  section('5. OpenAPI 文档可访问性 (www 域名)')

  r = await req('GET', '/_openapi.json', { baseUrl: WWW_URL })
  assertStatus(r, 200, 'GET  /_openapi.json (www)')
  if (r.status === 200 && r.body) {
    const pathCount = r.body.paths ? Object.keys(r.body.paths).length : 0
    info(`    OpenAPI 路径数: ${pathCount}`)
    if (pathCount > 0) ok(`    OpenAPI spec 包含 ${pathCount} 个路径`)
    else fail('    OpenAPI spec 路径为空')
  }

  r = await req('GET', '/_scalar', { baseUrl: WWW_URL })
  assertStatus(r, 200, 'GET  /_scalar (www)')

  r = await req('GET', '/_swagger', { baseUrl: WWW_URL })
  assertStatus(r, 200, 'GET  /_swagger (www)')

  console.log()

  // ═══════════════════════════════════════════════════════
  // 6. Starpath 端点 — 公开但需正确入参
  // ═══════════════════════════════════════════════════════
  section('6. Starpath 端点 — 输入校验')

  // 6.1 获取报告 — 不存在的 ID 应 404
  r = await req('GET', '/api/starpath/report?id=non-existent-id-12345')
  assertRange(r, 400, 404, 'GET  /api/starpath/report (无效 ID)')

  // 6.2 提交问卷 — 空入参应 400
  r = await req('POST', '/api/starpath/questionnaire/answer', { body: {} })
  assertStatus(r, 400, 'POST /api/starpath/questionnaire/answer (空入参 → 400)')

  // 6.3 提交邮箱 — 空入参应 400
  r = await req('POST', '/api/starpath/email/submit', { body: {} })
  assertStatus(r, 400, 'POST /api/starpath/email/submit (空入参 → 400)')

  // 6.4 创建订阅 — 无效入参应 400
  r = await req('POST', '/api/starpath/subscribe/ios', { body: {} })
  assertStatus(r, 400, 'POST /api/starpath/subscribe/ios (空入参 → 400)')

  // 6.5 支付确认 — 无效入参应 400
  r = await req('POST', '/api/starpath/payment/card', { body: {} })
  assertStatus(r, 400, 'POST /api/starpath/payment/card (空入参 → 400)')

  console.log()

  // ═══════════════════════════════════════════════════════
  // 7. 健康检查 — 综合状态
  // ═══════════════════════════════════════════════════════
  section('7. 健康检查端点')

  r = await req('GET', '/api/health')
  assertStatus(r, 200, 'GET  /api/health')
  if (r.status === 200 && r.body) {
    assertJsonField(r.body, 'status', '    health.status')
    assertJsonField(r.body, 'checks', '    health.checks')
    if (r.body.status) {
      const statusColor = r.body.status === 'ok' ? c.green : r.body.status === 'degraded' ? c.yellow : c.red
      info(`    综合状态: ${statusColor}${r.body.status}${c.reset}`)
      if (r.body.checks?.database) {
        info(`    数据库: ${r.body.checks.database.status} (${r.body.checks.database.latency_ms}ms)`)
      }
      if (r.body.checks?.storage) {
        info(`    存储: ${r.body.checks.storage.status} — ${r.body.checks.storage.message || ''}`)
      }
      if (r.body.checks?.memory) {
        info(`    内存: ${r.body.checks.memory.used_gb}GB / ${r.body.checks.memory.total_gb}GB (${r.body.checks.memory.percent}%)`)
      }
    }
  }

  console.log()

  // ═══════════════════════════════════════════════════════
  // 8. CORS 跨域配置
  // ═══════════════════════════════════════════════════════
  section('8. CORS 跨域配置')

  r = await req('GET', '/api/v1/meta/build', {
    headers: { Origin: 'https://starpath.aihomeworkscan.com' },
  })
  const corsHeader = r.headers?.get('access-control-allow-origin')
  if (corsHeader) {
    ok(`CORS Allow-Origin: ${corsHeader}`)
  } else {
    warn('CORS Allow-Origin 头缺失（可能依赖 Vercel 层配置）')
  }

  // OPTIONS 预检
  r = await req('OPTIONS', '/api/v1/meta/build', {
    headers: {
      Origin: 'https://starpath.aihomeworkscan.com',
      'Access-Control-Request-Method': 'GET',
    },
  })
  if (r.status === 204 || r.status === 200) {
    ok(`OPTIONS 预检 → ${r.status}`)
  } else {
    warn(`OPTIONS 预检 → ${r.status}（非标准但可能正常）`)
  }

  // 缓存头验证
  r = await req('GET', '/api/v1/meta/build')
  const cacheControl = r.headers?.get('cache-control') || ''
  if (cacheControl.includes('no-store') || cacheControl.includes('no-cache')) {
    ok(`Cache-Control: ${cacheControl}`)
  } else {
    warn(`Cache-Control 异常: "${cacheControl}" (期望 no-store)`)
  }

  console.log()

  // ═══════════════════════════════════════════════════════
  // 汇总
  // ═══════════════════════════════════════════════════════
  section('测试汇总')
  const { pass: passCount, fail: failCount } = counts()
  const total = passCount + failCount
  const passRate = total > 0 ? Math.round((passCount / total) * 100) : 0

  console.log(`  ${c.green}通过: ${passCount}${c.reset}  ${failCount > 0 ? c.red : c.dim}失败: ${failCount}${c.reset}  ${c.dim}总计: ${total}${c.reset}`)
  console.log(`  通过率: ${passRate >= 95 ? c.green : passRate >= 80 ? c.yellow : c.red}${passRate}%${c.reset}`)
  console.log()

  if (failCount > 0) {
    console.error(`${c.red}  ⚠ 存在 ${failCount} 项失败，请检查上述 FAIL 项。${c.reset}\n`)
    process.exit(1)
  } else {
    console.log(`${c.green}  ✓ 所有测试项通过，生产 API 功能正常。${c.reset}\n`)
    process.exit(0)
  }
}

main().catch((err) => {
  console.error(`\n${c.red}测试执行异常: ${err.message}${c.reset}\n`)
  process.exit(1)
})
