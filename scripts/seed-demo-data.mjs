/**
 * 全量模拟数据种子脚本
 *
 * 写入真实感模拟数据到 Supabase 数据库：
 *   - 12 个用户（含不同角色、订阅等级、登录方式）
 *   - 8 个商品
 *   - 25+ 笔订单（各种状态）
 *   - 6+ 条订阅记录
 *   - 15+ 条用户反馈
 *   - 30+ 条审计日志
 *
 * 运行方式：
 *   node scripts/seed-demo-data.mjs          # 增量写入（跳过已存在）
 *   node scripts/seed-demo-data.mjs --clean  # 先清理旧模拟数据再写入
 *
 * 前提：.env 中 MOCK_DB=false，SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 已配置
 */

import { createClient } from '@supabase/supabase-js'
import { loadEnv, c, ok, fail, info, warn, section, counts } from './_shared.mjs'

loadEnv(import.meta.url)

const CLEAN_MODE = process.argv.includes('--clean')
const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log(`\n${c.bold}${c.cyan}══════════════════════════════════════════════════${c.reset}`)
console.log(`${c.bold}${c.cyan}  HEHE 全量模拟数据种子写入${c.reset}`)
console.log(`${c.bold}${c.cyan}══════════════════════════════════════════════════${c.reset}`)
if (CLEAN_MODE) warn('⚠  --clean 模式：将先删除已有模拟数据')

// ─── 前置检查 ────────────────────────────────────────
if (process.env.MOCK_DB === 'true') {
  warn('MOCK_DB=true（沙盒模式），请设为 false 后重试')
  process.exit(1)
}
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

// ─── 固定管理员 UUID（0001_core 预置） ───────────────
const ADMIN_UUID = '9e638ba2-41aa-4434-a68b-6bd9f7ed0963'

// ─── 时间工具 ─────────────────────────────────────────
function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}
function daysLater(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString()
}
function randomDate(startDaysAgo, endDaysAgo) {
  const start = new Date()
  start.setDate(start.getDate() - startDaysAgo)
  const end = new Date()
  end.setDate(end.getDate() - endDaysAgo)
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString()
}

// ═══════════════════════════════════════════════════════
//  模拟用户数据
// ═══════════════════════════════════════════════════════

const SEED_TAG = 'seed_demo'  // 用于标记和清理

const MOCK_USERS = [
  { email: 'zhangwei@hehe.dev',    password: 'Demo@12345', username: 'zhangwei',    display_name: '张伟',   role: 'admin', plan_status: 'enterprise', auth_provider: 'email',    phone: '13800138001' },
  { email: 'lina@hehe.dev',        password: 'Demo@12345', username: 'lina',        display_name: '李娜',   role: 'user',  plan_status: 'pro',        auth_provider: 'google',   phone: '13900139002' },
  { email: 'wangfang@hehe.dev',    password: 'Demo@12345', username: 'wangfang',    display_name: '王芳',   role: 'user',  plan_status: 'pro',        auth_provider: 'email',    phone: '13700137003' },
  { email: 'liuyang@hehe.dev',     password: 'Demo@12345', username: 'liuyang',     display_name: '刘洋',   role: 'user',  plan_status: 'free',       auth_provider: 'email',    phone: '13600136004' },
  { email: 'chenxiao@hehe.dev',    password: 'Demo@12345', username: 'chenxiao',    display_name: '陈晓',   role: 'user',  plan_status: 'pro',        auth_provider: 'facebook', phone: null },
  { email: 'zhaolei@hehe.dev',     password: 'Demo@12345', username: 'zhaolei',     display_name: '赵磊',   role: 'user',  plan_status: 'free',       auth_provider: 'email',    phone: '13500135006' },
  { email: 'sunli@hehe.dev',       password: 'Demo@12345', username: 'sunli',       display_name: '孙丽',   role: 'user',  plan_status: 'enterprise', auth_provider: 'apple',    phone: '13400134007' },
  { email: 'zhoujun@hehe.dev',     password: 'Demo@12345', username: 'zhoujun',     display_name: '周军',   role: 'user',  plan_status: 'pro',        auth_provider: 'email',    phone: null },
  { email: 'wumin@hehe.dev',       password: 'Demo@12345', username: 'wumin',       display_name: '吴敏',   role: 'user',  plan_status: 'free',       auth_provider: 'google',   phone: '13300133009' },
  { email: 'huangjie@hehe.dev',    password: 'Demo@12345', username: 'huangjie',    display_name: '黄杰',   role: 'user',  plan_status: 'free',       auth_provider: 'email',    phone: '13200132010' },
  { email: 'xumengyao@hehe.dev',   password: 'Demo@12345', username: 'xumengyao',   display_name: '徐梦瑶', role: 'user',  plan_status: 'pro',        auth_provider: 'email',    phone: '13100131011' },
  { email: 'anon_001@anonymous.hehe.dev', password: 'Demo@12345', username: null,          display_name: null,     role: 'user',  plan_status: 'free',       auth_provider: 'anonymous', phone: null, is_anonymous: true },
]

