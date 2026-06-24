#!/usr/bin/env node
/**
 * 生产环境端到端业务流程测试
 *
 * 模拟真实用户完整链路：
 *   注册 → 登录 → 浏览信息 → 填写问卷（逐步提交） → 提交邮箱 → 查看报告
 *
 * 业务流程参照 app/composables/useStarpathFlow.ts:
 *   welcome → intro(familiarity/overview/focus/goal/relationship)
 *   → birth(date/time/city) → profile(name) → alignment
 *   → questions(q1~q18) → loading → email → report
 *
 * 用法: node scripts/test-e2e-flow.mjs
 *       BASE_URL=https://api.example.com node scripts/test-e2e-flow.mjs
 */

import crypto from 'crypto'
import { c, ok, fail, warn, info, section, counts } from './_shared.mjs'

// ─── 配置 ──────────────────────────────────────────────
const BASE_URL = process.env.BASE_URL || 'https://api.aihomeworkscan.com'
const WWW_URL = BASE_URL.replace('://api.', '://www.')
const TIMEOUT_MS = 15000

// 生成唯一测试用户（避免与已有用户冲突）
const TEST_UID = Date.now().toString(36) + Math.random().toString(36).substring(2, 6)
const TEST_EMAIL = `e2e-test-${TEST_UID}@aihomeworkscan.com`
const TEST_PASSWORD = `E2eTest!${TEST_UID}`
const TEST_USERNAME = `Seeker${TEST_UID}`
const SESSION_ID = crypto.randomUUID() // 问卷 session key

// ─── 问卷数据（模拟用户输入）──────────────────────────
const QUESTIONNAIRE = {
  // intro 阶段
  familiarity: '了解一些',
  focus: ['感情关系', '事业与财富'],
  goal: '探索人生方向',
  relationship: '单身',
  // birth 信息
  gender: 'female',
  birthDate: '1995-08-15',
  birthTime: '14:30',
  birthCity: 'Beijing, China',
  fullName: 'TestSeeker',
  // alignment
  alignment: '理性分析',
  // 18 道深入问题（从 starpath-data.ts q1~q18 选项中选取）
  questions: [
    '勉强维持',       // q1: 你最近的生活状态
    '理性分析',       // q2: 面对重大决定时
    '学习成长',       // q3: 你最享受
    '选择性社交',     // q4: 社交风格
    '信任问题',       // q5: 关系中最大的挑战
    '寻求转变',       // q6: 事业方向
    '努力积累',       // q7: 财务状态
    '冥想放松',       // q8: 应对压力
    '爱与关系',       // q9: 最看重的价值
    '两者都有',       // q10: 命运观
    '终身学习者',     // q11: 学习态度
    '协作者',         // q12: 团队角色
    '内在状态',       // q13: 压力来源
    '谨慎尝试',       // q14: 对新事物
    '内心平静',       // q15: 终极目标
    '偶尔参考',       // q16: 对占星
    '创造价值',       // q17: 人生意义
    '自我认知',       // q18: 期望收获
  ],
}

// ─── HTTP 请求封装 ─────────────────────────────────────
let accessToken = null

