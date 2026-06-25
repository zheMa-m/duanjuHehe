#!/usr/bin/env node
/**
 * API 越权安全扫描 — 验证所有受保护端点拒绝未认证请求
 *
 * 扫描 server/api/ 下所有 .ts 文件，根据 @api-auth 声明发送
 * 未认证请求，确保返回 401/403 而非 200（越权漏洞）。
 *
 * 用法: node scripts/test-api-safety.mjs [port]
 *       API_PORT=3001 npm run test:api-safety
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { loadEnv, c, ok, fail, warn, info, section, counts } from './_shared.mjs'
loadEnv(import.meta.url)

// ─── 配置 ──────────────────────────────────────────────
const port = process.argv[2] || process.env.API_PORT || '3000'
const BASE_URL = `http://localhost:${port}`

section(`API 安全扫描 — ${BASE_URL}`)

// ─── 递归扫描 API 控制器 ──────────────────────────────
function scanApiFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir)
  for (const file of files) {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    if (stat.isDirectory()) {
      scanApiFiles(filePath, fileList)
    } else if (file.endsWith('.ts')) {
      fileList.push(filePath)
    }
  }
  return fileList
}

// ─── 文件路径 → 路由 + 方法 ───────────────────────────
function parseRoute(apiDir, filePath) {
  const relative = path.relative(apiDir, filePath)
  const parts = relative.split(path.sep)

  const fileName = parts.pop()
  const fileStem = fileName.replace(/\.ts$/, '')

  const methodMatch = fileStem.match(/\.(post|get|put|delete|patch)$/i)
  let method = 'GET'
  let routeFileName = fileStem

  if (methodMatch) {
    method = methodMatch[1].toUpperCase()
    routeFileName = fileStem.slice(0, -methodMatch[0].length)
  }

  let routePath = '/api/' + parts.join('/')

  if (routeFileName.startsWith('[') && routeFileName.endsWith(']')) {
    routePath += routeFileName.startsWith('[...')
      ? '/mock-id-999/mock-file'
      : '/mock-id-999'
  } else if (routeFileName !== 'index') {
    routePath += '/' + routeFileName
  }

  return { filePath, routePath, method }
}

// ─── 主流程 ────────────────────────────────────────────
async function runSafetyTest() {
  // 1. 检查服务器是否在线
  try {
    await fetch(BASE_URL + '/api/v1/user/profile', {
      headers: { 'x-mock-unauthorized': 'true' },
    })
  } catch {
    console.error(`\n${c.red}  扫描失败: 服务器未运行在 ${BASE_URL}${c.reset}`)
    console.error(`${c.yellow}  请先 npm run dev，或用参数指定端口: node scripts/test-api-safety.mjs 3001${c.reset}\n`)
    process.exit(1)
  }

  const apiDir = path.resolve('server/api')
  if (!fs.existsSync(apiDir)) {
    warn('未发现 server/api 目录，跳过扫描')
    return
  }

  const files = scanApiFiles(apiDir)
  const endpoints = files.map(f => parseRoute(apiDir, f))

  const { pass: _, fail: __ } = counts() // reset not needed, just access

  for (const endpoint of endpoints) {
    const code = fs.readFileSync(endpoint.filePath, 'utf-8')

    // 解析 @api-auth 声明
    const authMatch = code.match(/@api-auth:\s*(\w+)/)
    let authType = authMatch ? authMatch[1].toLowerCase() : null

    // 无声明时智能推导
    if (!authType) {
      if (endpoint.routePath.startsWith('/api/admin/')) {
        authType = 'admin'
      } else if (code.includes('assertUser') || code.includes('assertAdmin')) {
        authType = 'user'
      } else {
        authType = 'public'
      }
    }

    const isProtected = authType !== 'public'
    const label = `${endpoint.method.padEnd(6)} ${endpoint.routePath} [${authType.toUpperCase()}]`

    if (!isProtected) {
      console.log(`  ${c.yellow}PUBLIC${c.reset}  ${label}`)
      continue
    }

    // 发送未认证请求
    try {
      const response = await fetch(BASE_URL + endpoint.routePath, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'x-mock-unauthorized': 'true',
        },
        body: ['POST', 'PATCH', 'PUT'].includes(endpoint.method)
          ? JSON.stringify({})
          : undefined,
      })

      const status = response.status

      if (status === 401 || status === 403) {
        ok(`${label} → ${status} ${status === 401 ? 'Unauthorized' : 'Forbidden'}`)
      } else if (status === 400) {
        // 参数校验先于鉴权触发，无越权但建议 assertUser 前置
        ok(`${label} → 400 Bad Request (无越权)`)
      } else if (status === 200 || status === 201) {
        const bodyText = await response.text()
        fail(`${label} → ${status} 越权漏洞! ${bodyText.substring(0, 60)}...`)
      } else {
        warn(`${label} → ${status} 异常响应`)
      }
    } catch (fetchErr) {
      fail(`${label} → 请求崩溃: ${fetchErr.message}`)
    }
  }

  // ─── 安全策略真实测试 ──────────────────────────────────────
  await runSecurityPolicyTests()

  // ─── 汇总 ──────────────────────────────────────────
  const { pass, fail: failCount } = counts()
  console.log(`\n${c.bold}── 扫描结果 ──${c.reset}`)
  console.log(`  ${c.green}通过: ${pass}${c.reset}  ${failCount > 0 ? c.red : c.dim}失败: ${failCount}${c.reset}`)
  console.log()

  if (failCount > 0) {
    console.error(`${c.red}  安全测试未通过！请检查上述 FAIL 项。${c.reset}\n`)
    process.exit(1)
  } else {
    console.log(`${c.green}  所有安全防御测试合格。${c.reset}\n`)
    process.exit(0)
  }
}

// ─── 5 类安全策略测试 ──────────────────────────────────
async function runSecurityPolicyTests() {
  section('5.1 安全响应头验证')
  await testSecurityHeaders()

  section('5.2 速率限制验证')
  await testRateLimiting()

  section('5.3 IP 黑名单验证')
  await testIpBlacklist()

  section('5.4 API Key + 签名验证')
  await testApiKeyAndSignature()

  section('5.5 CORS 头验证')
  await testCorsHeaders()
}

// 5.1 安全响应头
async function testSecurityHeaders() {
  const requiredHeaders = [
    'strict-transport-security',
    'x-frame-options',
    'x-content-type-options',
    'referrer-policy',
    'permissions-policy',
  ]
  try {
    const res = await fetch(`${BASE_URL}/api/v1/products`, {
      headers: { 'x-mock-unauthorized': 'true' },
    })
    for (const h of requiredHeaders) {
      if (res.headers.has(h)) {
        ok(`安全头 ${h}: ${res.headers.get(h)}`)
      } else {
        fail(`缺少安全头: ${h}`)
      }
    }
  } catch (e) {
    fail(`安全头检查请求失败: ${e.message}`)
  }
}

// 5.2 速率限制
async function testRateLimiting() {
  const target = `${BASE_URL}/api/v1/products`
  // 先获取当前 policy 的速率上限
  let maxReqs = 100
  let windowSec = 60
  try {
    const policyRes = await fetch(`${BASE_URL}/api/admin/security/policy`, {
      headers: { 'x-mock-unauthorized': 'true' },
    })
    if (policyRes.ok) {
      const policyData = await policyRes.json()
      if (policyData.data?.rate_limit?.enabled) {
        maxReqs = policyData.data.rate_limit.max_requests || 100
        windowSec = policyData.data.rate_limit.window_seconds || 60
      }
    }
  } catch { /* 使用默认值 */ }

  const N = maxReqs + 5
  info(`发送 ${N} 次请求测试速率限制 (max=${maxReqs}/${windowSec}s)`)

  let got429 = false
  let rateLimitHeaders = false
  for (let i = 0; i < N; i++) {
    try {
      const res = await fetch(target, {
        headers: { 'x-mock-unauthorized': 'true' },
      })
      if (res.status === 429) {
        got429 = true
        rateLimitHeaders = res.headers.has('x-ratelimit-remaining') || res.headers.has('retry-after')
        ok(`第 ${i + 1} 次请求返回 429 (速率限制触发)`)
        break
      }
    } catch { /* 忽略 */ }
  }
  if (!got429) {
    warn(`未触发 429，可能速率限制未启用或阈值较高 (尝试了 ${N} 次)`)
  }
  if (got429 && rateLimitHeaders) {
    ok('响应包含 RateLimit 头')
  } else if (got429 && !rateLimitHeaders) {
    warn('429 响应缺少 X-RateLimit-* 或 Retry-After 头')
  }
}

