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
export const mockCampaignsTable: Array<{ subdomain: string; title: string; subtitle: string; badge: string; color_from: string; color_to: string }> = [
  {
    subdomain: 'ai',
    title: '🤖 HEHE AI 协作者首发',
    subtitle: '基于先进智能体的全自动化提效工作流上线。立即预约，锁定首月免费体验资格。',
    badge: '限时 10,000 名',
    color_from: 'from-purple-600',
    color_to: 'to-indigo-600'
  },
  {
    subdomain: 'cloud',
    title: '☁️ HEHE 云原生企业私有化',
    subtitle: '一键输出物理隔离安全沙盒，专为合规与核心系统容灾设计。首发限时 7 折特惠。',
    badge: '企业专属首发',
    color_from: 'from-blue-600',
    color_to: 'to-cyan-600'
  },
  {
    subdomain: 'promo',
    title: '🚀 HEHE 全栈单仓极速版',
    subtitle: '仅需单人即可撬动完整的全球边缘分发与 Supabase 强类型契约防御。',
    badge: '开发者特惠季',
    color_from: 'from-rose-600',
    color_to: 'to-orange-600'
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

// 内存 Mock 广告位配置表
export const mockAdSlotsTable: Array<Record<string, any>> = [
  { id: 'ad-1', name: 'Top Header Banner', position: 'header_banner', is_active: true, campaign_id: null, ad_provider: 'custom', ad_config: { html: '<div class="ad-banner">Sponsored Content</div>', width: 728, height: 90 }, sort_order: 1, created_at: new Date(Date.now() - 86400000 * 7).toISOString() },
  { id: 'ad-2', name: 'Footer Banner', position: 'footer_banner', is_active: true, campaign_id: null, ad_provider: 'adsense', ad_config: { 'data-ad-client': 'ca-pub-xxxx', 'data-ad-slot': '1234567890' }, sort_order: 2, created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: 'ad-3', name: 'Native Inline Ad', position: 'native_inline', is_active: true, campaign_id: null, ad_provider: 'custom', ad_config: { html: '<div class="native-ad">Promoted</div>' }, sort_order: 3, created_at: new Date(Date.now() - 86400000 * 3).toISOString() }
]

// 内存 Mock 广告事件表
export const mockAdEventsTable: Array<Record<string, any>> = [
  { id: 'ae-1', ad_slot_id: 'ad-1', event_type: 'impression', campaign_subdomain: 'promo', ip: '203.0.113.1', user_agent: 'Mozilla/5.0', referrer: 'https://google.com', created_at: new Date(Date.now() - 3600000 * 5).toISOString() },
  { id: 'ae-2', ad_slot_id: 'ad-1', event_type: 'click', campaign_subdomain: 'promo', ip: '203.0.113.2', user_agent: 'Mozilla/5.0', referrer: 'https://google.com', created_at: new Date(Date.now() - 3600000 * 4).toISOString() },
  { id: 'ae-3', ad_slot_id: 'ad-2', event_type: 'impression', campaign_subdomain: 'ai', ip: '203.0.113.3', user_agent: 'Chrome/120', referrer: '', created_at: new Date(Date.now() - 3600000 * 3).toISOString() },
  { id: 'ae-4', ad_slot_id: 'ad-1', event_type: 'impression', campaign_subdomain: 'promo', ip: '203.0.113.4', user_agent: 'Safari/17', referrer: 'https://twitter.com', created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: 'ae-5', ad_slot_id: 'ad-3', event_type: 'impression', campaign_subdomain: 'cloud', ip: '203.0.113.5', user_agent: 'Mozilla/5.0', referrer: '', created_at: new Date(Date.now() - 3600000).toISOString() }
]

// 内存 Mock 用户档案表
export const mockProfilesTable: Array<Record<string, any>> = [
  { id: 'mock-user-123', username: 'solo_hacker', role: 'admin', plan_status: 'pro', avatar_url: null, display_name: 'Solo Hacker', auth_provider: 'email', provider_id: null, device_id: null, is_anonymous: false, email_verified: true, phone: null, created_at: new Date(Date.now() - 86400000 * 30).toISOString(), updated_at: new Date().toISOString() }
]



// 内存 Mock 用户反馈/评价表
export const mockFeedbacksTable: Array<Record<string, any>> = [
  { id: 'fb-1', user_id: 'mock-user-123', campaign_subdomain: 'promo', type: 'review', rating: 5, comment: '产品体验非常流畅，注册流程简洁高效！', display_name: 'Alice', is_approved: true, admin_reply: null, created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: 'fb-2', user_id: 'mock-user-456', campaign_subdomain: 'promo', type: 'review', rating: 4, comment: 'Great landing page, very responsive.', display_name: 'Bob', is_approved: true, admin_reply: 'Thanks for your feedback!', created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: 'fb-3', user_id: 'mock-user-789', campaign_subdomain: 'ai', type: 'review', rating: 5, comment: 'AI features are impressive, love the demo.', display_name: 'Charlie', is_approved: true, admin_reply: null, created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 'fb-4', user_id: 'mock-user-123', campaign_subdomain: 'promo', type: 'bug', rating: 2, comment: '表单提交后页面白屏了，刷新才恢复。', display_name: 'Solo Hacker', is_approved: true, admin_reply: null, created_at: new Date().toISOString() },
]

export function getDB(event: any) {
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
    if (tableName === 'ad_slots') return mockAdSlotsTable
    if (tableName === 'ad_events') return mockAdEventsTable
    if (tableName === 'feedbacks') return mockFeedbacksTable
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
      order: (col: string, opt?: { ascending?: boolean }) => {
        const sorted = [...dataset].sort((a: any, b: any) => {
          const valA = new Date(a[col]).getTime() || 0
          const valB = new Date(b[col]).getTime() || 0
          return opt?.ascending ? valA - valB : valB - valA
        })
        return makeChain(tableName, sorted)
      },
      single: async () => {
        // profiles 表专用 Mock：返回 mockProfilesTable 中第一条记录
        if (tableName === 'profiles') {
          if (mockProfilesTable.length > 0) {
            return { data: { ...mockProfilesTable[0] }, error: null }
          }
          return {
            data: {
              id: 'mock-user-123',
              username: 'solo_hacker',
              role: 'admin',
              plan_status: 'pro',
              avatar_url: null,
              display_name: 'Solo Hacker',
              auth_provider: 'email',
              is_anonymous: false,
              email_verified: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            error: null
          }
        }
        if (dataset.length > 0) {
          return { data: dataset[0], error: null }
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
      getUser: async (_token: string) => ({
        data: {
          user: { id: 'mock-user-123', email: 'admin@hehe.dev', user_metadata: { username: 'solo_hacker', display_name: 'Solo Hacker', provider: 'email' } }
        },
        error: null
      }),
      signInWithPassword: async ({ email, password }: { email: string; password: string }) => ({
        data: {
          user: { id: 'mock-user-123', email },
          session: { access_token: `mock-access-${Date.now()}`, refresh_token: `mock-refresh-${Date.now()}`, expires_at: Date.now() + 3600000 }
        },
        error: null
      }),
      signUp: async ({ email, password, options }: { email: string; password: string; options?: any }) => ({
        data: {
          user: { id: `mock-${Date.now()}`, email, user_metadata: options?.data || {} },
          session: { access_token: `mock-access-${Date.now()}`, refresh_token: `mock-refresh-${Date.now()}`, expires_at: Date.now() + 3600000 }
        },
        error: null
      }),
      signOut: async () => ({ error: null }),
      signInWithOAuth: async ({ provider, options }: { provider: string; options?: any }) => ({
        data: {
          url: `${options?.redirectTo || 'http://localhost:3000'}/api/v1/auth/callback?provider=${provider}&mock=true`,
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
        updateUserById: async (_uid: string, attrs: { password?: string }) => {
          return { data: { user: { id: _uid } }, error: null }
        }
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
        if (tableName === 'ad_events') {
          const newEvent = {
            id: Math.random().toString(36).substring(2, 9),
            ad_slot_id: data.ad_slot_id || '',
            event_type: data.event_type || 'impression',
            campaign_subdomain: data.campaign_subdomain || null,
            ip: data.ip || '127.0.0.1',
            user_agent: data.user_agent || '',
            referrer: data.referrer || '',
            created_at: new Date().toISOString()
          }
          mockAdEventsTable.unshift(newEvent)
          return { data: [newEvent], error: null }
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
            is_approved: true,
            admin_reply: null,
            created_at: new Date().toISOString()
          }
          mockFeedbacksTable.unshift(newFeedback)
          return { data: [newFeedback], error: null }
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
      upsert: async (data: any) => ({ data, error: null })
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
        list: async (_prefix: string, _opts?: any) => {
          return { data: [], error: null }
        },
      })
    }
  }
}
