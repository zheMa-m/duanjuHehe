import { createClient } from '@supabase/supabase-js'

let dbClient: any = null

// 内存 Mock 数据存储区，支持热加载状态保持
export const mockTasksTable: Array<{ id: string; title: string; completed: boolean; tenant_id?: string; created_at: string }> = [
  { id: '1', title: '🚀 转型指南：阅读 dev_transition_notice 熟悉团队转型概念', completed: true, tenant_id: 'mock-tenant-abc', created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: '2', title: '💻 全栈实操：绑定本地 yourdomain.localhost 域名运行预览', completed: false, tenant_id: 'mock-tenant-abc', created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: '3', title: '🛡️ 契约安全：执行 npm run test:api-safety 运行越权自动化扫描', completed: false, tenant_id: 'mock-tenant-abc', created_at: new Date().toISOString() }
]

// 内存 Mock 统一活动日志表（合并原 audit_logs + user_login_logs）
export const mockActivityLogsTable: Array<Record<string, any>> = [
  { id: 1, category: 'system', user_id: null, action: 'SYSTEM_INIT', ip: '127.0.0.1', metadata: { operator: 'system', status: 'SUCCESS' }, created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: 2, category: 'admin', user_id: null, action: 'DATABASE_MIGRATION', ip: 'localhost', metadata: { operator: 'system', status: 'SUCCESS' }, created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 3, category: 'auth', user_id: 'mock-user-123', action: 'login', ip: '127.0.0.1', metadata: { provider: 'email', user_agent: 'Chrome/120', device_id: 'dev-abc', success: true }, created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 4, category: 'auth', user_id: 'mock-user-123', action: 'login', ip: '127.0.0.1', metadata: { provider: 'google', user_agent: 'Safari/17', device_id: 'dev-abc', success: true }, created_at: new Date().toISOString() },
]

// 内存 Mock 营销活动配置表，支持后台热改，H5 前端秒级热重载渲染！
export const mockCampaignsTable: Array<Record<string, any>> = [
  {
    id: 'c-ai',
    subdomain: 'ai',
    title: '🤖 HEHE AI 协作者首发',
    subtitle: '基于先进智能体的全自动化提效工作流上线。立即预约，锁定首月免费体验资格。',
    badge: '限时 10,000 名',
    color_from: 'from-purple-600',
    color_to: 'to-indigo-600',
    ga_measurement_id: null,
    meta_pixel_id: null,
    tiktok_pixel_id: null,
  },
  {
    id: 'c-cloud',
    subdomain: 'cloud',
    title: '☁️ HEHE 云原生企业私有化',
    subtitle: '一键输出物理隔离安全沙盒，专为合规与核心系统容灾设计。首发限时 7 折特惠。',
    badge: '企业专属首发',
    color_from: 'from-blue-600',
    color_to: 'to-cyan-600',
    ga_measurement_id: null,
    meta_pixel_id: null,
    tiktok_pixel_id: null,
  },
  {
    id: 'c-h5-v1',
    subdomain: 'h5-v1',
    title: '✨ HEHE 营销 H5 v1 毛玻璃拟态',
    subtitle: '柔和毛玻璃质感与渐变光晕，适合品牌种草与轻转化场景。',
    badge: 'V1 示例',
    color_from: 'from-rose-600',
    color_to: 'to-orange-600',
    ga_measurement_id: null,
    meta_pixel_id: null,
    tiktok_pixel_id: null,
  },
  {
    id: 'c-h5-v2',
    subdomain: 'h5-v2',
    title: '🎨 HEHE 营销 H5 v2 新野兽派',
    subtitle: '采用大胆的新野兽派视觉版式，引入 3D 浮动卡片、扫光粒子与极客跑马灯。',
    badge: '全新 V2 体验',
    color_from: 'from-green-400',
    color_to: 'to-emerald-600',
    ga_measurement_id: null,
    meta_pixel_id: null,
    tiktok_pixel_id: null,
  },
  {
    id: 'c-starpath',
    subdomain: 'starpath',
    title: 'StarPath — AI 占星报告',
    subtitle: '个性化 AI 占星分析：认识你的星辰蓝图',
    badge: 'AI 星盘解读',
    color_from: 'from-purple-600',
    color_to: 'to-indigo-600',
    ga_measurement_id: null,
    meta_pixel_id: null,
    tiktok_pixel_id: null,
  }
]

