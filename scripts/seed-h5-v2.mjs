/**
 * 营销 H5 v2 种子数据脚本
 *
 * 功能：向物理 Supabase 数据库中插入"营销 H5 v2"活动配置记录
 * 运行方式：node scripts/seed-h5-v2.mjs
 *
 * 前提：.env 中 MOCK_DB=false，SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 已配置
 */

import { createClient } from '@supabase/supabase-js'
import { loadEnv, c, ok, fail, info, section } from './_shared.mjs'

loadEnv(import.meta.url)

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log(`\n${c.bold}${c.cyan}════════════════════════════════════════${c.reset}`)
console.log(`${c.bold}${c.cyan}  营销 H5 v2 活动配置种子数据写入${c.reset}`)
console.log(`${c.bold}${c.cyan}════════════════════════════════════════${c.reset}`)

if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
  console.log(`${c.red}  SUPABASE_URL 未配置，请检查 .env${c.reset}`)
  process.exit(1)
}
if (!serviceRoleKey || serviceRoleKey.includes('placeholder')) {
  console.log(`${c.red}  SUPABASE_SERVICE_ROLE_KEY 未配置，请检查 .env${c.reset}`)
  process.exit(1)
}

info(`SUPABASE_URL: ${supabaseUrl}`)

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

section('检查 h5-v2 活动是否已存在')

const { data: existing, error: checkErr } = await supabase
  .from('campaigns')
  .select('id, subdomain, title')
  .eq('subdomain', 'h5-v2')
  .single()

if (checkErr && checkErr.code !== 'PGRST116') {
  // PGRST116 = 未找到记录，属正常情况
  fail(`查询失败: ${checkErr.message}`)
  process.exit(1)
}

if (existing) {
  ok(`活动 "h5-v2" 已存在（id: ${existing.id}），跳过写入`)
  console.log(`\n${c.bold}${c.green}  ✅ 无需操作，记录已是最新${c.reset}\n`)
  process.exit(0)
}

section('插入 h5-v2 活动配置')

const { data: inserted, error: insertErr } = await supabase
  .from('campaigns')
  .insert({
    subdomain: 'h5-v2',
    title: '🎨 HEHE 营销 H5 v2 新野兽派',
    subtitle: '采用大胆的新野兽派视觉版式，引入 3D 浮动卡片、扫光粒子与极客跑马灯。',
    badge: '全新 V2 体验',
    color_from: 'from-green-400',
    color_to: 'to-emerald-600',
    is_active: true,
    cta_text: '立即体验',
    sort_order: 10,
  })
  .select()

if (insertErr) {
  fail(`写入失败: ${insertErr.message}`)
  process.exit(1)
}

ok(`活动配置已成功写入！`)
console.log(`  ${c.cyan}新记录 ID: ${inserted?.[0]?.id}${c.reset}`)
console.log(`  ${c.cyan}subdomain: h5-v2${c.reset}`)

console.log(`\n${c.bold}${c.cyan}════════════════════════════════════════${c.reset}`)
console.log(`${c.bold}${c.green}  🎉 种子数据写入完成！${c.reset}`)
console.log(`${c.bold}${c.cyan}════════════════════════════════════════${c.reset}\n`)
console.log(`${c.yellow}  ► 重启 dev server 后，在管理后台可见新活动配置${c.reset}`)
console.log(`${c.yellow}  ► 访问 /h5-v2/h5-v2 预览新版落地页${c.reset}\n`)
