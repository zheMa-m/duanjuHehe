# 脚手架基础说明

> 单人全栈单仓混合技术架构 v1.0 — 面向独立开发者的闭环项目脚手架

---

## 1. 项目定位

本项目是**单人全栈独立开发者闭环项目脚手架**，一人负责开发、维护、上线、测试、运维全流程。不是 SaaS 多租户产品，而是单人全栈项目的基础骨架。

---

## 2. 前置条件

| 工具 | 版本要求 | 安装方式 |
|------|----------|----------|
| Node.js | ≥ 20.x | `nvm install 20` 或 [nodejs.org](https://nodejs.org) |
| npm | ≥ 10.x | 随 Node.js 一起安装 |
| Git | ≥ 2.x | `brew install git` (macOS) |
| Supabase CLI | ≥ 2.x | `brew install supabase/tap/supabase`（可选，本地 Supabase 时需要） |
| Docker | ≥ 20.x | [docker.com](https://www.docker.com/get-started/)（可选，本地 Supabase 时需要） |

---

## 3. 技术栈

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| 前端框架 | **Nuxt 4** (Vue 3 + Nitro) | `future.compatibilityVersion: 4` |
| 样式方案 | **UnoCSS** | 原子化 CSS，按需生成 |
| 图片优化 | **@nuxt/image** | 自动压缩、格式转换、懒加载 |
| 国际化 | **@nuxtjs/i18n** | 中英文双语，prefix_except_default 策略 |
| 数据库 | **Supabase PostgreSQL** | RLS 行级安全策略 |
| 用户认证 | **Supabase Auth** | Email/OAuth/Anonymous |
| 部署平台 | **Vercel** | 边缘缓存、Serverless Functions |
| 类型校验 | **TypeScript + Zod** | 运行时输入校验 |

---

## 4. 目录结构

```
hehe-app/
├── app/
│   ├── components/
│   │   ├── admin/         # 管理后台组件（局部导入）
│   │   ├── client/        # 前台通用组件
│   │   ├── h5/            # H5 营销页专用组件
│   │   └── shared/        # 跨端共享组件（社交分享、语言切换）
│   ├── composables/       # Vue Composables（自动导入，含 useLocaleDetect）
│   ├── pages/
│   │   ├── (admin)/admin/ # 管理后台页面（SPA）
│   │   ├── (client)/      # 官网首页 + 任务看板（ISR）
│   │   └── (h5)/h5/       # 营销 H5 页面（SWR）
│   ├── plugins/           # Nuxt 插件
│   ├── utils/             # 前端工具函数
│   └── app.vue            # 根组件
├── locales/               # i18n 翻译文件（zh.json、en.json）
├── server/
│   ├── api/
│   │   ├── admin/         # 管理员专用 API（需 assertAdmin）
│   │   └── v1/            # 公开/用户 API
│   ├── middleware/
│   │   ├── 00.apm.ts      # 性能监控
│   │   ├── 01.subdomain-rewrite.ts  # 子域名路由重写
│   │   ├── 02.auth.ts     # JWT 身份解析（Cookie + Bearer）
│   │   ├── 03.admin.ts    # 管理员权限拦截
│   │   └── 04.auth-guard.ts  # 请求级权限守卫
│   └── utils/             # 服务端工具（db/auth/payments/ads/ip/logger）
├── supabase/
│   └── migrations/        # SQL 迁移文件（版本号递增）
├── public/                # 静态资源
├── scripts/               # 运维脚本
├── DESIGN-*.md            # 三端设计系统规范（client/admin/h5）
└── docs/                  # 核心文档（本目录）
```

---

## 5. 多域名路由设计

通过 `01.subdomain-rewrite.ts` 中间件实现子域名路由重写：

| 子域名 | 路径重写 | 渲染策略 |
|--------|----------|----------|
| `yourdomain.localhost` | → `/client/` | ISR (3600s) |
| `admin.yourdomain.localhost` | → `/admin/` | SPA (ssr: false) |
| `api.yourdomain.localhost` | → `/api/v1/` | no-store |
| `*.yourdomain.localhost` | → `/h5/{subdomain}/` | SWR (600s) |

---

## 6. 渲染策略

| 路由 | 策略 | 说明 |
|------|------|------|
| `/client/**` | ISR 3600s | 官网首页，定时增量再生 |
| `/h5/**` | SWR 600s | 营销 H5，后台修改秒级热更新 |
| `/admin/**` | SPA (ssr: false) | 管理后台，完全客户端渲染 |
| `/api/**` | no-store | API 接口，绝对禁止缓存 |

---

## 7. 环境变量配置

```env
# Mock 模式（无需数据库，本地开发）
MOCK_DB=true

# Supabase 服务端凭据（MOCK_DB=false 时生效）
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret-key

# Supabase 前端公开凭据（NUXT_PUBLIC_ 前缀）
NUXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NUXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Stripe 支付凭证
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PUBLIC_KEY=pk_test_xxx

# 生产环境根域名（部署到 Vercel 时填写真实域名）
ROOT_DOMAIN=yourdomain.localhost
```

> **安全原则**：`SUPABASE_SERVICE_ROLE_KEY` 和 `STRIPE_SECRET_KEY` 严禁出现在前端代码中（禁止 `NUXT_PUBLIC_` 前缀）。

> **环境变量详细说明**：
> - `MOCK_DB` 切换说明 → [02-supabase-integration.md](./02-supabase-integration.md) 第 3 节
> - `ROOT_DOMAIN` 部署配置 → [03-vercel-deployment.md](./03-vercel-deployment.md) 第 6 节

---

## 8. Mock DB 离线开发

项目内置完整的内存 Mock PostgreSQL 适配器（`server/utils/db.ts`），支持：

- 链式查询：`.eq().order().single()`
- 聚合统计：`{ count: 'exact', head: true }`
- CRUD 操作：`insert/update/delete/upsert`
- Auth 模拟：`signUp/signInWithPassword/signInWithOAuth/signOut`

设置 `MOCK_DB=true` 即可完全离线开发，无需 Supabase 物理数据库。

---

## 9. 中间件执行链

```
请求进入
  → 00.apm.ts        记录响应时间指标
  → 01.subdomain-rewrite.ts  子域名 → 路径重写
  → 02.auth.ts       JWT 身份解析（Bearer > Cookie > 匿名）
  → 03.admin.ts      /api/admin/* 管理员强拦截
  → 04.auth-guard.ts  请求级权限守卫（支付/订单需登录）
  → API 处理函数
```

---

## 10. 统一响应格式

所有 API 响应使用 `sendSuccess()` 统一格式：

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "timestamp": "2026-06-15T12:00:00.000Z",
  "data": { ... }
}
```

错误拦截使用 `createError()`：

```ts
throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
```

---

## 11. 快速启动

```bash
# 安装依赖
npm install

# 启动开发服务器（Mock DB 模式）
npm run dev

# 启动 Supabase + 开发服务器（需要 Supabase CLI）
npm run dev:all

# API 安全扫描
npm run test:api-safety

# 类型检查
npm run check
```

---

## 12. 数据库迁移

迁移文件放在 `supabase/migrations/` 目录，按版本号命名：

| 文件 | 内容 | 类型 |
|------|------|------|
| `0001_core.sql` | profiles, tasks, activity_logs + 触发器函数 | 必选 |
| `0002_campaign_optional.sql` | campaigns（营销模块） | ⚠️ 可选 |
| `0003_ad_optional.sql` | ad_slots, ad_events | ⚠️ 可选 |
| `0004_feedback_optional.sql` | feedbacks 评价表 | ⚠️ 可选 |
| `0005_payment_optional.sql` | products, orders（支付模块） | ⚠️ 可选 |

所有表必须开启 RLS（`ENABLE ROW LEVEL SECURITY`），数据行级隔离。

> **完整接入指南**：从 Mock DB 切换到真实 Supabase 的详细操作步骤见 [02-supabase-integration.md](./02-supabase-integration.md)

---

## 13. 多语言国际化 (i18n)

基于 `@nuxtjs/i18n` 模块实现中英文双语支持，仅覆盖主站官网和 H5 营销页，管理后台保持纯中文。

### 配置

```ts
// nuxt.config.ts
i18n: {
  locales: [
    { code: 'zh', language: 'zh-CN', name: '中文', file: 'zh.json' },
    { code: 'en', language: 'en-US', name: 'English', file: 'en.json' },
  ],
  defaultLocale: 'zh',
  strategy: 'prefix_except_default',
  detectBrowserLanguage: {
    useCookie: true,
    cookieKey: 'i18n_locale',
    redirectOn: 'root',
    fallbackLocale: 'zh',
  },
  langDir: 'locales/',
}
```

### 路由策略

| 路由 | 语言 | 说明 |
|------|------|------|
| `/` `/tasks` | 中文 | 默认语言无前缀 |
| `/en` `/en/tasks` | 英文 | `/en` 前缀 |
| `/h5/promo` | 中/英 | 内部状态切换，URL 不变 |

### 语言检测优先级

URL 路径 > Cookie (`i18n_locale`) > 浏览器语言 > 时区推断 > 默认中文

### 翻译文件

- `locales/zh.json` — 中文翻译
- `locales/en.json` — 英文翻译

分组：common / nav / header / hero / tasks / h5 / userBar / login / review / share

### 使用方式

```vue
<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <h1>{{ t('hero.title') }}</h1>
</template>
```

---

## 14. 文档导航

| 文档 | 内容 | 阅读顺序 |
|------|------|----------|
| [02-supabase-integration.md](./02-supabase-integration.md) | Supabase 数据库集成与迁移 | 基础设施① |
| [03-vercel-deployment.md](./03-vercel-deployment.md) | Vercel 部署与域名配置 | 基础设施② |
| [04-github-integration.md](./04-github-integration.md) | GitHub 代码托管与 CI/CD | 基础设施③ |
| [05-user-auth.md](./05-user-auth.md) | 用户认证体系 | 业务模块① |
| [06-payment-integration.md](./06-payment-integration.md) | Stripe 支付集成 | 业务模块② |
| [07-ad-monetization-optional.md](./07-ad-monetization-optional.md) | 广告流量变现（可选） | 业务模块③ |
| [08-social-feedback.md](./08-social-feedback.md) | 社交分享与用户反馈 | 业务模块④ |
| [09-cloudflare-optional.md](./09-cloudflare-optional.md) | Cloudflare DNS 与安全（可选） | 可选增强 |

---

## 15. 常见问题

### Q: 启动时报 `Cannot find name 'useLocaleDetect'`

新增 composable 后 Nuxt 类型未更新，运行 `npx nuxi prepare` 重新生成 `.nuxt/types/imports.d.ts`。

### Q: i18n 构建失败，提示 `ENOENT: i18n/locales/zh.json`

`@nuxtjs/i18n` v10 的 `restructureDir` 默认为 `"i18n"`，需在 nuxt.config.ts 中设置 `restructureDir: '.'` 使 `langDir` 相对项目根目录解析。

### Q: 子域名路由不生效

确认本地已绑定 `/etc/hosts`：
```bash
127.0.0.1 yourdomain.localhost
127.0.0.1 admin.yourdomain.localhost
127.0.0.1 ai.yourdomain.localhost
```

### Q: Mock DB 切换真实 DB 后页面白屏

切换后数据库是空的，需要执行迁移 + 插入种子数据。详见 [02-supabase-integration.md](./02-supabase-integration.md) 第 4、5 节。
