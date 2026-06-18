<script setup lang="ts">
import { onMounted, onBeforeUnmount, computed } from 'vue'

const { t, locale } = useI18n()

useAppSEO({
  title: () => '帮助文档中心 - HeHe App',
  description: () => 'HeHe App 完整帮助文档 — 从项目搭建到部署上线的全流程指南。',
})

// JSON-LD structured data for SEO
useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        headline: 'HeHe App Help Documentation',
        description: 'Complete full-stack project handbook from setup to deployment',
        proficiencyLevel: 'Beginner',
        about: {
          '@type': 'SoftwareApplication',
          name: 'HeHe App',
          applicationCategory: 'DeveloperApplication',
          operatingSystem: 'Web',
        },
      }),
    },
  ],
})

// ── Sidebar ──
const sidebarOpen = ref(false)
const toggleSidebar = () => { sidebarOpen.value = !sidebarOpen.value }
const closeSidebar = () => { sidebarOpen.value = false }

// ── Scroll-spy ──
let scrollObserver: IntersectionObserver | null = null

onMounted(() => {
  const sections = document.querySelectorAll('section[id]')
  const navLinks = document.querySelectorAll('.nav-item[href^="#"]')

  scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(l => l.classList.remove('active'))
        const link = document.querySelector(`.nav-item[href="#${entry.target.id}"]`)
        if (link) link.classList.add('active')
      }
    })
  }, { rootMargin: '-30% 0px -60% 0px' })

  sections.forEach(s => scrollObserver!.observe(s))
})

onBeforeUnmount(() => {
  scrollObserver?.disconnect()
  scrollObserver = null
})

// ── Back to top ──
const showBackToTop = ref(false)
const handleScroll = () => {
  showBackToTop.value = window.scrollY > 500
}
const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
onMounted(() => window.addEventListener('scroll', handleScroll, { passive: true }))
onBeforeUnmount(() => window.removeEventListener('scroll', handleScroll))

// ── Search ──
const searchQuery = ref('')
const searchResults = ref<string[]>([])
const searchFocused = ref(false)
let blurTimer: ReturnType<typeof setTimeout> | null = null

const onSearchFocus = () => {
  if (blurTimer) { clearTimeout(blurTimer); blurTimer = null }
  searchFocused.value = true
}
const onSearchBlur = () => {
  blurTimer = setTimeout(() => { searchFocused.value = false }, 200)
}

const performSearch = () => {
  if (!searchQuery.value.trim()) {
    searchResults.value = []
    return
  }
  const query = searchQuery.value.toLowerCase()
  const results: string[] = []
  document.querySelectorAll('section[id]').forEach(section => {
    const text = section.textContent?.toLowerCase() || ''
    if (text.includes(query)) {
      results.push(section.id)
    }
  })
  searchResults.value = results
}

const navigateToSearchResult = (id: string) => {
  searchFocused.value = false
  searchQuery.value = ''
  searchResults.value = []
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// ── Code copy ──
const copyCode = async (event: MouseEvent) => {
  const btn = event.currentTarget as HTMLElement
  // 向上找最近的 .code-block 容器，再取其中的 pre 元素
  const container = btn.closest('.code-block') as HTMLElement | null
  const pre = container?.querySelector('pre') as HTMLElement | null
  const text = pre?.textContent || ''
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    const original = btn.textContent
    btn.textContent = '✓ 已复制'
    btn.classList.add('copied')
    setTimeout(() => {
      btn.textContent = original
      btn.classList.remove('copied')
    }, 2000)
  } catch {
    // 降级方案：execCommand
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.cssText = 'position:fixed;opacity:0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    btn.textContent = '✓ 已复制'
    setTimeout(() => { btn.textContent = '复制代码' }, 2000)
  }
}

// ── FAQ expand/collapse ──
const faqExpanded = ref<Record<string, boolean>>({})
const faqAllExpanded = ref(false)

const toggleFaqAll = () => {
  faqAllExpanded.value = !faqAllExpanded.value
  faqData.forEach((cat) => {
    cat.items.forEach((_, i) => {
      faqExpanded.value[`${cat.cat}-${i}`] = faqAllExpanded.value
    })
  })
}

const faqCategoryLabel = (cat: string) => {
  const map: Record<string, string> = {
    deploy: '部署相关',
    database: '数据库相关',
    auth: '认证相关',
    performance: '性能相关',
  }
  return map[cat] || cat
}

const toggleFaq = (key: string) => {
  faqExpanded.value[key] = !faqExpanded.value[key]
}

// ── Navigation ──
const navSections = computed(() => [
  { group: 'overview', items: ['s0', 's1', 's2', 's3', 's4'] },
  { group: 'infrastructure', items: ['s5', 's7', 's8', 's9'] },
  { group: 'business', items: ['s10', 's11', 's12'] },
  { group: 'optional', items: ['s13'] },
  { group: 'faq', items: ['s14', 's15', 's16', 's17'] },
])

const sectionLabelMap: Record<string, string> = {
  's0': '文档概览',
  's1': '定位与技术栈',
  's2': '目录结构与路由',
  's3': '环境变量',
  's4': '渲染策略对比',
  's5': 'Supabase 集成',
  's7': 'Supabase OAuth 体系',
  's8': 'Vercel 部署',
  's9': 'GitHub 集成',
  's10': '支付系统',
  's11': '管理后台',
  's12': '社交分享与反馈',
  's13': 'Cloudflare 接入',
  's14': '本地开发',
  's15': 'API 规范',
  's16': '国际化配置',
  's17': '常见问题'
}
const sectionLabel = (key: string) => sectionLabelMap[key] || key
const navGroupLabelMap: Record<string, string> = {
  'overview': '概览',
  'infrastructure': '基础设施',
  'business': '业务模块',
  'optional': '可选增强',
  'faq': '开发规范与FAQ'
}
const navGroupLabel = (group: string) => navGroupLabelMap[group] || group

// ── Theme toggle ──
const theme = ref<'dark' | 'light'>('dark')
const toggleTheme = () => {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  if (import.meta.client) {
    document.documentElement.setAttribute('data-theme', theme.value)
  }
}

// ═══════════════════════════════════════════════
// HARDCODED TECHNICAL DATA — never goes through i18n
// ═══════════════════════════════════════════════

const techStackRows = computed(() => [
  ['前端框架', 'Nuxt 4 (Vue 3 + Nitro)', 'future.compatibilityVersion: 4'],
  ['样式方案', 'UnoCSS', '原子化 CSS，按需生成'],
  ['图片优化', '@nuxt/image', '自动压缩、格式转换、懒加载'],
  ['国际化', '@nuxtjs/i18n', '中英文双语，prefix_except_default 策略'],
  ['PWA', '@vite-pwa/nuxt', 'Admin 后台离线可用，Service Worker 缓存'],
  ['数据库', 'Supabase PostgreSQL', 'RLS 行级安全策略，Supavisor 连接池'],
  ['认证', 'Supabase Auth', '邮箱 + Google/GitHub OAuth + 匿名登录'],
  ['支付', 'Stripe（策略模式）', '支持一次性付款 + 订阅制，Mock/生产双模式'],
  ['分析', 'Vercel Analytics + 多平台埋点', 'GA4 / Meta Pixel / TikTok Pixel 自动分发'],
  ['部署', 'Vercel', 'Git 推送自动部署，子域名自适应路由'],
])

const prereqRows = [
  ['Node.js', '≥ 20.x', 'node --version', '运行时'],
  ['npm', '≥ 10.x', 'npm --version', '包管理'],
  ['Supabase CLI', '≥ 1.x', 'supabase --version', '数据库迁移'],
  ['Git', '≥ 2.x', 'git --version', '版本控制'],
  ['Supabase 账号', '-', 'supabase.com/dashboard', '云数据库'],
  ['Vercel 账号', '-', 'vercel.com/dashboard', '部署平台'],
]

const routingRows = [
  ['根域名', '/', 'ISR (3600s)', 'SEO 友好的静态生成'],
  ['根域名', '/architecture', 'ISR (3600s)', '技术架构文档'],
  ['根域名', '/help', 'ISR (3600s)', '帮助文档中心'],
  ['其他子域名', '→ /h5/{subdomain}/', 'SWR (600s)', '营销活动页，快速更新'],
  ['根域名', '/admin/**', 'SPA (ssr: false)', '管理后台，无 SSR 泄露'],
  ['根域名', '/api/**', 'no-store', '实时 API，零缓存'],
]

const middlewareSteps = [
  '00.apm', '01.subdomain', '02.auth', '03.admin',
  '04.auth-guard', '06.api-security',
]

const middlewareStepsDetail = [
  ['00.apm', '性能监控', '记录 /api/ 路径的请求耗时与状态码，异步写入 APM 系统'],
  ['01.subdomain', '子域名路由重写', '根据 Host 头静默重写路由：主域名→/client，admin子域名→/admin，通配子域名→/h5/{subdomain}'],
  ['02.auth', '双模鉴权', 'Mock模式（内存用户表）与生产模式（Supabase JWT验证），支持 Bearer/Cookie/device-id 多通道'],
  ['03.admin', '管理员断言', '拦截 /api/admin/*，验证管理员角色，放行定时任务 x-cron-secret'],
  ['04.auth-guard', '用户认证守卫', '要求支付/订单/存储等敏感端点已登录，匿名用户返回 403'],
  ['06.api-security', 'API 安全防护', '8层安全检查：IP黑白名单、国家限制、API Key验证、HMAC签名、端点控制、速率限制'],
]

const envRows = [
  ['NUXT_PUBLIC_SUPABASE_URL', 'Supabase 项目 URL', '是', '前端可访问'],
  ['NUXT_PUBLIC_SUPABASE_ANON_KEY', 'Supabase anon key', '是', '前端可访问'],
  ['SUPABASE_SERVICE_ROLE_KEY', 'Supabase service_role key', '是', '仅服务端，禁止加 NUXT_PUBLIC_ 前缀'],
  ['STRIPE_SECRET_KEY', 'Stripe 密钥', '否', '仅支付模块'],
  ['STRIPE_WEBHOOK_SECRET', 'Stripe Webhook 密钥', '否', '仅支付模块'],
  ['STRIPE_PUBLIC_KEY', 'Stripe 公钥', '否', '仅支付模块'],
  ['MOCK_DB', 'Mock 数据库开关', '是', '本地开发 true，生产 false'],
]

const migrationRows = [
  ['0001_core.sql', '核心表（profiles, tasks, activity_logs, storage_trash） + is_admin() + handle_new_user()', '必选'],
  ['0002_campaign.sql', '营销活动表 campaigns + 留资表 campaign_registrations', '必选（H5依赖）'],
  ['0003_feedback.sql', '用户评价表 feedbacks（评分1-5 + 管理员审批回复）', '可选'],
  ['0004_payment.sql', '商品表 products + 订单表 orders + 支付配置 + 订阅表 subscriptions', '可选'],
  ['0005_api_security.sql', 'API安全策略表 api_security_settings + API Key 表 api_keys（SHA-256哈希）', '必选'],
  ['0006_system.sql', '系统配置表 system_configs（KV配置） + 埋点种子数据', '必选'],
  ['0012_archive_audit_logs.sql', '审计日志冷热归档（pg_cron定时任务 + audit-archives 存储桶）', '可选'],
]

const adminSql = `-- 通过邮箱设置管理员（在 SQL Editor 中执行）
UPDATE profiles
SET role = 'admin'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'your-email@example.com'
);`

const seedSql = `-- 插入营销活动种子数据（H5 页面依赖 campaigns 表，迁移后必须执行）
-- 来源：supabase/migrations/0002_campaign.sql
INSERT INTO campaigns (subdomain, title, subtitle, badge, color_from, color_to, is_active, cta_text, description, features) VALUES
('ai', '🤖 HEHE AI 协作者首发', '基于先进智能体的全自动化提效工作流上线。立即预约，锁定首月免费体验资格。', '限时 10,000 名', 'from-purple-600', 'to-indigo-600', true, '立即预约', '基于先进智能体的全自动化提效工作流', '[{"icon":"⚡","text":"一键生成"},{"icon":"🔒","text":"安全沙盒"},{"icon":"🌐","text":"全球分发"}]'::jsonb),
('cloud', '☁️ HEHE 云原生企业私有化', '一键输出物理隔离安全沙盒，专为合规与核心系统容灾设计。首发限时 7 折特惠。', '企业专属首发', 'from-blue-600', 'to-cyan-600', true, '立即预约', '专为合规与核心系统容灾设计', '[{"icon":"🛡️","text":"物理隔离"},{"icon":"📊","text":"实时监控"},{"icon":"🔄","text":"自动容灾"}]'::jsonb),
('promo', '🚀 HEHE 全栈单仓极速版', '仅需单人即可撬动完整的全球边缘分发与 Supabase 强类型契约防御。', '开发者特惠季', 'from-rose-600', 'to-orange-600', true, '立即预约', '单人全栈闭环交付', '[{"icon":"🧑‍💻","text":"单人交付"},{"icon":"💰","text":"降本提效"},{"icon":"🚀","text":"极速上线"}]'::jsonb);

-- 插入商品种子数据（支付功能可选，来源：supabase/migrations/0004_payment.sql）
INSERT INTO products (name, price, tenant_id) VALUES
('HEHE Pro 工具套件', 29.99, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
('HEHE Enterprise 全套方案', 299.00, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
`

const migrationRuleItems = [
  '所有表必须启用 RLS + FORCE RLS',
  'Admin 检查使用 `is_admin(auth.uid())`，禁止 inline EXISTS 子查询',
  '`is_admin()` 函数使用 SECURITY DEFINER 避免递归权限问题',
  'Money 字段使用 NUMERIC，禁止浮点数',
  'activity_logs 表只追加不删除，定期归档到 Storage',
  'API Key 使用 SHA-256 哈希存储，禁止明文',
  '迁移文件按顺序编号（0001, 0002...），禁止修改已推送的迁移文件',
]

const loginRows = [
  ['邮箱密码', 'signInWithPassword', 'POST /api/v1/auth/login', '需要注册'],
  ['Google OAuth', 'signInWithOAuth', 'GET /api/v1/auth/google', 'Supabase Dashboard 配置'],
  ['GitHub OAuth', 'signInWithOAuth', 'GET /api/v1/auth/github', 'Supabase Dashboard 配置'],
  ['匿名', 'device-id header', '-', '无需注册，自动分配 UUID'],
]

const profilesRows = [
  ['id', 'UUID', '与 auth.users 一对一关联'],
  ['email', 'TEXT', '用户邮箱'],
  ['username', 'TEXT', '用户名（可选）'],
  ['avatar_url', 'TEXT', '头像 URL（可选）'],
  ['role', 'TEXT', 'user / admin，管理员手动设置'],
  ['is_anonymous', 'BOOLEAN', '是否为匿名用户'],
  ['created_at', 'TIMESTAMPTZ', '注册时间'],
  ['updated_at', 'TIMESTAMPTZ', '最后更新时间'],
]

const tokenRows = [
  ['Access Token', 'JWT', '1 hour', 'Bearer Header 或 Cookie'],
  ['Refresh Token', 'Opaque', '30 days', '自动刷新 Access Token'],
  ['Device ID', 'UUID', '持久化', '匿名用户的标识'],
]

const apiAuthRows = [
  ['POST', '/api/v1/auth/login', '邮箱密码登录'],
  ['POST', '/api/v1/auth/register', '注册新用户'],
  ['GET', '/api/v1/auth/google', 'Google OAuth 跳转'],
  ['GET', '/api/v1/auth/github', 'GitHub OAuth 跳转'],
  ['POST', '/api/v1/auth/logout', '登出'],
]

const renderingRows = [
  ['/', 'ISR (3600s)', 'SEO 友好的静态生成，首次构建后增量再生'],
  ['/architecture', 'ISR (3600s)', '技术架构白皮书'],
  ['/help', 'ISR (3600s)', '帮助文档中心'],
  ['/h5/**', 'ISR (600s)', '营销活动页，后台修改后最快 10 分钟更新'],
  ['/h5-v2/**', 'ISR (600s)', 'H5 v2 活动页'],
  ['/admin/**', 'SPA (ssr: false)', '管理后台纯客户端渲染，隔离 SSR 安全泄露'],
  ['/api/**', 'no-store', '实时 API 零缓存，每次请求实时响应'],
]

const domainRows = [
  ['主域名', 'example.com', 'A', '76.76.21.21', 'Vercel IP'],
  ['通配符', '*.example.com', 'CNAME', 'cname.vercel-dns.com', '子域名转发'],
]

const checklistItems = [
  '所有 .env 变量已在 Vercel Dashboard → Environment Variables 中配置',
  'Supabase 项目 URL + anon key + service_role key 已填入',
  'MOCK_DB 设置为 false',
  '管理员账号已通过 Supabase Dashboard 或 temp-create-admin.mjs 脚本创建',
  'Stripe 密钥已配置（如需支付功能）',
  'npm run gen:types 已执行',
  'supabase db push 已执行（所有迁移已应用）',
  'npm run check 通过',
  'npm run build 通过（无 prerender 错误）',
  'DNS 通配符记录已配置（*.domain.com → cname.vercel-dns.com）',
]

const branchRows = [
  ['main', '生产分支，自动部署到 Vercel Production'],
  ['feature/*', '功能分支，合并到 main 后自动预览部署'],
  ['fix/*', '修复分支，同 feature 流程'],
  ['hotfix/*', '紧急修复，直接基于 main 创建'],
]

const ciYaml = `name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run check
      - run: npm run build`

const protectionItems = [
  'main 分支必须通过 PR 合并',
  '合并前必须通过 CI 检查',
  '禁止直接 push 到 main',
  '代码审查至少 1 人 Approve',
]

const dualRows = [
  ['Mock 模式', 'MOCK_DB=true', '返回模拟支付数据，不调用 Stripe API，适合前端开发'],
  ['生产模式', 'MOCK_DB=false', '调用真实 Stripe API，支持一次性付款 + 订阅制（subscription）'],
]

const rlsItems = [
  'orders_user_own：用户可查看和创建自己的订单（SELECT + INSERT 合并）',
  'orders_admin_all：管理员可查看所有订单',
  '只有管理员可更新订单状态',
  '订单金额由服务端计算，前端不可篡改',
]

const amountItems = [
  '数据库层：amount NUMERIC(10, 2) CHECK (amount >= 0)',
  'API 层：Zod 校验 amount 为正数，最多两位小数',
  'Stripe 层：服务端计算最终金额，不信任客户端传值',
  '所有金额操作记录到 activity_logs',
]

const testCardRows = [
  ['4242424242424242', 'Visa', '支付成功'],
  ['4000000000000002', 'Visa', '支付被拒'],
  ['4000000000003220', 'Visa', '需要 3D Secure'],
]



const shareRows = [
  ['微信', 'weixin:// 协议', '微信内置浏览器自动识别'],
  ['微博', 'https://service.weibo.com/share/share.php', 'URL 参数传递'],
  ['QQ', 'https://connect.qq.com/widget/shareqq/index.html', 'URL 参数传递'],
  ['复制链接', 'navigator.clipboard', 'Clipboard API'],
]

const feedbackRows = [
  ['GET', '/api/v1/feedback', '获取某内容的评价列表'],
  ['POST', '/api/v1/feedback', '提交评价（评分 + 评论）'],
  ['DELETE', '/api/v1/feedback/:id', '删除自己的评价'],
]

const feedbackItems = [
  '`feedbacks` 表存储用户评价（评分 1-5 + 文字评论）',
  '支持按内容 ID 查询评价列表',
  '前端使用 `ReviewSection` 组件展示',
  '管理员可在后台审核评价',
]

const dnsRows = [
  ['主域名', '@', 'A', '76.76.21.21', 'DNS-only（灰色）'],
  ['通配符', '*', 'CNAME', 'cname.vercel-dns.com', 'DNS-only（灰色）'],
  ['www', 'www', 'CNAME', 'cname.vercel-dns.com', 'DNS-only（灰色）'],
]