// ═══════════════════════════════════════════════════════
//  模拟商品数据
// ═══════════════════════════════════════════════════════

const MOCK_PRODUCTS = [
  { name: '基础月度套餐',   price: 29.00,   is_active: true,  payment_meta: { stripe_price_id: 'price_basic_monthly' } },
  { name: '专业月度套餐',   price: 99.00,   is_active: true,  payment_meta: { stripe_price_id: 'price_pro_monthly' } },
  { name: '专业年度套餐',   price: 899.00,  is_active: true,  payment_meta: { stripe_price_id: 'price_pro_yearly' } },
  { name: '企业月度套餐',   price: 299.00,  is_active: true,  payment_meta: { stripe_price_id: 'price_enterprise_monthly' } },
  { name: '企业年度套餐',   price: 2699.00, is_active: true,  payment_meta: { stripe_price_id: 'price_enterprise_yearly' } },
  { name: '流量加速包 10K', price: 49.00,   is_active: true,  payment_meta: { stripe_price_id: 'price_traffic_10k' } },
  { name: '存储空间扩展 50G', price: 39.00, is_active: true,  payment_meta: { stripe_price_id: 'price_storage_50g' } },
  { name: '旧版入门套餐',   price: 9.90,    is_active: false, payment_meta: { stripe_price_id: 'price_legacy_starter' } },
]

// ═══════════════════════════════════════════════════════
//  模拟反馈数据
// ═══════════════════════════════════════════════════════