async function req(method, path, { body, headers = {}, baseUrl = BASE_URL } = {}) {
  const url = baseUrl + path
  const start = Date.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  const finalHeaders = { 'Content-Type': 'application/json', ...headers }
  if (accessToken) finalHeaders['Authorization'] = `Bearer ${accessToken}`

  try {
    const response = await fetch(url, {
      method,
      headers: finalHeaders,
      body: body ? JSON.stringify(body) : undefined,
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
    return { status: response.status, ok: response.ok, elapsed, body: responseBody, url }
  } catch (err) {
    clearTimeout(timer)
    return { status: 0, ok: false, elapsed: Date.now() - start, error: err.message, url }
  }
}

// ─── 断言辅助 ──────────────────────────────────────────
function assertStatus(r, expected, label) {
  if (r.status === expected) {
    ok(`${label} → ${r.status} (${r.elapsed}ms)`)
    return true
  }
  fail(`${label} → 期望 ${expected}，实际 ${r.status} (${r.elapsed}ms) ${r.body ? JSON.stringify(r.body).substring(0, 80) : ''}`)
  return false
}

function assertRange(r, min, max, label) {
  if (r.status >= min && r.status <= max) {
    ok(`${label} → ${r.status} (${r.elapsed}ms)`)
    return true
  }
  fail(`${label} → 期望 ${min}-${max}，实际 ${r.status} (${r.elapsed}ms)`)
  return false
}

function assertField(obj, field, label) {
  if (obj && typeof obj === 'object' && field in obj) {
    ok(`${label} ✓`)
    return true
  }
  fail(`${label} — 缺少 "${field}": ${JSON.stringify(obj).substring(0, 80)}`)
  return false
}

// ─── 主流程 ────────────────────────────────────────────
async function main() {
  section(`端到端业务流程测试 — ${BASE_URL}`)
  info(`测试邮箱: ${TEST_EMAIL}`)
  info(`Session:  ${SESSION_ID}`)
  console.log()

  // ═══════════════════════════════════════════════════════
  // STEP 1: 用户注册
  // ═══════════════════════════════════════════════════════
  section('STEP 1: 用户注册')

  let r = await req('POST', '/api/v1/auth/register', {
    body: {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      username: TEST_USERNAME,
    },
  })

  let registered = false
  let sessionFromRegister = null

  if (r.status === 200) {
    ok(`注册成功 → 200 (${r.elapsed}ms)`)
    assertField(r.body, 'data', '    response.data')
    if (r.body?.data?.user) {
      assertField(r.body.data, 'user', '    data.user')
      info(`    用户 ID: ${r.body.data.user.id}`)
    }
    if (r.body?.data?.session) {
      sessionFromRegister = r.body.data.session
      ok('    返回会话 token（无需邮箱验证）')
      accessToken = sessionFromRegister.access_token
    } else {
      warn('    未返回 session（可能需要邮箱验证）')
    }
    registered = true
  } else if (r.status === 400) {
    // 可能邮箱已存在或其他校验错误
    warn(`注册返回 400 (${r.elapsed}ms) — ${JSON.stringify(r.body).substring(0, 100)}`)
    info('    将尝试用已有账号登录')
  } else {
    fail(`注册失败 → ${r.status} (${r.elapsed}ms) — ${JSON.stringify(r.body).substring(0, 100)}`)
  }

  console.log()

  // ═══════════════════════════════════════════════════════
  // STEP 2: 用户登录
  // ═══════════════════════════════════════════════════════
  section('STEP 2: 用户登录')

  r = await req('POST', '/api/v1/auth/login', {
    body: {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    },
  })

  if (r.status === 200) {
    ok(`登录成功 → 200 (${r.elapsed}ms)`)
    if (r.body?.data?.session) {
      accessToken = r.body.data.session.access_token
      ok(`    access_token 获取成功 (长度 ${accessToken.length})`)
      info(`    过期时间: ${new Date(r.body.data.session.expires_at * 1000).toISOString()}`)
    } else {
      warn('    登录成功但未返回 session（账户可能需要邮箱验证）')
      // 尝试匿名登录作为后备
      info('    尝试匿名登录作为后备...')
      r = await req('POST', '/api/v1/auth/login', {
        body: { anonymous: true, device_id: `e2e-${TEST_UID}` },
      })
      if (r.status === 200 && r.body?.data?.session) {
        accessToken = r.body.data.session.access_token
        ok(`    匿名登录成功 → access_token 获取`)
      } else if (r.status === 400) {
        warn(`    匿名登录被拒 (400) — Supabase 未启用匿名登录（安全策略预期）`)
        info('    问卷流程为公开端点，无需认证可继续')
      } else {
        fail(`    匿名登录失败 → ${r.status}`)
      }
    }
  } else if (r.status === 401) {
    warn(`登录返回 401 (${r.elapsed}ms) — 邮箱可能需要验证`)
    info('    尝试匿名登录...')
    r = await req('POST', '/api/v1/auth/login', {
      body: { anonymous: true, device_id: `e2e-${TEST_UID}` },
    })
    if (r.status === 200 && r.body?.data?.session) {
      accessToken = r.body.data.session.access_token
      ok(`    匿名登录成功 → access_token 获取`)
    } else if (r.status === 400) {
      warn(`    匿名登录被拒 (400) — Supabase 未启用匿名登录（安全策略预期）`)
      info('    问卷流程为公开端点，无需认证可继续')
    } else {
      fail(`    匿名登录失败 → ${r.status} — 后续鉴权测试将跳过`)
    }
  } else {
    fail(`登录失败 → ${r.status} (${r.elapsed}ms)`)
  }

  console.log()

  // ═══════════════════════════════════════════════════════
  // STEP 3: 浏览信息（已认证访问）
  // ═══════════════════════════════════════════════════════
  section('STEP 3: 浏览信息（已认证）')

  // 3.1 获取当前用户档案
  r = await req('GET', '/api/v1/auth/me')
  if (accessToken) {
    if (r.status === 200) {
      ok(`GET /api/v1/auth/me → 200 (${r.elapsed}ms)`)
      assertField(r.body, 'data', '    response.data')
      if (r.body?.data) {
        info(`    用户: ${r.body.data.username || r.body.data.email || 'N/A'}`)
        info(`    角色: ${r.body.data.role || 'N/A'}`)
        info(`    匿名: ${r.body.data.is_anonymous ?? 'N/A'}`)
      }
    } else if (r.status === 403) {
      // 匿名用户被 auth-guard 拦截（/api/v1/auth/me 需要非匿名用户）
      ok(`GET /api/v1/auth/me → 403 (匿名用户被拒，符合预期)`)
    } else {
      fail(`GET /api/v1/auth/me → ${r.status} (${r.elapsed}ms)`)
    }
  } else {
    // 无 token 时，auth/me 应返回 401（auth-guard 拦截）
    assertRange(r, 401, 401, 'GET /api/v1/auth/me (无 token → 401)')
  }

  // 3.2 浏览公开内容 — 埋点配置
  r = await req('GET', '/api/v1/analytics/config')
  assertStatus(r, 200, 'GET /api/v1/analytics/config (浏览埋点配置)')

  // 3.3 浏览公开内容 — 构建版本
  r = await req('GET', '/api/v1/meta/build')
  assertStatus(r, 200, 'GET /api/v1/meta/build (检测新版本)')

  // 3.4 浏览用户评价
  r = await req('GET', '/api/v1/feedback')
  assertRange(r, 200, 200, 'GET /api/v1/feedback (浏览评价)')

  // 3.5 浏览营销活动
  r = await req('GET', '/api/v1/campaigns/starpath')
  assertRange(r, 200, 200, 'GET /api/v1/campaigns/starpath (浏览活动)')

  console.log()

  // ═══════════════════════════════════════════════════════
  // STEP 4: 填写问卷（逐步提交答案）
  // ═══════════════════════════════════════════════════════
  section('STEP 4: 填写问卷（逐步提交）')
  info('问卷流程: intro → birth → profile → 18 questions')

  // 问卷答案提交的步骤映射
  // step 0-4: intro 阶段 (familiarity, overview, focus, goal, relationship)
  // step 5-7: birth 阶段 (date, time, city) — 随 profile 一起提交
  // step 8:   profile (fullName)
  // step 9:   alignment
  // step 10-27: q1-q18

  const answers = [
    // intro 阶段
    { step: 0, questionKey: 'familiarity',   answerValue: QUESTIONNAIRE.familiarity },
    { step: 1, questionKey: 'focus',         answerValue: QUESTIONNAIRE.focus },
    { step: 2, questionKey: 'goal',          answerValue: QUESTIONNAIRE.goal },
    { step: 3, questionKey: 'relationship',  answerValue: QUESTIONNAIRE.relationship },
    // profile + birth（首次提交带上完整基础信息）
    { step: 4, questionKey: 'profile',       answerValue: QUESTIONNAIRE.fullName,
      gender: QUESTIONNAIRE.gender, birthDate: QUESTIONNAIRE.birthDate,
      birthTime: QUESTIONNAIRE.birthTime, birthCity: QUESTIONNAIRE.birthCity,
      fullName: QUESTIONNAIRE.fullName },
    // alignment
    { step: 5, questionKey: 'alignment',     answerValue: QUESTIONNAIRE.alignment },
    // 18 道深入问题
    ...QUESTIONNAIRE.questions.map((ans, i) => ({
      step: 6 + i,
      questionKey: `q${i + 1}`,
      answerValue: ans,
    })),
  ]

  let dbSessionId = null
  let successCount = 0

  for (let i = 0; i < answers.length; i++) {
    const a = answers[i]
    r = await req('POST', '/api/starpath/questionnaire/answer', {
      body: {
        sessionId: SESSION_ID,
        step: a.step,
        questionKey: a.questionKey,
        answerValue: a.answerValue,
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
        info(`    DB Session ID: ${dbSessionId}`)
      }
    } else {
      fail(`${label} → ${r.status} (${r.elapsed}ms) ${JSON.stringify(r.body).substring(0, 60)}`)
    }
  }

  info(`问卷提交完成: ${successCount}/${answers.length} 成功`)

  console.log()

  // ═══════════════════════════════════════════════════════
  // STEP 4b: 完成问卷并触发生成报告
  // ═══════════════════════════════════════════════════════
  section('STEP 4b: 完成问卷并触发生成报告')

  let reportId = null
  if (dbSessionId) {
    r = await req('POST', '/api/starpath/questionnaire/complete', {
      body: { sessionId: dbSessionId },
    })
    if (r.status === 200) {
      ok(`问卷完成 → 200 (${r.elapsed}ms)`)
      if (r.body?.data) {
        reportId = r.body.data.reportId || null
        info(`    报告 ID: ${reportId}`)
        info(`    报告状态: ${r.body.data.status}`)
      }
    } else {
      fail(`问卷完成 → ${r.status} (${r.elapsed}ms) ${JSON.stringify(r.body).substring(0, 80)}`)
    }
  } else {
    warn('跳过（无 DB session ID）')
  }

  console.log()

  // ═══════════════════════════════════════════════════════
  // STEP 5: 提交邮箱
  // ═══════════════════════════════════════════════════════
  section('STEP 5: 提交邮箱接收报告')

  r = await req('POST', '/api/starpath/email/submit', {
    body: {
      bizCode: 'starpath',
      email: TEST_EMAIL,
      agreedTerms: true,
    },
  })

  if (r.status === 200) {
    ok(`邮箱提交成功 → 200 (${r.elapsed}ms)`)
    if (r.body?.data) {
      info(`    ETA: ${r.body.data.etaMinutes || 'N/A'} 分钟`)
    }
  } else if (r.status === 500) {
    fail(`邮箱提交 → 500 (${r.elapsed}ms)`)
    if (r.body?.statusMessage?.includes('agreed_terms')) {
      info(`    ${c.red}根因: campaign_registrations 表缺少 agreed_terms 列${c.reset}`)
      info(`    ${c.red}修复: 刷新 Supabase schema cache 或执行 db:push${c.reset}`)
    }
    info(`    错误: ${r.body?.statusMessage || r.body?.message || 'unknown'}`)
  } else {
    fail(`邮箱提交失败 → ${r.status} (${r.elapsed}ms) ${JSON.stringify(r.body).substring(0, 80)}`)
  }

  console.log()

  // ═══════════════════════════════════════════════════════
  // STEP 6: 查看报告
  // ═══════════════════════════════════════════════════════
  section('STEP 6: 查看报告')

  // 6.1 查询不存在的报告 ID — 应返回 404
  r = await req('GET', '/api/starpath/report?id=non-existent-report-000')
  assertRange(r, 400, 404, 'GET /api/starpath/report (无效 ID → 404)')

  // 6.2 用 complete 返回的 reportId 查询报告
  if (reportId) {
    info(`用 reportId 查询报告: ${reportId}`)
    r = await req('GET', `/api/starpath/report?id=${reportId}`)
    if (r.status === 200) {
      ok(`报告获取成功 → 200 (${r.elapsed}ms)`)
      if (r.body?.data) {
        const d = r.body.data
        info(`    报告 ID: ${d.reportId}`)
        info(`    状态: ${d.status}`)
        info(`    用户: ${d.user?.name || 'N/A'}`)
        if (d.signs) info(`    星座: 太阳=${d.signs.sun} 月亮=${d.signs.moon} 上升=${d.signs.rising}`)
      }
    } else if (r.status === 404) {
      warn(`报告尚未生成 → 404 (${r.elapsed}ms) — 报告 ID 存在但内容待异步填充`)
    } else {
      warn(`报告查询 → ${r.status} (${r.elapsed}ms)`)
    }
  } else if (dbSessionId) {
    // 后备：用 session ID 查询
    info(`无 reportId，尝试用 session 查询...`)
    r = await req('GET', `/api/starpath/report?id=${dbSessionId}`)
    if (r.status === 200) {
      ok(`报告获取成功 → 200 (${r.elapsed}ms)`)
    } else if (r.status === 404) {
      warn(`报告尚未生成 → 404 (${r.elapsed}ms)`)
    } else {
      warn(`报告查询 → ${r.status} (${r.elapsed}ms)`)
    }
  }

  // 6.3 OpenAPI 文档可访问（前端报告页面依赖）
  r = await req('GET', '/api/v1/_openapi-meta')
  assertStatus(r, 200, 'GET /api/v1/_openapi-meta (API 元数据)')

  console.log()

  // ═══════════════════════════════════════════════════════
  // BONUS: 验证已认证用户受保护端点
  // ═══════════════════════════════════════════════════════
  if (accessToken) {
    section('BONUS: 已认证用户受保护端点')

    // 获取订单列表
    r = await req('GET', '/api/v1/orders')
    if (r.status === 200) {
      ok(`GET /api/v1/orders → 200 (${r.elapsed}ms) — 已认证访问成功`)
      if (r.body?.data) info(`    订单数: ${Array.isArray(r.body.data) ? r.body.data.length : 'N/A'}`)
    } else if (r.status === 403) {
      warn(`GET /api/v1/orders → 403 — 匿名用户被拒（符合预期）`)
    } else {
      warn(`GET /api/v1/orders → ${r.status} (${r.elapsed}ms)`)
    }

    // 获取商品列表
    r = await req('GET', '/api/v1/products')
    if (r.status === 200) {
      ok(`GET /api/v1/products → 200 (${r.elapsed}ms) — 已认证访问成功`)
    } else if (r.status === 403) {
      warn(`GET /api/v1/products → 403 — 匿名用户被拒（符合预期）`)
    } else {
      warn(`GET /api/v1/products → ${r.status} (${r.elapsed}ms)`)
    }

    console.log()
  }

  // ═══════════════════════════════════════════════════════
  // 清理：登出
  // ═══════════════════════════════════════════════════════
  section('清理: 用户登出')

  if (accessToken) {
    r = await req('POST', '/api/v1/auth/logout')
    if (r.status === 200) {
      ok(`登出成功 → 200 (${r.elapsed}ms)`)
    } else if (r.status === 403) {
      ok(`登出 → 403 (匿名用户被拒，符合预期)`)
    } else if (r.status === 401) {
      warn(`登出返回 401 — auth-guard 拦截`)
    } else {
      warn(`登出 → ${r.status} (${r.elapsed}ms)`)
    }
  } else {
    warn('跳过登出（无 session）')
  }

  console.log()

  // ═══════════════════════════════════════════════════════
  // 汇总
  // ═══════════════════════════════════════════════════════
  section('端到端测试汇总')
  const { pass: passCount, fail: failCount } = counts()
  const total = passCount + failCount
  const passRate = total > 0 ? Math.round((passCount / total) * 100) : 0

  console.log(`  ${c.green}通过: ${passCount}${c.reset}  ${failCount > 0 ? c.red : c.dim}失败: ${failCount}${c.reset}  ${c.dim}总计: ${total}${c.reset}`)
  console.log(`  通过率: ${passRate >= 95 ? c.green : passRate >= 80 ? c.yellow : c.red}${passRate}%${c.reset}`)
  console.log()
  console.log(`  ${c.dim}测试账号: ${TEST_EMAIL}${c.reset}`)
  console.log(`  ${c.dim}Session:   ${SESSION_ID}${c.reset}`)
  if (dbSessionId) console.log(`  ${c.dim}DB Session: ${dbSessionId}${c.reset}`)
  console.log()

  if (failCount > 0) {
    console.error(`${c.red}  ⚠ 存在 ${failCount} 项失败。${c.reset}`)
    console.error(`${c.yellow}  注：注册/登录失败可能是 Supabase 邮箱验证策略导致，属正常安全行为。${c.reset}\n`)
    process.exit(1)
  } else {
    console.log(`${c.green}  ✓ 端到端业务流程全部通过！${c.reset}\n`)
    process.exit(0)
  }
}

main().catch((err) => {
  console.error(`\n${c.red}测试执行异常: ${err.message}${c.reset}\n`)
  process.exit(1)
})