const whyNoProxyItems = [
  'Vercel 自带全球 CDN 和边缘缓存，无需 Cloudflare 代理',
  '双层代理会增加延迟，且可能导致 HTTPS 证书问题',
  'DNS-only 模式保留了 Cloudflare 的 DNS 管理和安全功能，但不拦截流量',
]

const securityItems = [
  '开启 DNSSEC（域名系统安全扩展）',
  '配置 SSL/TLS 为 Full (strict) 模式',
  '开启 Bot Fight Mode（机器人防护）',
  '设置 Rate Limiting（速率限制）保护 API',
  '配置 WAF 规则（Web 应用防火墙）',
]

const quickStartCode = `# 安装依赖
npm install

# 启动开发服务器（Mock DB 模式，无需数据库）
npm run dev

# 启动 Supabase + 开发服务器
npm run dev:all

# 类型检查
npm run check

# 构建
npm run build`

const localSupabaseCode = `# 初始化本地 Supabase
supabase init

# 启动全套服务（PG + Auth + Storage + Studio）
supabase start

# Studio 地址: http://localhost:54323
# API URL: http://localhost:54321
# Anon Key: 在 Studio → Settings → API 中查看`

const scriptsRows = [
  ['npm run dev', '启动开发服务器（Mock DB 内存数据库）'],
  ['npm run dev:all', '并发启动 Supabase 本地服务 + Nuxt 开发服务器'],
  ['npm run check', 'TypeScript 类型检查（vue-tsc --noEmit）'],
  ['npm run build', '生产构建（含 prerender + Vercel preset）'],
  ['npm run gen:types', '生成 Supabase 数据库 TypeScript 类型定义'],
  ['npm run gen:types:local', '从本地 Supabase 生成类型'],
  ['npm run db:push', '推送数据库迁移到远程并重新生成类型'],
  ['npm run test:api-safety', 'API 鉴权安全扫描（验证 @api-auth 声明与中间件行为一致性）'],
  ['npm run test:supabase', 'Supabase 连接 + 表 + 桶 + 迁移状态健康检查'],
  ['npm run test:storage', 'Storage 全链路集成测试（上传/公开URL/签名URL/RLS）'],
  ['npm run gen:crud <name>', '生成 CRUD API 控制器（Zod + sendSuccess）'],
  ['npm run gen:rls <table> [--admin]', '生成 RLS 策略 SQL'],
  ['npm run scaffold <name>', '脚手架生成器：API 路由 + 页面组件'],
  ['npm run seed:demo', '插入演示数据（活动/商品/用户）'],
]

const apiResponseExample = `// 成功响应格式
{
  "success": true,
  "data": { ... },        // 业务数据
  "message": "操作成功"     // 可选提示信息
}

// 分页响应格式
{
  "success": true,
  "data": [ ... ],        // 数据列表
  "total": 100,           // 总记录数
  "page": 1,              // 当前页码
  "pageSize": 20          // 每页数量
}

// 错误响应格式
{
  "success": false,
  "error": "错误描述",     // 英文错误信息
  "code": "ERROR_CODE"    // 错误码（可选）
}`

const apiAuthDeclareExample = `// @api-auth: admin   → 管理员专用，03.admin 中间件强制验证
// @api-auth: user    → 需登录用户，04.auth-guard 中间件验证
// @api-auth: public  → 公开接口，无需认证`

const i18nConfigExample = `// nuxt.config.ts 中 i18n 配置
i18n: {
  strategy: 'prefix_except_default',  // 默认语言不加前缀
  defaultLocale: 'zh',                // 默认中文
  locales: [
    { code: 'zh', iso: 'zh-CN', file: 'zh.json' },
    { code: 'en', iso: 'en-US', file: 'en.json' },
  ],
  detectBrowserLanguage: {
    useCookie: true,
    cookieKey: 'i18n_locale',
    redirectOnRoot: true,
  },
}`

const i18nUsageExample = `// 在 <script setup> 中使用
const { t, locale } = useI18n()

// 模板中使用
<h1>{{ t('home.title') }}</h1>

// SEO 中需要响应式
useSeoMeta({
  title: () => t('home.seoTitle'),
})

// 切换语言
locale.value = locale.value === 'zh' ? 'en' : 'zh'`

const i18nDetectionItems = [
  'URL 路径前缀（如 /en/about）',
  'Cookie（i18n_locale）',
  '浏览器语言（navigator.language）',
  '时区判断（亚洲时区 → zh，其他 → en）',
  '兜底默认 zh',
]

const localeSections = [
  ['common', '通用 UI 文案（按钮、提示、占位符等）'],
  ['nav / header', '导航栏和页面头部'],
  ['home', '首页各区块'],
  ['architecture', '技术架构页面'],
  ['hero', '首页 Hero 区域'],
  ['tasks', '任务看板'],
  ['h5', 'H5 营销页'],
  ['userBar', '用户状态栏'],
  ['login', '登录弹窗'],
  ['review', '评价组件'],
  ['share', '社交分享'],
]

// ── FAQ data (localized Q&A, titles from i18n) ──
const faqData = [
  {
    cat: 'deploy',
    items: [
      { q: '如何部署到 Vercel？', a: '将项目推送到 GitHub，在 Vercel 中导入仓库即可自动部署。确保 .env 中的环境变量已在 Vercel Dashboard → Environment Variables 中配置，尤其是 MOCK_DB=false 和 Supabase 相关密钥。管理员账号通过 Supabase Dashboard 创建。' },
      { q: '为什么 H5 页面没有内容？', a: 'H5 页面依赖 campaigns 表的数据。切换到真实 Supabase 数据库后，需要执行迁移并插入种子数据。详见本文 Supabase 集成章节。' },
      { q: '如何配置自定义域名？', a: '在 Vercel Dashboard → Settings → Domains 中添加主域名和通配符域名（*.domain.com），然后在 DNS 提供商处添加对应的 A/CNAME 记录。' },
      { q: 'i18n 构建报错 "Cannot read properties of undefined"？', a: '检查所有 t() 调用是否使用了正确的 key 路径。确保 locales/zh.json 和 locales/en.json 的 key 结构完全一致。使用 npm run check 进行类型检查。' },
      { q: 'build 时 prerender 失败返回 401？', a: '确认没有配置旧的 SITE_ACCESS_PASSWORD 环境变量。项目已移除站点访问密码机制，统一使用管理员账号认证。清除 Vercel 环境变量中的 SITE_ACCESS_PASSWORD。' },
    ],
  },
  {
    cat: 'database',
    items: [
      { q: '本地开发如何连接 Supabase？', a: '使用 `npm run dev` 默认使用 Mock DB（内存数据库）。使用 `npm run dev:all` 并发启动本地 Supabase 服务和 Nuxt 开发服务器。' },
      { q: '如何执行数据库迁移？', a: '使用 `supabase login` 登录，然后 `supabase link --project-ref <ref>` 关联项目，最后 `supabase db push` 推送迁移。迁移按编号顺序（0001-0012）执行。' },
      { q: 'RLS 策略怎么写？', a: '参考 supabase/migrations/ 目录下的迁移文件。Admin 检查必须使用 `is_admin(auth.uid())` SECURITY DEFINER 函数，不要 inline EXISTS 子查询。' },
      { q: '如何从 Mock DB 切换到真实 Supabase？', a: '设置 .env 中 MOCK_DB=false，确保 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY 正确配置。执行 supabase db push 推送迁移。运行 npm run dev:all。' },
      { q: '子域名路由不生效？', a: '确认 DNS 通配符记录已配置（*.example.com → cname.vercel-dns.com）。确认 Vercel Dashboard → Domains 中已添加通配符域名。检查 01.subdomain-rewrite 中间件日志。' },
    ],
  },
  {
    cat: 'auth',
    items: [
      { q: '支持哪些登录方式？', a: '支持邮箱密码登录、Google OAuth、GitHub OAuth 和匿名登录。OAuth 需要在 Supabase Dashboard → Authentication → Providers 中配置对应的 Client ID 和 Secret。' },
      { q: 'Token 过期了怎么办？', a: 'Access Token (JWT) 有效期 1 小时，Refresh Token 有效期 30 天。前端 supabase-auth 插件会自动使用 Refresh Token 刷新 Access Token，无需手动处理。' },
      { q: '如何添加管理员？', a: '通过 Supabase Dashboard → Authentication → Users → Add User 创建用户并勾选 Auto Confirm User，然后在 Table Editor → profiles 中将该用户的 role 字段改为 admin。也可通过 CLI 脚本 node temp-create-admin.mjs 快速创建。' },
      { q: '管理后台如何登录？', a: '访问 /admin，使用 Supabase Auth 注册的管理员邮箱和密码登录。登录后会校验用户 role 是否为 admin，非管理员账号将被拒绝。' },
    ],
  },
  {
    cat: 'performance',
    items: [
      { q: '页面加载慢怎么办？', a: '检查是否使用了 <NuxtImg> 替代原生 <img>；确认图片开启了懒加载和格式转换；检查 ISR 缓存策略是否生效（/ 和 /help 为 3600s，/h5 为 600s）。' },
      { q: '如何监控线上性能？', a: '项目内置 APM 中间件（00.apm），记录请求耗时和状态码。Admin 后台可查看 APM 监控面板。Vercel Analytics + Speed Insights 提供 Web Vitals 指标。' },
      { q: 'API 接口有速率限制吗？', a: '是的。06.api-security 中间件实现了固定窗口速率限制，按 IP 或 API Key 限流，返回 X-RateLimit-Limit/Remaining/Reset 头。配置在 api_security_settings 表中。' },
    ],
  },
]
</script>

<template>
  <div class="app-help-root" :class="`theme-${theme}`">
    <!-- SIDEBAR BACKDROP (mobile) -->
    <div v-if="sidebarOpen" class="sidebar-backdrop" @click="closeSidebar" />

    <!-- SIDEBAR -->
    <nav class="sidebar" :class="{ 'sidebar-open': sidebarOpen }">
      <div class="sidebar-logo">
        <div class="logo-badge">
          <div class="logo-dot" />
          <span class="logo-text">HELP {{ 'v1.0' }}</span>
        </div>
        <div class="sidebar-title">{{ '帮助文档中心' }}</div>
        <div class="sidebar-version">{{ '从零到一的全栈项目实战手册' }}</div>
      </div>

      <nav class="sidebar-nav" @click="closeSidebar">
        <template v-for="group in navSections" :key="group.group">
          <div class="nav-section">{{ navGroupLabel(group.group) }}</div>
          <a
            v-for="(key, idx) in group.items"
            :key="key"
            :class="['nav-item', { active: idx === 0 && group.items[0] === 's0' && key === 's0' }]"
            :href="`#${key}`"
          >
            <span class="nav-num">{{ String(parseInt(key.slice(1))).padStart(2, '0') }}</span>
            {{ sectionLabel(key) }}
          </a>
        </template>
      </nav>
    </nav>

    <!-- MAIN -->
    <main class="main">
      <!-- TOP HEADER -->
      <header class="top-header">
        <div class="top-header-left">
          <button class="hamburger-btn" @click="toggleSidebar" aria-label="Toggle navigation">
            <span class="hamburger-line" />
            <span class="hamburger-line" />
            <span class="hamburger-line" />
          </button>
          <span class="top-header-indicator">●</span>
          <span class="top-header-title">HELP CENTER</span>
        </div>
        <div class="top-header-menu">
          <div class="search-wrap" :class="{ focused: searchFocused }">
            <input
              v-model="searchQuery"
              :placeholder="'搜索文档...'"
              class="search-input"
              @input="performSearch"
              @focus="onSearchFocus"
              @blur="onSearchBlur"
            />
            <span class="search-icon">🔍</span>
            <div v-if="searchResults.length && searchFocused" class="search-dropdown">
              <div
                v-for="id in searchResults"
                :key="id"
                class="search-result-item"
                @mousedown.prevent="navigateToSearchResult(id)"
              >
                → {{ sectionLabel(id) }}
              </div>
              <div v-if="searchResults.length === 0" class="search-no-results">
                {{ '无匹配结果' }}
              </div>
            </div>
          </div>
          <button class="theme-btn" @click="toggleTheme" :title="theme === 'dark' ? 'Switch to light' : 'Switch to dark'">
            {{ theme === 'dark' ? '☀️' : '🌙' }}
          </button>
          <NuxtLink to="/" class="menu-btn">
            ← {{ '返回首页' }}
          </NuxtLink>
        </div>
      </header>

      <!-- HERO -->
      <div class="hero" id="top">
        <div class="hero-bg" />
        <div class="hero-grid" />
        <div class="hero-content">
          <div class="hero-tags">
            <span class="hero-tag tag-blue">{{ '📚 Nuxt 4' }}</span>
            <span class="hero-tag tag-green">{{ '🗄️ Supabase' }}</span>
            <span class="hero-tag tag-purple">{{ '▲ Vercel' }}</span>
            <span class="hero-tag tag-cyan">{{ '🔐 Auth' }}</span>
          </div>
          <h1 class="hero-title">{{ '帮助文档中心' }}</h1>
          <p class="hero-desc">{{ 'HeHe App 完整帮助文档 — 从项目搭建到部署上线的全流程指南。' }}</p>
          <div class="hero-meta">
            <div class="meta-card">
              <div class="meta-label">{{ 'v1.0' }}</div>
              <div class="meta-value">1.0</div>
            </div>
            <div class="meta-card">
              <div class="meta-label">{{ '最后更新' }}</div>
              <div class="meta-value">2026-06</div>
            </div>
          </div>
        </div>
      </div>

      <!-- DOCUMENTATION CONTENT -->
      <div class="doc-content">

        <!-- ═══════ S0: Overview ═══════ -->
        <section id="s0" class="section" v-once>
          <div class="section-header">
            <div class="section-num">00</div>
            <h2>{{ '文档概览' }}</h2>
          </div>
          <div class="section-body">
            <p>{{ '本帮助文档基于项目 docs/ 目录下的 9 份核心文档整合而成，覆盖从项目搭建、数据库集成、用户认证、支付接入到生产部署的全流程。文档采用左侧导航 + 右侧内容的经典布局，支持中英文双语切换。' }}</p>
            <div class="subsection">
              <h3>{{ '文档结构' }}</h3>
              <div class="doc-grid">
                <div v-for="(doc, idx) in ([{num:'01', title:'定位与技术栈', desc:'平台边界、技术选型、渲染策略、快速启动、前置条件'},{num:'02', title:'目录结构与路由', desc:'目录结构、多域名路由、中间件执行链（6层）'},{num:'03', title:'环境变量', desc:'变量清单、安全红线、Mock DB 离线开发、管理员配置'},{num:'04', title:'渲染策略对比', desc:'SSR/ISR/SWR 全维度对比、选型决策树、性能数字'},{num:'05', title:'Supabase 集成与数据库迁移', desc:'7个迁移文件、连接池、种子数据、Storage、管理员创建'},{num:'06', title:'Supabase OAuth 体系', desc:'邮箱+社交OAuth、5层纵深防御、Token生命周期、useAuth API'},{num:'08', title:'Vercel 部署', desc:'环境变量、域名配置、渲染策略、检查清单、预览部署'},{num:'09', title:'GitHub 集成', desc:'分支策略、CI/CD、分支保护、Actions 配置、PR 模板'},{num:'10', title:'支付系统', desc:'Stripe策略模式、一次性付款+订阅制、Mock/生产双模式'},{num:'12', title:'社交分享与反馈', desc:'6大平台分享、用户评价系统、审批工作流'},{num:'13', title:'Cloudflare 接入', desc:'DNS配置、SSL/TLS、安全功能、缓存规则'},{num:'14', title:'本地开发', desc:'快速开始、本地Supabase、脚本说明、代码生成器'},{num:'15', title:'API 规范', desc:'统一响应格式、Zod校验、鉴权声明、OpenAPI文档'},{num:'16', title:'国际化配置', desc:'i18n策略、语言检测、翻译文件结构、使用规范'},{num:'17', title:'常见问题', desc:'部署、数据库、认证、性能相关FAQ'}] as any[])" :key="idx" class="doc-card">
                  <div class="doc-card-num">{{ doc.num }}</div>
                  <div class="doc-card-body">
                    <h4>{{ doc.title }}</h4>
                    <p>{{ doc.desc }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ═══════ S1: Positioning & Tech Stack ═══════ -->
        <section id="s1" class="section" v-once>
          <div class="section-header">
            <div class="section-num">01</div>
            <h2>{{ '定位与技术栈' }}</h2>
          </div>
          <div class="section-body">
            <div class="subsection">
              <h3>{{ '项目定位' }}</h3>
              <p>{{ '本项目是单人全栈独立开发者闭环项目脚手架，一人负责开发、维护、上线、测试、运维全流程。在单一 Nuxt 4 代码仓库中同时支撑主站官网（SSR）、管理后台（SPA + PWA）、营销 H5 落地页（ISR）和 REST API 四类运行时。不是 SaaS 多租户产品，而是单人全栈项目的基础骨架。' }}</p>
            </div>
            <div class="subsection">
              <h3>{{ '技术栈' }}</h3>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th v-for="col in (['分类', '技术方案', '说明'] as string[])" :key="col">{{ col }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, i) in techStackRows" :key="i">
                      <td v-for="(cell, j) in row" :key="j">
                        <strong v-if="j === 1">{{ cell }}</strong>
                        <code v-else-if="j === 2 && cell.startsWith('future')">{{ cell }}</code>
                        <span v-else>{{ cell }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ '前置条件' }}</h3>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th v-for="col in (['工具', '版本要求', '检查命令', '用途'] as string[])" :key="col">{{ col }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, i) in prereqRows" :key="i">
                      <td v-for="(cell, j) in row" :key="j">
                        <code v-if="j === 2">{{ cell }}</code>
                        <span v-else>{{ cell }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ '快速启动' }}</h3>
              <div class="code-block">
                <button class="copy-btn" @click="copyCode($event)">{{ '复制代码' }}</button>
                <pre><code>{{ quickStartCode }}</code></pre>
              </div>
              <p>{{ 'Mock DB 模式（MOCK_DB=true）无需 Supabase 账号，所有数据存储在内存中，支持完整的 CRUD、Auth 模拟和链式查询，适合前端 UI 开发和快速原型验证。' }}</p>
            </div>
            <div class="subsection">
              <h3>{{ '渲染策略' }}</h3>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th v-for="col in (['路由', '策略', '说明'] as string[])" :key="col">{{ col }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, i) in renderingRows" :key="i">
                      <td><code>{{ row[0] }}</code></td>
                      <td>
                        <span class="badge" :class="{
                          'badge-purple': (row[1] as string).includes('ISR'),
                          'badge-cyan': (row[1] as string).includes('SWR'),
                          'badge-green': (row[1] as string).includes('SPA'),
                          'badge-orange': (row[1] as string).includes('no-store'),
                        }">{{ row[1] }}</span>
                      </td>
                      <td>{{ row[2] }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <!-- ═══════ S2: Directory Structure & Routing ═══════ -->
        <section id="s2" class="section" v-once>
          <div class="section-header">
            <div class="section-num">02</div>
            <h2>{{ '目录结构与路由' }}</h2>
          </div>
          <div class="section-body">
            <div class="subsection">
              <h3>{{ '目录结构' }}</h3>
              <div class="code-block">
                <button class="copy-btn" @click="copyCode($event)">{{ '复制代码' }}</button>
                <pre><code>hehe-app/
├── app/
│   ├── components/
│   │   ├── admin/         # 管理后台组件（20+ 个，local imports）
│   │   ├── client/        # 客户端网站组件
│   │   ├── h5/            # H5 营销页组件
│   │   └── shared/        # 跨平台共享组件（LanguageSwitcher, SocialShare）
│   ├── composables/       # Vue Composables（9个，auto-imported）
│   ├── pages/
│   │   ├── (admin)/       # 管理后台（SPA, ssr: false）
│   │   ├── (client)/      # 官网 + 架构 + 帮助文档（ISR 3600s）
│   │   └── (h5)/          # H5 营销活动页（ISR 600s）
│   ├── plugins/           # Nuxt 插件（analytics, supabase-auth）
│   ├── types/             # TypeScript 类型定义
│   ├── utils/             # 客户端工具函数
│   └── app.vue
├── locales/               # i18n 翻译文件（zh.json, en.json）
├── server/
│   ├── api/admin/         # 管理后台 API（03.admin 中间件保护）
│   ├── api/v1/            # 公开/用户 API
│   ├── middleware/        # 中间件链（00→01→02→03→04→06）
│   └── utils/             # 服务端工具（db, auth, payment-strategies, storage, api-security）
├── supabase/migrations/   # 数据库迁移（0001-0012，7个文件）
├── public/                # 静态资源（fonts, favicon, og-image）
├── scripts/               # 运维脚本（12个 .mjs）
└── docs/                  # 核心架构文档</code></pre>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ '多域名路由设计' }}</h3>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th v-for="col in (['域名', '路径', '渲染策略', '说明'] as string[])" :key="col">{{ col }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, i) in routingRows" :key="i">
                      <td><code v-if="!(row[0] as string).startsWith('根域名') && !(row[0] as string).startsWith('Root')">{{ row[0] }}</code><span v-else>{{ row[0] }}</span></td>
                      <td><code>{{ row[1] }}</code></td>
                      <td>
                        <span class="badge" :class="{
                          'badge-purple': (row[2] as string).includes('ISR'),
                          'badge-green': (row[2] as string).includes('SPA'),
                          'badge-orange': (row[2] as string).includes('no-store'),
                          'badge-cyan': (row[2] as string).includes('SWR'),
                        }">{{ row[2] }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ '中间件执行链' }}</h3>
              <div class="flow-steps">
                <template v-for="(step, i) in middlewareSteps" :key="i">
                  <div class="flow-step"><span class="flow-num">{{ String(i).padStart(2, '0') }}</span>{{ step }}</div>
                  <div v-if="i < middlewareSteps.length - 1" class="flow-arrow">→</div>
                </template>
              </div>
              <p class="mt-4">{{ '每个请求按编号顺序依次经过这 6 个中间件，形成清晰的安全管道。各中间件职责如下：' }}</p>
              <div class="table-wrap mt-3">
                <table>
                  <thead><tr><th v-for="col in (['中间件', '职责', '说明'] as string[])" :key="col">{{ col }}</th></tr></thead>
                  <tbody>
                    <tr v-for="(row, i) in middlewareStepsDetail" :key="i">
                      <td v-for="(cell, j) in row" :key="j"><code v-if="j === 0">{{ cell }}</code><span v-else>{{ cell }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <!-- ═══════ S3: Env Vars ═══════ -->
        <section id="s3" class="section" v-once>
          <div class="section-header">
            <div class="section-num">03</div>
            <h2>{{ '环境变量' }}</h2>
          </div>
          <div class="section-body">
            <div class="subsection">
              <h3>{{ '环境变量清单' }}</h3>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th v-for="col in (['变量名', '说明', '必填', '备注'] as string[])" :key="col">{{ col }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, i) in envRows" :key="i">
                      <td v-for="(cell, j) in row" :key="j">
                        <code v-if="j === 0">{{ cell }}</code>
                        <span v-else>{{ cell }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="alert alert-warn">
                <div class="alert-icon">⚠️</div>
                <div class="alert-body">
                  <strong>{{ '安全红线' }}</strong>
                  <p>{{ 'SUPABASE_SERVICE_ROLE_KEY 和 STRIPE_SECRET_KEY 绝对不能加 NUXT_PUBLIC_ 前缀。这些密钥拥有绕过 RLS 的权限。' }}</p>
                </div>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ 'Mock DB 离线开发' }}</h3>
              <p>{{ '项目内置完整的内存 Mock PostgreSQL 适配器，设置 MOCK_DB=true 即可完全离线开发，无需 Supabase 物理数据库。支持链式查询、聚合统计、CRUD 操作和 Auth 模拟。' }}</p>
            </div>
          </div>
        </section>

        <!-- ═══════ S4: Rendering Strategies ═══════ -->
        <section id="s4" class="section" v-once>
          <div class="section-header">
            <div class="section-num">04</div>
            <h2>{{ '渲染策略对比' }}</h2>
          </div>
          <div class="section-body">
            <div class="subsection">
              <h3>{{ '三种渲染模式' }}</h3>
              <p>{{ 'SSR、ISR、SWR 三种渲染模式是现代全栈框架的核心能力。三者本质上都是「服务端介入渲染」，核心差异在于何时渲染、缓存多久、谁触发更新。选错渲染策略，轻则 LCP 超标，重则服务器在流量峰值下崩溃。' }}</p>
              <div class="table-wrap">
                <table>
                  <thead><tr><th v-for="col in (['对比维度', 'SSR', 'ISR', 'SWR'] as string[])" :key="col">{{ col }}</th></tr></thead>
                  <tbody>
                    <tr v-for="(row, i) in ([['渲染时机', '每次请求实时渲染', '首次渲染并缓存，后台定时刷新', '过期后返回旧缓存，后台异步刷新'],['TTFB', '200-800ms（每次）', '~5ms（命中缓存）', '~5ms（命中缓存）'],['数据新鲜度', '100% 实时', '最多延迟 revalidate 秒', '最多延迟 maxAge 秒'],['服务器压力', '高（每请求计算一次）', '极低（缓存期零计算）', '低（过期后异步一次）'],['SEO 友好度', '极佳', '极佳', '极佳'],['适合更新频率', '秒级', '小时/天级', '分钟/小时级'],['Nuxt 4 配置', 'ssr: true', 'isr: 3600', 'swr: 600']] as string[][])" :key="i">
                      <td v-for="(cell, j) in row" :key="j"><strong v-if="j === 0">{{ cell }}</strong><code v-else-if="j >= 3 && row[0] === 'Nuxt 4 配置'">{{ cell }}</code><span v-else>{{ cell }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ '机制原理' }}</h3>
              <p><strong>SSR：</strong>{{ '每次请求实时计算 — 用户请求 → 服务器查 DB/调 API → 渲染 HTML → 返回。每次都要计算。' }}</p>
              <p><strong>ISR：</strong>{{ '首次构建 + 后台静默刷新 — 首次请求渲染并写入边缘缓存（TTL=3600s）。缓存期内直接返回（~5ms），过期后先返回旧缓存，后台触发重新计算。用户无感知，永远不等待。' }}</p>
              <p><strong>SWR：</strong>{{ '过期即用旧缓存 + 后台异步更新 — 首次请求渲染并写入缓存（maxAge=600s）。缓存期内 ~5ms 返回，过期后立即返回旧缓存同时后台异步刷新。与 ISR 行为几乎一致，区别在时间窗口语义。' }}</p>
              <div class="alert alert-info">
                <div class="alert-icon">💡</div>
                <div class="alert-body">
                  <strong>{{ '关键结论' }}</strong>
                  <p>{{ 'ISR 和 SWR 在「过期后先返回旧缓存、后台异步刷新」行为上几乎完全一致。核心区别：ISR 适合小时/天级低频更新内容，SWR 适合分钟级中频更新内容。' }}</p>
                </div>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ '选型决策树' }}</h3>
              <p><strong>{{ '维度一：数据更新频率' }}</strong></p>
              <ul>
                <li><strong>{{ '秒级变化：' }}</strong>{{ 'SSR（股价、实时弹幕、直播数据）' }}</li>
                <li><strong>{{ '分钟到小时级：' }}</strong>{{ 'SWR（营销活动、商品库存、新闻）' }}</li>
                <li><strong>{{ '小时到天级：' }}</strong>{{ 'ISR（官网介绍、博客、定价页）' }}</li>
              </ul>
              <p><strong>{{ '维度二：SEO 重要性' }}</strong></p>
              <ul>
                <li><strong>{{ '不重要：' }}</strong>{{ 'SPA（管理后台、用户私有页、订单详情）' }}</li>
                <li><strong>{{ '重要：' }}</strong>{{ '按数据更新频率三选一（ISR / SWR / SSR）' }}</li>
              </ul>
            </div>
            <div class="subsection">
              <h3>{{ '本项目选型定论' }}</h3>
              <div class="table-wrap">
                <table>
                  <thead><tr><th v-for="col in (['页面/场景', '选型', '配置', '理由'] as string[])" :key="col">{{ col }}</th></tr></thead>
                  <tbody>
                    <tr v-for="(row, i) in ([['官网首页', 'ISR', 'isr: 3600', '每日更新一次足够，极致 LCP'],['H5 活动页', 'SWR', 'swr: 600', '活动配置随时可改，容忍 10 分钟延迟'],['管理后台', 'SPA', 'ssr: false', '无 SEO 需求，强权限隔离'],['API 接口', '无渲染', 'no-store', '纯 JSON，绝对禁止缓存']] as string[][])" :key="i">
                      <td v-for="(cell, j) in row" :key="j"><strong v-if="j === 1">{{ cell }}</strong><code v-else-if="j === 2">{{ cell }}</code><span v-else>{{ cell }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ 'routeRules 配置速查' }}</h3>
              <div class="code-block">
                <button class="copy-btn" @click="copyCode($event)">{{ '复制代码' }}</button>
                <pre><code>// nuxt.config.ts
