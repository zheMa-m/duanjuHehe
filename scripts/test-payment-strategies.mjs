#!/usr/bin/env node
/**
 * 支付策略集成测试 — Mock DB 模式全生命周期验证
 *
 * 测试所有支付渠道的策略层实现：
 *  - createSession / createOrder
 *  - payment confirmation
 *  - webhook verification
 *  - transaction logging
 *
 * 前置条件: npm run dev (MOCK_DB=true)
 *
 * 用法:
 *   node scripts/test-payment-strategies.mjs [port]
 *   npm run test:payment-strategies
 */

import { loadEnv, c, ok, fail, info, warn, section, counts } from './_shared.mjs'

loadEnv(import.meta.url)

// ─── 配置 ──────────────────────────────────────────────
const port = process.argv[2] || process.env.API_PORT || '3000'
const BASE_URL = `http://localhost:${port}`

console.log(`\n${c.bold}${c.cyan}══════════════════════════════════════════════════${c.reset}`)
console.log(`${c.bold}${c.cyan}  支付策略集成测试 (MOCK_DB 模式)${c.reset}`)
console.log(`${c.bold}${c.cyan}══════════════════════════════════════════════════${c.reset}`)

// ─── 工具函数 ──────────────────────────────────────────
async function apiPost(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return { status: res.status, data }
}

async function apiGet(path) {
  const res = await fetch(`${BASE_URL}${path}`)
  const data = await res.json()
  return { status: res.status, data }
}

function assert(condition, msg) {
  if (condition) ok(msg)
  else fail(msg)
}

// ═══════════════════════════════════════════════════════
//  前置检查 — 服务器在线
// ═══════════════════════════════════════════════════════
section('0. 前置检查')

let serverOnline = false
try {
  const res = await fetch(`${BASE_URL}/api/v1/user/profile`, {
    headers: { 'x-mock-unauthorized': 'true' },
  })
  serverOnline = true
  ok(`服务器在线: ${BASE_URL}`)
} catch {
  fail(`服务器未运行在 ${BASE_URL}`)
  console.error(`\n${c.red}  请先执行 npm run dev 启动开发服务器${c.reset}\n`)
  process.exit(1)
}

if (process.env.MOCK_DB !== 'true') {
  warn('MOCK_DB 未设为 true，测试将在真实 DB 环境运行（需配置真实凭证）')
  warn('建议: export MOCK_DB=true && npm run dev')
}

// ═══════════════════════════════════════════════════════
//  1. PayPal 支付全生命周期
// ═══════════════════════════════════════════════════════
section('1. PayPal 支付生命周期')

let paypalOrderId = ''