const MOCK_FEEDBACKS = [
  { type: 'review',  rating: 5, comment: '非常好用的平台，界面简洁美观，功能齐全！', display_name: '张伟', is_approved: true, admin_reply: '感谢您的认可！', campaign_subdomain: 'h5-v2' },
  { type: 'review',  rating: 4, comment: '整体体验不错，希望能增加批量操作功能。', display_name: '李娜', is_approved: true, admin_reply: null, campaign_subdomain: 'h5-v2' },
  { type: 'review',  rating: 5, comment: '客服响应很快，问题都能及时解决。', display_name: '王芳', is_approved: true, admin_reply: '感谢好评，我们会继续努力！', campaign_subdomain: 'h5-v2' },
  { type: 'bug',     rating: 2, comment: '移动端在某些页面加载很慢，图片显示不全。', display_name: '刘洋', is_approved: true, admin_reply: '已收到反馈，正在优化中。', campaign_subdomain: null },
  { type: 'feature', rating: 4, comment: '希望能支持微信支付和支付宝支付。', display_name: '陈晓', is_approved: false, admin_reply: null, campaign_subdomain: null },
  { type: 'review',  rating: 5, comment: '数据分析功能很强大，报表一目了然。', display_name: '孙丽', is_approved: true, admin_reply: null, campaign_subdomain: 'h5-v2' },
  { type: 'general', rating: 3, comment: '功能还行，但文档不太完善，有些 API 不知道怎么用。', display_name: '周军', is_approved: true, admin_reply: '感谢反馈，文档正在补充中。', campaign_subdomain: null },
  { type: 'bug',     rating: 1, comment: '注册流程有问题，验证码收不到。', display_name: '赵磊', is_approved: true, admin_reply: '已修复，请重新尝试。', campaign_subdomain: null },
  { type: 'feature', rating: 4, comment: '建议增加数据导出功能，支持 CSV 和 Excel。', display_name: '吴敏', is_approved: false, admin_reply: null, campaign_subdomain: null },
  { type: 'review',  rating: 5, comment: '性价比很高，比同类产品好用很多！', display_name: '黄杰', is_approved: true, admin_reply: null, campaign_subdomain: 'h5-v2' },
  { type: 'review',  rating: 4, comment: '营销页面模板很丰富，自定义程度也高。', display_name: '徐梦瑶', is_approved: true, admin_reply: null, campaign_subdomain: 'h5-v2' },
  { type: 'general', rating: 3, comment: '希望后台管理能支持深色模式。', display_name: '张伟', is_approved: true, admin_reply: '已支持，可在设置中切换。', campaign_subdomain: null },
  { type: 'feature', rating: null, comment: '能否支持多语言？我们有海外客户需求。', display_name: '李娜', is_approved: false, admin_reply: null, campaign_subdomain: null },
  { type: 'bug',     rating: 2, comment: '订单导出时金额精度丢失，小数位显示不对。', display_name: '王芳', is_approved: true, admin_reply: '已修复，v1.2.1 发布。', campaign_subdomain: null },
  { type: 'review',  rating: 5, comment: '用了三个月了，稳定可靠，强烈推荐！', display_name: '孙丽', is_approved: true, admin_reply: null, campaign_subdomain: 'h5-v2' },
]

// ═══════════════════════════════════════════════════════
//  主流程
// ═══════════════════════════════════════════════════════

let createdUserIds = []

// ── 清理模式 ─────────────────────────────────────────
if (CLEAN_MODE) {
  section('清理旧模拟数据')

  // 按依赖顺序清理
  const cleanTables = ['activity_logs', 'feedbacks', 'subscriptions', 'orders', 'products']
  for (const table of cleanTables) {
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000').is('id', null) // noop — 用 rpc 或直接 delete
    // service_role 直接 delete all
    const { error: delErr, count } = await supabase.from(table).delete().not('id', 'is', null)
    if (delErr) {
      warn(`清理 ${table}: ${delErr.message}`)
    } else {
      ok(`${table} — 已清理`)
    }
  }

  // 清理非管理员的 profiles（及关联 auth.users）
  const { data: nonAdminProfiles } = await supabase
    .from('profiles')
    .select('id')
    .neq('id', ADMIN_UUID)

  if (nonAdminProfiles?.length) {
    for (const p of nonAdminProfiles) {
      await supabase.auth.admin.deleteUser(p.id)
    }
    ok(`已删除 ${nonAdminProfiles.length} 个非管理员用户`)
  }
}

// ═══════════════════════════════════════════════════════
//  1. 创建用户
// ═══════════════════════════════════════════════════════
section('1. 创建模拟用户')

// 预加载 auth.users 列表，避免重复请求
const { data: _authListAll } = await supabase.auth.admin.listUsers()
const existingAuthMap = new Map((_authListAll?.users || []).map(u => [u.email, u]))