export default defineNuxtConfig({
  routeRules: {
    '/admin/**': { ssr: false },           // 管理后台 SPA，隔离 SSR 泄露
    '/h5/**':    { isr: 600 },             // H5 ISR，10min 刷新
    '/h5-v2/**': { isr: 600 },            // H5 v2 ISR，10min 刷新
    '/':         { isr: 3600 },            // 首页 ISR，1h 刷新
    '/architecture': { isr: 3600 },        // 架构白皮书 ISR
    '/help':     { isr: 3600 },            // 帮助文档 ISR
    '/api/**':   { cors: true, headers: { 'cache-control': 'no-store, no-cache, must-revalidate' } },
  }
})</code></pre>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ '常见误区' }}</h3>
              <div class="faq-item" :class="{ expanded: faqExpanded['render-q1'] }">
                <div class="faq-q" @click="toggleFaq('render-q1')">
                  <span class="faq-chevron">▸</span>
                  Q: {{ 'ISR 缓存过期，用户会看到空白页或等待吗？' }}
                </div>
                <div class="faq-a" v-show="faqExpanded['render-q1']">
                  A: {{ '不会。ISR 过期后第一个请求依然立即拿到旧缓存（用户无感知），服务器后台静默刷新。用户永远不需要等待。' }}
                </div>
              </div>
              <div class="faq-item" :class="{ expanded: faqExpanded['render-q2'] }">
                <div class="faq-q" @click="toggleFaq('render-q2')">
                  <span class="faq-chevron">▸</span>
                  Q: {{ 'ISR 和 SWR 本质区别是什么？' }}
                </div>
                <div class="faq-a" v-show="faqExpanded['render-q2']">
                  A: {{ '核心差异在语义与时间窗口。ISR 定位于小时/天级低频更新，SWR 定位于分钟级中频更新。机制上两者几乎一致：过期后先返回旧缓存，后台异步刷新。' }}
                </div>
              </div>
              <div class="faq-item" :class="{ expanded: faqExpanded['render-q3'] }">
                <div class="faq-q" @click="toggleFaq('render-q3')">
                  <span class="faq-chevron">▸</span>
                  Q: {{ 'SSR 在什么情况下是唯一正确选择？' }}
                </div>
                <div class="faq-a" v-show="faqExpanded['render-q3']">
                  A: {{ '三种情况必须用 SSR：1. 页面内容因用户身份不同而完全不同（个人中心、订单）；2. 内容必须是秒级实时数据（行情、竞拍）；3. 页面含高度敏感数据，不允许任何缓存（金融账户）。' }}
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ═══════ S5: Supabase ═══════ -->
        <section id="s5" class="section" v-once>
          <div class="section-header">
            <div class="section-num">05</div>
            <h2>{{ 'Supabase 集成与数据库迁移' }}</h2>
          </div>
          <div class="section-body">
            <div class="subsection">
              <h3>{{ '创建 Supabase 项目' }}</h3>
              <ol>
                <li><a href="https://supabase.com/dashboard" target="_blank">Supabase Dashboard</a> {{ '中创建新项目' }}</li>
                <li><strong>New Project</strong> — {{ '填写项目名称和数据库密码' }}</li>
                <li><strong>Settings → API</strong> — {{ '获取项目 URL 和 anon key' }}</li>
                <li>{{ '将 URL 和 key 配置到项目 .env 文件' }}</li>
              </ol>
            </div>
            <div class="subsection">
              <h3>{{ '数据库 Schema 概览' }}</h3>
              <div class="schema-diagram">
                <div class="schema-box">
                  <div class="schema-title">auth.users</div>
                  <div class="schema-desc">Supabase 内置用户表</div>
                </div>
                <div class="schema-arrow">▼ handle_new_user() trigger</div>
                <div class="schema-row">
                  <div class="schema-box schema-core"><div class="schema-title">profiles</div><div class="schema-desc">用户档案 (0001 必选)</div></div>
                  <div class="schema-box schema-core"><div class="schema-title">tasks</div><div class="schema-desc">业务任务 (0001 必选)</div></div>
                  <div class="schema-box schema-core"><div class="schema-title">activity_logs</div><div class="schema-desc">审计日志 (0001 必选)</div></div>
                </div>
                <div class="schema-row">
                  <div class="schema-box schema-opt"><div class="schema-title">campaigns</div><div class="schema-desc">营销活动 + 留资 (0002)</div></div>
                  <div class="schema-box schema-opt"><div class="schema-title">feedbacks</div><div class="schema-desc">用户评价 (0003 可选)</div></div>
                  <div class="schema-box schema-opt"><div class="schema-title">products</div><div class="schema-desc">商品 (0004 可选)</div></div>
                </div>
                <div class="schema-row">
                  <div class="schema-box schema-opt"><div class="schema-title">orders</div><div class="schema-desc">订单 (0004 可选)</div></div>
                  <div class="schema-box schema-opt"><div class="schema-title">subscriptions</div><div class="schema-desc">订阅 (0004 可选)</div></div>
                  <div class="schema-box schema-opt"><div class="schema-title">api_keys</div><div class="schema-desc">API Key (0005)</div></div>
                </div>
                <div class="schema-row">
                  <div class="schema-box schema-opt"><div class="schema-title">api_security_settings</div><div class="schema-desc">安全策略 (0005)</div></div>
                  <div class="schema-box schema-opt"><div class="schema-title">system_configs</div><div class="schema-desc">系统配置 (0006)</div></div>
                  <div class="schema-box schema-opt"><div class="schema-title">payment_configs</div><div class="schema-desc">支付配置 (0004)</div></div>
                </div>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ 'Connection Pooler（Serverless 必配）' }}</h3>
              <p>{{ 'Vercel Serverless Functions 每次请求都可能创建新连接，容易打满 Supabase Free 计划的 10 个直连上限。在 Supabase Dashboard → Settings → Database → Connection Pooler 中启用。' }}</p>
              <div class="table-wrap">
                <table>
                  <thead><tr><th v-for="col in (['模式', '连接上限', '适用场景'] as string[])" :key="col">{{ col }}</th></tr></thead>
                  <tbody>
                    <tr v-for="(row, i) in ([['直连 (Direct)', '10 (Free) / 20 (Pro)', '本地开发、Supabase Studio'],['连接池 (Pooler)', '200 (Free) / 500 (Pro)', 'Serverless 生产环境']] as string[][])" :key="i">
                      <td v-for="(cell, j) in row" :key="j"><code v-if="j === 1">{{ cell }}</code><span v-else>{{ cell }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>{{ '使用 Pooler 时需注意：' }}</p>
              <ul>
                <li>{{ '连接字符串端口从 5432 改为 6543' }}</li>
                <li>{{ 'Pooler 使用 session 模式，支持 prepared statements' }}</li>
                <li>{{ 'Serverless 中必须使用 Pooler 连接，否则高峰期会耗尽连接' }}</li>
              </ul>
            </div>
            <div class="subsection">
              <h3>{{ '执行数据库迁移' }}</h3>
              <p>{{ '数据库迁移只创建表结构，不包含业务数据。迁移文件按顺序编号，必须依次执行。' }}</p>
              <p><strong>{{ '方式一：SQL Editor 手动执行（推荐首次）' }}</strong></p>
              <p>{{ '在 Supabase Dashboard → SQL Editor 中，按顺序复制粘贴迁移文件内容并执行。每次执行一个文件，确认无报错后再执行下一个。执行后进入 Table Editor 确认所有表已创建。' }}</p>
              <p><strong>{{ '方式二：Supabase CLI 自动推送（推荐）' }}</strong></p>
              <div class="code-block">
                <button class="copy-btn" @click="copyCode($event)">{{ '复制代码' }}</button>
                <pre><code>supabase login
supabase link --project-ref &lt;your-project-ref&gt;
supabase db push</code></pre>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ '填充初始数据（种子数据）' }}</h3>
              <p>{{ '数据库迁移仅创建表结构，不包含业务数据。如果切换为物理数据库而未填充初始数据，H5 页面会因为 campaigns 表为空而白屏。' }}</p>
              <p>{{ '在 Supabase Dashboard → SQL Editor 中运行以下 SQL 以插入营销活动及商品初始数据：' }}</p>
              <div class="code-block">
                <button class="copy-btn" @click="copyCode($event)">{{ '复制代码' }}</button>
                <pre><code>{{ seedSql }}</code></pre>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ '创建管理员账号' }}</h3>
              <p>{{ '数据库迁移完成后，需要配置管理员账号。管理后台已完全切换到 Supabase Auth 认证，管理员通过 Supabase 邮箱登录。' }}</p>
              <p><strong>{{ '方式一：通过 Dashboard 创建（推荐）' }}</strong></p>
              <ol>
                <li>{{ '进入 Authentication → Users → Add User，填写邮箱和密码，勾选 Auto Confirm User' }}</li>
                <li>{{ '进入 Table Editor → profiles，找到刚创建的用户行，将 role 字段改为 admin' }}</li>
              </ol>
              <p><strong>{{ '方式二：通过 SQL 快速设置' }}</strong></p>
              <div class="code-block">
                <button class="copy-btn" @click="copyCode($event)">{{ '复制代码' }}</button>
                <pre><code>{{ adminSql }}</code></pre>
              </div>
              <p><strong>{{ '方式三：通过 CLI 脚本创建/更新' }}</strong></p>
              <p>{{ '项目提供 ' }}<code>temp-create-admin.mjs</code> {{ '脚本，可通过 CLI 快速创建或更新内置管理员账号：' }}</p>
              <div class="code-block">
                <button class="copy-btn" @click="copyCode($event)">{{ '复制代码' }}</button>
                <pre><code>node temp-create-admin.mjs</code></pre>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ 'OAuth 社交登录配置' }}</h3>
              <p>{{ '在 Supabase Dashboard → Authentication → Providers 中配置第三方登录。' }}</p>
              <div class="table-wrap">
                <table>
                  <thead><tr><th v-for="col in (['Provider', '需要配置', '获取地址'] as string[])" :key="col">{{ col }}</th></tr></thead>
                  <tbody>
                    <tr v-for="(row, i) in ([['Google', 'Client ID + Client Secret', 'Google Cloud Console → APIs & Services → Credentials'],['Facebook', 'App ID + App Secret', 'Meta for Developers → 我的应用'],['Apple', 'Service ID + Key ID + Private Key', 'Apple Developer → Certificates, Identifiers & Profiles']] as string[][])" :key="i">
                      <td v-for="(cell, j) in row" :key="j"><strong v-if="j === 0">{{ cell }}</strong><span v-else>{{ cell }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>{{ '配置完成后，将 Supabase Dashboard 提供的 Redirect URL 填入各平台的回调地址白名单。' }}</p>
            </div>
            <div class="subsection">
              <h3>{{ 'Supabase Storage' }}</h3>
              <p>{{ '项目内置 Supabase Storage 支持，提供 3 个 Bucket 覆盖全部业务场景，RLS 策略内置于 0001_core.sql 迁移中：' }}</p>
              <div class="table-wrap">
                <table>
                  <thead><tr><th v-for="col in (['Bucket', '可见性', '大小限制', '允许类型', '写入权限'] as string[])" :key="col">{{ col }}</th></tr></thead>
                  <tbody>
                    <tr v-for="(row, i) in ([['avatars', '公开', '2 MB', 'png / jpeg / gif / webp', '认证用户写自己目录'],['campaign-assets', '公开', '10 MB', 'png / jpeg / gif / webp / mp4', '仅管理员'],['uploads', '私有', '50 MB', '不限制', '认证用户写自己目录']] as string[][])" :key="i">
                      <td v-for="(cell, j) in row" :key="j"><code v-if="j === 0">{{ cell }}</code><span v-else>{{ cell }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ 'Storage 路径规范与 RLS 隔离' }}</h3>
              <p>{{ '所有文件路径遵循 ' }}<code>{user_id}/{timestamp}_{filename}</code> {{ '格式。RLS 策略通过 ' }}<code>(storage.foldername(name))[1] = auth.uid()::text</code> {{ '校验路径首段与用户 uid 一致，实现行级隔离：' }}</p>
              <ul>
                <li><strong>avatars：</strong>{{ '认证用户可上传/更新/删除自己目录下的文件，所有人可公开读取，管理员全权限' }}</li>
                <li><strong>campaign-assets：</strong>{{ '仅管理员可写入/更新/删除，所有人可公开读取' }}</li>
                <li><strong>uploads：</strong>{{ '认证用户仅可读写自己目录下的文件，管理员全权限' }}</li>
              </ul>
            </div>
            <div class="subsection">
              <h3>{{ '混合上传策略' }}</h3>
              <p>{{ '项目采用混合上传模式，兼顾安全与性能：' }}</p>
              <div class="table-wrap">
                <table>
                  <thead><tr><th v-for="col in (['文件大小', '模式', '流程'] as string[])" :key="col">{{ col }}</th></tr></thead>
                  <tbody>
                    <tr v-for="(row, i) in ([['< 5 MB', '服务端中转', '客户端 → POST /api/v1/storage/upload → Nitro 用 service_role 写入 Storage'],['≥ 5 MB', '客户端直传', '客户端 → POST /api/v1/storage/signed-url 获取签名 → 直传 Supabase Storage']] as string[][])" :key="i">
                      <td v-for="(cell, j) in row" :key="j"><strong v-if="j === 1">{{ cell }}</strong><span v-else>{{ cell }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ 'Storage API 端点' }}</h3>
              <div class="table-wrap">
                <table>
                  <thead><tr><th v-for="col in (['方法', '路径', '说明'] as string[])" :key="col">{{ col }}</th></tr></thead>
                  <tbody>
                    <tr v-for="(row, i) in ([['POST', '/api/v1/storage/upload', '服务端中转上传（小文件）'],['POST', '/api/v1/storage/signed-url', '生成直传签名 URL（大文件）'],['DELETE', '/api/v1/storage/{bucket}/{user_id}/{filename}', '删除文件'],['GET', '/api/v1/storage/signed-url/{bucket}/{user_id}/{filename}', '获取私有文件临时访问 URL']] as string[][])" :key="i">
                      <td v-for="(cell, j) in row" :key="j"><code v-if="j === 0 || j === 1">{{ cell }}</code><span v-else>{{ cell }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>{{ '所有端点均需认证（' }}<code>@api-auth: user</code>{{ '），由 ' }}<code>04.auth-guard.ts</code> {{ '中间件统一拦截。' }}</p>
            </div>
            <div class="subsection">
              <h3>{{ 'useStorage() Composable' }}</h3>
              <p>{{ '前端使用 useStorage() composable 进行文件操作，自动选择上传模式：' }}</p>
              <div class="code-block">
                <button class="copy-btn" @click="copyCode($event)">{{ '复制代码' }}</button>
                <pre><code>const { upload, remove, getSignedUrl, getPublicUrl } = useStorage()

// 上传文件（自动判断大小，选择中转或直传）
const result = await upload(file, 'avatars')
console.log(result.path, result.publicUrl)

// 删除文件
await remove('avatars', 'user-id/1234_photo.png')

// 获取私有文件临时访问链接
const url = await getSignedUrl('uploads', 'user-id/5678_doc.pdf')

// 获取公开文件 URL（无需 API 请求）
const publicUrl = getPublicUrl('avatars', 'user-id/1234_photo.png')</code></pre>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ 'Storage RLS 安全加固' }}</h3>
              <p>{{ 'Supabase 对 public bucket 默认创建的 DELETE 策略过于宽松（anon 用户可删除任意文件）。0001_core.sql 添加了 RESTRICTIVE 策略进行加固：' }}</p>
              <ul>
                <li><strong>storage_scope_restrict：</strong>{{ '限制所有操作只能在 3 个业务 bucket 范围内' }}</li>
                <li><strong>campaign_assets_restrict_delete：</strong>{{ 'campaign-assets bucket 禁止非管理员删除' }}</li>
                <li><strong>uploads_restrict_anon：</strong>{{ 'anon 用户完全禁止访问 uploads bucket' }}</li>
              </ul>
              <p>{{ '注意：RESTRICTIVE 策略与 PERMISSIVE 策略是 AND 逻辑。Supabase Storage API 的 remove() 在 RLS 阻止删除时返回 error=null, data=[]（假成功），需检查文件是否仍存在。' }}</p>
            </div>
            <div class="subsection">
              <h3>{{ '本地 Supabase 开发环境' }}</h3>
              <div class="code-block">
                <button class="copy-btn" @click="copyCode($event)">{{ '复制代码' }}</button>
                <pre><code># 安装 Supabase CLI
