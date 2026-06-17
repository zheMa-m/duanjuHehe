/**
 * Supabase 数据库连通性 + 表完备性 + Storage Bucket 一键诊断
 *
 * 运行方式:
 *   node scripts/test-supabase-connection.mjs
 *   npm run test:supabase
 *
 * 前提: .env 中 MOCK_DB=false，SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 已配置
 */

import { createClient } from '@supabase/supabase-js'
import { loadEnv, c, ok, fail, info, warn, section, counts } from './_shared.mjs'

loadEnv(import.meta.url)

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log(`\n${c.bold}${c.cyan}══════════════════════════════════════════════════${c.reset}`)
console.log(`${c.bold}${c.cyan}  Supabase 数据库 & Storage 一键诊断${c.reset}`)
console.log(`${c.bold}${c.cyan}══════════════════════════════════════════════════${c.reset}`)

// ─── 前置检查 ────────────────────────────────────────
if (process.env.MOCK_DB === 'true') {
  warn('MOCK_DB=true（沙盒模式），请设为 false 后重试')
  process.exit(1)
}
if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
  console.log(`${c.red}  SUPABASE_URL 未配置或为占位符${c.reset}`)
  process.exit(1)
}
if (!serviceRoleKey || serviceRoleKey.includes('placeholder')) {
  console.log(`${c.red}  SUPABASE_SERVICE_ROLE_KEY 未配置或为占位符${c.reset}`)
  process.exit(1)
}

info(`SUPABASE_URL: ${supabaseUrl}`)
info(`SERVICE_ROLE_KEY: ${serviceRoleKey.substring(0, 20)}...`)

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// ═══════════════════════════════════════════════════════
//  1. 连通性 + 表完备性检查
// ═══════════════════════════════════════════════════════
section('1. 连通性 & 表完备性检查')

const requiredTables = [
  'profiles',       // 0001_core
  'tasks',          // 0001_core
  'activity_logs',  // 0001_core
  'campaigns',      // 0002_campaign_optional
  'feedbacks',      // 0004_feedback_optional
  'products',       // 0005_payment_optional
  'orders',         // 0005_payment_optional
  'campaign_registrations', // 0006_campaign_registrations
]

for (const table of requiredTables) {
  const { error } = await supabase.from(table).select('*').limit(1)
  if (error) {
    if (error.message.includes('fetch failed') || error.message.includes('ENOTFOUND')) {
      console.log(`${c.red}  连接失败: 无法访问 Supabase${c.reset}`)
      process.exit(1)
    }
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      fail(`${table} — 未创建（可选模块未启用）`)
    } else {
      ok(`${table} — 已存在`)
    }
  } else {
    ok(`${table} — 已存在`)
  }
}

// ═══════════════════════════════════════════════════════
//  2. Storage Bucket 检查
// ═══════════════════════════════════════════════════════
section('2. Storage Bucket 检查')

const expectedBuckets = [
  { id: 'avatars', public: true, sizeLimit: 2097152 },
  { id: 'campaign-assets', public: true, sizeLimit: 10485760 },
  { id: 'uploads', public: false, sizeLimit: 52428800 },
]

for (const expected of expectedBuckets) {
  const { data, error } = await supabase.storage.getBucket(expected.id)
  if (error) {
    fail(`Bucket "${expected.id}" — 不存在: ${error.message}`)
  } else {
    const publicOk = data.public === expected.public
    const sizeOk = data.file_size_limit === expected.sizeLimit
    if (publicOk && sizeOk) {
      ok(`Bucket "${expected.id}" — public=${data.public}, size_limit=${data.file_size_limit}`)
    } else {
      fail(`Bucket "${expected.id}" — 配置不匹配 (期望 public=${expected.public}, limit=${expected.sizeLimit}; 实际 public=${data.public}, limit=${data.file_size_limit})`)
    }
  }
}

// ═══════════════════════════════════════════════════════
//  3. 迁移状态检查
// ═══════════════════════════════════════════════════════
section('3. 迁移版本检查')

// 通过查询 supabase_migrations.schema_migrations 表获取已应用迁移
const { data: migrations, error: migErr } = await supabase
  .from('supabase_migrations.schema_migrations')
  .select('version, name')
  .order('version')

if (migErr) {
  // 直接查询替代方式
  info(`无法查询迁移表 (${migErr.message.substring(0, 40)})，跳过迁移检查`)
} else if (migrations?.length) {
  migrations.forEach(m => ok(`迁移 ${m.version} — ${m.name || '(已应用)'}`))
} else {
  info('未找到迁移记录')
}

// ═══════════════════════════════════════════════════════
//  汇总
// ═══════════════════════════════════════════════════════
console.log(`\n${c.bold}${c.cyan}══════════════════════════════════════════════════${c.reset}`)
const { pass: passCount, fail: failCount } = counts()
const total = passCount + failCount
if (failCount === 0) {
  console.log(`${c.bold}${c.green}  诊断通过！${passCount}/${total} 项检查成功${c.reset}`)
} else {
  console.log(`${c.bold}${c.red}  有 ${failCount}/${total} 项检查未通过${c.reset}`)
}
console.log(`${c.bold}${c.cyan}══════════════════════════════════════════════════${c.reset}\n`)

process.exit(failCount > 0 ? 1 : 0)