for (const u of MOCK_USERS) {
  // 检查 profiles 是否已存在
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('email', u.email)
    .maybeSingle()

  if (existingProfile) {
    ok(`${u.display_name || u.email} — 已存在 (${existingProfile.id.substring(0, 8)}...)`)
    createdUserIds.push(existingProfile.id)
    continue
  }

  // 检查 auth.users（可能 profile 的 email 未同步）
  const existingAuth = existingAuthMap.get(u.email)
  if (existingAuth) {
    ok(`${u.display_name || u.email} — auth 已存在 (${existingAuth.id.substring(0, 8)}...)`)
    createdUserIds.push(existingAuth.id)
    // 同步更新 profile
    await supabase.from('profiles').update({
      role: u.role, plan_status: u.plan_status, auth_provider: u.auth_provider,
      phone: u.phone, is_anonymous: u.is_anonymous || false,
    }).eq('id', existingAuth.id)
    continue
  }

  // 通过 Admin API 创建 auth.users（触发器自动创建 profile）
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true,
    user_metadata: {
      username: u.username,
      display_name: u.display_name,
      provider: u.auth_provider === 'anonymous' ? 'email' : u.auth_provider,
      is_anonymous: u.is_anonymous || false,
    },
  })

  if (authErr) {
    fail(`${u.display_name || u.email} — 创建失败: ${authErr.message}`)
    continue
  }

  const userId = authData.user.id
  createdUserIds.push(userId)

  // 更新 profile 到目标状态
  const { error: updateErr } = await supabase
    .from('profiles')
    .update({
      role: u.role,
      plan_status: u.plan_status,
      auth_provider: u.auth_provider,
      phone: u.phone,
      is_anonymous: u.is_anonymous || false,
      email_verified: u.auth_provider !== 'anonymous',
      stripe_customer_id: u.plan_status !== 'free' ? `cus_mock_${userId.substring(0, 8)}` : null,
    })
    .eq('id', userId)

  if (updateErr) {
    warn(`${u.display_name || u.email} — profile 更新: ${updateErr.message}`)
  } else {
    ok(`${u.display_name || u.email} — 已创建 (${userId.substring(0, 8)}...)`)
  }
}

info(`共 ${createdUserIds.length} 个用户就绪`)

// ═══════════════════════════════════════════════════════
//  2. 创建商品
// ═══════════════════════════════════════════════════════
section('2. 创建模拟商品')

const productIds = []
for (const p of MOCK_PRODUCTS) {
  // 幂等：按名称检查
  const { data: existing } = await supabase
    .from('products')
    .select('id')
    .eq('name', p.name)
    .maybeSingle()

  if (existing) {
    ok(`${p.name} — 已存在`)
    productIds.push(existing.id)
    continue
  }

  const { data, error } = await supabase
    .from('products')
    .insert({
      ...p,
      tenant_id: ADMIN_UUID,
      created_at: randomDate(120, 30),
    })
    .select('id')

  if (error) {
    fail(`${p.name} — ${error.message}`)
    productIds.push(null)
  } else {
    ok(`${p.name} — ¥${p.price}`)
    productIds.push(data[0].id)
  }
}

// ═══════════════════════════════════════════════════════
//  3. 创建订单
// ═══════════════════════════════════════════════════════
section('3. 创建模拟订单')

const orderStatuses = ['paid', 'paid', 'paid', 'paid', 'paid', 'pending', 'failed', 'refunded']
const paymentProviders = ['stripe', 'stripe', 'stripe', 'paypal', 'manual']
let orderCounter = 1000

function generateOrderNo() {
  orderCounter++
  const ts = new Date().toISOString().replace(/[-:T]/g, '').substring(0, 12)
  return `HEHE-${ts}-${orderCounter}`
}