npm install -g supabase

# 初始化本地 Supabase
supabase init

# 启动全套服务（PG + Auth + Storage + Studio）
supabase start

# Studio 地址: http://localhost:54323
# API URL: http://localhost:54321
# Anon Key: 在 Studio → Settings → API 中查看</code></pre>
              </div>
              <p>{{ '本地 Supabase 包含完整的 PostgreSQL、Auth、Storage 和 Studio 界面，适合离线开发和测试。' }}</p>
            </div>
            <div class="subsection">
              <h3>{{ '连接验证与排查' }}</h3>
              <div class="table-wrap">
                <table>
                  <thead><tr><th v-for="col in (['检查项', '命令/位置', '预期结果'] as string[])" :key="col">{{ col }}</th></tr></thead>
                  <tbody>
                    <tr v-for="(row, i) in ([['环境变量配置', 'cat .env | grep SUPABASE', 'URL + anon key + service_role key 都已填入'],['数据库连接', 'npm run test:supabase', '所有表检查通过'],['Storage 可用', 'npm run test:storage', '上传/下载/签名URL 正常'],['RLS 策略', 'Dashboard → SQL Editor', '所有表 ENABLE ROW LEVEL SECURITY'],['迁移状态', 'supabase migration list', '所有迁移文件状态为 Applied'],['类型生成', 'npm run gen:types', '无报错，生成最新类型'],['OAuth 配置', 'Dashboard → Authentication → Providers', '回调 URL 已配置'],['帮助文档页面', '访问 /help', '所有章节内容完整显示']] as string[][])" :key="i">
                      <td v-for="(cell, j) in row" :key="j"><code v-if="j === 1">{{ cell }}</code><span v-else>{{ cell }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ '迁移同步问题排查' }}</h3>
              <ul>
                <li><strong>{{ '迁移未应用：' }}</strong><code>supabase db push</code> {{ '推送本地迁移到远程' }}</li>
                <li><strong>{{ '迁移冲突：' }}</strong><code>supabase db pull</code> {{ '拉取远程 schema，手动合并差异' }}</li>
                <li><strong>{{ '迁移损坏：' }}</strong><code>supabase migration repair &lt;version&gt; --status applied</code> {{ '标记迁移状态' }}</li>
                <li><strong>{{ '重置本地数据库：' }}</strong><code>supabase db reset</code> {{ '清空本地数据库并重新执行所有迁移' }}</li>
              </ul>
            </div>
            <div class="subsection">
              <h3>{{ '新增迁移标准流程' }}</h3>
              <ol>
                <li><code>supabase migration new &lt;name&gt;</code> {{ '创建新迁移文件' }}</li>
                <li>{{ '在生成的 SQL 文件中编写 DDL 语句（CREATE TABLE、RLS 策略等）' }}</li>
                <li><code>supabase db reset</code> {{ '本地验证迁移是否正确执行' }}</li>
                <li><code>supabase db push</code> {{ '推送到远程 Supabase 项目' }}</li>
                <li><code>npm run gen:types</code> {{ '重新生成 TypeScript 类型' }}</li>
              </ol>
              <p><strong>{{ 'SQL 编写规范：' }}</strong></p>
              <ul>
                <li v-for="(item, i) in migrationRuleItems" :key="i" v-html="item.replace(/`([^`]+)`/g, '<code>$1</code>')" />
                <li>{{ '迁移文件按顺序编号（0001, 0002...），禁止修改已推送的迁移文件' }}</li>
              </ul>
            </div>
            <div class="subsection">
              <h3>{{ 'TypeScript 类型生成' }}</h3>
              <div class="code-block">
                <button class="copy-btn" @click="copyCode($event)">{{ '复制代码' }}</button>
                <pre><code># 生成 Supabase 数据库类型定义
npm run gen:types

# 生成的文件：app/types/database.types.ts
# 每次数据库结构变更后都需要重新生成</code></pre>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ '生产回滚流程' }}</h3>
              <ol>
                <li><strong>{{ '数据库回滚：' }}</strong><code>supabase db push</code> {{ '推送回滚迁移文件' }}</li>
                <li><strong>{{ '代码回滚：' }}</strong><code>git revert &lt;commit-hash&gt;</code> {{ '或通过 Vercel Dashboard 回滚到上一个部署' }}</li>
                <li><strong>{{ '验证：' }}</strong>{{ '确认所有功能正常后，重新生成类型并运行测试' }}</li>
              </ol>
            </div>
            <div class="subsection">
              <h3>{{ '快速参考命令' }}</h3>
              <div class="code-block">
                <button class="copy-btn" @click="copyCode($event)">{{ '复制代码' }}</button>
                <pre><code># 数据库连接测试
npm run test:supabase

# Storage 集成测试
npm run test:storage

# 生成 TypeScript 类型
npm run gen:types

# 推送迁移到远程
supabase db push

# 拉取远程 schema
supabase db pull

# 创建新迁移
supabase migration new my_migration

# 重置本地数据库
supabase db reset

# 生成 RLS 策略 SQL
npm run gen:rls &lt;table&gt; [--admin]</code></pre>
              </div>
            </div>
          </div>
        </section>

        <!-- ═══════ S5: Migrations ═══════ -->
        <!-- ═══════ S6: Auth ═══════ -->
        <section id="s7" class="section" v-once>
          <div class="section-header">
            <div class="section-num">06</div>
            <h2>{{ 'Supabase OAuth 体系' }}</h2>
          </div>
          <div class="section-body">
            <div class="subsection">
              <h3>{{ '支持的登录方式' }}</h3>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th v-for="col in (['方式', 'SDK 方法', 'API 端点', '备注'] as string[])" :key="col">{{ col }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, i) in loginRows" :key="i">
                      <td v-for="(cell, j) in row" :key="j">
                        <code v-if="j === 1 || j === 2">{{ cell }}</code>
                        <span v-else>{{ cell }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ 'profiles 表核心字段' }}</h3>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th v-for="col in (['字段', '类型', '说明'] as string[])" :key="col">{{ col }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, i) in profilesRows" :key="i">
                      <td v-for="(cell, j) in row" :key="j">
                        <code v-if="j === 0">{{ cell }}</code>
                        <span v-else>{{ cell }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ 'Token 生命周期' }}</h3>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th v-for="col in (['Token 类型', '格式', '有效期', '传递方式'] as string[])" :key="col">{{ col }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, i) in tokenRows" :key="i">
                      <td v-for="(cell, j) in row" :key="j">
                        <code v-if="j === 2">{{ cell }}</code>
                        <span v-else>{{ cell }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ '服务端 API' }}</h3>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th v-for="col in (['方法', '端点', '说明'] as string[])" :key="col">{{ col }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, i) in apiAuthRows" :key="i">
                      <td v-for="(cell, j) in row" :key="j">
                        <code v-if="j === 0 || j === 1">{{ cell }}</code>
                        <span v-else>{{ cell }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ 'Cookie 安全' }}</h3>
              <p>{{ 'Auth Cookie 使用 SameSite=Strict + Secure（HTTPS）策略，最大化 CSRF 防护。服务端中间件使用 getUser()（非 getSession()）验证 JWT，遵循 Supabase 推荐的最佳实践。' }}</p>
            </div>
            <div class="subsection">
              <h3>{{ 'handle_new_user 触发器' }}</h3>
              <p>{{ '新用户注册时，Supabase 自动在 profiles 表中创建对应记录。触发器逻辑：' }}</p>
              <div class="code-block">
                <button class="copy-btn" @click="copyCode($event)">{{ '复制代码' }}</button>
                <pre><code>CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();</code></pre>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ 'useAuth() Composable API' }}</h3>
              <p>{{ '前端通过 useAuth() composable 管理认证状态，提供以下方法：' }}</p>
              <div class="table-wrap">
                <table>
                  <thead><tr><th v-for="col in (['方法', '说明'] as string[])" :key="col">{{ col }}</th></tr></thead>
                  <tbody>
                    <tr v-for="(row, i) in ([['user', '当前用户信息（响应式 ref）'],['isLoggedIn', '是否已登录（computed）'],['isAdmin', '是否为管理员（computed）'],['signIn(email, password)', '邮箱密码登录'],['signUp(email, password)', '注册新用户'],['signInWithGoogle()', 'Google OAuth 登录'],['signInWithGithub()', 'GitHub OAuth 登录'],['signInAnonymously()', '匿名登录'],['signOut()', '登出']] as string[][])" :key="i">
                      <td v-for="(cell, j) in row" :key="j"><code v-if="j === 0">{{ cell }}</code><span v-else>{{ cell }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ '权限守卫（5 层纵深防御）' }}</h3>
              <p>{{ '服务端中间件链实现分层权限控制：' }}</p>
              <ul>
                <li><strong>00.apm：</strong>{{ 'APM 性能监控，异步记录请求耗时与状态码' }}</li>
                <li><strong>01.subdomain：</strong>{{ '子域名自适应路由重写（多域名/单域名模式自动适配）' }}</li>
                <li><strong>02.auth：</strong>{{ '双模鉴权，解析用户身份（Bearer Header → Cookie → 匿名 device-id）' }}</li>
                <li><strong>03.admin：</strong>{{ '管理员断言守卫，拦截 /api/admin/*，非 admin 返回 403' }}</li>
                <li><strong>04.auth-guard：</strong>{{ '用户认证守卫，要求登录用户，匿名用户访问 payments/orders 返回 403' }}</li>
                <li><strong>06.api-security：</strong>{{ '8 层 API 安全策略：IP黑白名单 → 国家限制 → API Key 验证 → HMAC-SHA256 签名 → 端点控制 → 速率限制' }}</li>
              </ul>
            </div>
            <div class="subsection">
              <h3>{{ 'OAuth Provider 申请指南' }}</h3>
              <p><strong>Google OAuth：</strong></p>
              <ol>
                <li>{{ '前往 Google Cloud Console → APIs & Services → Credentials' }}</li>
                <li>{{ '创建 OAuth 2.0 Client ID，应用类型选择 Web application' }}</li>
                <li>{{ '在 Authorized redirect URIs 中添加 Supabase Dashboard 提供的回调 URL' }}</li>
                <li>{{ '将 Client ID 和 Client Secret 填入 Supabase Dashboard → Authentication → Providers → Google' }}</li>
              </ol>
              <p><strong>GitHub OAuth：</strong></p>
              <ol>
                <li>{{ '前往 GitHub → Settings → Developer settings → OAuth Apps → New OAuth App' }}</li>
                <li>{{ '填写 Application name、Homepage URL、Authorization callback URL' }}</li>
                <li>{{ '生成 Client Secret 后填入 Supabase Dashboard' }}</li>
              </ol>
            </div>
            <div class="subsection">
              <h3>{{ '匿名→绑定数据迁移' }}</h3>
              <p>{{ '匿名用户登录后可以绑定正式账号，服务端会自动将匿名期间的设备 ID 关联数据迁移到正式用户 ID 下。迁移策略：' }}</p>
              <ul>
                <li>{{ '匿名用户的所有数据以 device_id 为标识' }}</li>
                <li>{{ '绑定正式账号后，触发 link_identity() 将 device_id 映射到 user_id' }}</li>
                <li>{{ '绑定后的查询自动使用 user_id，无缝衔接' }}</li>
              </ul>
            </div>
            <div class="subsection">
              <h3>{{ 'H5 前端组件' }}</h3>
              <p>{{ 'H5 营销页面提供完整的登录/用户组件：' }}</p>
              <ul>
                <li><code>H5UserBar</code>：{{ '用户状态栏，显示头像/昵称/登出按钮' }}</li>
                <li><code>H5LoginModal</code>：{{ '登录弹窗，支持邮箱/Google/GitHub/匿名四种方式' }}</li>
                <li>{{ '两个组件均支持 i18n 中英文双语，通过 t() 函数切换语言' }}</li>
              </ul>
            </div>
            <div class="subsection">
              <h3>{{ '常见认证问题' }}</h3>
              <div class="faq-item" :class="{ expanded: faqExpanded['auth-trouble-0'] }">
                <div class="faq-q" @click="toggleFaq('auth-trouble-0')">
                  <span class="faq-chevron">▸</span>
                  Q: {{ '邮箱注册后用户无法登录？' }}
                </div>
                <div class="faq-a" v-show="faqExpanded['auth-trouble-0']">
                  A: {{ '检查 Supabase Dashboard → Authentication → Settings → Email Auth。如果开启了 Confirm email，用户必须点击确认邮件中的链接激活后才能登录。开发测试阶段可先关闭此选项。' }}
                </div>
              </div>
              <div class="faq-item" :class="{ expanded: faqExpanded['auth-trouble-1'] }">
                <div class="faq-q" @click="toggleFaq('auth-trouble-1')">
                  <span class="faq-chevron">▸</span>
                  Q: {{ 'OAuth 回调报错 Invalid redirect URL？' }}
                </div>
                <div class="faq-a" v-show="faqExpanded['auth-trouble-1']">
                  A: {{ '需在 Supabase Dashboard → Authentication → URL Configuration → Redirect URLs 中添加对应的域名（如本地开发填 http://localhost:3000/api/v1/auth/callback，生产环境填线上真实域名回调）。' }}
                </div>
              </div>
              <div class="faq-item" :class="{ expanded: faqExpanded['auth-trouble-2'] }">
                <div class="faq-q" @click="toggleFaq('auth-trouble-2')">
                  <span class="faq-chevron">▸</span>
                  Q: {{ 'Token 过期后接口返回 401 报错？' }}
                </div>
                <div class="faq-a" v-show="faqExpanded['auth-trouble-2']">
                  A: {{ '检查 Cookie 中 sb-refresh-token 是否存在。正常情况下客户端 supabase-auth 插件会自动监听并刷新 token。如仍 401，请检查 Supabase 控制台中 JWT Expiry 设置（推荐为 3600s）。' }}
                </div>
              </div>
              <div class="faq-item" :class="{ expanded: faqExpanded['auth-trouble-3'] }">
                <div class="faq-q" @click="toggleFaq('auth-trouble-3')">
                  <span class="faq-chevron">▸</span>
                  Q: {{ '设备绑定邮箱后匿名历史数据会丢失吗？' }}
                </div>
                <div class="faq-a" v-show="faqExpanded['auth-trouble-3']">
                  A: {{ '历史行为与广告事件主要绑定在 device_id 上，绑定后新业务数据走正式的 user_id。历史的匿名记录可通过关联的 device-id header 进行合并与追溯。' }}
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ═══════ S7: Vercel Deployment ═══════ -->
        <section id="s8" class="section" v-once>
          <div class="section-header">
            <div class="section-num">08</div>
            <h2>{{ 'Vercel 部署' }}</h2>
          </div>
          <div class="section-body">
            <div class="subsection">
              <h3>{{ '部署流程' }}</h3>
              <ol>
                <li>{{ '将项目代码推送到 GitHub' }}</li>
                <li><a href="https://vercel.com/dashboard" target="_blank">Vercel Dashboard</a> → {{ '导入 Git 仓库' }}</li>
                <li>{{ '配置生产环境变量（所有 .env 中的变量）' }}</li>
                <li>{{ '设置 Framework Preset 为 Nuxt.js，Node.js Version ≥ 20.x' }}</li>
                <li>{{ '部署完成，自动分配 vercel.app 域名' }}</li>
              </ol>
            </div>
            <div class="subsection">
              <h3>{{ '生产环境变量配置' }}</h3>
              <p>{{ '在 Vercel Dashboard → 你的项目 → Settings → Environment Variables 中逐项配置：' }}</p>
              <div class="table-wrap">
                <table>
                  <thead><tr><th v-for="col in (['变量名', '说明', '是否必须'] as string[])" :key="col">{{ col }}</th></tr></thead>
                  <tbody>
                    <tr v-for="(row, i) in ([['MOCK_DB', '关闭 Mock 沙盒，设为 false', '必须'],['SUPABASE_URL', 'Supabase 项目 URL（服务端）', '必须'],['SUPABASE_SERVICE_ROLE_KEY', 'Supabase 服务端密钥（禁止加 NUXT_PUBLIC_ 前缀）', '必须'],['NUXT_PUBLIC_SUPABASE_URL', 'Supabase URL（前端公开）', '必须'],['NUXT_PUBLIC_SUPABASE_ANON_KEY', 'Supabase anon 公钥（前端公开）', '必须'],['STRIPE_SECRET_KEY', 'Stripe 密钥（服务端）', '可选'],['STRIPE_WEBHOOK_SECRET', 'Stripe Webhook 签名密钥', '可选'],['STRIPE_PUBLIC_KEY', 'Stripe 公钥', '可选']] as string[][])" :key="i">
                      <td><code>{{ row[0] }}</code></td>
                      <td>{{ row[1] }}</td>
                      <td><span :class="row[2] === '必须' ? 'badge badge-purple' : 'badge badge-cyan'">{{ row[2] }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="alert alert-warn">
                <div class="alert-icon">🔒</div>
                <div class="alert-body">
                  <strong>{{ '安全红线' }}</strong>
                  <p>{{ 'SUPABASE_SERVICE_ROLE_KEY 和 STRIPE_SECRET_KEY 绝对不能加 NUXT_PUBLIC_ 前缀。只有 NUXT_PUBLIC_ 前缀的变量才会暴露给浏览器端。' }}</p>
                </div>
              </div>
              <p>{{ '⚠️ 环境变量修改后需重新部署才能生效。可推送一个空 commit 触发：' }}</p>
              <div class="code-block">
                <button class="copy-btn" @click="copyCode($event)">{{ '复制代码' }}</button>
                <pre><code>git commit --allow-empty -m "chore: redeploy for env update" && git push</code></pre>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ '渲染策略' }}</h3>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th v-for="col in (['路由', '策略', '说明'] as string[])" :key="col">{{ col }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, i) in renderingRows" :key="i">
                      <td><code>{{ row[0] }}</code></td>
                      <td>
                        <span class="badge" :class="{
                          'badge-purple': (row[1] as string).includes('ISR'),
                          'badge-cyan': (row[1] as string).includes('SWR'),
                          'badge-green': (row[1] as string).includes('SPA'),
                          'badge-orange': (row[1] as string).includes('no-store'),
                        }">{{ row[1] }}</span>
                      </td>
                      <td>{{ row[2] }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ '域名配置' }}</h3>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th v-for="col in (['类型', '域名', '记录类型', '值', '说明'] as string[])" :key="col">{{ col }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, i) in domainRows" :key="i">
                      <td v-for="(cell, j) in row" :key="j">
                        <code v-if="j === 0">{{ cell }}</code>
                        <span v-else>{{ cell }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ '站点 URL 与子域名路由' }}</h3>
              <p>{{ '项目采用零配置方案，站点 URL 自动适配不同环境：' }}</p>
              <div class="table-wrap">
                <table>
                  <thead><tr><th v-for="col in (['环境', 'URL 来源', '示例'] as string[])" :key="col">{{ col }}</th></tr></thead>
                  <tbody>
                    <tr v-for="(row, i) in ([['本地开发', '默认值', 'http://localhost:3000'],['Vercel Preview', 'VERCEL_URL（自动注入）', 'https://hehe-app-git-main.vercel.app'],['Vercel Production', 'VERCEL_URL（绑定域名后自动）', 'https://yourdomain.com']] as string[][])" :key="i">
                      <td v-for="(cell, j) in row" :key="j"><code v-if="j === 1">{{ cell }}</code><span v-else>{{ cell }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>{{ '子域名路由中间件自动派生逻辑：' }}</p>
              <ul>
                <li>{{ 'server/middleware/01.subdomain-rewrite.ts 自动从运行环境中提取根域名，在 Vercel 绑定自定义域名后自动激活通配符 H5 子域名，无需手动设置。' }}</li>
                <li>{{ '本地开发子域名需要配置 ROOT_DOMAIN=yourdomain.localhost 环境变量，并配合本地 host 映射。' }}</li>
                <li>{{ '可配置最高优先级的 NUXT_PUBLIC_BASE_URL 环境变量，显式覆盖站点根路径。' }}</li>
              </ul>
            </div>
            <div class="subsection">
              <h3>{{ '部署检查清单' }}</h3>
              <ul class="checklist">
                <li v-for="(item, i) in checklistItems" :key="i">✅ {{ item }}</li>
              </ul>
            </div>
            <div class="subsection">
              <h3>{{ 'Vercel Analytics & Speed Insights' }}</h3>
              <p>{{ 'Vercel 提供内置的性能监控与流量分析工具：' }}</p>
              <p>{{ '安装统计与监控依赖：' }}</p>
              <div class="code-block">
                <button class="copy-btn" @click="copyCode($event)">{{ '复制代码' }}</button>
                <pre><code># 安装 Vercel 性能分析与监控包
npm i @vercel/analytics @vercel/speed-insights</code></pre>
              </div>
              <p>{{ '在 app.vue 中引入并挂载（Nuxt 4 集成方式）：' }}</p>
              <div class="code-block">
                <button class="copy-btn" @click="copyCode($event)">{{ '复制代码' }}</button>
                <pre><code>&lt;script setup lang="ts"&gt;
import { Analytics } from '@vercel/analytics/nuxt'
import { SpeedInsights } from '@vercel/speed-insights/nuxt'
&lt;/script&gt;

&lt;template&gt;
  &lt;div&gt;
    &lt;NuxtLayout&gt;
      &lt;NuxtPage /&gt;
    &lt;/NuxtLayout&gt;
    &lt;!-- 挂载监控组件 --&gt;
    &lt;Analytics /&gt;
    &lt;SpeedInsights /&gt;
  &lt;/div&gt;
&lt;/template&gt;</code></pre>
              </div>
              <ul>
                <li><strong>Analytics：</strong>{{ '在 Vercel Dashboard → Analytics 中一键启用，自动收集 PV、UV、访问来源及设备类型。' }}</li>
                <li><strong>Speed Insights：</strong>{{ '监控 Core Web Vitals 指标（如 LCP、CLS、INP），为产品性能优化提供高价值建议。' }}</li>
                <li>{{ 'Hobby 计划包含基础的分析数据，Pro 计划提供更长的历史保留期及多维度高级数据。' }}</li>
              </ul>
            </div>
            <div class="subsection">
              <h3>{{ 'Stripe Webhook 配置' }}</h3>
              <p>{{ '支付功能需要在 Stripe Dashboard 和 Vercel 中配置 Webhook：' }}</p>
              <ol>
                <li>{{ '在 Stripe Dashboard → Developers → Webhooks → Add endpoint' }}</li>
                <li>{{ 'Endpoint URL 设置为 ' }}<code>https://your-domain.com/api/v1/payments/webhook</code></li>
                <li>{{ '选择要监听的事件：' }}<code>payment_intent.succeeded</code>, <code>payment_intent.payment_failed</code></li>
                <li>{{ '获取 Webhook Signing Secret 并填入 Vercel 环境变量 ' }}<code>STRIPE_WEBHOOK_SECRET</code></li>
                <li><strong>{{ '本地测试：' }}</strong><code>stripe listen --forward-to localhost:3000/api/v1/payments/webhook</code></li>
              </ol>
            </div>
            <div class="subsection">
              <h3>{{ 'Vercel CLI 部署（可选）' }}</h3>
              <p>{{ '除了 Dashboard 导入，也可以通过 Vercel CLI 部署：' }}</p>
              <div class="code-block">
                <button class="copy-btn" @click="copyCode($event)">{{ '复制代码' }}</button>
                <pre><code># 安装 Vercel CLI
npm i -g vercel

# 登录并部署
vercel login
vercel

# 生产部署
vercel --prod</code></pre>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ 'Preview Deployments（预览部署）' }}</h3>
              <p>{{ '每次推送代码到非 main 分支或创建 Pull Request 时，Vercel 都会自动创建一个独立的预览部署。' }}</p>
              <p>{{ '预览部署的典型开发流程示例：' }}</p>
              <div class="code-block">
                <button class="copy-btn" @click="copyCode($event)">{{ '复制代码' }}</button>
                <pre><code># 1. 检出新功能分支
