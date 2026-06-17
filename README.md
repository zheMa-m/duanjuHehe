<div align="center">

<img src="public/favicon.svg" alt="HeHe App" width="64" height="64" />

# HeHe App

### 单人全栈独立闭环脚手架

[![Nuxt 4](https://img.shields.io/badge/Nuxt-4-00DC82?logo=nuxt.js&logoColor=white)](https://nuxt.com)
[![Vue 3](https://img.shields.io/badge/Vue-3.4-4FC08D?logo=vue.js&logoColor=white)](https://vuejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PG-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Vercel-Deploy-000000?logo=vercel&logoColor=white)](https://vercel.com)
[![License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

</div>

---

## 概述

HeHe App 是一个为 **单人全栈工程师 (Solo Hacker)** 设计的生产级脚手架。基于 **Nuxt 4 全栈混合架构**，在单一代码仓库中同时支撑**主站官网**（SSR）、**管理后台**（SPA）、**营销 H5 落地页**（SWR）和 **REST API** 四类运行时，配套 Supabase PostgreSQL 数据库、i18n 国际化、AI 辅助开发工具链，赋能单个开发者高效完成从开发到运维的全生命周期。

> **核心理念**：一仓覆盖全业务，零代码切换沙盒/生产，AI 友好的工具链。

---

## 目录

- [快速开始](#快速开始)
- [架构设计](#架构设计)
- [技术栈](#技术栈)
- [渲染策略](#渲染策略)
- [项目结构](#项目结构)
- [功能特性](#功能特性)
- [数据库集成](#数据库集成)
- [安全模型](#安全模型)
- [国际化 (i18n)](#国际化-i18n)
- [设计系统](#设计系统)
- [API 文档](#api-文档)
- [自动化工具链](#自动化工具链)
- [部署](#部署)
- [环境变量](#环境变量)
- [开发指南](#开发指南)
- [参考文档](#参考文档)

---

## 快速开始

### 前置要求

- **Node.js** ≥ 18
- **npm** ≥ 9
- （可选）**Supabase CLI** — 本地数据库实例

### 安装与运行

```bash
# 1. 克隆项目
git clone <your-repo-url> && cd hehe-app

# 2. 安装依赖
npm install

# 3. 启动开发服务（Mock DB 模式，无需数据库）
npm run dev

# 4. 启动开发服务 + Supabase 本地实例
npm run dev:all
```

浏览器访问：
| 地址 | 说明 |
|---|---|
| `http://localhost:3000` | 主站官网 |
| `http://localhost:3000/admin` | 管理后台（测试账号：`admin` / `admin888`） |
| `http://localhost:3000/h5/demo` | 示例营销 H5 页 |
| `http://localhost:3000/_scalar` | Scalar API 文档 |
| `http://localhost:3000/_swagger` | Swagger UI |

---

## 架构设计

### 多端统一架构

```
                   ┌─────────────────────────────────┐
                   │         Nuxt 4 Monorepo          │
                   │                                  │
    Browser ──────▶│  (client)/  → SSR  (ISR 3600s)  │──▶ Supabase PG
    Admin   ──────▶│  (admin)/   → SPA  (ssr: false)  │──▶ Supabase Storage
    H5      ──────▶│  (h5)/      → SWR  (ISR 600s)    │──▶ Stripe API
                   │                                  │
    API Client ───▶│  /api/v1/*  → no-store            │──▶ Vercel KV
                   │  /api/admin/* → no-store          │
                   └─────────────────────────────────┘
                            │
                    Vercel Serverless
```

### 中间件责任链

请求进入后依次经过编号中间件，形成清晰的安全管道：

```
00.apm → 01.subdomain-rewrite → 02.auth → 03.admin → 04.auth-guard → 05.access-guard
  │              │                  │           │             │                │
  │              │                  │           │             │                │
  性能监控     子域名路由         Bearer/      管理员        用户态          站点访问
              重写到对应路径     Cookie      断言守卫      强制认证        密码保护
                               双模鉴权
```

### API 安全声明

每个 API 端点通过注释声明其安全级别，配合 `test:api-safety` 自动扫描：

```typescript
// @api-auth: admin   → 仅管理员（03.admin 中间件保护）
// @api-auth: user    → 需认证用户（04.auth-guard 中间件保护）
// @api-auth: public  → 无需认证
```

---

## 技术栈

| 类别 | 技术 | 说明 |
|---|---|---|
| **框架** | Nuxt 4 (Vue 3.4) | 全栈混合渲染框架 |
| **语言** | TypeScript 5.5 | 全量类型覆盖 |
| **数据库** | Supabase PostgreSQL | 云托管 PG + 内置 Auth + Storage |
| **部署** | Vercel | Serverless 部署，零配置 |
| **CSS** | UnoCSS | 原子化 CSS 引擎 |
| **校验** | Zod 3 | 运行时类型校验 |
| **国际化** | @nuxtjs/i18n 10 | 中英文双语切换 |
| **图片** | @nuxt/image 2 | 图片优化与缓存 |
| **支付** | Stripe | 懒加载，Mock 模式返回假数据 |
| **PWA** | @vite-pwa/nuxt | 管理后台 PWA 离线支持 |
| **监控** | Vercel Analytics + Speed Insights | 前端性能与分析 |
| **API 文档** | Nitro OpenAPI 3.1 + Scalar + Swagger | 自动生成交互式文档 |

---

## 渲染策略

| 路由 | 策略 | 缓存 | 理由 |
|---|---|---|---|
| `/` `/architecture` `/tasks` | **SSR + ISR** | 3600s | SEO 友好，首屏秒开 |
| `/h5/**` | **SSR + SWR** | 600s | 营销页需快速更新 |
| `/admin/**` | **SPA** | `ssr: false` | 纯客户端，隔离 SSR 泄露 |
| `/api/**` | **no-store** | 无 | 实时数据，零缓存 |

---

## 项目结构

```
hehe-app/
├── app/                            # 前端应用层
│   ├── components/
│   │   ├── admin/                  # 管理后台组件（本地导入）
│   │   ├── client/                 # 主站组件
│   │   ├── h5/                     # H5 营销组件
│   │   └── shared/                 # 跨端共享组件
│   ├── composables/                # 自动导入的组合式函数
│   ├── pages/
│   │   ├── (client)/               # 主站页面 → /、/tasks、/architecture
│   │   ├── (admin)/admin/          # 管理后台 → /admin
│   │   └── (h5)/h5/[subdomain]/    # H5 营销页 → /h5/:subdomain
│   └── plugins/                    # Nuxt 插件
├── server/                         # 服务端层
│   ├── api/
│   │   ├── admin/                  # 管理员 API（03.admin 保护）
│   │   └── v1/                     # 公开/用户 API
│   ├── middleware/                  # 编号中间件链（00 → 06）
│   └── utils/                      # 服务端工具函数
├── supabase/migrations/            # 版本化 SQL 迁移（0001 → 0005）
├── locales/                        # i18n 翻译文件（zh.json / en.json）
├── scripts/                        # AI 辅助工具链脚本
│   ├── _shared.mjs                 # 共享 .env 加载 + 彩色输出
│   ├── gen-crud-api.mjs            # CRUD 控制器生成器
│   ├── scaffolder.mjs              # API + 页面脚手架
│   ├── generate-rls-sql.mjs        # RLS 策略生成器
│   ├── test-api-safety.mjs         # API 安全扫描器
│   ├── test-supabase-connection.mjs # 数据库健康检查
│   └── test-storage.mjs            # Storage 全链路集成测试
├── docs/                           # 详细技术文档（9 篇）
├── design/                         # 设计系统规范
├── nuxt.config.ts                  # Nuxt 配置
├── tsconfig.json                   # TypeScript 配置
└── uno.config.ts                   # UnoCSS 配置
```

---

## 功能特性

### 🛡️ 管理后台

- **苹果极简风格登录**：毛玻璃卡片，`localStorage` 持久化会话
- **系统健康监控 (APM)**：P95/P99 时延、CPU/内存占用、异常告警（800ms Warning / 2000ms Critical）
- **审计日志**：动态条件筛选、模糊搜索、UTF-8 BOM 防乱码 CSV 导出
- **密码修改**：毛玻璃 Modal，调用受保护 API，自动记入审计流

### 📱 营销 H5 矩阵

- **云端实时发布**：后台编辑活动配置（Badge / 标题 / 描述），PATCH 接口落库后前端秒级生效
- **SWR 驱动渲染**：600s 间隔的 SWR 策略，无需重新部署即可更新活动页
- **拟真手机框架**：苹果拟物外壳 + 磨砂玻璃 + 渐变光晕微动画
- **赛博风电子票券**：表单提交后生成随机编号的发光票券
- **全量 i18n**：表单、按钮、评价区均支持中英文自动切换

### 💾 Supabase Storage

- **三个业务 Bucket**：`avatars`（头像，公开读）、`campaign-assets`（营销素材）、`uploads`（私有文件）
- **RLS + RESTRICTIVE 双重加固**：用户目录隔离 + 防止 anon 未授权写入
- **混合上传策略**：小文件服务端中转（安全），大文件客户端 Signed URL 直传（性能）

### 📊 OpenAPI 文档

- **三套交互式 UI**：Scalar（紫色主题）、Swagger UI、原始 OpenAPI 3.1.0 JSON
- **生产环境密码保护**：`SITE_ACCESS_PASSWORD` 环境变量，支持 `?token=` / `?password=` / Bearer / Cookie 四种方式

---

## 数据库集成

### 迁移文件

`supabase/migrations/` 下按版本号递增的 SQL 文件，最小部署仅需 `0001_core.sql`（含核心表 + Storage Bucket + RLS 策略）：

| 迁移 | 内容 | 状态 |
|---|---|---|
| `0001_core.sql` | 核心表（profiles、tasks、activity_logs）+ Storage Bucket + RLS 策略 | **必选** |
| `0002_campaign_optional.sql` | 营销活动 campaigns | 可选 |
| `0003_ad_optional.sql` | 广告位 ad_slots、ad_events | 可选 |
| `0004_feedback_optional.sql` | 用户反馈 feedbacks | 可选 |
| `0005_payment_optional.sql` | 支付 products、orders | 可选 |

### RLS 设计原则

- 所有表**必须**启用 `FORCE ROW LEVEL SECURITY`
- 管理员权限统一使用 `is_admin(auth.uid())` SECURITY DEFINER 函数，**禁止**内联 `EXISTS` 子查询（防止无限递归）
- 金额字段使用 `NUMERIC` 类型，**禁止**浮点数
- 列表查询上限 `pageSize <= 100`

### Mock DB → 生产切换

```env
# .env
MOCK_DB=false                                    # 关闭 Mock 模式
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
NUXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NUXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
```

Mock DB 适配器完全兼容 Supabase JS Client 链式调用 API（`.eq().order().single()` / `.insert().select()`），开发期零配置即可进入前端逻辑开发。

---

## 安全模型

### 多层纵深防御

```
┌──────────────────────────────────────────────┐
│  Layer 1: 站点访问密码 (SITE_ACCESS_PASSWORD) │
│           → 页面拦截 + API 文档保护           │
│  Layer 2: 管理员断言 (assertAdmin)            │
│  Layer 3: 用户认证守卫 (assertUser)           │
│  Layer 4: RLS 行级安全 (FORCE ROW LEVEL)      │
│  Layer 5: Zod 输入校验                         │
│  Layer 6: API 安全扫描 (@api-auth 声明)       │
└──────────────────────────────────────────────┘
```

### 密钥安全边界

**绝不暴露到前端（禁止 `NUXT_PUBLIC_` 前缀）：**

| 密钥 | 用途 |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | 服务端数据库操作 |
| `STRIPE_SECRET_KEY` | Stripe 支付密钥 |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook 验证 |
| `SITE_ACCESS_PASSWORD` | 站点访问密码（页面 + API 文档统一） |

### 鉴权流程

1. 中间件从 **Bearer Header** → **Cookie** (`sb-access-token`) → **device-id** 提取身份
2. JWT 令牌由 Supabase Auth 签发，服务端通过 Supabase 验证
3. OAuth `client_secret` 存储在 Supabase Dashboard，永不在代码中出现
4. 匿名用户可访问公开 API，但支付/订单等端点由 `04.auth-guard` 返回 403

---

## 国际化 (i18n)

基于 `@nuxtjs/i18n`，支持**中文（默认）**和**英文**：

- **策略**：`prefix_except_default` — 中文无前缀，英文 `/en` 前缀
- **智能检测**：URL 路径 > Cookie (`i18n_locale`) > 浏览器语言 > 时区推断 > fallback `zh`
- **覆盖范围**：主站官网 + H5 营销页；管理后台保持纯中文
- **翻译文件**：`locales/zh.json` + `locales/en.json`，按功能命名空间分组
- **使用方式**：`const { t } = useI18n()` → `t('home.title')`

> 新增页面时，提取所有用户可见文案到 `locales/*.json`，使用 `t()` 函数调用，禁止硬编码中文。

---

## 设计系统

三端统一设计规范（详见 [DESIGN.md](./DESIGN.md)）：

| 平台 | 视觉性格 | 背景体系 | 排版特点 |
|---|---|---|---|
| **Client** | 深海暗色科技 | 三层递进（`#080c18` → `#0a0e1a` → `#131d35`） | h1: 2rem/700，body: 0.875rem/1.7 |
| **Admin** | 纯黑极简 | 白色透明度层级（5%/8%/10%） | h1: 1.25rem/600，body: 0.75rem |
| **H5** | 深色沉浸 + 手机框架 | Slate 色系 + 动态渐变光晕 | h1: 1.25rem/800，body: 0.75rem |

**共享基础**：Inter 字体栈、JetBrains Mono 代码字体、8px 基准间距网格、语义功能色体系。

---

## API 文档

### 可用端点

| 端点 | 说明 | 环境 |
|---|---|---|
| `/_openapi.json` | 原始 OpenAPI 3.1.0 规范 | 开发 + 生产 |
| `/_scalar` | Scalar 交互式文档（紫色主题） | 开发 + 生产 |
| `/_swagger` | Swagger UI 交互式文档 | 开发 + 生产 |

### 生产环境访问

```bash
# Query 参数
curl "https://hehe-app.vercel.app/_swagger?token=<SITE_ACCESS_PASSWORD>"

# Bearer Header
curl -H "Authorization: Bearer <SITE_ACCESS_PASSWORD>" "https://hehe-app.vercel.app/_scalar"
```

> 开发环境自动放行，无需 Token。

### API 分组

Auth · Products · Tasks · Payments · Orders · Ads · Campaigns · Feedback · User · Admin Tasks · Admin Orders · Admin Campaigns · Admin Ad Slots · Admin APM · Admin Audit · Admin Revenue · Admin Profile

---

## 自动化工具链

所有脚本共享 `scripts/_shared.mjs`（`.env` 加载 + 彩色输出），可直接通过 `npm run` 调用：

### CRUD 生成器

```bash
npm run gen:crud <resource>
```

自动在 `server/api/v1/` 下生成全套 RESTful 控制器，包含 `defineRouteMeta` OpenAPI 元数据、Zod 参数校验、`sendSuccess`/`throwError` 统一响应、`@api-auth: user` 安全声明。

### 脚手架生成器

```bash
npm run scaffold <name>
```

同时生成 API 端点和配套前端页面骨架（含 SEO 元数据 + 表单 + 结果展示）。

### RLS 策略生成器

```bash
npm run gen:rls <table>           # 基础租户隔离
npm run gen:rls <table> --admin   # 额外生成 is_admin() 管理员策略
```

输出到 `scripts/rls-output/` 目录。

### API 安全扫描

```bash
npm run test:api-safety          # 默认 localhost:3000
npm run test:api-safety 3001     # 指定端口
```

自动提取 `@api-auth` 声明，对未认证请求进行 401/403 探针测试。**任何接口返回 200 即为 FAIL，应阻断合入。**

### Supabase 健康检查

```bash
npm run test:supabase
```

一键验证数据库连接、表结构、Storage Bucket、迁移版本。

### Storage 集成测试

```bash
npm run test:storage
```

对三个 Bucket 执行 20 项端到端测试（上传、公开 URL、Signed URL、RLS 权限验证）。

### 生成数据库类型

```bash
npm run gen:types
```

从 Supabase 本地实例生成 TypeScript 类型定义到 `app/types/database.types.ts`。

---

## 部署

### Vercel 一键部署

项目配置了 `nitro.preset: 'vercel'`，推送到 GitHub 后 Vercel 自动部署：

1. 在 Vercel 中导入项目
2. 配置 [环境变量](#环境变量)
3. 部署完成

### 环境变量

```env
# ── 数据库 ──
MOCK_DB=true                                    # 开发模式（true=内存模拟 / false=真实 Supabase）
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
NUXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NUXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>

# ── Stripe（可选）──
STRIPE_SECRET_KEY=<stripe_secret>
STRIPE_WEBHOOK_SECRET=<stripe_webhook>

# ── 安全 ──
SITE_ACCESS_PASSWORD=<your_password>            # 统一访问密码（页面 + API 文档）

# ── 站点 ──
NUXT_PUBLIC_BASE_URL=https://yourdomain.com     # 站点 URL（可选，自动探测）
ROOT_DOMAIN=yourdomain.com                      # 根域名（子域名路由用）
```

> `.env` 文件包含密钥，已加入 `.gitignore`，永不提交。

---

## 开发指南

### 常用命令

| 命令 | 说明 |
|---|---|
| `npm install` | 安装依赖 |
| `npm run dev` | 启动开发服务（Mock DB） |
| `npm run dev:all` | 开发服务 + Supabase 本地实例 |
| `npm run build` | 构建生产包 |
| `npm run generate` | 静态预渲染全站（Nitro 爬虫） |
| `npm run preview` | 本地预览构建产物 |
| `npm run check` | TypeScript + Vue SFC 类型检查 |
| `npm run gen:types` | 生成 Supabase TypeScript 类型 |
| `npm run apm:monitor` | APM 系统健康监控（依赖真实 Supabase） |

### 代码规范

- **Composition API** + `<script setup lang="ts">` — 禁止 Options API
- **Zod** 校验所有 API 入参 — 永不信客户端数据
- **`sendSuccess()`** / **`throwError()`** — 统一 API 响应格式
- 服务端错误消息用英文，前端通过 `t()` 翻译展示
- 图片使用 `<NuxtImg>` 替代原生 `<img>`
- 首屏图片添加 `fetchpriority="high"` + `loading="eager"`

### 新增功能工作流

```bash
# 1. 添加数据库迁移（如需要）
# 创建 supabase/migrations/0008_xxx.sql

# 2. 生成 CRUD API
npm run gen:crud <resource>

# 3. 生成 RLS 策略
npm run gen:rls <table> --admin

# 4. 生成前端页面
npm run scaffold <name>

# 5. 添加 i18n 翻译
# 编辑 locales/zh.json 和 locales/en.json

# 6. 安全扫描
npm run test:api-safety

# 7. 类型检查
npm run check
```

### Mock DB 开发

设置 `MOCK_DB=true` 即可离线开发。Mock 适配器支持：
- 链式查询：`.eq().order().single()`
- 插入返回：`.insert(data).select('*')`
- 聚合查询：`{ count: 'exact', head: true }`
- 认证模拟：`signUp` / `signInWithPassword` / `signInWithOAuth` / `signOut`

---

## 参考文档

| 文档 | 内容 |
|---|---|
| [AGENTS.md](./AGENTS.md) | AI Agent 开发手册 |
| [DESIGN.md](./DESIGN.md) | 三端设计系统规范 |
| [docs/01-scaffold-basics.md](./docs/01-scaffold-basics.md) | 脚手架基础 |
| [docs/02-supabase-integration.md](./docs/02-supabase-integration.md) | Supabase 集成指南 |
| [docs/03-vercel-deployment.md](./docs/03-vercel-deployment.md) | Vercel 部署指南 |
| [docs/04-github-integration.md](./docs/04-github-integration.md) | GitHub 集成 |
| [docs/05-user-auth.md](./docs/05-user-auth.md) | 用户认证 |
| [docs/06-payment-integration-optional.md](./docs/06-payment-integration-optional.md) | 支付集成 |
| [docs/07-ad-monetization-optional.md](./docs/07-ad-monetization-optional.md) | 广告变现 |
| [docs/08-social-feedback-optional.md](./docs/08-social-feedback-optional.md) | 社交反馈 |
| [docs/09-cloudflare-optional.md](./docs/09-cloudflare-optional.md) | Cloudflare 接入 |

---

## License

MIT © HeHe App