// 为每个非匿名用户创建 2-3 个订单
let orderCount = 0
for (let i = 0; i < Math.min(createdUserIds.length, 8); i++) {
  const userId = createdUserIds[i]
  const numOrders = 2 + Math.floor(Math.random() * 2)

  for (let j = 0; j < numOrders; j++) {
    const prodIdx = Math.floor(Math.random() * MOCK_PRODUCTS.length)
    const product = MOCK_PRODUCTS[prodIdx]
    const productId = productIds[prodIdx]
    const status = orderStatuses[Math.floor(Math.random() * orderStatuses.length)]
    const provider = paymentProviders[Math.floor(Math.random() * paymentProviders.length)]

    const { error } = await supabase
      .from('orders')
      .insert({
        order_no: generateOrderNo(),
        product_id: productId,
        product_name: product.name,
        amount: product.price,
        currency: 'CNY',
        status,
        user_id: userId,
        payment_provider: provider,
        payment_intent_id: status === 'paid' ? `pi_mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}` : null,
        created_at: randomDate(90, 1),
      })

    if (!error) orderCount++
  }
}

ok(`已创建 ${orderCount} 笔订单`)

// ═══════════════════════════════════════════════════════
//  4. 创建订阅
// ═══════════════════════════════════════════════════════
section('4. 创建模拟订阅')

const subStatuses = ['active', 'active', 'active', 'trialing', 'past_due', 'canceled']
let subCount = 0

// 为 pro/enterprise 用户创建订阅
const paidUsers = MOCK_USERS.filter(u => u.plan_status !== 'free')
for (let i = 0; i < paidUsers.length && i < createdUserIds.length; i++) {
  const user = paidUsers[i]
  const userId = createdUserIds[i]
  const isYearly = Math.random() > 0.5
  const priceId = user.plan_status === 'enterprise'
    ? (isYearly ? 'price_enterprise_yearly' : 'price_enterprise_monthly')
    : (isYearly ? 'price_pro_yearly' : 'price_pro_monthly')
  const status = subStatuses[Math.floor(Math.random() * subStatuses.length)]
  const startDate = randomDate(60, 10)
  const startDt = new Date(startDate)
  const endDt = new Date(startDt)
  endDt.setMonth(endDt.getMonth() + (isYearly ? 12 : 1))

  const { error } = await supabase
    .from('subscriptions')
    .insert({
      user_id: userId,
      stripe_subscription_id: `sub_mock_${userId.substring(0, 8)}_${Date.now()}`,
      status,
      price_id: priceId,
      quantity: 1,
      cancel_at_period_end: status === 'canceled',
      current_period_start: startDt.toISOString(),
      current_period_end: endDt.toISOString(),
      created_at: startDate,
    })

  if (!error) subCount++
}

ok(`已创建 ${subCount} 条订阅记录`)

// ═══════════════════════════════════════════════════════
//  5. 创建反馈
// ═══════════════════════════════════════════════════════
section('5. 创建模拟反馈')

let feedbackCount = 0
for (let i = 0; i < MOCK_FEEDBACKS.length; i++) {
  const fb = MOCK_FEEDBACKS[i]
  const userIdx = i % Math.min(createdUserIds.length, 6)

  const { error } = await supabase
    .from('feedbacks')
    .insert({
      ...fb,
      user_id: createdUserIds[userIdx] || null,
      created_at: randomDate(60, 1),
    })

  if (!error) feedbackCount++
}

ok(`已创建 ${feedbackCount} 条反馈`)

// ═══════════════════════════════════════════════════════
//  6. 创建审计日志
// ═══════════════════════════════════════════════════════
section('6. 创建模拟审计日志')