git checkout -b feature/new-campaign

# 2. 开发完毕后提交并推送到 GitHub
git add .
git commit -m "feat: design new H5 campaign page"
git push origin feature/new-campaign

# → Vercel 会自动监听该推送，并生成带有该分支名称的预览 URL</code></pre>
              </div>
              <p>{{ '预览环境特点及数据库隔离：' }}</p>
              <ul>
                <li>{{ 'PR 关联：Vercel 会自动在 GitHub 的 PR 评论中提供该环境的预览链接。' }}</li>
                <li>{{ '独立配置：预览环境默认复用生产环境变量。如需测试数据库隔离，可在 Vercel 后台为 Preview 环境配置专门的测试数据库 API 凭证，或在 Pro 团队计划中使用 Supabase Branching。' }}</li>
                <li>{{ '合并上线：预览环境验证通过后，将 PR 合并到 main 分支，即会自动触发生产环境的增量更新。' }}</li>
              </ul>
            </div>
            <div class="subsection">
              <h3>{{ 'Vercel 计划选择' }}</h3>
              <div class="table-wrap">
                <table>
                  <thead><tr><th v-for="col in (['计划', '价格', '适合场景'] as string[])" :key="col">{{ col }}</th></tr></thead>
                  <tbody>
                    <tr v-for="(row, i) in ([['Hobby', '免费', '个人项目，每日 100GB 带宽，ISR 缓存 3600s 上限'],['Pro', '$20/月', '商业项目，1TB 带宽，更长 ISR 缓存，团队协作'],['Enterprise', '定制', '企业级，无限带宽，专属支持，SLA 保障']] as string[][])" :key="i">
                      <td v-for="(cell, j) in row" :key="j"><strong v-if="j === 0">{{ cell }}</strong><span v-else>{{ cell }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ '常见部署问题' }}</h3>
              <div class="faq-item" :class="{ expanded: faqExpanded['deploy-trouble-0'] }">
                <div class="faq-q" @click="toggleFaq('deploy-trouble-0')">
                  <span class="faq-chevron">▸</span>
                  Q: {{ '部署后页面白屏 / 500 错误？' }}
                </div>
                <div class="faq-a" v-show="faqExpanded['deploy-trouble-0']">
                  A: {{ '检查 Vercel 环境变量是否全部配置（尤其是 NUXT_PUBLIC_SUPABASE_URL 和 NUXT_PUBLIC_SUPABASE_ANON_KEY，以及 MOCK_DB 设为 false）。打开浏览器控制台查看 Network 请求，或在 Vercel Dashboard → Deployments → Functions 日志中排查具体运行时报错。' }}
                </div>
              </div>
              <div class="faq-item" :class="{ expanded: faqExpanded['deploy-trouble-1'] }">
                <div class="faq-q" @click="toggleFaq('deploy-trouble-1')">
                  <span class="faq-chevron">▸</span>
                  Q: {{ 'API 路由返回 404？' }}
                </div>
                <div class="faq-a" v-show="faqExpanded['deploy-trouble-1']">
                  A: {{ '确认 API 路由格式正确（如 /api/v1/xxx）。检查子域名重写中间件（01.subdomain-rewrite）是否正确识别了请求，在 Vercel Functions 日志中检查 event.path 路径重写结果。' }}
                </div>
              </div>
              <div class="faq-item" :class="{ expanded: faqExpanded['deploy-trouble-2'] }">
                <div class="faq-q" @click="toggleFaq('deploy-trouble-2')">
                  <span class="faq-chevron">▸</span>
                  Q: {{ '子域名不生效？' }}
                </div>
                <div class="faq-a" v-show="faqExpanded['deploy-trouble-2']">
                  A: {{ '确认 DNS 中通配符记录（*.example.com）已正确配置并指向 Vercel。对于通配符域名，必须使用 Vercel Nameservers。确认 Vercel Dashboard → Domains 中已添加了通配符域名。' }}
                </div>
              </div>
              <div class="faq-item" :class="{ expanded: faqExpanded['deploy-trouble-3'] }">
                <div class="faq-q" @click="toggleFaq('deploy-trouble-3')">
                  <span class="faq-chevron">▸</span>
                  Q: {{ '环境变量修改后不生效？' }}
                </div>
                <div class="faq-a" v-show="faqExpanded['deploy-trouble-3']">
                  A: {{ 'Vercel 的环境变量在构建时注入。修改环境变量后需要进行 Redeploy。可以通过 Vercel 后台点击 Redeploy，或推送一个空 commit 触发自动重新部署：git commit --allow-empty -m "chore: redeploy for env update" && git push。' }}
                </div>
              </div>
              <div class="faq-item" :class="{ expanded: faqExpanded['deploy-trouble-4'] }">
                <div class="faq-q" @click="toggleFaq('deploy-trouble-4')">
                  <span class="faq-chevron">▸</span>
                  Q: {{ 'ISR/SWR 缓存不更新？' }}
                </div>
                <div class="faq-a" v-show="faqExpanded['deploy-trouble-4']">
                  A: {{ 'Vercel 的缓存根据 routeRules 中的时间自动过期。如需强制清除，可在 Vercel Dashboard → Deployments 中点击 Purge Cache，或者推送新代码部署（新部署会自动清除缓存）。' }}
                </div>
              </div>
              <div class="faq-item" :class="{ expanded: faqExpanded['deploy-trouble-5'] }">
                <div class="faq-q" @click="toggleFaq('deploy-trouble-5')">
                  <span class="faq-chevron">▸</span>
                  Q: {{ '构建超时或内存不足？' }}
                </div>
                <div class="faq-a" v-show="faqExpanded['deploy-trouble-5']">
                  A: {{ 'Hobby 计划构建超时上限为 45 分钟，内存约 3GB。如果构建失败，检查是否引入了过大依赖（如 puppeteer）。若确实需要，可以在 vercel.json 中为特定函数增加内存限制，或升级到 Pro 计划。' }}
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ═══════ S8: GitHub ═══════ -->
        <section id="s9" class="section" v-once>
          <div class="section-header">
            <div class="section-num">09</div>
            <h2>{{ 'GitHub 集成' }}</h2>
          </div>
          <div class="section-body">
            <div class="subsection">
              <h3>{{ '前置准备' }}</h3>
              <p>{{ '使用 GitHub 进行代码托管与 CI/CD 流程：' }}</p>
              <ol>
                <li>{{ '注册 GitHub 账号，并推荐在本地配置 Git 身份信息：' }}</li>
                <div class="code-block">
                  <button class="copy-btn" @click="copyCode($event)">{{ '复制代码' }}</button>
                  <pre><code>git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"</code></pre>
                </div>
                <li>{{ '安装 GitHub CLI（推荐），方便通过命令行管理 PR 与仓库：' }}</li>
                <div class="code-block">
                  <button class="copy-btn" @click="copyCode($event)">{{ '复制代码' }}</button>
                  <pre><code>brew install gh
gh auth login</code></pre>
                </div>
              </ol>
            </div>
            <div class="subsection">
              <h3>{{ '创建与推送仓库' }}</h3>
              <p>{{ '将本地项目关联并推送到 GitHub 远程私有仓库：' }}</p>
              <ol>
                <li>{{ '在 GitHub 上创建一个名为 ' }}<code>hehe-app</code>{{ ' 的私有仓库（Private）。' }}</li>
                <li>{{ '在本地项目根目录下，运行以下命令进行关联并推送：' }}</li>
                <div class="code-block">
                  <button class="copy-btn" @click="copyCode($event)">{{ '复制代码' }}</button>
                  <pre><code># 初始化 git 并设置默认分支为 main
git init
git branch -M main

# 关联远程仓库
git remote add origin https://github.com/your-username/hehe-app.git

# 首次推送代码
git add .
git commit -m "Initial commit: Nuxt 4 + Supabase + Vercel"
git push -u origin main</code></pre>
                </div>
              </ol>
            </div>
            <div class="subsection">
              <h3>{{ '.gitignore 配置' }}</h3>
              <p>{{ '确保敏感和不必要的构建文件不被提交。项目根目录下应包含完整的 .gitignore：' }}</p>
              <div class="code-block">
                <button class="copy-btn" @click="copyCode($event)">{{ '复制代码' }}</button>
                <pre><code># 依赖与临时文件
node_modules/
.nuxt/
.output/
.data/
.nitro/
.cache/

# 环境变量 (严禁提交敏感密钥)
.env
.env.*
!.env.example

# 构建产物与平台临时目录
dist/
.vercel/</code></pre>
              </div>
              <div class="alert alert-warn">
                <div class="alert-icon">🔒</div>
                <div class="alert-body">
                  <strong>{{ '安全红线' }}</strong>
                  <p>{{ '.env 文件包含 Supabase 和 Stripe 密钥，绝对不能提交到 GitHub。如果误提交，需要立即在服务商后台重置/轮换所有密钥，并使用 git-filter-repo 彻底清理 Git 历史。' }}</p>
                </div>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ '分支策略' }}</h3>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th v-for="col in (['分支', '说明'] as string[])" :key="col">{{ col }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, i) in branchRows" :key="i">
                      <td v-for="(cell, j) in row" :key="j">
                        <code v-if="j === 0">{{ cell }}</code>
                        <span v-else>{{ cell }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ 'GitHub Actions CI' }}</h3>
              <p>{{ '在 .github/workflows/ci.yml 中配置自动类型检查和构建验证：' }}</p>
              <div class="code-block">
                <button class="copy-btn" @click="copyCode($event)">{{ '复制代码' }}</button>
                <pre><code>{{ ciYaml }}</code></pre>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ 'Commit 消息规范' }}</h3>
              <p>{{ '遵循 Conventional Commits 规范：' }}</p>
              <div class="table-wrap">
                <table>
                  <thead><tr><th v-for="col in (['类型', '说明', '示例'] as string[])" :key="col">{{ col }}</th></tr></thead>
                  <tbody>
                    <tr v-for="(row, i) in ([['feat', '新功能', 'feat: add user avatar upload'],['fix', 'Bug 修复', 'fix: resolve login redirect loop'],['docs', '文档更新', 'docs: update API reference'],['refactor', '代码重构', 'refactor: extract auth middleware'],['chore', '构建/工具变更', 'chore: update dependencies']] as string[][])" :key="i">
                      <td v-for="(cell, j) in row" :key="j"><code v-if="j === 0">{{ cell }}</code><span v-else>{{ cell }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ '分支保护建议' }}</h3>
              <ul>
                <li v-for="(item, i) in protectionItems" :key="i">{{ item }}</li>
              </ul>
            </div>
            <div class="subsection">
              <h3>{{ '与 Vercel 联动' }}</h3>
              <p>{{ 'GitHub 仓库与 Vercel 深度集成：' }}</p>
              <ul>
                <li><strong>{{ 'Push main → Production：' }}</strong>{{ '推送到 main 分支自动触发 Vercel 生产部署' }}</li>
                <li><strong>{{ 'Push branch → Preview：' }}</strong>{{ '推送到任意分支自动创建 Vercel 预览部署' }}</li>
                <li><strong>{{ 'PR → Preview：' }}</strong>{{ '每个 PR 自动生成独立预览 URL，方便 Code Review 时验证' }}</li>
                <li>{{ '.gitattributes 配置统一 LF 换行符，避免 Windows/Mac/Linux 跨平台差异' }}</li>
              </ul>
            </div>
            <div class="subsection">
              <h3>{{ 'PR 模板' }}</h3>
              <p>{{ '在 .github/pull_request_template.md 中创建 PR 模板：' }}</p>
              <div class="code-block">
                <button class="copy-btn" @click="copyCode($event)">{{ '复制代码' }}</button>
                <pre><code>## 变更说明
