#!/usr/bin/env node
/**
 * HMAC-SHA256 请求签名验证测试
 *
 * 用法:
 *   node scripts/test-signature.mjs [port]
 *
 * 测试内容：
 *   1. 离线签名算法验证（纯本地计算，确认 HMAC 实现正确）
 *   2. 在线端点测试（需要运行中的服务器 + 有效的 API Key）
 *
 * 在线测试需要环境变量：
 *   TEST_API_KEY       — 创建好的 API Key（ak_live_...）
 *   TEST_SIGNING_SECRET — 对应的签名密钥（sk_live_...）
 */

import crypto from 'crypto'
import { loadEnv, c, ok, fail, info, section, counts } from './_shared.mjs'
loadEnv(import.meta.url)

const port = process.argv[2] || process.env.API_PORT || '3000'
const BASE_URL = `http://localhost:${port}`

// ─── 签名计算（与服务端 verifyRequestSignature 完全一致）───────
function computeSignature(method, path, timestamp, body, signingSecret) {
  const bodyHash = crypto.createHash('sha256').update(body || '').digest('hex')
  const stringToSign = `${method}\n${path}\n${timestamp}\n${bodyHash}`
  return crypto.createHmac('sha256', signingSecret).update(stringToSign).digest('hex')
}

// ─── 测试 1：离线签名算法正确性 ──────────────────────────────
section('离线签名算法验证')

const TEST_SECRET = 'sk_live_test_secret_for_unit_testing_only'
const TEST_METHOD = 'POST'
const TEST_PATH = '/api/v1/products'
const TEST_BODY = '{"name":"test product","price":9.99}'
const TEST_TIMESTAMP = String(Math.floor(Date.now() / 1000))

const sig1 = computeSignature(TEST_METHOD, TEST_PATH, TEST_TIMESTAMP, TEST_BODY, TEST_SECRET)
const sig2 = computeSignature(TEST_METHOD, TEST_PATH, TEST_TIMESTAMP, TEST_BODY, TEST_SECRET)

// 确定性：相同输入产生相同签名
if (sig1 === sig2) {
  ok('签名确定性：相同输入 → 相同签名')
} else {
  fail('签名确定性失败！')
}

// 格式：64 字符 hex
if (/^[a-f0-9]{64}$/.test(sig1)) {
  ok(`签名格式正确：${sig1.substring(0, 16)}...（64 hex chars）`)
} else {
  fail(`签名格式错误：${sig1}`)
}

// 不同 body → 不同签名
const sig3 = computeSignature(TEST_METHOD, TEST_PATH, TEST_TIMESTAMP, '{"different":true}', TEST_SECRET)
if (sig1 !== sig3) {
  ok('签名唯一性：不同 body → 不同签名')
} else {
  fail('签名唯一性失败！')
}

// 不同 secret → 不同签名
const sig4 = computeSignature(TEST_METHOD, TEST_PATH, TEST_TIMESTAMP, TEST_BODY, 'different_secret')
if (sig1 !== sig4) {
  ok('密钥隔离：不同 secret → 不同签名')
} else {
  fail('密钥隔离失败！')
}

// 不同 method → 不同签名
const sig5 = computeSignature('GET', TEST_PATH, TEST_TIMESTAMP, TEST_BODY, TEST_SECRET)
if (sig1 !== sig5) {
  ok('方法隔离：不同 METHOD → 不同签名')
} else {
  fail('方法隔离失败！')
}

// 过期时间戳检测（±300s）
const expiredTimestamp = String(Math.floor(Date.now() / 1000) - 600) // 10 分钟前
const sigExpired = computeSignature(TEST_METHOD, TEST_PATH, expiredTimestamp, TEST_BODY, TEST_SECRET)
info(`过期签名仍然可计算（服务端负责校验时间窗口）: ${sigExpired.substring(0, 16)}...`)

// ─── 测试 2：StringToSign 协议格式 ──────────────────────────
section('StringToSign 协议格式')

const bodyHash = crypto.createHash('sha256').update(TEST_BODY).digest('hex')
const expectedStringToSign = `${TEST_METHOD}\n${TEST_PATH}\n${TEST_TIMESTAMP}\n${bodyHash}`
const lines = expectedStringToSign.split('\n')