const LOG_TEMPLATES = [
  { category: 'auth',   action: 'user.login',            meta: { provider: 'email' } },
  { category: 'auth',   action: 'user.login',            meta: { provider: 'google' } },
  { category: 'auth',   action: 'user.logout',           meta: {} },
  { category: 'auth',   action: 'user.signup',           meta: { provider: 'email' } },
  { category: 'auth',   action: 'user.password_reset',   meta: {} },
  { category: 'admin',  action: 'product.create',        meta: { product: '基础月度套餐' } },
  { category: 'admin',  action: 'product.update',        meta: { product: '专业月度套餐', field: 'price' } },
  { category: 'admin',  action: 'order.status_change',   meta: { order_no: 'HEHE-202606', from: 'pending', to: 'paid' } },
  { category: 'admin',  action: 'campaign.update',       meta: { subdomain: 'h5-v2', field: 'is_active' } },
  { category: 'admin',  action: 'campaign.create',       meta: { subdomain: 'summer-sale' } },
  { category: 'admin',  action: 'feedback.approve',      meta: { rating: 5 } },
  { category: 'admin',  action: 'feedback.reply',        meta: {} },
  { category: 'admin',  action: 'user.role_change',      meta: { from: 'user', to: 'admin' } },
  { category: 'admin',  action: 'config.update',         meta: { key: 'analytics_settings' } },
  { category: 'admin',  action: 'media.upload',          meta: { bucket: 'uploads', file: 'report.pdf' } },
  { category: 'system', action: 'backup.complete',       meta: { tables: 12, size_mb: 4.2 } },
  { category: 'system', action: 'migration.applied',     meta: { version: '0006' } },
  { category: 'system', action: 'api.rate_limit',        meta: { endpoint: '/api/v1/orders', ip: '223.104.xx.xx' } },
]

const FAKE_IPS = ['192.168.1.100', '10.0.0.55', '223.104.63.12', '114.240.88.7', '175.10.23.45', '2001:db8::1']

let logCount = 0
for (let i = 0; i < 35; i++) {
  const template = LOG_TEMPLATES[i % LOG_TEMPLATES.length]
  const userId = template.category !== 'system'
    ? createdUserIds[Math.floor(Math.random() * Math.min(createdUserIds.length, 6))]
    : null

  const { error } = await supabase
    .from('activity_logs')
    .insert({
      category: template.category,
      user_id: userId,
      action: template.action,
      ip: FAKE_IPS[Math.floor(Math.random() * FAKE_IPS.length)],
      metadata: template.meta,
      created_at: randomDate(30, 0),
    })

  if (!error) logCount++
}

ok(`已创建 ${logCount} 条审计日志`)

// ═══════════════════════════════════════════════════════
//  7. 创建留资预约记录
// ═══════════════════════════════════════════════════════
section('7. 创建模拟留资预约')

// 先查出所有活动，用于关联 campaign_id
const { data: allCampaigns } = await supabase
  .from('campaigns')
  .select('id, subdomain')

const campaignMap = new Map((allCampaigns || []).map(c => [c.subdomain, c.id]))