<!-- 简要描述本次变更内容 -->

## 变更类型
- [ ] 新功能
- [ ] Bug 修复
- [ ] 文档更新
- [ ] 重构

## 测试
<!-- 描述如何测试这些变更 -->

## 检查清单
- [ ] 代码通过 type check (npm run check)
- [ ] 代码通过 build (npm run build)
- [ ] API 安全扫描通过 (npm run test:api-safety)
- [ ] 相关文档已更新</code></pre>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ 'Pull Request 工作流与合并' }}</h3>
              <p>{{ 'PR 是单仓或多团队协作中保证主干代码质量的核心工作流：' }}</p>
              <ol>
                <li><strong>{{ '创建 PR：' }}</strong>{{ '在 GitHub 推送 feature 分支后，点击仓库顶部的 Compare & pull request，根据模板填写 Title 和 Description。' }}</li>
                <li><strong>{{ '状态检查：' }}</strong>{{ '等待 GitHub Actions 自动运行，确认编译与类型检查（Status checks）全部变为绿色通过状态。' }}</li>
                <li><strong>{{ '选择合并方式：' }}</strong>
                  <ul>
                    <li><strong>Merge commit</strong>：{{ '保留所有细分 commit 提交记录及分支线（推荐，最完整）。' }}</li>
                    <li><strong>Squash and merge</strong>：{{ '将分支上的所有提交压缩合并为一个 clean commit 写入主干（适合碎片化小功能）。' }}</li>
                    <li><strong>Rebase and merge</strong>：{{ '采用变基的形式保持一条线性的主干提交历史。' }}</li>
                  </ul>
                </li>
                <li><strong>{{ '触发上线：' }}</strong>{{ '点击 Confirm merge 合并后，Vercel 将自动接管并将代码部署上线至生产环境。' }}</li>
              </ol>
            </div>
            <div class="subsection">
              <h3>{{ '安全实践' }}</h3>
              <div class="alert alert-warn">
                <div class="alert-icon">⚠️</div>
                <div class="alert-body">
                  <strong>{{ '密钥泄露应急处理' }}</strong>
                  <p>{{ '如果密钥被意外提交到 Git 仓库：' }}</p>
                  <ol>
                    <li>{{ '立即在 Supabase/Stripe Dashboard 中撤销泄露的密钥' }}</li>
                    <li>{{ '使用 git-filter-repo 清理 Git 历史中的敏感信息' }}</li>
                    <li>{{ '在 GitHub → Settings → Secrets 中重新生成密钥' }}</li>
                    <li>{{ '强制推送清理后的历史（需团队协调）' }}</li>
                  </ol>
                </div>
              </div>
              <ul>
                <li>{{ '.gitattributes 配置统一 LF 换行，避免跨平台差异' }}</li>
                <li>{{ 'GitHub Secrets 存储 CI 所需的敏感环境变量' }}</li>
                <li>{{ '定期审查仓库的 Collaborator 和 Access Token 权限' }}</li>
              </ul>
            </div>
            <div class="subsection">
              <h3>{{ '常见 GitHub 问题' }}</h3>
              <div class="faq-item" :class="{ expanded: faqExpanded['gh-trouble-0'] }">
                <div class="faq-q" @click="toggleFaq('gh-trouble-0')">
                  <span class="faq-chevron">▸</span>
                  Q: {{ 'git push 报 Permission denied？' }}
                </div>
                <div class="faq-a" v-show="faqExpanded['gh-trouble-0']">
                  A: {{ '检查 SSH Key 是否已添加到 GitHub（Settings → SSH and GPG keys）。使用 ssh -T git@github.com 测试连接。如果使用 HTTPS，检查 Personal Access Token 是否过期。' }}
                </div>
              </div>
              <div class="faq-item" :class="{ expanded: faqExpanded['gh-trouble-1'] }">
                <div class="faq-q" @click="toggleFaq('gh-trouble-1')">
                  <span class="faq-chevron">▸</span>
                  Q: {{ 'CI 构建失败？' }}
                </div>
                <div class="faq-a" v-show="faqExpanded['gh-trouble-1']">
                  A: {{ '查看 GitHub Actions 的详细日志。常见原因：npm ci 失败（检查 package-lock.json 是否提交）、TypeScript 类型错误（运行 npm run check 本地验证）、构建超时。' }}
                </div>
              </div>
              <div class="faq-item" :class="{ expanded: faqExpanded['gh-trouble-2'] }">
                <div class="faq-q" @click="toggleFaq('gh-trouble-2')">
                  <span class="faq-chevron">▸</span>
                  Q: {{ '误删了文件/分支怎么恢复？' }}
                </div>
                <div class="faq-a" v-show="faqExpanded['gh-trouble-2']">
                  A: {{ '使用 git reflog 查看操作历史，找到删除前的 commit hash，然后 git checkout &lt;hash&gt; -- &lt;file&gt; 恢复文件，或 git branch &lt;name&gt; &lt;hash&gt; 恢复分支。' }}
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ═══════ S9: Stripe Payments ═══════ -->
        <section id="s10" class="section" v-once>
          <div class="section-header">
            <div class="section-num">10</div>
            <h2>{{ '支付系统' }}</h2>
          </div>
          <div class="section-body">
            <div class="subsection">
              <h3>{{ '支付流程' }}</h3>
              <div class="flow-steps">
                <template v-for="(step, i) in (['用户选择商品', '创建 PaymentIntent', 'Stripe Elements 收集支付信息', '确认支付', 'Webhook 回调更新订单状态'] as string[])" :key="i">
                  <div class="flow-step"><span class="flow-num">{{ i + 1 }}</span>{{ step }}</div>
                  <div v-if="i < (['用户选择商品', '创建 PaymentIntent', 'Stripe Elements 收集支付信息', '确认支付', 'Webhook 回调更新订单状态'] as string[]).length - 1" class="flow-arrow">→</div>
                </template>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ '双模式运行' }}</h3>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th v-for="col in (['模式', '配置', '行为'] as string[])" :key="col">{{ col }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, i) in dualRows" :key="i">
                      <td v-for="(cell, j) in row" :key="j">
                        <code v-if="j === 1">{{ cell }}</code>
                        <span v-else>{{ cell }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ '支付策略模式' }}</h3>
              <p>{{ '支付系统采用策略模式设计（server/utils/payment-strategies/），支持多支付渠道扩展：' }}</p>
              <div class="table-wrap">
                <table>
                  <thead><tr><th v-for="col in (['文件', '职责', '说明'] as string[])" :key="col">{{ col }}</th></tr></thead>
                  <tbody>
                    <tr v-for="(row, i) in ([['types.ts', '策略接口定义', 'PaymentStrategy 接口：createSession + verifyWebhook'],['factory.ts', '策略工厂', '按 provider 名获取策略实例，预留 PayPal/WeChat 扩展'],['stripe.ts', 'Stripe 策略', '支持 subscription（订阅制）和 payment（一次性付款）两种模式']] as string[][])" :key="i">
                      <td v-for="(cell, j) in row" :key="j"><code v-if="j === 0">{{ cell }}</code><span v-else>{{ cell }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p><strong>{{ 'Stripe Webhook 事件：' }}</strong>{{ 'checkout.session.completed、customer.subscription.created/updated/deleted、invoice.payment_failed、charge.refunded' }}</p>
              <p><strong>{{ '支付配置来源：' }}</strong>{{ '生产环境从 ' }}<code>payment_configs</code> {{ '和 ' }}<code>system_configs</code> {{ '表动态读取 Stripe 密钥，无需硬编码。' }}</p>
            </div>
            <div class="subsection">
              <h3>{{ 'orders 表 RLS 策略' }}</h3>
              <ul>
                <li v-for="(item, i) in rlsItems" :key="i" v-html="item.replace(/`([^`]+)`/g, '<code>$1</code>')" />
              </ul>
            </div>
            <div class="subsection">
              <h3>{{ 'usePayment() Composable' }}</h3>
              <p>{{ '前端通过 usePayment() composable 管理支付流程：' }}</p>
              <div class="table-wrap">
                <table>
                  <thead><tr><th v-for="col in (['方法', '说明'] as string[])" :key="col">{{ col }}</th></tr></thead>
                  <tbody>
                    <tr v-for="(row, i) in ([['createOrder(productId, quantity)', '创建订单，返回 orderId + clientSecret'],['confirmPayment(orderId)', '确认支付，返回订单状态'],['orders', '当前用户的订单列表（响应式 ref）'],['currentOrder', '当前正在处理的订单']] as string[][])" :key="i">
                      <td v-for="(cell, j) in row" :key="j"><code v-if="j === 0">{{ cell }}</code><span v-else>{{ cell }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ 'Checkout Session 参数' }}</h3>
              <p>{{ '创建 Stripe Checkout Session 的关键参数：' }}</p>
              <div class="code-block">
                <button class="copy-btn" @click="copyCode($event)">{{ '复制代码' }}</button>
                <pre><code>const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  line_items: [{
    price_data: {
      currency: 'usd',
      product_data: { name: 'Product Name' },
      unit_amount: Math.round(amount * 100), // 美元转美分
    },
    quantity: 1,
  }],
  mode: 'payment',
  success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${origin}/cancel`,
  metadata: { orderId: order.id },
})</code></pre>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ '金额安全' }}</h3>
              <ul>
                <li v-for="(item, i) in amountItems" :key="i" v-html="item.replace(/`([^`]+)`/g, '<code>$1</code>')" />
              </ul>
            </div>
            <div class="subsection">
              <h3>{{ 'Admin 管理端 API' }}</h3>
              <p>{{ '管理员可通过以下 API 管理订单和查看收入：' }}</p>
              <div class="table-wrap">
                <table>
                  <thead><tr><th v-for="col in (['方法', '端点', '说明'] as string[])" :key="col">{{ col }}</th></tr></thead>
                  <tbody>
                    <tr v-for="(row, i) in ([['GET', '/api/admin/orders', '查询所有订单（支持状态筛选、分页）'],['PATCH', '/api/admin/orders/:id', '更新订单状态（退款/完成）'],['GET', '/api/admin/revenue', '收入统计（按日/周/月汇总）']] as string[][])" :key="i">
                      <td v-for="(cell, j) in row" :key="j"><code v-if="j === 0 || j === 1">{{ cell }}</code><span v-else>{{ cell }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ '审计日志' }}</h3>
              <p>{{ '所有支付相关操作（创建订单、确认支付、退款）都会记录到 activity_logs 表。该表为 append-only，不删除不修改，确保操作可追溯。' }}</p>
            </div>
            <div class="subsection">
              <h3>{{ '测试卡号' }}</h3>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th v-for="col in (['卡号', '品牌', '结果'] as string[])" :key="col">{{ col }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, i) in testCardRows" :key="i">
                      <td v-for="(cell, j) in row" :key="j">
                        <code v-if="j === 0">{{ cell }}</code>
                        <span v-else>{{ cell }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ 'Stripe 账号注册与配置' }}</h3>
              <ol>
                <li>{{ '前往 ' }}<a href="https://dashboard.stripe.com/register" target="_blank">dashboard.stripe.com/register</a> {{ '注册账号' }}</li>
                <li>{{ '在 Developers → API keys 中获取 Publishable key 和 Secret key' }}</li>
                <li>{{ '测试模式使用以 sk_test_ 开头的密钥，生产模式使用 sk_live_' }}</li>
                <li>{{ '将 STRIPE_SECRET_KEY 填入 .env 和 Vercel 环境变量' }}</li>
              </ol>
            </div>
            <div class="subsection">
              <h3>{{ 'Webhook 签名验证' }}</h3>
              <p>{{ '服务端使用 Stripe SDK 的 constructEvent() 方法验证 Webhook 签名，防止伪造回调。关键代码：' }}</p>
              <div class="code-block">
                <button class="copy-btn" @click="copyCode($event)">{{ '复制代码' }}</button>
                <pre><code>const sig = getHeader(event, 'stripe-signature')
const stripeEvent = stripe.webhooks.constructEvent(
  body, sig, process.env.STRIPE_WEBHOOK_SECRET
)</code></pre>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ '常见支付问题' }}</h3>
              <div class="faq-item" :class="{ expanded: faqExpanded['pay-trouble-0'] }">
                <div class="faq-q" @click="toggleFaq('pay-trouble-0')">
                  <span class="faq-chevron">▸</span>
                  Q: {{ 'Mock 模式下支付返回什么？' }}
                </div>
                <div class="faq-a" v-show="faqExpanded['pay-trouble-0']">
                  A: {{ 'Mock 模式下所有支付 API 返回模拟数据：创建订单返回假的 paymentIntentId，确认支付直接返回 success 状态。适合前端 UI 开发。' }}
                </div>
              </div>
              <div class="faq-item" :class="{ expanded: faqExpanded['pay-trouble-1'] }">
                <div class="faq-q" @click="toggleFaq('pay-trouble-1')">
                  <span class="faq-chevron">▸</span>
                  Q: {{ 'Webhook 收不到回调？' }}
                </div>
                <div class="faq-a" v-show="faqExpanded['pay-trouble-1']">
                  A: {{ '检查 Stripe Dashboard → Webhooks 中端点 URL 是否正确、事件是否已选择（payment_intent.succeeded）。使用 Stripe CLI 的 stripe trigger 命令手动发送测试事件。确认 Webhook Secret 环境变量配置正确。' }}
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ═══════ S11: Admin Dashboard ═══════ -->
        <section id="s11" class="section" v-once>
          <div class="section-header">
            <div class="section-num">11</div>
            <h2>{{ '管理后台' }}</h2>
          </div>
          <div class="section-body">
            <div class="subsection">
              <h3>{{ '登录方式' }}</h3>
              <p>{{ '管理后台通过 ' }}<code>/admin</code> {{ '路径访问（SPA 模式，纯客户端渲染）。使用 Supabase Auth 邮箱密码登录，登录后会校验用户 ' }}<code>role</code> {{ ' 是否为 ' }}<code>admin</code>{{ '，非管理员账号将被拒绝访问。管理员账号通过 Supabase Dashboard 或 ' }}<code>temp-create-admin.mjs</code> {{ '脚本创建。' }}</p>
            </div>
            <div class="subsection">
              <h3>{{ '三种导航模式' }}</h3>
              <p>{{ '管理员可在 Header 右侧切换器中自由选择三种导航模式，偏好持久化至 ' }}<code>localStorage('admin-nav-mode')</code>{{ '：' }}</p>
              <div class="table-wrap">
                <table>
                  <thead><tr><th v-for="col in (['模式', '宽度', '特点'] as string[])" :key="col">{{ col }}</th></tr></thead>
                  <tbody>
                    <tr v-for="(row, i) in ([['Grouped（分组折叠）', '272px / 64px（折叠）', '菜单按5组分类折叠，激活项左侧3px紫蓝渐变竖线'],['Tabbed（双栏分区）', '192px 子侧栏', '域驱动极简子侧栏，Header内Tab栏 Cmd+1/2/3切换'],['Compact（极简命令）', '64px / 208px（hover展开）', '仅5个高频项，Cmd+K命令面板搜索']] as string[][])" :key="i">
                      <td v-for="(cell, j) in row" :key="j"><strong v-if="j === 0">{{ cell }}</strong><span v-else>{{ cell }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ '四种主题' }}</h3>
              <p>{{ '管理后台支持 4 种主题切换，通过 ' }}<code>useAdminTheme</code> {{ 'composable 管理，CSS Variables 驱动：' }}</p>
              <ul>
                <li><strong>Dark：</strong>{{ '默认深靛蓝暗色主题，灵感来自 Linear/Vercel' }}</li>
                <li><strong>Light：</strong>{{ '亮色主题，适合日间办公' }}</li>
                <li><strong>Classic Dark：</strong>{{ '经典暗色主题' }}</li>
                <li><strong>System：</strong>{{ '跟随系统 ' }}<code>prefers-color-scheme</code> {{ '自动切换' }}</li>
              </ul>
            </div>
            <div class="subsection">
              <h3>{{ '管理后台功能模块' }}</h3>
              <p>{{ '管理后台包含以下完整功能模块（共 20+ 个管理组件）：' }}</p>
              <div class="table-wrap">
                <table>
                  <thead><tr><th v-for="col in (['模块', '功能'] as string[])" :key="col">{{ col }}</th></tr></thead>
                  <tbody>
                    <tr v-for="(row, i) in ([['概览 (Overview)', '核心指标卡片、收入趋势、活跃用户统计'],['任务管理 (Tasks)', '业务任务 CRUD、状态流转、定时任务触发'],['活动管理 (Campaigns)', '营销活动配置、留资管理（leads）、H5页面动态内容'],['商品管理 (Products)', '商品CRUD、Stripe产品同步'],['订单管理 (Orders)', '订单列表、状态管理、退款处理'],['订阅管理 (Subscriptions)', 'Stripe订阅周期管理'],['用户管理 (Users)', '用户列表、角色管理、统计数据'],['评价管理 (Feedback)', '用户评价审核、回复管理'],['收入统计 (Revenue)', '收入数据看板、趋势分析'],['媒体库 (Media)', 'Storage文件管理、批量删除、回收站、详情预览'],['API 安全 (Security)', 'API Key管理、安全策略配置、安全事件日志'],['审计日志 (Audit)', '管理员操作记录、冷热归档到Storage'],['APM 监控', '请求耗时、状态码、吞吐量实时面板'],['系统配置 (Config)', '系统KV配置、通知设置、支付通道配置'],['管理员账号', '密码修改、头像设置']] as string[][])" :key="i">
                      <td v-for="(cell, j) in row" :key="j"><strong v-if="j === 0">{{ cell }}</strong><span v-else>{{ cell }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ '命令面板 (Cmd+K)' }}</h3>
              <p>{{ '全局 ' }}<code>Cmd+K</code> {{ '（Windows: ' }}<code>Ctrl+K</code>{{ '）唤起命令面板，支持：' }}</p>
              <ul>
                <li>{{ '模糊搜索所有菜单项' }}</li>
                <li>{{ '最近使用记录（localStorage 持久化）' }}</li>
                <li>{{ '↑↓ 键盘导航 + Enter 确认 + Esc 关闭' }}</li>
                <li>{{ '分组展示（运营/营销/系统）' }}</li>
              </ul>
            </div>
            <div class="subsection">
              <h3>{{ 'PWA 离线支持' }}</h3>
              <p>{{ '管理后台通过 @vite-pwa/nuxt 实现 PWA 功能，配置作用域仅限 ' }}<code>/admin/</code>{{ '：' }}</p>
              <ul>
                <li><strong>{{ '缓存策略：' }}</strong>{{ 'NetworkFirst，优先网络请求，失败时回退缓存' }}</li>
                <li><strong>{{ '离线访问：' }}</strong>{{ '已访问过的管理页面在无网络时可离线查看' }}</li>
                <li><strong>{{ '安装到桌面：' }}</strong>{{ '支持 Add to Home Screen，像原生 App 一样使用' }}</li>
              </ul>
            </div>
          </div>
        </section>

        <!-- ═══════ S12: Social Share & Feedback ═══════ -->
        <section id="s12" class="section" v-once>
          <div class="section-header">
            <div class="section-num">12</div>
            <h2>{{ '社交分享与反馈' }}</h2>
          </div>
          <div class="section-body">
            <div class="subsection">
              <h3>{{ '社交分享组件' }}</h3>
              <p>{{ '纯前端实现，零后端依赖，支持 6 大主流社交平台：' }}</p>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th v-for="col in (['平台', '协议/URL', '说明'] as string[])" :key="col">{{ col }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, i) in shareRows" :key="i">
                      <td v-for="(cell, j) in row" :key="j">
                        <code v-if="j === 1">{{ cell }}</code>
                        <span v-else>{{ cell }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ '用户反馈系统' }}</h3>
              <p>{{ '前后端完整实现，支持星级评分（1-5）+ 文字评论 + 管理员回复。' }}</p>
              <ul>
                <li v-for="(item, i) in feedbackItems" :key="i" v-html="item.replace(/`([^`]+)`/g, '<code>$1</code>')" />
              </ul>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th v-for="col in (['方法', '端点', '说明'] as string[])" :key="col">{{ col }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, i) in feedbackRows" :key="i">
                      <td v-for="(cell, j) in row" :key="j">
                        <code v-if="j === 0 || j === 1">{{ cell }}</code>
                        <span v-else>{{ cell }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ '社交分享支持的平台' }}</h3>
              <p>{{ '分享组件支持以下 6 大主流社交平台（纯前端实现，零后端依赖）：' }}</p>
              <ul>
                <li><strong>WhatsApp：</strong><code>https://wa.me/?text=</code> {{ '协议，移动端自动唤起 App' }}</li>
                <li><strong>Facebook：</strong><code>https://www.facebook.com/sharer/sharer.php?u=</code> {{ '分享链接' }}</li>
                <li><strong>Twitter/X：</strong><code>https://twitter.com/intent/tweet?url=</code> {{ '带文本的分享' }}</li>
                <li><strong>Telegram：</strong><code>https://t.me/share/url?url=</code> {{ 'Telegram 分享' }}</li>
                <li><strong>微信：</strong><code>weixin://</code> {{ '协议，微信内置浏览器自动识别' }}</li>
                <li><strong>复制链接：</strong><code>navigator.clipboard.writeText()</code> {{ 'Clipboard API' }}</li>
              </ul>
            </div>
            <div class="subsection">
              <h3>{{ 'H5ReviewSection 组件' }}</h3>
              <p>{{ 'H5 营销页面使用 H5ReviewSection 组件展示用户评价，包含以下功能：' }}</p>
              <ul>
                <li>{{ '评分分布条形图（1-5 星统计）' }}</li>
                <li>{{ '评价列表（支持分页加载）' }}</li>
                <li>{{ '管理员回复展示' }}</li>
                <li>{{ '写评价表单（登录后可用）' }}</li>
                <li>{{ '完整的 i18n 中英文支持' }}</li>
              </ul>
            </div>
            <div class="subsection">
              <h3>{{ '与现有模块集成' }}</h3>
              <p>{{ '反馈系统与以下模块协同工作：' }}</p>
              <ul>
                <li><strong>{{ '认证模块：' }}</strong>{{ '登录用户可提交评价，匿名用户仅可查看' }}</li>
                <li><strong>{{ '支付模块：' }}</strong>{{ '购买后可自动邀请用户评价' }}</li>
                <li><strong>{{ 'Admin 后台：' }}</strong>{{ '管理员审核、回复、删除评价' }}</li>
              </ul>
            </div>
            <div class="subsection">
              <h3>{{ '反馈审批工作流' }}</h3>
              <div class="flow-steps">
                <template v-for="(step, i) in (['用户提交评价', '管理员审核', '通过：公开显示', '回复用户', '驳回：仅用户可见'] as string[])" :key="i">
                  <div class="flow-step"><span class="flow-num">{{ i + 1 }}</span>{{ step }}</div>
                  <div v-if="i < 4" class="flow-arrow">→</div>
                </template>
              </div>
              <p>{{ '管理员在 Admin 后台可以查看所有评价，通过/驳回/回复。建议对同一 IP/用户做提交频率限制（例如每小时最多 3 条）。' }}</p>
            </div>
            <div class="subsection">
              <h3>{{ '常见反馈问题' }}</h3>
              <div class="faq-item" :class="{ expanded: faqExpanded['fb-trouble-0'] }">
                <div class="faq-q" @click="toggleFaq('fb-trouble-0')">
                  <span class="faq-chevron">▸</span>
                  Q: {{ '匿名用户可以提交评价吗？' }}
                </div>
                <div class="faq-a" v-show="faqExpanded['fb-trouble-0']">
                  A: {{ '不可以。提交评价需要登录（04.auth-guard 中间件强制要求）。匿名用户可以查看评价列表和统计数据，但不能提交评价。' }}
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ═══════ S12: Cloudflare ═══════ -->
        <section id="s13" class="section" v-once>
          <div class="section-header">
            <div class="section-num">13</div>
            <h2>{{ 'Cloudflare 接入' }}</h2>
          </div>
          <div class="section-body">
            <div class="alert alert-info">
              <div class="alert-icon">ℹ️</div>
              <div class="alert-body">
                <strong>{{ '可选增强方案' }}</strong>
                <p>{{ '本项目部署在 Vercel 上。推荐用法：Cloudflare 仅做 DNS 管理（灰色云朵 DNS-only），由 Vercel 处理 CDN 和安全。' }}</p>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ '添加站点到 Cloudflare' }}</h3>
              <ol>
                <li>{{ '登录 Cloudflare Dashboard，点击 Add a site' }}</li>
                <li>{{ '输入域名，选择 Free 计划，Cloudflare 自动扫描并导入现有 DNS 记录' }}</li>
                <li>{{ 'Cloudflare 分配两个 Nameservers（如 anna.ns.cloudflare.com / bob.ns.cloudflare.com）' }}</li>
                <li>{{ '去域名注册商（Namecheap/GoDaddy 等）将 Nameservers 改为 Cloudflare 提供的地址' }}</li>
                <li>{{ '等待 DNS 传播（5-30 分钟），回到 Cloudflare 点击 Check nameservers 验证' }}</li>
              </ol>
            </div>
            <div class="subsection">
              <h3>{{ 'DNS 记录配置' }}</h3>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th v-for="col in (['类型', '名称', '记录类型', '值', '代理状态'] as string[])" :key="col">{{ col }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, i) in dnsRows" :key="i">
                      <td v-for="(cell, j) in row" :key="j">
                        <code v-if="j === 0 || j === 1 || j === 2">{{ cell }}</code>
                        <span v-else>{{ cell }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ 'DNS 验证命令' }}</h3>
              <div class="code-block">
                <button class="copy-btn" @click="copyCode($event)">{{ '复制代码' }}</button>
                <pre><code># 检查 NS 记录是否指向 Cloudflare