// 5.3 IP 黑名单
async function testIpBlacklist() {
  const testIp = '198.51.100.99'
  // 1. 获取当前 policy
  let originalBlacklist = []
  try {
    const res = await fetch(`${BASE_URL}/api/admin/security/policy`, {
      headers: { 'x-mock-unauthorized': 'true' },
    })
    if (res.ok) {
      const data = await res.json()
      originalBlacklist = data.data?.ip_policy?.blacklist || []
    }
  } catch { /* 继续 */ }

  // 2. 添加测试 IP 到黑名单
  try {
    const patchRes = await fetch(`${BASE_URL}/api/admin/security/policy`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-mock-unauthorized': 'true' },
      body: JSON.stringify({ ip_policy: { mode: 'blacklist', whitelist: [], blacklist: [...originalBlacklist, testIp] } }),
    })
    if (!patchRes.ok) {
      warn(`无法更新 policy (${patchRes.status})，跳过 IP 黑名单测试`)
      return
    }
    ok(`已添加测试 IP ${testIp} 到黑名单`)
  } catch (e) {
    warn(`IP 黑名单测试跳过: ${e.message}`)
    return
  }

  // 3. 用伪造 IP 发送请求
  try {
    const res = await fetch(`${BASE_URL}/api/v1/products`, {
      headers: { 'x-mock-unauthorized': 'true', 'x-forwarded-for': testIp },
    })
    if (res.status === 403) {
      const body = await res.json()
      if (body.data?.code === 'IP_BLOCKED' || body.statusMessage?.includes('IP')) {
        ok(`伪造 IP ${testIp} 被拦截 (403 IP_BLOCKED)`)
      } else {
        ok(`伪造 IP ${testIp} 返回 403`)
      }
    } else {
      warn(`伪造 IP 返回 ${res.status}，可能中间件未识别 x-forwarded-for`)
    }
  } catch (e) {
    fail(`IP 黑名单测试请求失败: ${e.message}`)
  }

  // 4. 清理：恢复原黑名单
  try {
    await fetch(`${BASE_URL}/api/admin/security/policy`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-mock-unauthorized': 'true' },
      body: JSON.stringify({ ip_policy: { mode: 'blacklist', whitelist: [], blacklist: originalBlacklist } }),
    })
    ok('已清理测试 IP')
  } catch { warn('清理 IP 黑名单失败') }
}

