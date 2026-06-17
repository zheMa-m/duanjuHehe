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
import { loadEnv, c, ok, fail, warn, section, counts } from './_shared.mjs'
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

  // ─── 汇总 ──────────────────────────────────────────
  const { pass, fail: failCount } = counts()
  console.log(`\n${c.bold}── 扫描结果 ──${c.reset}`)
  console.log(`  ${c.green}通过: ${pass}${c.reset}  ${failCount > 0 ? c.red : c.dim}失败: ${failCount}${c.reset}`)
  console.log()

  if (failCount > 0) {
    console.error(`${c.red}  越权防护测试未通过！请检查上述 FAIL 项。${c.reset}\n`)
    process.exit(1)
  } else {
    console.log(`${c.green}  所有受保护 API 安全防御合格。${c.reset}\n`)
    process.exit(0)
  }
}

runSafetyTest()