dig yourdomain.com NS

# 检查子域名 CNAME
dig admin.yourdomain.com CNAME

# 检查通配符记录
dig test123.yourdomain.com CNAME

# 检查 HTTPS 响应头
curl -I https://yourdomain.com

# 查看 SSL 证书详情
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com</code></pre>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ '为什么不使用代理模式' }}</h3>
              <ol>
                <li v-for="(item, i) in whyNoProxyItems" :key="i">{{ item }}</li>
              </ol>
            </div>
            <div class="subsection">
              <h3>{{ '安全功能（Free 计划）' }}</h3>
              <ul>
                <li v-for="(item, i) in securityItems" :key="i">{{ item }}</li>
              </ul>
            </div>
            <div class="subsection">
              <h3>{{ 'SSL/TLS 配置' }}</h3>
              <p>{{ '在 Cloudflare → SSL/TLS 中，推荐选择 ' }}<strong>Full (strict)</strong> {{ '模式：' }}</p>
              <ul>
                <li><strong>Flexible：</strong>{{ '客户端到 Cloudflare 加密，Cloudflare 到源站明文（不安全）' }}</li>
                <li><strong>Full：</strong>{{ '两端都加密，但不验证源站证书' }}</li>
                <li><strong>Full (strict)：</strong>{{ '两端加密 + 验证源站证书（推荐）' }}</li>
              </ul>
              <p>{{ '同时开启 ' }}<strong>Always Use HTTPS</strong> {{ '强制所有 HTTP 请求跳转到 HTTPS。' }}</p>
              <p>{{ '进入 SSL/TLS → Edge Certificates，建议开启：' }}</p>
              <ul>
                <li><strong>Always Use HTTPS：</strong>{{ '自动将 HTTP 重定向到 HTTPS' }}</li>
                <li><strong>Automatic HTTPS Rewrites：</strong>{{ '自动修复混合内容警告' }}</li>
              </ul>
            </div>
            <div class="subsection">
              <h3>{{ 'DDoS 与 Bot 防护' }}</h3>
              <p>{{ 'Cloudflare Free 计划自带以下安全功能（无需额外配置）：' }}</p>
              <ul>
                <li><strong>{{ 'DDoS 防护：' }}</strong>{{ '不限量的 Layer 3/4/7 DDoS 攻击缓解' }}</li>
                <li><strong>{{ 'Bot Fight Mode：' }}</strong>{{ '进入 Security → Bots 开启，自动挑战可疑 Bot' }}</li>
                <li><strong>{{ 'WAF 规则：' }}</strong>{{ '自动拦截 SQL 注入、XSS 跨站脚本、路径遍历等常见攻击' }}</li>
                <li>{{ '合法搜索引擎爬虫（Googlebot、Bingbot）自动放行' }}</li>
              </ul>
            </div>
            <div class="subsection">
              <h3>{{ '缓存规则与 Page Rules' }}</h3>
              <p>{{ 'DNS-only 模式下 Cloudflare 不缓存内容（由 Vercel CDN 处理）。如需额外配置：' }}</p>
              <ul>
                <li>{{ '静态资源（/public/）：可设置 Edge TTL 为 1 天' }}</li>
                <li>{{ 'API 路由（/api/）：设置不缓存（Bypass Cache）' }}</li>
                <li>{{ 'Rate Limiting 规则：保护 /api/ 端点，例如每 IP 每分钟 60 次请求' }}</li>
              </ul>
            </div>
            <div class="subsection">
              <h3>{{ '纯 DNS vs Vercel Nameservers' }}</h3>
              <div class="table-wrap">
                <table>
                  <thead><tr><th v-for="col in (['方案', 'DNS 管理', 'CDN', '安全防护', '适用场景'] as string[])" :key="col">{{ col }}</th></tr></thead>
                  <tbody>
                    <tr v-for="(row, i) in ([['Cloudflare DNS-only', 'Cloudflare', 'Vercel', 'Cloudflare DDoS/WAF', '需要额外安全防护'],['Vercel Nameservers', 'Vercel', 'Vercel', 'Vercel 基础防护', '简单部署，无额外需求']] as string[][])" :key="i">
                      <td v-for="(cell, j) in row" :key="j"><strong v-if="j === 0">{{ cell }}</strong><span v-else>{{ cell }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ '常见 Cloudflare 问题' }}</h3>
              <div class="faq-item" :class="{ expanded: faqExpanded['cf-trouble-0'] }">
                <div class="faq-q" @click="toggleFaq('cf-trouble-0')">
                  <span class="faq-chevron">▸</span>
                  Q: {{ '网站打不开/SSL 错误？' }}
                </div>
                <div class="faq-a" v-show="faqExpanded['cf-trouble-0']">
                  A: {{ '如果使用了代理模式（橙色云朵），检查 SSL/TLS 模式是否为 Full 或 Full (strict)。Flexible 模式可能导致重定向循环。建议切回 DNS-only（灰色云朵）模式。' }}
                </div>
              </div>
              <div class="faq-item" :class="{ expanded: faqExpanded['cf-trouble-1'] }">
                <div class="faq-q" @click="toggleFaq('cf-trouble-1')">
                  <span class="faq-chevron">▸</span>
                  Q: {{ '子域名通配符不生效？' }}
                </div>
                <div class="faq-a" v-show="faqExpanded['cf-trouble-1']">
                  A: {{ 'Free 计划不支持通配符代理。使用 DNS-only 模式可以配置通配符 CNAME 记录（* → cname.vercel-dns.com）。确认 Vercel Dashboard 中已添加通配符域名。' }}
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ═══════ S13: Local Development ═══════ -->
        <section id="s14" class="section" v-once>
          <div class="section-header">
            <div class="section-num">14</div>
            <h2>{{ '本地开发' }}</h2>
          </div>
          <div class="section-body">
            <div class="subsection">
              <h3>{{ '快速启动' }}</h3>
              <div class="code-block">
                <button class="copy-btn" @click="copyCode($event)">{{ '复制代码' }}</button>
                <pre><code>{{ quickStartCode }}</code></pre>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ '本地 Supabase 实例' }}</h3>
              <div class="code-block">
                <button class="copy-btn" @click="copyCode($event)">{{ '复制代码' }}</button>
                <pre><code>{{ localSupabaseCode }}</code></pre>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ '可用脚本' }}</h3>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th v-for="col in (['命令', '说明'] as string[])" :key="col">{{ col }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, i) in scriptsRows" :key="i">
                      <td v-for="(cell, j) in row" :key="j">
                        <code v-if="j === 0">{{ cell }}</code>
                        <span v-else>{{ cell }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ '代码生成器' }}</h3>
              <p><strong>{{ 'CRUD API 生成器：' }}</strong><code>npm run gen:crud &lt;resource&gt;</code></p>
              <p>{{ '自动生成完整的 CRUD API 端点（GET 列表/GET 详情/POST 创建/PATCH 更新/DELETE 删除），包含 Zod 校验、defineRouteMeta 元数据和 sendSuccess 响应格式。' }}</p>
              <p><strong>{{ '脚手架生成器：' }}</strong><code>npm run scaffold &lt;name&gt;</code></p>
              <p>{{ '一键生成 API + Page 完整模块，包括服务端 API 端点和前端页面组件，减少重复代码编写。' }}</p>
              <p><strong>{{ 'RLS 策略生成器：' }}</strong><code>npm run gen:rls &lt;table&gt; [--admin]</code></p>
              <p>{{ '为指定表生成 RLS 行级安全策略 SQL，加 --admin 参数生成管理员策略。' }}</p>
            </div>
          </div>
        </section>

        <!-- ═══════ S14: API Response Format ═══════ -->
        <section id="s15" class="section" v-once>
          <div class="section-header">
            <div class="section-num">15</div>
            <h2>{{ 'API 规范' }}</h2>
          </div>
          <div class="section-body">
            <div class="subsection">
              <h3>{{ '统一响应格式' }}</h3>
              <p>{{ '项目所有 API 使用统一的响应格式，通过 sendSuccess() 和 createError() 工具函数返回。错误信息在服务端使用英文，前端展示层通过 t() 翻译。' }}</p>
              <div class="code-block">
                <button class="copy-btn" @click="copyCode($event)">{{ '复制代码' }}</button>
                <pre><code>{{ apiResponseExample }}</code></pre>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ 'API 鉴权声明' }}</h3>
              <p>{{ '每个 API 文件顶部通过注释声明鉴权级别，供 test:api-safety 扫描器自动验证：' }}</p>
              <div class="code-block">
                <button class="copy-btn" @click="copyCode($event)">{{ '复制代码' }}</button>
                <pre><code>{{ apiAuthDeclareExample }}</code></pre>
              </div>
              <div class="table-wrap">
                <table>
                  <thead><tr><th v-for="col in (['鉴权级别', '中间件', '说明'] as string[])" :key="col">{{ col }}</th></tr></thead>
                  <tbody>
                    <tr v-for="(row, i) in ([['admin', '03.admin + 04.auth-guard', '管理员专用，需登录 + admin 角色'],['user', '04.auth-guard', '需登录用户，匿名用户返回 403'],['public', '无', '公开接口，无需认证']] as string[][])" :key="i">
                      <td v-for="(cell, j) in row" :key="j"><code v-if="j === 0">{{ cell }}</code><span v-else>{{ cell }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ 'Zod 输入校验' }}</h3>
              <p>{{ '所有 API 使用 Zod 进行输入校验，格式示例：' }}</p>
              <div class="code-block">
                <button class="copy-btn" @click="copyCode($event)">{{ '复制代码' }}</button>
                <pre><code>import { z } from 'zod'

const bodySchema = z.object({
  title: z.string().min(1).max(200),
  status: z.enum(['active', 'inactive']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

const body = await readValidatedBody(event, bodySchema.parse)</code></pre>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ 'OpenAPI 文档' }}</h3>
              <p>{{ '项目内置 OpenAPI 3.1.0 文档支持，每个路由通过 defineRouteMeta 声明元数据。' }}</p>
              <div class="table-wrap">
                <table>
                  <thead><tr><th v-for="col in (['端点', '说明', '访问方式'] as string[])" :key="col">{{ col }}</th></tr></thead>
                  <tbody>
                    <tr v-for="(row, i) in ([['/_openapi.json', 'OpenAPI 3.1.0 原始 JSON', '直接访问'],['/_scalar', 'Scalar 交互式文档（紫色主题）', '直接访问'],['/_swagger', 'Swagger UI 文档', '直接访问']] as string[][])" :key="i">
                      <td v-for="(cell, j) in row" :key="j"><code v-if="j === 0">{{ cell }}</code><span v-else>{{ cell }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <!-- ═══════ S15: i18n Configuration ═══════ -->
        <section id="s16" class="section" v-once>
          <div class="section-header">
            <div class="section-num">16</div>
            <h2>{{ '国际化配置' }}</h2>
          </div>
          <div class="section-body">
            <div class="subsection">
              <h3>{{ 'i18n 策略' }}</h3>
              <p>{{ '项目使用 @nuxtjs/i18n 模块，采用 prefix_except_default 策略：默认语言（中文）URL 不加前缀，英文加 /en 前缀。Admin 后台和帮助文档页面使用硬编码中文，不走 i18n。' }}</p>
              <div class="code-block">
                <button class="copy-btn" @click="copyCode($event)">{{ '复制代码' }}</button>
                <pre><code>{{ i18nConfigExample }}</code></pre>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ '语言检测优先级' }}</h3>
              <p>{{ '系统按以下优先级自动检测用户语言：' }}</p>
              <ol>
                <li v-for="(item, i) in i18nDetectionItems" :key="i">{{ item }}</li>
              </ol>
            </div>
            <div class="subsection">
              <h3>{{ '使用方式' }}</h3>
              <div class="code-block">
                <button class="copy-btn" @click="copyCode($event)">{{ '复制代码' }}</button>
                <pre><code>{{ i18nUsageExample }}</code></pre>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ '翻译文件结构' }}</h3>
              <p>{{ 'locales/ 目录下 zh.json 和 en.json 的 key 结构完全一致，分为以下命名空间：' }}</p>
              <div class="table-wrap">
                <table>
                  <thead><tr><th v-for="col in (['命名空间', '覆盖范围'] as string[])" :key="col">{{ col }}</th></tr></thead>
                  <tbody>
                    <tr v-for="(row, i) in localeSections" :key="i">
                      <td v-for="(cell, j) in row" :key="j"><code v-if="j === 0">{{ cell }}</code><span v-else>{{ cell }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="subsection">
              <h3>{{ '新增页面 i18n 规范' }}</h3>
              <ol>
                <li>{{ '将所有用户可见文字提取到 locales/zh.json 和 locales/en.json 中，使用命名空间 key（如 tasks.title）' }}</li>
                <li>{{ '在 &lt;script setup&gt; 中使用 const { t } = useI18n()' }}</li>
                <li>{{ '模板中使用 t(\'key\') 获取翻译文本' }}</li>
                <li>{{ 'SEO meta 中使用 () =&gt; t(\'key\') 保持响应式' }}</li>
                <li>{{ 'Admin 页面（(admin)/）和帮助文档（/help）保持硬编码中文，无需 i18n' }}</li>
              </ol>
            </div>
          </div>
        </section>

        <!-- ═══════ S16: FAQ ═══════ -->
        <section id="s17" class="section">
          <div class="section-header">
            <div class="section-num">17</div>
            <h2>{{ '常见问题' }}</h2>
          </div>
          <div class="section-body">
            <div class="faq-toolbar">
              <button class="faq-toggle-all" @click="toggleFaqAll">
                {{ faqAllExpanded ? '折叠全部' : '展开全部' }}
              </button>
            </div>
            <template v-for="(cat, ci) in faqData" :key="ci">
              <div class="subsection">
                <h3>{{ faqCategoryLabel(cat.cat) }}</h3>
                <div
                  v-for="(item, ii) in cat.items"
                  :key="ii"
                  class="faq-item"
                  :class="{ expanded: faqExpanded[`${cat.cat}-${ii}`] }"
                >
                  <div class="faq-q" @click="toggleFaq(`${cat.cat}-${ii}`)">
                    <span class="faq-chevron">▸</span>
                    Q: {{ item.q }}
                  </div>
                  <div class="faq-a" v-show="faqExpanded[`${cat.cat}-${ii}`]">
                    A: {{ item.a }}
                  </div>
                </div>
              </div>
            </template>
          </div>
        </section>

      </div><!-- /doc-content -->

      <!-- FOOTER -->
      <footer class="doc-footer">
        <div class="footer-inner">
          <div class="footer-left">
            <span class="logo-dot" />
            <span class="logo-label">HEHE</span>
            <span class="footer-copy">© 2026 · Help Center</span>
          </div>
          <div class="footer-links">
            <NuxtLink to="/architecture" class="footer-link">{{ '技术架构' }}</NuxtLink>
            <NuxtLink to="/" class="footer-link">{{ '返回首页' }}</NuxtLink>
          </div>
        </div>
      </footer>

      <!-- BACK TO TOP -->
      <button v-show="showBackToTop" class="back-to-top" @click="scrollToTop" :title="'返回顶部'">
        ↑
      </button>
    </main>
  </div>
</template>

<style scoped>
/* ── CSS Variables ── */
.app-help-root {
  --bg-primary: #0a0e1a;
  --bg-card: #131d35;
  --bg-card-hover: #1a2540;
  --bg-sidebar: #080c18;
  --border: #1e2d4d;
  --border-light: #243558;
  --accent-blue: #4f8ef7;
  --accent-purple: #8b5cf6;
  --accent-cyan: #22d3ee;
  --accent-green: #10b981;
  --accent-orange: #f59e0b;
  --accent-red: #ef4444;
  --text-primary: #e2e8f0;
  --text-secondary: #94a3b8;
  --text-tertiary: #64748b;
  background: var(--bg-primary);
  color: var(--text-primary);
  min-height: 100vh;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Noto Sans SC', sans-serif;
}

/* ── SIDEBAR ── */
.sidebar {
  position: fixed;
  top: 0; left: 0; bottom: 0;
  width: 260px;
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border);
  overflow-y: auto;
  z-index: 100;
  display: flex;
  flex-direction: column;
}
.sidebar-logo {
  padding: 28px 24px 20px;
  border-bottom: 1px solid var(--border);
}
.logo-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.logo-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--accent-cyan);
  box-shadow: 0 0 8px rgba(34, 211, 238, 0.6);
}
.logo-text {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: var(--accent-cyan);
}
.sidebar-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
}
.sidebar-version {
  font-size: 11px;
  color: var(--text-tertiary);
}
.sidebar-nav {
  flex: 1;
  padding: 16px 16px 32px;
  overflow-y: auto;
}
.nav-section {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-tertiary);
  padding: 16px 8px 6px;
}
.nav-section:first-child { padding-top: 4px; }
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 8px;
  font-size: 13px;
  color: var(--text-secondary);
  text-decoration: none;
  border-radius: 6px;
  transition: all 0.15s;
}
.nav-item:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.04);
}
.nav-item.active {
  color: var(--accent-blue);
  background: rgba(79, 142, 247, 0.08);
}
.nav-num {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-tertiary);
  min-width: 24px;
  font-variant-numeric: tabular-nums;
}
.nav-item.active .nav-num { color: var(--accent-blue); }