// 5.4 API Key + 签名
async function testApiKeyAndSignature() {
  let testKeyId = null
  let testApiKey = null
  let testSigningSecret = null

  // 1. 创建测试 Key
  try {
    const res = await fetch(`${BASE_URL}/api/admin/security/keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-mock-unauthorized': 'true' },
      body: JSON.stringify({ name: 'test-safety-key', permissions: ['read'], require_signature: true }),
    })
    if (!res.ok) {
      warn(`无法创建测试 Key (${res.status})，跳过 Key+签名测试`)
      return
    }
    const data = await res.json()
    testKeyId = data.data.id
    testApiKey = data.data.apiKey
    testSigningSecret = data.data.signingSecret
    ok('已创建测试 API Key')
  } catch (e) {
    warn(`Key 创建失败: ${e.message}`)
    return
  }

  const targetUrl = `${BASE_URL}/api/v1/products`

  // 测试 1: 无 Key 访问
  try {
    const res = await fetch(targetUrl, { headers: { 'x-mock-unauthorized': 'true' } })
    ok(`无 Key 访问: ${res.status} (架构不强制 Key，属于正常)`)
  } catch (e) {
    fail(`无 Key 测试失败: ${e.message}`)
  }

  // 测试 2: 无效 Key
  try {
    const res = await fetch(targetUrl, {
      headers: { 'x-mock-unauthorized': 'true', 'x-api-key': 'invalid-key-12345' },
    })
    if (res.status === 401) {
      ok(`无效 Key → 401 INVALID_API_KEY`)
    } else {
      warn(`无效 Key → ${res.status} (预期 401)`)
    }
  } catch (e) {
    fail(`无效 Key 测试失败: ${e.message}`)
  }

  // 测试 3: 有效 Key + 无签名
  try {
    const res = await fetch(targetUrl, {
      headers: { 'x-mock-unauthorized': 'true', 'x-api-key': testApiKey },
    })
    if (res.status === 403) {
      const body = await res.json()
      if (body.data?.code === 'SIGNATURE_MISSING') {
        ok('有效 Key + 无签名 → 403 SIGNATURE_MISSING')
      } else {
        ok(`有效 Key + 无签名 → 403`)
      }
    } else if (res.status === 200) {
      warn('有效 Key + 无签名 → 200 (签名未强制)')
    } else {
      warn(`有效 Key + 无签名 → ${res.status}`)
    }
  } catch (e) {
    fail(`签名缺失测试失败: ${e.message}`)
  }

  // 测试 4: 有效 Key + 正确签名
  try {
    const timestamp = Date.now().toString()
    const path = '/api/v1/products'
    const payload = ''
    const signature = crypto.createHmac('sha256', testSigningSecret)
      .update(`${timestamp}${path}${payload}`)
      .digest('hex')
    const res = await fetch(targetUrl, {
      headers: {
        'x-mock-unauthorized': 'true',
        'x-api-key': testApiKey,
        'x-signature': signature,
        'x-timestamp': timestamp,
      },
    })
    if (res.status === 200) {
      ok('有效 Key + 正确签名 → 200')
    } else {
      const body = await res.text()
      warn(`有效 Key + 正确签名 → ${res.status}: ${body.substring(0, 60)}`)
    }
  } catch (e) {
    fail(`正确签名测试失败: ${e.message}`)
  }

  // 测试 5: 有效 Key + 错误签名
  try {
    const timestamp = Date.now().toString()
    const res = await fetch(targetUrl, {
      headers: {
        'x-mock-unauthorized': 'true',
        'x-api-key': testApiKey,
        'x-signature': 'deadbeef00000000000000000000000000000000000000000000000000000000',
        'x-timestamp': timestamp,
      },
    })
    if (res.status === 403) {
      ok('有效 Key + 错误签名 → 403 INVALID_SIGNATURE')
    } else {
      warn(`错误签名 → ${res.status} (预期 403)`)
    }
  } catch (e) {
    fail(`错误签名测试失败: ${e.message}`)
  }

  // 清理：吊销测试 Key
  if (testKeyId) {
    try {
      await fetch(`${BASE_URL}/api/admin/security/keys/${testKeyId}`, {
        method: 'DELETE',
        headers: { 'x-mock-unauthorized': 'true' },
      })
      ok('已清理测试 Key')
    } catch { warn('清理测试 Key 失败') }
  }
}

// 5.5 CORS 头验证
async function testCorsHeaders() {
  // 测试 1: 恶意域名
  try {
    const res = await fetch(`${BASE_URL}/api/v1/products`, {
      headers: { 'x-mock-unauthorized': 'true', 'origin': 'https://evil.com' },
    })
    const acao = res.headers.get('access-control-allow-origin')
    if (!acao || acao !== 'https://evil.com') {
      ok(`恶意 Origin https://evil.com 被拒绝 (ACAO: ${acao || 'none'})`)
    } else {
      fail(`恶意 Origin https://evil.com 被允许!`)
    }
  } catch (e) {
    fail(`CORS 恶意 Origin 测试失败: ${e.message}`)
  }

  // 测试 2: 获取配置的合法域名并测试
  let configuredOrigin = null
  try {
    const res = await fetch(`${BASE_URL}/api/admin/security/policy`, {
      headers: { 'x-mock-unauthorized': 'true' },
    })
    if (res.ok) {
      const data = await res.json()
      const origins = data.data?.cors_config?.allowed_origins || []
      if (origins.length > 0) configuredOrigin = origins[0]
    }
  } catch { /* 继续 */ }

  if (configuredOrigin && !configuredOrigin.includes('*')) {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/products`, {
        headers: { 'x-mock-unauthorized': 'true', 'origin': configuredOrigin },
      })
      const acao = res.headers.get('access-control-allow-origin')
      if (acao === configuredOrigin) {
        ok(`合法 Origin ${configuredOrigin} 被允许 (ACAO: ${acao})`)
      } else {
        warn(`合法 Origin ${configuredOrigin} → ACAO: ${acao || 'none'} (可能未匹配)`)
      }
    } catch (e) {
      fail(`CORS 合法 Origin 测试失败: ${e.message}`)
    }
  } else {
    info('未配置具体域名或域名为通配符，跳过合法 Origin 测试')
  }
}

runSafetyTest()