// 真实感留资数据
const MOCK_LEADS = [
  // h5-v2 活动留资
  { subdomain: 'h5-v2', phone: '13811001001', email: 'liuhao@qq.com',       days: 1  },
  { subdomain: 'h5-v2', phone: '13922002002', email: 'zhangming@163.com',   days: 1  },
  { subdomain: 'h5-v2', phone: '15033003003', email: 'wangli@gmail.com',    days: 2  },
  { subdomain: 'h5-v2', phone: '18644004004', email: 'chenxiao@outlook.com', days: 2  },
  { subdomain: 'h5-v2', phone: '13755005005', email: 'sunwei@qq.com',       days: 3  },
  { subdomain: 'h5-v2', phone: '15866006006', email: 'zhoujun@163.com',     days: 4  },
  { subdomain: 'h5-v2', phone: '18077007007', email: 'wumin@hotmail.com',   days: 5  },
  { subdomain: 'h5-v2', phone: '13688008008', email: 'huangpeng@qq.com',    days: 5  },
  { subdomain: 'h5-v2', phone: '15199009009', email: 'xujing@163.com',      days: 6  },
  { subdomain: 'h5-v2', phone: '18200100010', email: 'helei@gmail.com',     days: 7  },
  { subdomain: 'h5-v2', phone: '13711111111', email: 'malin@qq.com',        days: 8  },
  { subdomain: 'h5-v2', phone: '15922222222', email: 'gaoyang@163.com',     days: 9  },
  { subdomain: 'h5-v2', phone: '18533333333', email: 'linzhi@outlook.com',  days: 10 },
  { subdomain: 'h5-v2', phone: '13844444444', email: 'zhengyu@qq.com',      days: 11 },
  { subdomain: 'h5-v2', phone: '15755555555', email: 'caoyang@gmail.com',   days: 12 },
  { subdomain: 'h5-v2', phone: '18666666666', email: 'dingning@163.com',    days: 13 },
  { subdomain: 'h5-v2', phone: '13977777777', email: 'fanyu@hotmail.com',   days: 14 },
  { subdomain: 'h5-v2', phone: '15088888888', email: 'songqi@qq.com',       days: 15 },
  { subdomain: 'h5-v2', phone: '18199999999', email: 'tangwei@163.com',     days: 16 },
  { subdomain: 'h5-v2', phone: '13600000000', email: 'renjie@gmail.com',    days: 18 },
  { subdomain: 'h5-v2', phone: '15512345678', email: 'hanbing@outlook.com', days: 20 },
  { subdomain: 'h5-v2', phone: '18823456789', email: 'lvzhi@qq.com',        days: 22 },
  { subdomain: 'h5-v2', phone: '13534567890', email: 'jianghua@163.com',    days: 25 },
  { subdomain: 'h5-v2', phone: '15645678901', email: 'qinxue@gmail.com',    days: 28 },
  { subdomain: 'h5-v2', phone: '18756789012', email: 'shenyi@hotmail.com',  days: 30 },
  // 其他活动（若存在 promo / ai 活动则也会写入）
  { subdomain: 'promo',  phone: '13800100001', email: 'promo_user1@qq.com',  days: 3  },
  { subdomain: 'promo',  phone: '13900200002', email: 'promo_user2@163.com', days: 7  },
  { subdomain: 'promo',  phone: '15000300003', email: 'promo_user3@gmail.com', days: 14 },
  { subdomain: 'ai',     phone: '18600400004', email: 'ai_lead1@qq.com',     days: 5  },
  { subdomain: 'ai',     phone: '13700500005', email: 'ai_lead2@163.com',    days: 10 },
]

let leadsCount = 0
for (const lead of MOCK_LEADS) {
  const campaignId = campaignMap.get(lead.subdomain) || null
  // 没有对应活动的跳过（避免外键约束报错）
  if (!campaignId) continue

  const { error } = await supabase
    .from('campaign_registrations')
    .insert({
      campaign_id: campaignId,
      subdomain: lead.subdomain,
      phone: lead.phone,
      email: lead.email,
      user_id: null,  // 匿名留资
      created_at: daysAgo(lead.days),
    })

  if (!error) leadsCount++
}

ok(`已创建 ${leadsCount} 条留资预约记录`)

// ═══════════════════════════════════════════════════════
//  汇总
// ═══════════════════════════════════════════════════════
console.log(`\n${c.bold}${c.cyan}══════════════════════════════════════════════════${c.reset}`)
const { pass: passCount, fail: failCount } = counts()
console.log(`${c.bold}${c.green}  写入完成！${c.reset}`)
console.log(`${c.dim}  用户: ${createdUserIds.length}  |  商品: ${productIds.filter(Boolean).length}  |  订单: ${orderCount}${c.reset}`)
console.log(`${c.dim}  订阅: ${subCount}  |  反馈: ${feedbackCount}  |  日志: ${logCount}  |  留资: ${leadsCount}${c.reset}`)
if (failCount > 0) {
  console.log(`${c.yellow}  ⚠ ${failCount} 项操作失败，请检查上方日志${c.reset}`)
}
console.log(`${c.bold}${c.cyan}══════════════════════════════════════════════════${c.reset}\n`)
console.log(`${c.yellow}  ► 重启 dev server 后，管理后台可查看全部模拟数据${c.reset}`)
console.log(`${c.yellow}  ► 所有用户密码统一为: Demo@12345${c.reset}\n`)

process.exit(failCount > 0 ? 1 : 0)