/* ── MAIN ── */
.main {
  margin-left: 260px;
  min-height: 100vh;
}

/* ── TOP HEADER ── */
.top-header {
  position: fixed;
  top: 0; right: 0; left: 260px;
  height: 64px;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  background: rgba(10, 14, 26, 0.8);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 40px;
  z-index: 90;
}
.top-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.top-header-indicator {
  color: var(--accent-cyan);
  font-size: 8px;
  animation: pulse 2s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
.top-header-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}
.top-header-menu {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ── SEARCH ── */
.search-wrap {
  position: relative;
}
.search-input {
  width: 200px;
  height: 32px;
  padding: 0 12px 0 32px;
  font-size: 12px;
  color: var(--text-primary);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 6px;
  outline: none;
  transition: all 0.2s;
  font-family: inherit;
}
.search-input::placeholder { color: var(--text-tertiary); }
.search-wrap.focused .search-input {
  border-color: var(--accent-blue);
  width: 260px;
}
.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  pointer-events: none;
}
.search-dropdown {
  position: absolute;
  top: 38px;
  left: 0;
  right: 0;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  max-height: 240px;
  overflow-y: auto;
  z-index: 200;
  box-shadow: 0 8px 30px rgba(0,0,0,0.4);
}
.search-result-item {
  padding: 8px 14px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.15s;
}
.search-result-item:hover {
  background: rgba(79, 142, 247, 0.1);
  color: var(--accent-blue);
}
.search-no-results {
  padding: 12px 14px;
  font-size: 12px;
  color: var(--text-tertiary);
  text-align: center;
}

/* ── THEME BUTTON ── */
.theme-btn {
  width: 32px; height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}
.theme-btn:hover {
  background: var(--bg-card-hover);
  border-color: var(--border-light);
}

/* ── MENU BTN ── */
.menu-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 6px;
  text-decoration: none;
  transition: all 0.2s;
  cursor: pointer;
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text-primary);
}
.menu-btn:hover {
  background: var(--bg-card-hover);
  border-color: var(--border-light);
}

/* ── HAMBURGER ── */
.hamburger-btn {
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  width: 32px; height: 32px;
  padding: 6px;
  background: none;
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  margin-right: 12px;
}
.hamburger-line {
  display: block;
  width: 100%;
  height: 2px;
  background: var(--text-secondary);
  border-radius: 1px;
}

/* ── HERO ── */
.hero {
  position: relative;
  padding: 100px 60px 64px;
  overflow: hidden;
  margin-top: 64px;
}
.hero-bg {
  position: absolute;
  top: -20%;
  left: 50%;
  transform: translateX(-50%);
  width: 600px; height: 600px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(79, 142, 247, 0.08) 0%, rgba(139, 92, 246, 0.04) 50%, transparent 70%);
  pointer-events: none;
}
.hero-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(30, 45, 77, 0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(30, 45, 77, 0.1) 1px, transparent 1px);
  background-size: 60px 60px;
  mask-image: radial-gradient(ellipse 60% 50% at 50% 40%, black 30%, transparent 70%);
  pointer-events: none;
}
.hero-content {
  position: relative;
  max-width: 100%;
}
.hero-tags {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.hero-tag {
  padding: 4px 12px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 9999px;
  border: 1px solid;
}
.tag-blue { color: var(--accent-blue); border-color: rgba(79, 142, 247, 0.3); background: rgba(79, 142, 247, 0.08); }
.tag-green { color: var(--accent-green); border-color: rgba(16, 185, 129, 0.3); background: rgba(16, 185, 129, 0.08); }
.tag-purple { color: var(--accent-purple); border-color: rgba(139, 92, 246, 0.3); background: rgba(139, 92, 246, 0.08); }
.tag-cyan { color: var(--accent-cyan); border-color: rgba(34, 211, 238, 0.3); background: rgba(34, 211, 238, 0.08); }

.hero-title {
  font-size: 2.5rem;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.02em;
  margin: 0 0 16px;
  background: linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.hero-desc {
  font-size: 1.05rem;
  color: var(--text-secondary);
  line-height: 1.7;
  margin: 0 0 28px;
  max-width: 640px;
}
.hero-meta {
  display: flex;
  gap: 16px;
}
.meta-card {
  padding: 10px 20px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
}
.meta-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-tertiary);
  margin-bottom: 4px;
}
.meta-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--accent-blue);
}

/* ── DOC CONTENT ── */
.doc-content {
  padding: 0 60px 80px;
  max-width: 1200px;
}

/* ── SECTION ── */
.section {
  padding: 48px 0;
  border-bottom: 1px solid var(--border);
}
.section:last-child { border-bottom: none; }
.section-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 28px;
}
.section-num {
  font-size: 14px;
  font-weight: 800;
  color: var(--accent-blue);
  background: rgba(79, 142, 247, 0.1);
  padding: 4px 10px;
  border-radius: 6px;
  font-variant-numeric: tabular-nums;
}
.section-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}
.section-body { color: var(--text-secondary); line-height: 1.75; }
.section-body p { margin: 0 0 14px; }
.section-body a { color: var(--accent-blue); text-decoration: none; }
.section-body a:hover { text-decoration: underline; }

/* ── SUBSECTION ── */
.subsection { margin-bottom: 32px; }
.subsection:last-child { margin-bottom: 0; }
.subsection h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px;
}
.subsection h4 {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 6px;
}

/* ── TABLE ── */
.table-wrap {
  overflow-x: auto;
  margin: 14px 0;
  border: 1px solid var(--border);
  border-radius: 8px;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
th {
  background: rgba(255, 255, 255, 0.03);
  padding: 10px 14px;
  text-align: left;
  font-weight: 600;
  color: var(--text-primary);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--border);
}
td {
  padding: 10px 14px;
  border-bottom: 1px solid rgba(30, 45, 77, 0.4);
  color: var(--text-secondary);
}
tr:last-child td { border-bottom: none; }

/* ── CODE ── */
.code-block {
  position: relative;
  margin: 14px 0;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}
.code-block pre {
  margin: 0;
  padding: 16px 20px;
  background: rgba(0, 0, 0, 0.3);
  font-size: 13px;
  line-height: 1.6;
  overflow-x: auto;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}
.code-block code, code {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.9em;
  background: rgba(255, 255, 255, 0.06);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--accent-cyan);
}
.code-block code { background: none; padding: 0; }

/* ── COPY BTN ── */
.copy-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.2s;
  z-index: 2;
  font-family: inherit;
}
.copy-btn:hover {
  color: var(--accent-blue);
  border-color: rgba(79, 142, 247, 0.3);
}

/* ── BADGES ── */
.badge {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 9999px;
  letter-spacing: 0.05em;
}
.badge-purple { background: rgba(139, 92, 246, 0.12); color: #a78bfa; }
.badge-green { background: rgba(16, 185, 129, 0.12); color: #34d399; }
.badge-orange { background: rgba(245, 158, 11, 0.12); color: #fbbf24; }
.badge-cyan { background: rgba(34, 211, 238, 0.12); color: #67e8f9; }

/* ── ALERTS ── */
.alert {
  display: flex;
  gap: 12px;
  padding: 14px 18px;
  border-radius: 8px;
  margin: 16px 0;
  border: 1px solid;
}
.alert-warn {
  background: rgba(245, 158, 11, 0.06);
  border-color: rgba(245, 158, 11, 0.25);
}
.alert-info {
  background: rgba(79, 142, 247, 0.06);
  border-color: rgba(79, 142, 247, 0.2);
}
.alert-icon { font-size: 18px; flex-shrink: 0; margin-top: 1px; }
.alert-body strong { display: block; font-size: 13px; color: var(--text-primary); margin-bottom: 4px; }
.alert-body p { font-size: 13px; color: var(--text-secondary); margin: 0; }

/* ── FLOW STEPS ── */
.flow-steps {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin: 16px 0;
}
.flow-step {
  padding: 8px 16px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-primary);
}
.flow-num {
  font-size: 11px;
  font-weight: 700;
  color: var(--accent-blue);
  background: rgba(79, 142, 247, 0.12);
  padding: 2px 6px;
  border-radius: 4px;
}
.flow-arrow {
  color: var(--text-tertiary);
  font-size: 14px;
  font-weight: 700;
}

/* ── LISTS ── */
.section-body ul, .section-body ol {
  margin: 12px 0;
  padding-left: 20px;
}
.section-body li {
  margin-bottom: 6px;
  font-size: 13px;
}
.checklist { list-style: none !important; padding-left: 0 !important; }
.checklist li { margin-bottom: 4px; }

/* ── DOC GRID (S0) ── */
.doc-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 14px;
}
.doc-card {
  padding: 16px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  display: flex;
  gap: 12px;
}
.doc-card-num {
  font-size: 20px;
  font-weight: 800;
  color: var(--accent-blue);
  opacity: 0.5;
  flex-shrink: 0;
}
.doc-card-body h4 { font-size: 13px; margin-bottom: 4px; }
.doc-card-body p { font-size: 11px; color: var(--text-tertiary); line-height: 1.5; margin: 0; }

/* ── SCHEMA DIAGRAM ── */
.schema-diagram { margin: 16px 0; }
.schema-box {
  padding: 14px 18px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  text-align: center;
  flex: 1;
  min-width: 0;
}
.schema-core { border-color: rgba(16, 185, 129, 0.3); }
.schema-opt { border-color: rgba(245, 158, 11, 0.25); }
.schema-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}
.schema-desc {
  font-size: 11px;
  color: var(--text-tertiary);
}
.schema-arrow {
  text-align: center;
  padding: 8px 0;
  font-size: 12px;
  color: var(--text-tertiary);
}
.schema-row {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

/* ── FAQ ── */
.faq-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}
.faq-toggle-all {
  padding: 5px 14px;
  font-size: 12px;
  font-weight: 600;
  color: var(--accent-blue);
  background: rgba(79, 142, 247, 0.08);
  border: 1px solid rgba(79, 142, 247, 0.2);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}
.faq-toggle-all:hover {
  background: rgba(79, 142, 247, 0.14);
}
.faq-item {
  margin-bottom: 10px;
  padding: 14px 18px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  transition: border-color 0.2s;
}
.faq-item:hover { border-color: var(--border-light); }
.faq-q {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  user-select: none;
}
.faq-chevron {
  font-size: 10px;
  color: var(--text-tertiary);
  transition: transform 0.2s;
  flex-shrink: 0;
}
.faq-item.expanded .faq-chevron {
  transform: rotate(90deg);
}
.faq-a {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.65;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border);
}

/* ── FOOTER ── */
.doc-footer {
  border-top: 1px solid var(--border);
  padding: 24px 60px;
}
.footer-inner {
  max-width: 1200px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.footer-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.footer-copy {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-left: 12px;
}
.footer-links { display: flex; gap: 20px; }
.footer-link {
  font-size: 13px;
  color: var(--text-tertiary);
  text-decoration: none;
  transition: color 0.2s;
}
.footer-link:hover { color: var(--text-secondary); }

/* ── BACK TO TOP ── */
.back-to-top {
  position: fixed;
  bottom: 32px;
  right: 32px;
  width: 40px; height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  cursor: pointer;
  z-index: 50;
  transition: all 0.2s;
  box-shadow: 0 4px 16px rgba(0,0,0,0.3);
  font-family: inherit;
}
.back-to-top:hover {
  background: var(--bg-card-hover);
  border-color: var(--accent-blue);
  color: var(--accent-blue);
  transform: translateY(-2px);
}

/* ── RESPONSIVE ── */
@media (max-width: 1100px) {
  .sidebar { transform: translateX(-100%); transition: transform 0.3s; }
  .sidebar.sidebar-open { transform: translateX(0); }
  .main { margin-left: 0; }
  .top-header { left: 0; padding: 0 20px; }
  .hamburger-btn { display: flex; }
  .sidebar-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 95;
  }
  .doc-content { padding: 0 24px 60px; }
  .doc-footer { padding: 24px; }
  .hero { padding: 80px 24px 48px; }
  .hero-title { font-size: 1.8rem; }
  .doc-grid { grid-template-columns: repeat(2, 1fr); }
  .schema-row { flex-wrap: wrap; }
  .flow-steps { gap: 4px; }
  .flow-arrow { display: none; }
  .search-input { width: 140px; }
  .search-wrap.focused .search-input { width: 180px; }
}

@media (max-width: 640px) {
  .top-header-left { display: none; }
  .top-header-menu { width: 100%; justify-content: flex-end; }
  .hero-title { font-size: 1.4rem; }
  .doc-grid { grid-template-columns: 1fr; }
  .footer-inner { flex-direction: column; gap: 12px; text-align: center; }
  .search-input { width: 100px; }
  .search-wrap.focused .search-input { width: 140px; }
  .back-to-top { bottom: 20px; right: 20px; }
}

/* ── LIGHT THEME (manual toggle via data-theme) ── */
.theme-light {
  .app-help-root {
    --bg-primary: #f8fafc;
    --bg-card: #ffffff;
    --bg-card-hover: #f1f5f9;
    --bg-sidebar: #f1f5f9;
    --border: #e2e8f0;
    --border-light: #cbd5e1;
    --text-primary: #0f172a;
    --text-secondary: #475569;
    --text-tertiary: #94a3b8;
  }
  .app-help-root .top-header {
    background: rgba(248, 250, 252, 0.85);
  }
  .app-help-root .hero-title {
    background: linear-gradient(135deg, #0f172a 0%, #475569 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .app-help-root .code-block pre { background: #f1f5f9; }
  .app-help-root th { background: #f1f5f9; }
  .app-help-root .menu-btn { background: #ffffff; border-color: #e2e8f0; }
  .app-help-root .menu-btn:hover { background: #f1f5f9; }
}

@media (prefers-color-scheme: light) {
  .app-help-root:not(.theme-dark) {
    --bg-primary: #f8fafc;
    --bg-card: #ffffff;
    --bg-card-hover: #f1f5f9;
    --bg-sidebar: #f1f5f9;
    --border: #e2e8f0;
    --border-light: #cbd5e1;
    --text-primary: #0f172a;
    --text-secondary: #475569;
    --text-tertiary: #94a3b8;
  }
  .app-help-root:not(.theme-dark) .top-header {
    background: rgba(248, 250, 252, 0.85);
  }
  .app-help-root:not(.theme-dark) .hero-title {
    background: linear-gradient(135deg, #0f172a 0%, #475569 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .app-help-root:not(.theme-dark) .code-block pre { background: #f1f5f9; }
  .app-help-root:not(.theme-dark) th { background: #f1f5f9; }
  .app-help-root:not(.theme-dark) .menu-btn { background: #ffffff; border-color: #e2e8f0; }
  .app-help-root:not(.theme-dark) .menu-btn:hover { background: #f1f5f9; }
}

/* Force light when manually toggled */
.theme-light {
  --bg-primary: #f8fafc !important;
  --bg-card: #ffffff !important;
  --bg-card-hover: #f1f5f9 !important;
  --bg-sidebar: #f1f5f9 !important;
  --border: #e2e8f0 !important;
  --border-light: #cbd5e1 !important;
  --text-primary: #0f172a !important;
  --text-secondary: #475569 !important;
  --text-tertiary: #94a3b8 !important;
}
.theme-light .top-header { background: rgba(248, 250, 252, 0.85) !important; }
.theme-light .hero-title {
  background: linear-gradient(135deg, #0f172a 0%, #475569 100%) !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  background-clip: text !important;
}
.theme-light .code-block pre { background: #f1f5f9 !important; }
.theme-light th { background: #f1f5f9 !important; }
.theme-light .menu-btn { background: #ffffff !important; border-color: #e2e8f0 !important; }
.theme-light .menu-btn:hover { background: #f1f5f9 !important; }

/* ── PRINT STYLES ── */
@media print {
  .sidebar, .top-header, .back-to-top, .copy-btn, .hamburger-btn, .faq-toolbar { display: none !important; }
  .main { margin-left: 0 !important; }
  .hero { margin-top: 0 !important; padding: 40px 0 32px !important; }
  .hero-bg, .hero-grid { display: none !important; }
  .hero-title {
    background: none !important;
    -webkit-text-fill-color: #000 !important;
    color: #000 !important;
  }
  .doc-content { padding: 0 20px 40px !important; max-width: none !important; }
  .doc-footer { padding: 16px 20px !important; }
  .section { page-break-inside: avoid; }
  .code-block pre { background: #f5f5f5 !important; border: 1px solid #ddd !important; }
  .code-block code { color: #333 !important; background: none !important; }
  .app-help-root {
    --text-primary: #000 !important;
    --text-secondary: #333 !important;
    --text-tertiary: #666 !important;
    --bg-primary: #fff !important;
    --bg-card: #fff !important;
    background: #fff !important;
  }
}
</style>