try {
  // 1a. 创建订单
  const createRes = await apiPost('/api/starpath/subscribe/ios', {
    bizCode: 'starpath',
    platform: 'ios',
    plan: 'trial-7d',
    paymentMethod: 'paypal',
  })
  assert(
    createRes.status === 200 && createRes.data?.data?.orderId,
    `创建 PayPal 订单 → ${createRes.data?.data?.orderId || 'FAIL'}`
  )
  paypalOrderId = createRes.data?.data?.orderId

  // 1b. 确认支付
  if (paypalOrderId) {
    const confirmRes = await apiPost('/api/starpath/payment/paypal', {
      orderId: paypalOrderId,
      paymentId: `paypal_mock_pi_${Date.now()}`,
      payerId: 'mock_payer_abc',
    })
    assert(
      confirmRes.status === 200,
      `PayPal 支付确认 → ${confirmRes.status}`
    )
  }

  // 1c. Webhook 回执
  const whRes = await apiPost('/api/starpath/payment/webhook/paypal', {
    event_type: 'PAYMENT.CAPTURE.COMPLETED',
    resource: {
      id: 'mock_capture_1',
      custom_id: paypalOrderId,
      invoice_id: paypalOrderId,
    },
  })
  assert(
    whRes.status === 200,
    `PayPal Webhook 处理 → ${whRes.status}`
  )

  // 1d. 退款测试
  if (paypalOrderId) {
    const refundRes = await apiPost(`/api/admin/orders/${paypalOrderId}/refund`, {
      amount: 7.99,
      reason: 'integration_test',
    })
    // Returns 404 because the admin API requires auth in real mode
    // In mock mode, it might work with x-mock-admin
    const refundRes2 = await fetch(`${BASE_URL}/api/admin/orders/${paypalOrderId}/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-mock-admin': 'true',
      },
      body: JSON.stringify({ amount: 7.99, reason: 'integration_test' }),
    })
    assert(
      refundRes2.status === 200,
      `PayPal 退款 → ${refundRes2.status}`
    )
  }
} catch (e) {
  fail(`PayPal 测试异常: ${e.message}`)
}

// ═══════════════════════════════════════════════════════
//  2. Google Pay 支付全生命周期
// ═══════════════════════════════════════════════════════
section('2. Google Pay 支付生命周期')

try {
  // 2a. 创建订单
  const createRes = await apiPost('/api/starpath/subscribe/android', {
    bizCode: 'starpath',
    platform: 'android',
    plan: 'trial-7d',
    paymentMethod: 'google_iap',
  })
  const gpayOrderId = createRes.data?.data?.orderId
  assert(
    createRes.status === 200 && gpayOrderId,
    `创建 Google Pay 订单 → ${gpayOrderId || 'FAIL'}`
  )

  // 2b. 确认支付
  if (gpayOrderId) {
    const confirmRes = await apiPost('/api/starpath/payment/google-pay', {
      orderId: gpayOrderId,
      googlePayToken: Buffer.from(JSON.stringify({
        protocolVersion: 'ECv1',
        signature: 'mock_signature',
        signedMessage: JSON.stringify({ amount: 7.99 }),
      })).toString('base64'),
    })
    assert(
      confirmRes.status === 200,
      `Google Pay 支付确认 → ${confirmRes.status}`
    )
  }
} catch (e) {
  fail(`Google Pay 测试异常: ${e.message}`)
}

// ═══════════════════════════════════════════════════════
//  3. Stripe Card 支付全生命周期
// ═══════════════════════════════════════════════════════
section('3. Stripe 信用卡支付生命周期')

try {
  // 3a. 创建订单
  const createRes = await apiPost('/api/starpath/subscribe/ios', {
    bizCode: 'starpath',
    platform: 'ios',
    plan: 'trial-7d',
    paymentMethod: 'card',
  })
  const cardOrderId = createRes.data?.data?.orderId
  assert(
    createRes.status === 200 && cardOrderId,
    `创建 Card 订单 → ${cardOrderId || 'FAIL'}`
  )

  // 3b. 确认信用卡支付
  if (cardOrderId) {
    const confirmRes = await apiPost('/api/starpath/payment/card', {
      bizCode: 'starpath',
      orderId: cardOrderId,
      paymentToken: `tok_mock_${Date.now()}`,
      cardholderName: 'Test User',
    })
    assert(
      confirmRes.status === 200,
      `Card 支付确认 → ${confirmRes.status}`
    )
  }
} catch (e) {
  fail(`Card 测试异常: ${e.message}`)
}

// ═══════════════════════════════════════════════════════
//  4. Apple IAP 支付全生命周期
// ═══════════════════════════════════════════════════════
section('4. Apple IAP 支付生命周期')

try {
  // 4a. 创建订单
  const createRes = await apiPost('/api/starpath/subscribe/ios', {
    bizCode: 'starpath',
    platform: 'ios',
    plan: 'trial-7d',
    paymentMethod: 'apple_iap',
  })
  const appleOrderId = createRes.data?.data?.orderId
  assert(
    createRes.status === 200 && appleOrderId,
    `创建 Apple IAP 订单 → ${appleOrderId || 'FAIL'} (自动标记为 paid)`
  )

  // Apple IAP 通过 subscribe 接口即创建即完成（immediate payment）
  if (appleOrderId) {
    const statusRes = createRes.data?.data?.status
    assert(
      statusRes === 'paid',
      `Apple IAP 订单状态 → ${statusRes} (期望 paid)`
    )
  }

  // 4b. Webhook 测试
  const whRes = await apiPost('/api/starpath/payment/webhook/apple-iap', {
    signedPayload: 'mock_jwt_apple_server_notification',
  })
  assert(
    whRes.status === 200,
    `Apple IAP Webhook 处理 → ${whRes.status}`
  )
} catch (e) {
  fail(`Apple IAP 测试异常: ${e.message}`)
}

// ═══════════════════════════════════════════════════════
//  5. 支付渠道配置 API
// ═══════════════════════════════════════════════════════
section('5. 支付配置与健康检测')

try {
  // 5a. 公开支付配置
  const configRes = await apiGet('/api/v1/payments/config')
  assert(
    configRes.status === 200,
    `支付配置 API → ${configRes.status}`
  )
  const configs = configRes.data?.data || {}
  info(`已配置渠道: ${Object.keys(configs).join(', ') || '(无)'}`)

  // 5b. 环境变量健康检测（需要 admin header）
  const healthRes = await fetch(`${BASE_URL}/api/admin/config/status`, {
    headers: { 'x-mock-admin': 'true' },
  })
  assert(
    healthRes.status === 200,
    `系统健康检测 → ${healthRes.status}`
  )
} catch (e) {
  fail(`配置/健康检测异常: ${e.message}`)
}

// ═══════════════════════════════════════════════════════
//  6. 交易日志 API
// ═══════════════════════════════════════════════════════
section('6. 交易日志查询')

try {
  if (paypalOrderId) {
    const txRes = await fetch(`${BASE_URL}/api/admin/orders/${paypalOrderId}/transactions`, {
      headers: { 'x-mock-admin': 'true' },
    })
    assert(
      txRes.status === 200,
      `交易日志查询 → ${txRes.status}`
    )
  }
} catch (e) {
  fail(`交易日志查询异常: ${e.message}`)
}

// ═══════════════════════════════════════════════════════
//  汇总
// ═══════════════════════════════════════════════════════
console.log(`\n${c.bold}${c.cyan}══════════════════════════════════════════════════${c.reset}`)
const { pass: passCount, fail: failCount } = counts()
const total = passCount + failCount
if (failCount === 0) {
  console.log(`${c.bold}${c.green}  全部通过！${passCount}/${total} 项测试成功${c.reset}`)
} else {
  console.log(`${c.bold}${c.red}  ${failCount}/${total} 项测试未通过${c.reset}`)
}
console.log(`${c.bold}${c.cyan}══════════════════════════════════════════════════${c.reset}\n`)

process.exit(failCount > 0 ? 1 : 0)
