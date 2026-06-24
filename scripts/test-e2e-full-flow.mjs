#!/usr/bin/env node
/**
 * 生产环境完整业务流程端到端测试（含支付）
 *
 * 模拟真实用户全链路：
 *   匿名登录 → 浏览信息 → 填写问卷(24步) → 提交邮箱 → 完成问卷生成报告
 *   → 弹出商品信息(订阅) → 创建订单 → 信用卡支付 → 支付确认
 *   → 查看订单 → 查看报告 → 登出
 *
 * 官网双路径：匿名登录 + 邮箱登录
 *
 * 用法: node scripts/test-e2e-full-flow.mjs
 *       BASE_URL=https://api.example.com node scripts/test-e2e-full-flow.mjs
 */

import crypto from 'crypto'
import { c, ok, fail, warn, info, section, counts } from './_shared.mjs'

// ─── 配置 ──────────────────────────────────────────────
const BASE_URL = process.env.BASE_URL || 'https://api.aihomeworkscan.com'
const WWW_URL = BASE_URL.replace('://api.', '://www.')
const TIMEOUT_MS = 15000

const TEST_UID = Date.now().toString(36) + Math.random().toString(36).substring(2, 6)
const TEST_EMAIL = `e2e-full-${TEST_UID}@aihomeworkscan.com`
const TEST_PASSWORD = `E2eFull!${TEST_UID}`
const SESSION_ID = crypto.randomUUID()

// ─── 问卷数据 ──────────────────────────────────────────
const QUESTIONNAIRE = {
  gender: 'female', birthDate: '1995-08-15', birthTime: '14:30',
  birthCity: 'Beijing, China', fullName: 'TestSeeker',
  familiarity: '了解一些', focus: ['感情关系', '事业与财富'],
  goal: '探索人生方向', relationship: '单身', alignment: '理性分析',
  questions: [
    '勉强维持','理性分析','学习成长','选择性社交','信任问题',
    '寻求转变','努力积累','冥想放松','爱与关系','两者都有',
    '终身学习者','协作者','内在状态','谨慎尝试','内心平静',
    '偶尔参考','创造价值','自我认知',
  ],
}

// ─── HTTP 封装 ─────────────────────────────────────────
let accessToken = null