if (lines.length === 4) {
  ok(`StringToSign 4 行结构：METHOD / PATH / TIMESTAMP / BODY_HASH`)
} else {
  fail(`StringToSign 行数错误：${lines.length}`)
}

if (lines[0] === TEST_METHOD && lines[1] === TEST_PATH) {
  ok('StringToSign 前两行 = METHOD + PATH')
} else {
  fail('StringToSign 格式错误')
}

if (/^[a-f0-9]{64}$/.test(lines[3])) {
  ok('StringToSign 第 4 行 = SHA256(body)')
} else {
  fail('Body hash 格式错误')
}

// ─── 测试 3：在线端点测试（需要 API Key）───────────────────────
section('在线端点签名验证（需要 TEST_API_KEY + TEST_SIGNING_SECRET）')

const apiKey = process.env.TEST_API_KEY
const signingSecret = process.env.TEST_SIGNING_SECRET

if (!apiKey || !signingSecret) {
  info('跳过在线测试：未设置 TEST_API_KEY / TEST_SIGNING_SECRET 环境变量')
  info('在管理后台创建 API Key 后，设置环境变量重新运行：')
  info(`  TEST_API_KEY=ak_live_xxx TEST_SIGNING_SECRET=sk_live_xxx node scripts/test-signature.mjs`)
} else {
  const testEndpoint = '/api/v1/products'
  const testMethod = 'GET'
  const ts = String(Math.floor(Date.now() / 1000))
  const signature = computeSignature(testMethod, testEndpoint, ts, '', signingSecret)

  try {
    const res = await fetch(`${BASE_URL}${testEndpoint}`, {
      method: testMethod,
      headers: {
        'X-Api-Key': apiKey,
        'X-Api-Timestamp': ts,
        'X-Api-Signature': signature,
        'Content-Type': 'application/json',
      },
    })

    if (res.status === 200) {
      ok(`GET ${testEndpoint} → 200（签名验证通过）`)
    } else if (res.status === 403) {
      const body = await res.json().catch(() => ({}))
      if (body.data?.code === 'SIGNATURE_MISSING' || body.data?.code === 'INVALID_SIGNATURE') {
        fail(`签名被拒绝：${body.data?.code} — 检查 signing secret 是否正确`)
      } else {
        fail(`403: ${body.data?.code || body.statusMessage || 'unknown'}`)
      }
    } else if (res.status === 401) {
      fail(`401 Unauthorized — API Key 无效或已停用`)
    } else {
      info(`GET ${testEndpoint} → ${res.status}（签名头已发送，状态码取决于策略配置）`)
    }
  } catch (err) {
    fail(`请求失败：${err.message} — 服务器是否运行在 ${BASE_URL}？`)
  }

  // 测试过期签名
  const expiredTs = String(Math.floor(Date.now() / 1000) - 600)
  const expiredSig = computeSignature(testMethod, testEndpoint, expiredTs, '', signingSecret)

  try {
    const res2 = await fetch(`${BASE_URL}${testEndpoint}`, {
      method: testMethod,
      headers: {
        'X-Api-Key': apiKey,
        'X-Api-Timestamp': expiredTs,
        'X-Api-Signature': expiredSig,
      },
    })

    if (res2.status === 403) {
      ok('过期签名被正确拒绝（±300s 防重放）')
    } else if (res2.status === 200) {
      info('过期签名被接受 — 签名验证可能未启用（per-key require_signature = false）')
    } else {
      info(`过期签名 → ${res2.status}`)
    }
  } catch { /* server offline */ }
}

// ─── 汇总 ──────────────────────────────────────────────────
const { pass, fail: failCount } = counts()
console.log(`\n${c.bold}── 签名测试结果 ──${c.reset}`)
console.log(`  ${c.green}通过: ${pass}${c.reset}  ${failCount > 0 ? c.red : c.dim}失败: ${failCount}${c.reset}`)
console.log()

if (failCount > 0) {
  console.error(`${c.red}  签名测试有失败项，请检查！${c.reset}\n`)
  process.exit(1)
} else {
  console.log(`${c.green}  所有签名测试通过。${c.reset}\n`)
  process.exit(0)
}