// 内存 Mock 商品表
export const mockProductsTable: Array<{ id: string; name: string; price: number; tenant_id?: string; created_at: string }> = [
  { id: 'p1', name: 'HEHE Pro 工具套件', price: 29.99, tenant_id: 'mock-tenant-abc', created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: 'p2', name: 'HEHE Enterprise 全套方案', price: 299.00, tenant_id: 'mock-tenant-abc', created_at: new Date(Date.now() - 3600000).toISOString() }
]

// 内存 Mock 订单表
export const mockOrdersTable: Array<Record<string, any>> = [
  { id: 'ord-1', order_no: 'ORD-M1X2K3-PAID01', product_id: 'p1', product_name: 'HEHE Pro 工具套件', amount: 29.99, currency: 'USD', status: 'paid', user_id: 'mock-user-123', payment_provider: 'stripe', payment_intent_id: 'pi_mock_paid_001', created_at: new Date(Date.now() - 86400000 * 2).toISOString(), updated_at: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: 'ord-2', order_no: 'ORD-M1X2K3-PEND02', product_id: 'p2', product_name: 'HEHE Enterprise 全套方案', amount: 299.00, currency: 'USD', status: 'pending', user_id: 'mock-user-123', payment_provider: 'stripe', payment_intent_id: null, created_at: new Date(Date.now() - 86400000).toISOString(), updated_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 'ord-3', order_no: 'ORD-M1X2K3-FAIL03', product_id: 'p1', product_name: 'HEHE Pro 工具套件', amount: 29.99, currency: 'EUR', status: 'failed', user_id: 'mock-user-123', payment_provider: 'stripe', payment_intent_id: 'pi_mock_fail_003', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
]

// 内存 Mock 用户档案表
export const mockProfilesTable: Array<Record<string, any>> = [
  { id: 'mock-user-123', username: 'solo_hacker', role: 'admin', plan_status: 'pro', avatar_url: null, display_name: 'Solo Hacker', auth_provider: 'email', provider_id: null, device_id: null, is_anonymous: false, email_verified: true, email: 'admin@hehe.dev', phone: null, created_at: new Date(Date.now() - 86400000 * 30).toISOString(), updated_at: new Date().toISOString() },
  { id: 'mock-user-456', username: 'alice_wonder', role: 'user', plan_status: 'pro', avatar_url: null, display_name: 'Alice', auth_provider: 'google', provider_id: 'google-123456', device_id: null, is_anonymous: false, email_verified: true, email: 'alice@example.com', phone: '13800138001', created_at: new Date(Date.now() - 86400000 * 20).toISOString(), updated_at: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: 'mock-user-789', username: 'bob_builder', role: 'user', plan_status: 'free', avatar_url: null, display_name: 'Bob', auth_provider: 'email', provider_id: null, device_id: null, is_anonymous: false, email_verified: false, email: 'bob@example.com', phone: null, created_at: new Date(Date.now() - 86400000 * 10).toISOString(), updated_at: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: 'anon-abc123', username: 'anon_abc123', role: 'user', plan_status: 'free', avatar_url: null, display_name: 'Anonymous', auth_provider: 'anonymous', provider_id: null, device_id: 'device-xyz', is_anonymous: true, email_verified: false, email: null, phone: null, created_at: new Date(Date.now() - 86400000 * 3).toISOString(), updated_at: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: 'mock-user-101', username: 'charlie_dev', role: 'user', plan_status: 'enterprise', avatar_url: null, display_name: 'Charlie Dev', auth_provider: 'apple', provider_id: 'apple-789', device_id: null, is_anonymous: false, email_verified: true, email: 'charlie@dev.io', phone: '13912345678', created_at: new Date(Date.now() - 86400000 * 60).toISOString(), updated_at: new Date(Date.now() - 86400000).toISOString() },
]

// 内存 Mock 支付通道配置表（5 种支付渠道：stripe / paypal / google_pay / apple_iap / manual）
export const mockPaymentConfigsTable: Array<Record<string, any>> = [
  { provider: 'stripe',    is_enabled: true,  public_keys: { publicKey: 'pk_test_mock_hehe' },      extra_meta: { environment: 'test' },  updated_at: new Date().toISOString() },
  { provider: 'paypal',    is_enabled: false, public_keys: { clientId: 'mock_paypal_client' },       extra_meta: { environment: 'sandbox' }, updated_at: new Date().toISOString() },
  { provider: 'google_pay', is_enabled: false, public_keys: { merchantId: 'mock_gpay_merchant' },    extra_meta: { environment: 'TEST' },   updated_at: new Date().toISOString() },
  { provider: 'apple_iap', is_enabled: false, public_keys: { bundleId: 'com.hehe.app' },              extra_meta: { environment: 'sandbox' }, updated_at: new Date().toISOString() },
  { provider: 'manual',    is_enabled: true,  public_keys: {},                                        extra_meta: {},                        updated_at: new Date().toISOString() },
]

// 内存 Mock 订阅关系表
export const mockSubscriptionsTable: Array<Record<string, any>> = [
  { id: 'sub-1', user_id: 'mock-user-456', gateway_subscription_id: 'sub_mock_pro_monthly_001', subscription_provider: 'stripe', status: 'active', price_id: 'price_pro_monthly', quantity: 1, cancel_at_period_end: false, current_period_start: new Date(Date.now() - 86400000 * 5).toISOString(), current_period_end: new Date(Date.now() + 86400000 * 25).toISOString(), created_at: new Date(Date.now() - 86400000 * 60).toISOString(), updated_at: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: 'sub-2', user_id: 'mock-user-101', gateway_subscription_id: 'sub_mock_ent_annual_002', subscription_provider: 'stripe', status: 'active', price_id: 'price_enterprise_annual', quantity: 1, cancel_at_period_end: true, current_period_start: new Date(Date.now() - 86400000 * 180).toISOString(), current_period_end: new Date(Date.now() + 86400000 * 185).toISOString(), created_at: new Date(Date.now() - 86400000 * 180).toISOString(), updated_at: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: 'sub-3', user_id: 'mock-user-789', gateway_subscription_id: 'sub_mock_pro_monthly_003', subscription_provider: 'stripe', status: 'past_due', price_id: 'price_pro_monthly', quantity: 1, cancel_at_period_end: false, current_period_start: new Date(Date.now() - 86400000 * 35).toISOString(), current_period_end: new Date(Date.now() - 86400000 * 5).toISOString(), created_at: new Date(Date.now() - 86400000 * 90).toISOString(), updated_at: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: 'sub-4', user_id: 'anon-abc123', gateway_subscription_id: 'sub_mock_trial_004', subscription_provider: 'stripe', status: 'canceled', price_id: 'price_pro_monthly', quantity: 1, cancel_at_period_end: false, current_period_start: new Date(Date.now() - 86400000 * 45).toISOString(), current_period_end: new Date(Date.now() - 86400000 * 15).toISOString(), created_at: new Date(Date.now() - 86400000 * 45).toISOString(), updated_at: new Date(Date.now() - 86400000 * 15).toISOString() },
]

// 内存 Mock 系统通用配置表
export const mockSystemConfigsTable: Array<Record<string, any>> = [
  { key: 'notification_webhooks', value: [] },
  {
    key: 'analytics_settings',
    value: {
      is_enabled: false,
      enable_client: true,
      enable_h5: true,
      enable_admin: false,
      ga_measurement_id: '',
      meta_pixel_id: '',
      tiktok_pixel_id: '',
    }
  }
]



// 内存 Mock 用户反馈/评价表
export const mockFeedbacksTable: Array<Record<string, any>> = [
  { id: 'fb-1', user_id: 'mock-user-123', campaign_subdomain: 'h5-v1', type: 'review', rating: 5, comment: '产品体验非常流畅，注册流程简洁高效！', display_name: 'Alice', is_approved: true, admin_reply: null, created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: 'fb-2', user_id: 'mock-user-456', campaign_subdomain: 'h5-v1', type: 'review', rating: 4, comment: 'Great landing page, very responsive.', display_name: 'Bob', is_approved: true, admin_reply: 'Thanks for your feedback!', created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: 'fb-3', user_id: 'mock-user-789', campaign_subdomain: 'ai', type: 'review', rating: 5, comment: 'AI features are impressive, love the demo.', display_name: 'Charlie', is_approved: true, admin_reply: null, created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 'fb-4', user_id: 'mock-user-123', campaign_subdomain: 'h5-v1', type: 'bug', rating: 2, comment: '表单提交后页面白屏了，刷新才恢复。', display_name: 'Solo Hacker', is_approved: true, admin_reply: null, created_at: new Date().toISOString() },
]

// 内存 Mock 营销活动预约留资表
export const mockCampaignRegistrationsTable: Array<Record<string, any>> = [
  { id: 'reg-1', campaign_id: 'c-h5-v1', subdomain: 'h5-v1', phone: '13800138000', email: 'lead1@example.com', user_id: 'mock-user-123', created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: 'reg-2', campaign_id: 'c-ai', subdomain: 'ai', phone: '13912345678', email: 'lead2@example.com', user_id: null, created_at: new Date(Date.now() - 3600000).toISOString() },
]

// 内存 Mock 管理员 2FA 表
export const mockAdmin2FATable: Array<Record<string, any>> = []

// 内存 Mock 回收站表
export const mockStorageTrashTable: Array<Record<string, any>> = []

// 内存 Mock 自定义桶列表（系统桶固定）
export const mockCustomBuckets: Array<Record<string, any>> = []

export function getDB(event?: any) {
  // 检查是否开启本地离线 Mock DB 模式
  if (process.env.MOCK_DB === 'true') {
    return getLocalMockDB()
  }
  
  if (!dbClient) {
    dbClient = createClient(
      process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'
    )
  }
  return dbClient
}

// ────────────────────────────────────────────────────────────────
// 内存 Mock PostgreSQL 适配器
// 支持链式 .eq().eq()、.order()、.single() 以及 head/count 聚合
// ────────────────────────────────────────────────────────────────
function getLocalMockDB() {
  const getTableData = (tableName: string) => {
    if (tableName === 'activity_logs') return mockActivityLogsTable
    if (tableName === 'campaigns') return mockCampaignsTable
    if (tableName === 'profiles') return mockProfilesTable
    if (tableName === 'products') return mockProductsTable
    if (tableName === 'orders') return mockOrdersTable
    if (tableName === 'feedbacks') return mockFeedbacksTable
    if (tableName === 'campaign_registrations') return mockCampaignRegistrationsTable
    if (tableName === 'storage_trash') return mockStorageTrashTable
    if (tableName === 'payment_configs') return mockPaymentConfigsTable
    if (tableName === 'subscriptions') return mockSubscriptionsTable
    if (tableName === 'system_configs') return mockSystemConfigsTable
    if (tableName === 'admin_2fa') return mockAdmin2FATable
    return mockTasksTable
  }

  // 构造一个 Promise-like 链式查询结果对象
  // 支持 .eq()、.order()、.single()、.then()、以及 { count, head } 聚合
  const makeChain = (tableName: string, dataset: any[]) => {
    const chain: any = {
      eq: (col: string, val: any) => {
        const filtered = dataset.filter((item: any) => {
          if (item[col] === undefined) return true
          return item[col] === val
        })
        return makeChain(tableName, filtered)
      },
      in: (col: string, vals: any[]) => {
        const filtered = dataset.filter((item: any) => {
          if (item[col] === undefined) return true
          return vals.includes(item[col])
        })
        return makeChain(tableName, filtered)
      },
      gte: (col: string, val: any) => {
        const filtered = dataset.filter((item: any) => {
          if (item[col] === undefined) return true
          return new Date(item[col]).getTime() >= new Date(val).getTime()
        })
        return makeChain(tableName, filtered)
      },
      lte: (col: string, val: any) => {
        const filtered = dataset.filter((item: any) => {
          if (item[col] === undefined) return true
          return new Date(item[col]).getTime() <= new Date(val).getTime()
        })
        return makeChain(tableName, filtered)
      },
      order: (col: string, opt?: { ascending?: boolean }) => {
        const sorted = [...dataset].sort((a: any, b: any) => {
          const valA = new Date(a[col]).getTime() || 0
          const valB = new Date(b[col]).getTime() || 0
          return opt?.ascending ? valA - valB : valB - valA
        })
        return makeChain(tableName, sorted)
      },
      range: (from: number, to: number) => {
        const sliced = dataset.slice(from, to + 1)
        return makeChain(tableName, sliced)
      },
      single: async () => {
        if (dataset.length > 0) {
          return { data: { ...dataset[0] }, error: null }
        }
        return { data: null, error: { message: 'Not Found' } }
      },
      // select() 后的二次 select（Supabase 链式 insert().select() 场景）
      select: () => chain,
      // 支持 Supabase 的 { count: 'exact', head: true } 聚合
      then: (resolve: any) => {
        resolve({ data: dataset, error: null, count: dataset.length })
      }
    }
    return chain
  }

  return {
    // Supabase auth 命名空间 Mock（供 02.auth.ts 使用）
    auth: {
      getUser: async (_token: string) => {
        const profile = mockProfilesTable.find(p => _token.includes(p.id))
        if (profile) {
          return {
            data: {
              user: {
                id: profile.id,
                email: profile.email || '',
                user_metadata: {
                  username: profile.username,
                  display_name: profile.display_name,
                  provider: profile.auth_provider
                }
              }
            },
            error: null
          }
        }
        return {
          data: {
            user: { id: 'mock-user-123', email: 'admin@hehe.dev', user_metadata: { username: 'solo_hacker', display_name: 'Solo Hacker', provider: 'email' } }
          },
          error: null
        }
      },
      signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
        let profile = mockProfilesTable.find(p => p.email === email)
        if (!profile) {
          const username = email.split('@')[0]
          profile = {
            id: `mock-${Date.now()}`,
            email,
            username,
            display_name: username,
            role: 'user',
            plan_status: 'free',
            avatar_url: null,
            auth_provider: 'email',
            provider_id: null,
            device_id: null,
            is_anonymous: false,
            email_verified: true,
            phone: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          mockProfilesTable.push(profile)
        }
        const userId = profile.id
        return {
          data: {
            user: { id: userId, email },
            session: { access_token: `mock-access-${userId}-${Date.now()}`, refresh_token: `mock-refresh-${userId}-${Date.now()}`, expires_at: Date.now() + 3600000 }
          },
          error: null
        }
      },
      signUp: async ({ email, password, options }: { email: string; password: string; options?: any }) => {
        const userId = `mock-${Date.now()}`
        const meta = options?.data || {}
        // 模拟 DB 触发器 handle_new_user：注册时自动创建 profiles 记录
        const newProfile = {
          id: userId,
          email,
          username: meta.username || email.split('@')[0],
          display_name: meta.display_name || meta.username || email.split('@')[0],
          role: 'user',
          plan_status: 'free',
          avatar_url: null,
          auth_provider: meta.provider || 'email',
          provider_id: null,
          device_id: meta.device_id || null,
          is_anonymous: meta.is_anonymous || false,
          email_verified: false,
          phone: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        mockProfilesTable.push(newProfile)
        return {
          data: {
            user: { id: userId, email, user_metadata: meta },
            session: { access_token: `mock-access-${userId}-${Date.now()}`, refresh_token: `mock-refresh-${userId}-${Date.now()}`, expires_at: Date.now() + 3600000 }
          },
          error: null
        }
      },
      signOut: async () => ({ error: null }),
      signInAnonymously: async (opts?: { options?: { data?: any } }) => {
        const userId = `anon-${Date.now().toString(36)}`
        const meta = opts?.options?.data || { provider: 'anonymous', is_anonymous: true }
        // 模拟 DB 触发器：匿名登录时创建 profiles 记录
        const newProfile = {
          id: userId,
          email: null,
          username: `anon_${Date.now().toString(36)}`,
          display_name: 'Anonymous',
          role: 'user',
          plan_status: 'free',
          avatar_url: null,
          auth_provider: 'anonymous',
          provider_id: null,
          device_id: meta.device_id || null,
          is_anonymous: true,
          email_verified: false,
          phone: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        mockProfilesTable.push(newProfile)
        return {
          data: {
            user: { id: userId, email: null, user_metadata: meta },
            session: {
              access_token: `mock-anon-access-${userId}-${Date.now()}`,
              refresh_token: `mock-anon-refresh-${userId}-${Date.now()}`,
              expires_at: Date.now() + 86400000,
            }
          },
          error: null
        }
      },
      signInWithOAuth: async ({ provider, options }: { provider: string; options?: any }) => ({
        data: {
          // redirectTo 已包含完整回调路径，直接拼接 query 参数即可
          url: `${options?.redirectTo || 'http://localhost:3000/api/v1/auth/callback'}?provider=${provider}&mock=true`,
          provider
        },
        error: null
      }),
      refreshSession: async () => ({
        data: {
          session: { access_token: `mock-refreshed-${Date.now()}`, refresh_token: `mock-refresh-${Date.now()}`, expires_at: Date.now() + 3600000 }
        },
        error: null
      }),
      exchangeCodeForSession: async (code: string) => ({
        data: {
          user: { id: 'mock-user-123', email: 'user@example.com', app_metadata: { provider: 'google' } },
          session: { access_token: `mock-exchanged-${Date.now()}`, refresh_token: `mock-exchanged-refresh-${Date.now()}`, expires_at: Date.now() + 3600000 }
        },
        error: null
      }),
      updateUser: async ({ password }: { password: string }) => {
        return { data: { user: { id: 'mock-user-123' } }, error: null }
      },
      admin: {
        listUsers: async ({ page = 1, perPage = 50 }: { page?: number; perPage?: number } = {}) => {
          const start = (page - 1) * perPage
          const end = start + perPage
          const slice = mockProfilesTable.slice(start, end)
          return {
            data: {
              users: slice.map((p: any) => ({
                id: p.id,
                email: p.email,
                email_confirmed_at: p.email_verified ? p.created_at : null,
                created_at: p.created_at,
                last_sign_in_at: p.created_at,
                user_metadata: {
                  username: p.username,
                  display_name: p.display_name,
                  provider: p.auth_provider,
                },
                app_metadata: { provider: p.auth_provider },
                identities: [{ provider: p.auth_provider, id: p.id }],
              })),
              total: mockProfilesTable.length,
            },
            error: null,
          }
        },
        updateUserById: async (_uid: string, attrs: { password?: string; email?: string; user_metadata?: any }) => {
          const profile = mockProfilesTable.find((p: any) => p.id === _uid)
          if (profile && attrs.user_metadata) {
            Object.assign(profile, {
              display_name: attrs.user_metadata.display_name || profile.display_name,
              username: attrs.user_metadata.username || profile.username,
            })
          }
          return { data: { user: { id: _uid } }, error: null }
        },
        deleteUser: async (_uid: string) => {
          const idx = mockProfilesTable.findIndex((p: any) => p.id === _uid)
          if (idx !== -1) mockProfilesTable.splice(idx, 1)
          return { data: { user: { id: _uid } }, error: null }
        },
      }
    },
    from: (tableName: string) => ({
      // ── 查询 ──────────────────────────────────────────────
      select: (columns = '*', opts?: { count?: string; head?: boolean }) => {
        const data = getTableData(tableName)
        // 若有 head:true + count，直接返回聚合（不传输数据行）
        if (opts?.head && opts?.count) {
          return makeChain(tableName, data)
        }
        return makeChain(tableName, data)
      },
      // ── 写入 ──────────────────────────────────────────────
      insert: (data: any) => {
        // 内部辅助：执行插入并返回结果
        const doInsert = () => {
        if (tableName === 'tasks') {
          const newTask = {
            id: Math.random().toString(36).substring(2, 9),
            title: data.title || '',
            completed: false,
            tenant_id: data.tenant_id || undefined,
            created_at: new Date().toISOString()
          }
          mockTasksTable.unshift(newTask)
          return { data: [newTask], error: null }
        }
        if (tableName === 'activity_logs') {
          const newLog = {
            id: Date.now(),
            category: data.category || 'system',
            user_id: data.user_id || null,
            action: data.action || 'UNKNOWN',
            ip: data.ip || '127.0.0.1',
            metadata: data.metadata || {},
            created_at: new Date().toISOString()
          }
          mockActivityLogsTable.unshift(newLog)
          return { data: [newLog], error: null }
        }
        if (tableName === 'products') {
          const newProduct = {
            id: Math.random().toString(36).substring(2, 9),
            name: data.name || '',
            price: data.price || 0,
            tenant_id: data.tenant_id || undefined,
            created_at: data.created_at || new Date().toISOString()
          }
          mockProductsTable.unshift(newProduct)
          return { data: [newProduct], error: null }
        }
        if (tableName === 'orders') {
          const newOrder = {
            id: data.id || Math.random().toString(36).substring(2, 9),
            order_no: data.order_no || `ORD-${Date.now().toString(36).toUpperCase()}`,
            product_id: data.product_id || null,
            product_name: data.product_name || '',
            amount: data.amount || 0,
            currency: data.currency || 'USD',
            status: data.status || 'pending',
            user_id: data.user_id || null,
            payment_provider: data.payment_provider || 'stripe',
            payment_intent_id: data.payment_intent_id || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          mockOrdersTable.unshift(newOrder)
          return { data: [newOrder], error: null }
        }

        if (tableName === 'feedbacks') {
          const newFeedback = {
            id: `fb-${Math.random().toString(36).substring(2, 9)}`,
            user_id: data.user_id || null,
            campaign_subdomain: data.campaign_subdomain || null,
            type: data.type || 'review',
            rating: data.rating || null,
            comment: data.comment || null,
            display_name: data.display_name || 'Anonymous',
            is_approved: data.is_approved !== undefined ? data.is_approved : false,
            admin_reply: null,
            created_at: new Date().toISOString()
          }
          mockFeedbacksTable.unshift(newFeedback)
          return { data: [newFeedback], error: null }
        }

        if (tableName === 'campaigns') {
          const now = new Date().toISOString()
          const newCampaign = {
            id: `c-${Math.random().toString(36).substring(2, 9)}`,
            subdomain: data.subdomain || '',
            title: data.title || '',
            subtitle: data.subtitle || '',
            badge: data.badge || '',
            color_from: data.color_from || '#9333ea',
            color_to: data.color_to || '#4f46e5',
            is_active: data.is_active ?? false,
            cta_text: data.cta_text || '立即预约',
            cta_url: data.cta_url || null,
            cover_image: data.cover_image || null,
            description: data.description || null,
            features: data.features || [],
            sort_order: data.sort_order ?? 0,
            ga_measurement_id: data.ga_measurement_id || null,
            meta_pixel_id: data.meta_pixel_id || null,
            tiktok_pixel_id: data.tiktok_pixel_id || null,
            created_at: data.created_at || now,
            updated_at: data.updated_at || now,
          }
          mockCampaignsTable.unshift(newCampaign)
          return { data: [newCampaign], error: null }
        }

        if (tableName === 'campaign_registrations') {
          const newReg = {
            id: `reg-${Math.random().toString(36).substring(2, 9)}`,
            campaign_id: data.campaign_id || null,
            subdomain: data.subdomain || '',
            phone: data.phone || '',
            email: data.email || '',
            user_id: data.user_id || null,
            created_at: new Date().toISOString()
          }
          mockCampaignRegistrationsTable.unshift(newReg)
          return { data: [newReg], error: null }
        }
        if (tableName === 'subscriptions') {
          const newSub = {
            id: data.id || Math.random().toString(36).substring(2, 9),
            user_id: data.user_id,
            gateway_subscription_id: data.gateway_subscription_id,
            subscription_provider: data.subscription_provider || 'stripe',
            status: data.status,
            price_id: data.price_id,
            quantity: data.quantity || 1,
            cancel_at_period_end: data.cancel_at_period_end || false,
            current_period_start: data.current_period_start,
            current_period_end: data.current_period_end,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          mockSubscriptionsTable.unshift(newSub)
          return { data: [newSub], error: null }
        }
        return { data: [data], error: null }
        }

        // 支持链式 .insert().select()：返回带 .select() 方法的对象
        const result = doInsert()
        return {
          select: () => Promise.resolve(result),
          then: (resolve: any) => resolve(result),
        }
      },
      // ── 更新 ──────────────────────────────────────────────
      update: (data: any) => {
        const chain: any = {
          eq: (col: string, val: any) => {
            // 找到匹配记录并更新
            const table = getTableData(tableName)
            const record = table.find((item: any) => item[col] === val)
            if (record) Object.assign(record, data)
            // 继续支持链式调用
            chain._matched = record
            return chain
          },
          // select() 在 update 链末尾（Supabase 常见模式）
          select: () => chain,
          single: async () => {
            return chain._matched
              ? { data: chain._matched, error: null }
              : { data: null, error: { message: 'Not Found' } }
          },
          then: (resolve: any) => resolve({ error: null, data: chain._matched || null })
        }
        return chain
      },
      // ── 删除 ──────────────────────────────────────────────
      delete: () => {
        const chain: any = {
          eq: (col: string, val: any) => {
            const table = getTableData(tableName)
            const idx = table.findIndex((item: any) => item[col] === val)
            if (idx !== -1) table.splice(idx, 1)
            return chain
          },
          then: (resolve: any) => resolve({ error: null })
        }
        return chain
      },
      upsert: async (data: any) => {
        const table = getTableData(tableName) as any[]
        const items = Array.isArray(data) ? data : [data]
        for (const item of items) {
          let pkCol = 'id'
          if (tableName === 'payment_configs') pkCol = 'provider'
          if (tableName === 'subscriptions') pkCol = 'gateway_subscription_id'
          if (tableName === 'profiles') pkCol = 'id'
          if (tableName === 'system_configs') pkCol = 'key'
          if (tableName === 'admin_2fa') pkCol = 'user_id'
          
          const existingIdx = table.findIndex((x: any) => x[pkCol] === item[pkCol])
          if (existingIdx !== -1) {
            Object.assign(table[existingIdx], item, { updated_at: new Date().toISOString() })
          } else {
            table.unshift({
              id: item.id || Math.random().toString(36).substring(2, 9),
              ...item,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
          }
        }
        return { data, error: null }
      }
    }),

    // ── Storage 命名空间 Mock ─────────────────────────────────
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string, _fileBody: any) => {
          return { data: { path }, error: null }
        },
        remove: async (_paths: string[]) => {
          return { data: null, error: null }
        },
        getPublicUrl: (path: string) => {
          return { data: { publicUrl: `/mock-storage/${bucket}/${path}` } }
        },
        createSignedUploadUrl: (path: string) => {
          return { data: { signedUrl: `https://mock-storage.local/upload?bucket=${bucket}&path=${path}` }, error: null }
        },
        createSignedUrl: (path: string, expiresIn: number) => {
          return { data: { signedUrl: `https://mock-storage.local/signed/${bucket}/${path}?exp=${expiresIn}` }, error: null }
        },
        move: async (fromPath: string, toPath: string) => {
          return { data: { path: toPath }, error: null }
        },
        list: async (_prefix: string, opts?: any) => {
          const search = opts?.search?.toLowerCase()
          const limit = opts?.limit ?? 100
          const offset = opts?.offset ?? 0
          // Mock 样本文件
          const allFiles = [
            { id: 'mock-1', name: '1718000001_hero-banner.jpg', created_at: '2026-06-10T08:00:00Z', updated_at: '2026-06-10T08:00:00Z', metadata: { size: 245760, mimetype: 'image/jpeg', eTag: 'abc123', exif: { Make: 'Apple', Model: 'iPhone 15 Pro', DateTimeOriginal: '2026-06-09T14:30:00Z', ExposureTime: 0.008, FNumber: 1.78, ISO: 50, FocalLength: 6.86, latitude: 31.2304, longitude: 121.4737, ImageWidth: 4032, ImageHeight: 3024 } } },
            { id: 'mock-2', name: '1718000002_product-photo.png', created_at: '2026-06-11T10:30:00Z', updated_at: '2026-06-11T10:30:00Z', metadata: { size: 1048576, mimetype: 'image/png', eTag: 'def456', exif: { Make: 'Canon', Model: 'EOS R5', DateTimeOriginal: '2026-06-10T16:00:00Z', ExposureTime: 0.01, FNumber: 2.8, ISO: 100, FocalLength: 50, ImageWidth: 8192, ImageHeight: 5464 } } },
            { id: 'mock-3', name: '1718000003_promo-video.mp4', created_at: '2026-06-12T14:00:00Z', updated_at: '2026-06-12T14:00:00Z', metadata: { size: 8388608, mimetype: 'video/mp4', eTag: 'ghi789' } },
            { id: 'mock-4', name: '1718000004_report.pdf', created_at: '2026-06-13T09:15:00Z', updated_at: '2026-06-13T09:15:00Z', metadata: { size: 524288, mimetype: 'application/pdf', eTag: 'jkl012' } },
            { id: 'mock-5', name: '1718000005_logo.svg', created_at: '2026-06-14T11:45:00Z', updated_at: '2026-06-14T11:45:00Z', metadata: { size: 12288, mimetype: 'image/svg+xml', eTag: 'mno345' } },
          ]
          let filtered = allFiles
          if (search) filtered = filtered.filter(f => f.name.toLowerCase().includes(search))
          const paged = filtered.slice(offset, offset + limit)
          return { data: paged, error: null }
        },
      }),
      // ── Bucket CRUD Mock ──────────────────────────────────
      listBuckets: async () => {
        const systemBuckets = [
          { name: 'avatars', public: true, file_size_limit: 2 * 1024 * 1024, allowed_mime_types: ['image/*'], created_at: '2026-01-01T00:00:00Z' },
          { name: 'campaign-assets', public: true, file_size_limit: 10 * 1024 * 1024, allowed_mime_types: ['image/*', 'video/mp4'], created_at: '2026-01-01T00:00:00Z' },
          { name: 'uploads', public: false, file_size_limit: 50 * 1024 * 1024, allowed_mime_types: null, created_at: '2026-01-01T00:00:00Z' },
        ]
        return { data: [...systemBuckets, ...mockCustomBuckets], error: null }
      },
      createBucket: async (name: string, opts?: any) => {
        mockCustomBuckets.push({
          name,
          public: opts?.public ?? false,
          file_size_limit: opts?.fileSizeLimit ?? 50 * 1024 * 1024,
          allowed_mime_types: opts?.allowedMimeTypes ?? null,
          created_at: new Date().toISOString(),
        })
        return { data: { name }, error: null }
      },
      updateBucket: async (name: string, opts?: any) => {
        const b = mockCustomBuckets.find(b => b.name === name)
        if (b) {
          if (opts?.public !== undefined) b.public = opts.public
          if (opts?.fileSizeLimit !== undefined) b.file_size_limit = opts.fileSizeLimit
          if (opts?.allowedMimeTypes !== undefined) b.allowed_mime_types = opts.allowedMimeTypes
        }
        return { data: null, error: null }
      },
      deleteBucket: async (name: string) => {
        const idx = mockCustomBuckets.findIndex(b => b.name === name)
        if (idx !== -1) mockCustomBuckets.splice(idx, 1)
        return { data: null, error: null }
      },
    }
  }
}