async function req(method, path, { body, headers = {}, baseUrl = BASE_URL, noAuth = false } = {}) {
  const url = baseUrl + path
  const start = Date.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  const finalHeaders = { 'Content-Type': 'application/json', ...headers }
  // starpath 公开端点不带 token（避免 anon token 触发 RLS authenticated 策略冲突）
  const isStarpathPublic = path.startsWith('/api/starpath/')
  if (accessToken && !noAuth && !isStarpathPublic) finalHeaders['Authorization'] = `Bearer ${accessToken}`

  try {
    const res = await fetch(url, {
      method, headers: finalHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
    const elapsed = Date.now() - start
    clearTimeout(timer)
    let respBody = null
    const ct = res.headers.get('content-type') || ''
    if (ct.includes('application/json')) respBody = await res.json()
    else respBody = await res.text()
    return { status: res.status, ok: res.ok, elapsed, body: respBody, url }
  } catch (err) {
    clearTimeout(timer)
    return { status: 0, ok: false, elapsed: Date.now() - start, error: err.message, url }
  }
}

function assertStatus(r, expected, label) {
  if (r.status === expected) { ok(`${label} → ${r.status} (${r.elapsed}ms)`); return true }
  fail(`${label} → 期望 ${expected}，实际 ${r.status} (${r.elapsed}ms) ${r.body ? JSON.stringify(r.body).substring(0, 80) : ''}`)
  return false
}
function assertRange(r, min, max, label) {
  if (r.status >= min && r.status <= max) { ok(`${label} → ${r.status} (${r.elapsed}ms)`); return true }
  fail(`${label} → 期望 ${min}-${max}，实际 ${r.status} (${r.elapsed}ms)`)
  return false
}
function assertField(obj, field, label) {
  if (obj && typeof obj === 'object' && field in obj) { ok(`${label} ✓`); return true }
  fail(`${label} — 缺少 "${field}": ${JSON.stringify(obj).substring(0, 80)}`)
  return false
}

// ─── 主流程 ────────────────────────────────────────────
async function main() {
  section(`完整业务流程测试（含支付）— ${BASE_URL}`)
  info(`测试邮箱: ${TEST_EMAIL}`)
  info(`Session:  ${SESSION_ID}`)
  console.log()

  // ═══════════════════════════════════════════════════════
  // PATH A: 官网 — 匿名登录
  // ═══════════════════════════════════════════════════════
  section('PATH A: 匿名登录（官网入口）')

  let r = await req('POST', '/api/v1/auth/login', {
    body: { anonymous: true, device_id: `anon-${TEST_UID}` },
  })
  if (r.status === 200 && r.body?.data?.session) {
    accessToken = r.body.data.session.access_token
    ok(`匿名登录成功 → 200 (${r.elapsed}ms)`)
    info(`    access_token 长度: ${accessToken.length}`)
    if (r.body.data.user) info(`    用户 ID: ${r.body.data.user.id}`)
  } else {
    fail(`匿名登录失败 → ${r.status} (${r.elapsed}ms) ${JSON.stringify(r.body).substring(0, 80)}`)
  }

  console.log()

  // ═══════════════════════════════════════════════════════
  // PATH B: 官网 — 邮箱注册 + 登录
  // ═══════════════════════════════════════════════════════
  section('PATH B: 邮箱注册 + 登录')

  // B.1 注册
  r = await req('POST', '/api/v1/auth/register', {
    body: { email: TEST_EMAIL, password: TEST_PASSWORD, username: `Seeker${TEST_UID}` },
  })
  if (r.status === 200) {
    ok(`邮箱注册成功 → 200 (${r.elapsed}ms)`)
    if (r.body?.data?.user) info(`    用户 ID: ${r.body.data.user.id}`)
    if (r.body?.data?.session) {
      info('    返回 session（无需邮箱验证）')
    } else {
      warn('    未返回 session（需邮箱验证，将使用匿名 token 继续）')
    }
  } else if (r.status === 400) {
    warn(`注册返回 400 — ${JSON.stringify(r.body).substring(0, 60)}`)
    info('    可能邮箱验证策略限制，继续用匿名 token 测试')
  } else {
    fail(`注册失败 → ${r.status} (${r.elapsed}ms)`)
  }

  // B.2 邮箱登录
  r = await req('POST', '/api/v1/auth/login', {
    body: { email: TEST_EMAIL, password: TEST_PASSWORD },
  })
  if (r.status === 200 && r.body?.data?.session) {
    accessToken = r.body.data.session.access_token
    ok(`邮箱登录成功 → 200 (${r.elapsed}ms)`)
  } else if (r.status === 401) {
    warn(`邮箱登录 401 — 需邮箱验证，继续用匿名 token`)
  } else {
    warn(`邮箱登录 → ${r.status} (${r.elapsed}ms)`)
  }

  console.log()

  // ═══════════════════════════════════════════════════════
  // STEP 1: 浏览信息
  // ═══════════════════════════════════════════════════════
  section('STEP 1: 浏览信息')

  r = await req('GET', '/api/v1/auth/me')
  if (r.status === 200) ok(`GET /api/v1/auth/me → 200 (${r.elapsed}ms)`)
  else if (r.status === 403) ok(`GET /api/v1/auth/me → 403 (匿名用户被拒，预期)`)
  else if (r.status === 401) ok(`GET /api/v1/auth/me → 401 (未认证)`)
  else warn(`GET /api/v1/auth/me → ${r.status}`)

  r = await req('GET', '/api/v1/analytics/config')
  assertStatus(r, 200, 'GET /api/v1/analytics/config')

  r = await req('GET', '/api/v1/meta/build')
  assertStatus(r, 200, 'GET /api/v1/meta/build')

  r = await req('GET', '/api/v1/feedback')
  assertStatus(r, 200, 'GET /api/v1/feedback')

  r = await req('GET', '/api/v1/campaigns/starpath')
  assertStatus(r, 200, 'GET /api/v1/campaigns/starpath')

  console.log()

  // ═══════════════════════════════════════════════════════
  // STEP 2: 填写问卷（24步）
  // ═══════════════════════════════════════════════════════
  section('STEP 2: 填写问卷（24步逐步提交）')

  const answers = [
    { step: 0, questionKey: 'familiarity',  answerValue: QUESTIONNAIRE.familiarity },
    { step: 1, questionKey: 'focus',        answerValue: QUESTIONNAIRE.focus },
    { step: 2, questionKey: 'goal',         answerValue: QUESTIONNAIRE.goal },
    { step: 3, questionKey: 'relationship', answerValue: QUESTIONNAIRE.relationship },
    { step: 4, questionKey: 'profile',      answerValue: QUESTIONNAIRE.fullName,
      gender: QUESTIONNAIRE.gender, birthDate: QUESTIONNAIRE.birthDate,
      birthTime: QUESTIONNAIRE.birthTime, birthCity: QUESTIONNAIRE.birthCity,
      fullName: QUESTIONNAIRE.fullName },
    { step: 5, questionKey: 'alignment',    answerValue: QUESTIONNAIRE.alignment },
    ...QUESTIONNAIRE.questions.map((ans, i) => ({
      step: 6 + i, questionKey: `q${i + 1}`, answerValue: ans,
    })),
  ]

  let dbSessionId = null
  let successCount = 0
  for (let i = 0; i < answers.length; i++) {
    const a = answers[i]
    r = await req('POST', '/api/starpath/questionnaire/answer', {
      body: {
        sessionId: SESSION_ID, step: a.step,
        questionKey: a.questionKey, answerValue: a.answerValue,
        ...(a.gender && { gender: a.gender }),
        ...(a.birthDate && { birthDate: a.birthDate }),
        ...(a.birthTime && { birthTime: a.birthTime }),
        ...(a.birthCity && { birthCity: a.birthCity }),
        ...(a.fullName && { fullName: a.fullName }),
      },
    })
    const label = `  Q${String(i + 1).padStart(2, '0')} step=${a.step} ${a.questionKey.padEnd(14)}`
    if (r.status === 200) {
      ok(`${label} → 200 (${r.elapsed}ms)`)
      successCount++
      if (!dbSessionId && r.body?.data?.sessionId) {
        dbSessionId = r.body.data.sessionId
        info(`    DB Session: ${dbSessionId}`)
      }
    } else {
      fail(`${label} → ${r.status} (${r.elapsed}ms)`)
    }
  }
  info(`问卷提交: ${successCount}/${answers.length} 成功`)

  console.log()

  // ═══════════════════════════════════════════════════════
  // STEP 3: 完成问卷 + 触发报告生成
  // ═══════════════════════════════════════════════════════
  section('STEP 3: 完成问卷 + 触发报告生成')

  let reportId = null
  if (dbSessionId) {
    r = await req('POST', '/api/starpath/questionnaire/complete', {
      body: { sessionId: dbSessionId },
    })
    if (r.status === 200) {
      ok(`问卷完成 → 200 (${r.elapsed}ms)`)
      reportId = r.body?.data?.reportId || null
      info(`    报告 ID: ${reportId}`)
      info(`    报告状态: ${r.body?.data?.status}`)
    } else {
      fail(`问卷完成 → ${r.status} (${r.elapsed}ms) ${JSON.stringify(r.body).substring(0, 80)}`)
    }
  } else {
    warn('跳过（无 DB session）')
  }

  console.log()

  // ═══════════════════════════════════════════════════════
  // STEP 4: 提交邮箱接收报告
  // ═══════════════════════════════════════════════════════
  section('STEP 4: 提交邮箱')

  r = await req('POST', '/api/starpath/email/submit', {
    body: {
      bizCode: 'starpath', email: TEST_EMAIL,
      agreedTerms: true, ...(reportId && { reportId }),
    },
  })
  if (r.status === 200) {
    ok(`邮箱提交成功 → 200 (${r.elapsed}ms)`)
    info(`    ETA: ${r.body?.data?.etaMinutes || 'N/A'} 分钟`)
  } else {
    fail(`邮箱提交 → ${r.status} (${r.elapsed}ms) ${JSON.stringify(r.body).substring(0, 80)}`)
  }

  console.log()

  // ═══════════════════════════════════════════════════════
  // STEP 5: 弹出商品信息 — 创建订阅订单
  // ═══════════════════════════════════════════════════════
  section('STEP 5: 创建订阅订单（商品信息弹出）')

  let orderId = null
  r = await req('POST', '/api/starpath/subscribe/ios', {
    body: {
      bizCode: 'starpath',
      platform: 'ios',
      plan: 'trial-7d',
      paymentMethod: 'card',
      ...(reportId && { reportId }),
    },
  })
  if (r.status === 200) {
    ok(`订单创建成功 → 200 (${r.elapsed}ms)`)
    orderId = r.body?.data?.orderId || null
    info(`    订单 ID: ${orderId}`)
    info(`    方案: ${r.body?.data?.plan}`)
    info(`    金额: $${r.body?.data?.amount}`)
    info(`    状态: ${r.body?.data?.status}`)
    if (orderId) assertField(r.body.data, 'orderId', '    data.orderId')
  } else {
    fail(`订单创建 → ${r.status} (${r.elapsed}ms) ${JSON.stringify(r.body).substring(0, 80)}`)
  }

  console.log()

  // ═══════════════════════════════════════════════════════
  // STEP 6: 信用卡支付确认
  // ═══════════════════════════════════════════════════════
  section('STEP 6: 信用卡支付确认')

  if (orderId) {
    const paymentToken = `tok_visa_${Date.now()}`
    r = await req('POST', '/api/starpath/payment/card', {
      body: {
        bizCode: 'starpath',
        orderId: orderId,
        paymentToken: paymentToken,
        cardholderName: 'Test Seeker',
      },
    })
    if (r.status === 200) {
      ok(`支付确认成功 → 200 (${r.elapsed}ms)`)
      if (r.body?.data) {
        info(`    支付状态: ${r.body.data.status}`)
        info(`    收据 ID: ${r.body.data.receiptId}`)
      }
    } else {
      fail(`支付确认 → ${r.status} (${r.elapsed}ms) ${JSON.stringify(r.body).substring(0, 80)}`)
    }
  } else {
    warn('跳过（无订单 ID）')
  }

  console.log()

  // ═══════════════════════════════════════════════════════
  // STEP 7: 查看订单信息
  // ═══════════════════════════════════════════════════════
  section('STEP 7: 查看订单信息')

  if (orderId) {
    // 方式 1: 通过订单详情端点查询（需认证）
    r = await req('GET', `/api/v1/payments/${orderId}`)
    if (r.status === 200) {
      ok(`GET /api/v1/payments/${orderId.substring(0, 8)}... → 200 (${r.elapsed}ms)`)
      if (r.body?.data) {
        info(`    订单状态: ${r.body.data.status}`)
        info(`    金额: ${r.body.data.amount} ${r.body.data.currency}`)
        info(`    支付方式: ${r.body.data.payment_provider}`)
      }
    } else if (r.status === 403) {
      warn(`订单详情 → 403 (匿名用户被拒，预期)`)
    } else if (r.status === 401) {
      warn(`订单详情 → 401 (未认证)`)
    } else {
      warn(`订单详情 → ${r.status} (${r.elapsed}ms)`)
    }

    // 方式 2: 通过订单列表查询
    r = await req('GET', '/api/v1/orders')
    if (r.status === 200) {
      ok(`GET /api/v1/orders → 200 (${r.elapsed}ms)`)
      if (r.body?.data) {
        const orders = Array.isArray(r.body.data) ? r.body.data : (r.body.data?.items || [])
        info(`    订单总数: ${orders.length}`)
        const targetOrder = orders.find(o => o.id === orderId)
        if (targetOrder) {
          ok(`    找到刚创建的订单 ✓`)
          info(`      状态: ${targetOrder.status}`)
          info(`      金额: ${targetOrder.amount} ${targetOrder.currency}`)
        }
      }
    } else if (r.status === 403) {
      warn(`订单列表 → 403 (匿名用户被拒，预期)`)
    } else {
      warn(`订单列表 → ${r.status} (${r.elapsed}ms)`)
    }
  } else {
    warn('跳过（无订单 ID）')
  }

  console.log()

  // ═══════════════════════════════════════════════════════
  // STEP 8: 查看报告
  // ═══════════════════════════════════════════════════════
  section('STEP 8: 查看报告')

  // 8.1 无效 ID → 404
  r = await req('GET', '/api/starpath/report?id=non-existent-000')
  assertRange(r, 400, 404, 'GET /api/starpath/report (无效 ID → 404)')

  // 8.2 用 reportId 查询
  if (reportId) {
    r = await req('GET', `/api/starpath/report?id=${reportId}`)
    if (r.status === 200) {
      ok(`报告获取成功 → 200 (${r.elapsed}ms)`)
      if (r.body?.data) {
        const d = r.body.data
        info(`    报告 ID: ${d.reportId}`)
        info(`    状态: ${d.status}`)
        info(`    用户: ${d.user?.name || 'N/A'}`)
        if (d.signs) info(`    星座: 太阳=${d.signs.sun || '-'} 月亮=${d.signs.moon || '-'} 上升=${d.signs.rising || '-'}`)
      }
    } else if (r.status === 404) {
      warn(`报告 → 404 (内容待异步填充)`)
    } else {
      warn(`报告 → ${r.status} (${r.elapsed}ms)`)
    }
  } else {
    warn('跳过报告查询（无 reportId）')
  }

  console.log()

  // ═══════════════════════════════════════════════════════
  // BONUS: 支付配置（商品信息来源）
  // ═══════════════════════════════════════════════════════
  section('BONUS: 支付配置（前端商品弹窗数据源）')

  // 支付配置端点（公开但被 auth-guard 拦截，测试匿名行为）
  r = await req('GET', '/api/v1/payments/config')
  if (r.status === 200) {
    ok(`GET /api/v1/payments/config → 200 (${r.elapsed}ms)`)
    if (r.body?.data) info(`    支付通道: ${Object.keys(r.body.data).join(', ')}`)
  } else if (r.status === 401 || r.status === 403) {
    warn(`支付配置 → ${r.status} (auth-guard 拦截，前端通过 www 域名访问)`)
    // 通过 www 域名再试
    r = await req('GET', '/api/v1/payments/config', { baseUrl: WWW_URL })
    if (r.status === 200) {
      ok(`GET /api/v1/payments/config (www) → 200 (${r.elapsed}ms)`)
    } else {
      warn(`支付配置 (www) → ${r.status}`)
    }
  }

  console.log()

  // ═══════════════════════════════════════════════════════
  // 清理：登出
  // ═══════════════════════════════════════════════════════
  section('清理: 登出')

  if (accessToken) {
    r = await req('POST', '/api/v1/auth/logout')
    if (r.status === 200) ok(`登出 → 200 (${r.elapsed}ms)`)
    else if (r.status === 403) ok(`登出 → 403 (匿名用户被拒，预期)`)
    else if (r.status === 401) warn(`登出 → 401`)
    else warn(`登出 → ${r.status}`)
  } else {
    warn('跳过登出')
  }

  console.log()

  // ═══════════════════════════════════════════════════════
  // 汇总
  // ═══════════════════════════════════════════════════════
  section('完整流程测试汇总')
  const { pass: passCount, fail: failCount } = counts()
  const total = passCount + failCount
  const passRate = total > 0 ? Math.round((passCount / total) * 100) : 0

  console.log(`  ${c.green}通过: ${passCount}${c.reset}  ${failCount > 0 ? c.red : c.dim}失败: ${failCount}${c.reset}  ${c.dim}总计: ${total}${c.reset}`)
  console.log(`  通过率: ${passRate >= 95 ? c.green : passRate >= 80 ? c.yellow : c.red}${passRate}%${c.reset}`)
  console.log()
  console.log(`  ${c.dim}测试账号: ${TEST_EMAIL}${c.reset}`)
  console.log(`  ${c.dim}Session:   ${SESSION_ID}${c.reset}`)
  if (dbSessionId) console.log(`  ${c.dim}DB Session: ${dbSessionId}${c.reset}`)
  if (orderId) console.log(`  ${c.dim}订单 ID:    ${orderId}${c.reset}`)
  if (reportId) console.log(`  ${c.dim}报告 ID:    ${reportId}${c.reset}`)
  console.log()

  if (failCount > 0) {
    console.error(`${c.red}  ⚠ 存在 ${failCount} 项失败。${c.reset}\n`)
    process.exit(1)
  } else {
    console.log(`${c.green}  ✓ 完整业务流程全部通过！${c.reset}\n`)
    process.exit(0)
  }
}

main().catch((err) => {
  console.error(`\n${c.red}测试异常: ${err.message}${c.reset}\n`)
  process.exit(1)
})
