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

# 3. 启动开发服务（Mock DB 模式，无需数据库，开箱即用）
npm run dev

# 4. 启动开发服务 + 本地 Supabase 实例（需本地安装 Docker 并启动，且已安装 Supabase CLI）
npm run dev:all

# 5. Docker 部署运行（需安装 Docker）
docker compose up -d
```

浏览器访问：
| 地址 | 说明 |
|---|---|
| `http://localhost:3000` | 主站官网 |
| `http://localhost:3000/admin` | 管理后台（测试账号：`admin` / `admin888`） |
| `http://localhost:3000/h5/promo` | 示例营销 H5 页 |
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

### 🌐 子域名自适应重写机制

项目通过 [01.subdomain-rewrite.ts](server/middleware/01.subdomain-rewrite.ts) 中间件实现了自适应的多域名与单域名路由系统，支持一套代码在两种环境下无缝运行：

#### 1. 多域名/通配符域名模式 (生产环境推荐)
若在本地绑定了 hosts，或在生产平台（如 Vercel）绑定了自定义通配符域名（如 `*.yourdomain.com`），中间件会提取 HTTP 请求的 Host 头，与配置的 `ROOT_DOMAIN` 进行匹配并做静默重写：
*   **官网首页** (`yourdomain.com` 或 `www.yourdomain.com`) ──▶ 映射重写至 `/client/*` 目录。
*   **管理后台** (`admin.yourdomain.com`) ──▶ 映射重写至 `/admin/*` 目录（强制设为 `ssr: false` 的 SPA 运行态）。
*   **API 服务网关** (`api.yourdomain.com`) ──▶ 映射重写至 `/api/v1/*`。注意：若尝试访问非 `/api/v1/` 路径，中间件会直接抛出 404 错误，形成天然的 API 域名隔离防护。
*   **营销 H5 子域名** (`{subdomain}.yourdomain.com`) ──▶ 映射重写至 `/h5/{subdomain}/*`。例如，访问 `promo.yourdomain.com` 即可直接拉取营销后台动态落库的 `promo` 页面配置。

#### 2. 单域名自适应模式 (分支预览 / 零配置起步)
当在 Vercel 分支预览环境（如 `hehe-app-git-main.vercel.app`）或本地未配置 hosts 时，Host 并不匹配已注册的 Known Host。
此时，**重写机制会自动跳过**，系统转为单域名路由，直接通过子路径进行访问：
*   访问 `https://<deploy-host>/` ──▶ 天然匹配 `(client)` 路由组的首页。
*   访问 `https://<deploy-host>/admin` ──▶ 匹配 `(admin)/admin/index.vue`。
*   访问 `https://<deploy-host>/h5/promo` ──▶ 匹配 `(h5)/h5/[subdomain]/index.vue`，其中路由参数 `subdomain` 被自适应提取为 `promo`。

这一设计完美避开了通配符域名在分支预览中无法动态映射的业界难题，使每次 Git Push 产生的预览地址都能直接访问所有子路由功能。

### 中间件责任链

请求进入后依次经过编号中间件，形成清晰的安全管道：

```
00.apm → 01.subdomain-rewrite → 02.auth → 03.admin → 04.auth-guard → 05.api-security
  │              │                  │           │             │                │
  │              │                  │           │             │                │
  性能监控     子域名路由         Bearer/      管理员        用户态          API安全
              重写到对应路径     Cookie      断言守卫      强制认证        和防刷限制
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
| **监控** | Vercel Analytics + Speed Insights + Sentry | 前端性能 + 错误追踪 |
| **API 文档** | Nitro OpenAPI 3.1 + Scalar + Swagger | 自动生成交互式文档 |
| **测试** | Vitest + Playwright | 单元测试 + E2E 测试 |

---

## 渲染策略

| 路由 | 策略 | 缓存 | 理由 |
|---|---|---|---|
| `/` `/architecture` `/help` | **SSR + ISR** | 3600s | SEO 友好，首屏秒开 |
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
│   │   ├── shared/                 # 跨端共享组件
│   │   └── starpath/               # StarPath 智能问卷组件（8 个）
│   ├── composables/                # 自动导入的组合式函数
│   │   ├── useAuth / usePayment / useStorage / useAppSEO
│   │   ├── useExport / useAdminMenu / useAdminNav / useAdminTheme / useAnalytics
│   │   ├── useLocaleDetect / useStarpathFlow
│   ├── pages/
│   │   ├── (client)/               # 主站页面 → /、/architecture、/help
│   │   ├── (admin)/admin/          # 管理后台 → /admin
│   │   └── (h5)/h5/[subdomain]/    # H5 营销页 → /h5/:subdomain（含 StarPath 智能问卷完整链路）
│   ├── plugins/                    # Nuxt 插件
│   └── utils/                      # 客户端工具（http-client.ts 含 #shell/http 类型）
├── server/                         # 服务端层
│   ├── api/
│   │   ├── admin/                  # 管理员 API（03.admin 保护）
│   │   │   ├── analytics/ audit-logs/ auth/ campaigns/ config/
│   │   │   ├── orders/ products/ profile/ revenue/ security/
│   │   │   ├── starpath/ storage/ subscriptions/ tasks/ users/
│   │   ├── starpath/               # StarPath 智能问卷公开 API（questionnaire/payment/email/report/subscribe）
│   │   └── v1/                     # 公开/用户 API
│   ├── middleware/                  # 编号中间件链（00 → 06）
│   └── utils/                      # 服务端工具函数
│       ├── payment-strategies/     # 多支付策略工厂（Stripe/PayPal/Google Pay/Apple IAP/Manual）
│       ├── db.ts auth.ts payments.ts logger.ts response.ts
│       ├── api-security.ts apm.ts cache.ts email.ts export.ts
│       ├── ip.ts starpath-service.ts storage.ts payment-transaction.ts
├── supabase/migrations/            # 版本化 SQL 迁移（0001 → 0099，连续编号）
├── locales/                        # i18n 翻译文件（zh.json / en.json）
├── scripts/                        # 工具链脚本
│   ├── _shared.mjs                 # 共享 .env 加载 + 彩色输出
│   ├── gen-crud-api.mjs            # CRUD 控制器生成器
│   ├── scaffolder.mjs              # API + 页面脚手架
│   ├── generate-rls-sql.mjs        # RLS 策略生成器
│   ├── test-api-safety.mjs         # API 安全扫描器
│   ├── test-supabase-connection.mjs # 数据库健康检查
│   ├── test-storage.mjs            # Storage 全链路集成测试
│   ├── test-signature.mjs          # HMAC-SHA256 签名算法测试
│   ├── test-payment-strategies.mjs # 支付策略测试
│   ├── seed-demo-data.mjs          # 演示数据填充（用户/商品/活动/订单/订阅/反馈/日志/留资）
├── tests/                          # 测试文件
│   ├── unit/                       # Vitest 单元测试（composables/api/utils）
│   └── e2e/                        # Playwright E2E 测试
├── docs/                           # 详细技术文档（10 篇）
├── DESIGN.md                       # 三端设计系统规范
├── eslint.config.mjs               # ESLint Flat Config
├── nuxt.config.ts                  # Nuxt 配置
├── tsconfig.json                   # TypeScript 配置
└── uno.config.ts                   # UnoCSS 配置
```

---

## 功能特性

### 🛡️ 管理后台

- **苹果极简风格登录**：毛玻璃卡片，`localStorage` 持久化会话
- **双因素认证（2FA）**：TOTP 一次性密码 + 备用恢复码，管理员安全加固
- **系统健康监控 (APM)**：P95/P99 时延、CPU/内存占用、异常告警（800ms Warning / 2000ms Critical）
- **审计日志**：动态条件筛选、模糊搜索、服务端 stats API 驱动统计、UTF-8 BOM 防乱码 CSV 导出
- **密码修改**：毛玻璃 Modal，调用受保护 API，自动记入审计流
- **数据分析**：概览仪表盘、营收统计、用户分析（`/api/admin/analytics/`）
- **多支付管理**：Stripe / PayPal / Google Pay / Apple IAP / Manual 五大渠道切换（`/api/admin/config/payment`）
- **安全中心**：API Key 管理、IP 速率限制（`/api/admin/security/`）

### 🎯 StarPath 智能问卷 H5

- **问卷答题流程**：多步问卷 + 滚轮选择器（WheelPicker）+ 选项卡片，`useStarpathFlow` 管理状态
- **智能问卷引擎**：根据答题结果生成个性化分析报告
- **支付闭环**：信用卡格式化输入 + PayPal 集成，`/api/starpath/payment/` 处理
- **邮件报告**：问卷结果自动生成邮件报告（`/api/starpath/email/`）
- **多支付策略**：`server/utils/payment-strategies/` 策略工厂，统一 `PaymentStrategy` 接口
- **完整 H5 页面**：25 个 Vue 页面覆盖 StarPath 智能问卷全流程（答题/支付/结果）

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

- **三套交互式 UI**：Scalar（紫色主题）、Swagger UI、原始 OpenAPI 3.1.0 JSON（开发与生产环境均支持直接访问）

---

## 数据库集成

### 迁移文件

`supabase/migrations/` 下按版本号连续递增的 SQL 文件，每个文件为自包含逻辑单元，最小部署仅需 `0001_core.sql`：

| 迁移 | 内容 | 状态 |
|---|---|---|
| `0001_core.sql` | 核心表（profiles / tasks / activity_logs）+ Storage（4 Bucket）+ 回收站 + 通用函数 | **必选** |
| `0002_iap.sql` | 商品 products + 订单 orders（多渠道统一 Schema）+ 支付配置 + 交易日志 + 订阅 | 可选 |
| `0003_campaign.sql` | 营销活动 campaigns + campaign_registrations + 智能问卷 questionnaire_sessions/answers + AI 报告 ai_reports + 活动订单关联 campaign_orders | 可选 |
| `0004_feedback.sql` | 用户反馈 feedbacks（星级评分 + 审批） | 可选 |
| `0005_system.sql` | 系统 KV 配置 + API 安全策略（速率/IP/Key）+ 管理员 2FA（TOTP） | 可选 |
| `0099_cron_jobs.sql` | pg_cron 定时任务（审计归档 + 回收站清理） | 可选 |

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

### 💾 离线 Mock DB 开发手册

项目在 [server/utils/db.ts](server/utils/db.ts) 中实现了一个功能完备的内存 Mock PostgreSQL 适配器，支持在无物理数据库时进行绝大部分业务开发与调试：

#### 1. 覆盖 10+ 张核心业务表
适配器内置了对以下物理表的内存数组映射，支持查询（`select`）、插入（`insert`）、更新（`update`）与删除（`delete`）的完整增删改查逻辑：
*   `profiles`：用户个人档案表（支持匿名与注册用户角色管理）。
*   `tasks`：任务列表，支持基于租户标识 `tenant_id` 的行级过滤。
*   `activity_logs`：管理员操作及身份验证的安全审计日志表。
*   `campaigns`：营销活动配置（支持在管理后台热修改，前台 H5 秒级渲染生效）。
*   `products` 与 `orders`：Stripe 等支付所依赖的商品列表及订单流转记录。
*   `feedbacks`：用户的动态反馈与评价收集表。
*   `admin_2fa`：管理员双因素认证（TOTP 密钥 + 恢复码）。

#### 2. 全量 Auth 模块模拟
支持对 `supabase.auth` 所有核心 API 的模拟：
*   **注册与登录**：模拟 `signUp`、`signInWithPassword`、`signInAnonymously`（匿名登录）及 `signInWithOAuth`（第三方 OAuth 跳转模拟）。
*   **触发器模拟**：在调用 `signUp` 或 `signInAnonymously` 时，内存适配器会自动往 `mockProfilesTable` 中插入一条对应的 Profile 数据，完美复现了 Supabase 物理数据库中 `handle_new_user` 触发器的行为，确保前台个人中心与鉴权状态联查的完整度。

#### 3. Storage 存储模块模拟
提供了对 `supabase.storage` 中 `avatars`、`campaign-assets` 和 `uploads` 存储桶（Buckets）的上传及签名链接模拟：
*   支持 `upload`、`remove`、`getPublicUrl` 接口。
*   支持 `createSignedUrl` 与 `createSignedUploadUrl`，在前端客户端请求直传或私有签名访问时，直接返回模拟 CDN URL。

---

## 安全模型

### 多层纵深防御

```
┌──────────────────────────────────────────────┐
│  Layer 1: 管理员断言 (assertAdmin)            │
│  Layer 2: 用户认证守卫 (assertUser)           │
│  Layer 3: RLS 行级安全 (FORCE ROW LEVEL)      │
│  Layer 4: Zod 输入校验                         │
│  Layer 5: API 安全扫描 (@api-auth 声明)       │
└──────────────────────────────────────────────┘
```

### 密钥安全边界

**绝不暴露到前端（禁止 `NUXT_PUBLIC_` 前缀）：**

| 密钥 | 用途 |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | 服务端数据库操作 |

> 支付密钥（Stripe/PayPal/Apple IAP）已迁移至 DB，通过管理后台配置。

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

### 访问方式

开发环境与生产环境均无需 Token，可直接访问。

### API 分组

Auth · Products · Tasks · Payments · Orders · Campaigns · Feedback · User · StarPath Questionnaire · StarPath Payment · StarPath Email · Admin Tasks · Admin Orders · Admin Campaigns · Admin APM · Admin Audit · Admin Revenue · Admin Profile · Admin Security · Admin Analytics · Admin StarPath Questionnaire · Admin Storage · Admin Subscriptions · Admin Users

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
npm run test:api-safety          # 默认扫描 localhost:3000
npm run test:api-safety 3001     # 指定端口扫描
```

项目通过 [scripts/test-api-safety.mjs](scripts/test-api-safety.mjs) 脚本对所有 API 控制器文件（`server/api/**/*.ts`）进行自动化越权漏洞测试。

#### 1. 安全级别解析规则
扫描器会分析控制器代码：
*   **显式解析**：寻找 `// @api-auth: admin | user | public` 声明。
*   **智能推导**：若无声明，属于 `/api/admin/` 路径的推导为 `admin` 级别；若控制器包含 `assertUser` / `assertAdmin` 调用，推导为 `user` 级别；其余默认为 `public`。

#### 2. 未授权探针测试与判定逻辑
对于所有非 `public`（即受保护的）端点，扫描器将向本地服务发送**未携带任何凭证（Token/Cookie）**的探针请求，并根据响应状态码执行强校验判定：
*   **`401` 或 `403` ──▶ PASS**：权限防御拦截成功，判定为安全。
*   **`400` ──▶ PASS (无越权但建议调整)**：说明接口被 Zod 校验先于鉴权拦截，虽然没有泄漏数据，但建议将 `assertUser()` 置于 `readValidatedBody()` 之前。
*   **`200` 或 `201` ──▶ FAIL (越权漏洞)**：未授权用户成功读取或写入了数据！扫描器将打印高亮警告并直接抛出异常。
*   **其他状态码 ──▶ WARN**：显示异常响应，需人工排查。

**该扫描器与 CI/CD 流程或 Git Pre-commit 挂钩。若扫描结果包含任何 FAIL，脚本会抛出非零退出码（exit code 1），自动阻断部署或合入。**

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

# ── 站点 ──
APP_NAME=HeHe App                                # 应用名称（邮件/通知等场景使用）
NUXT_PUBLIC_BASE_URL=https://yourdomain.com     # 站点 URL（可选，自动探测）
ROOT_DOMAIN=yourdomain.com                      # 根域名（子域名路由用）
SITE_ACCESS_PASSWORD=                           # 站点访问密码（可选，设置后全局需要密码访问）
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
| `npm run lint` | ESLint 代码规范检查 |
| `npm run lint:fix` | ESLint 自动修复 |
| `npm run format` | Prettier 格式化所有文件 |
| `npm run format:check` | 检查代码格式是否符合 Prettier 规范 |
| `npm run seed:demo` | 填充演示数据 |
| `npm run deps:check` | 检查依赖更新 |
| `npm run test:unit` | 运行单元测试（Vitest） |
| `npm run test:unit:watch` | 监听模式运行单元测试 |
| `npm run test:e2e` | 运行 Playwright E2E 测试 |
| `npm run test:coverage` | 生成测试覆盖率报告 |
| `npm run test:all` | 运行全部测试（单元 + E2E） |

### 代码规范

- **Composition API** + `<script setup lang="ts">` — 禁止 Options API
- **Zod** 校验所有 API 入参 — 永不信客户端数据
- **`sendSuccess()`** / **`throwError()`** — 统一 API 响应格式
- **ESLint Flat Config** + **Prettier** — 自动化代码格式化与规范检查
- 服务端错误消息用英文，前端通过 `t()` 翻译展示
- 图片使用 `<NuxtImg>` 替代原生 `<img>`
- 首屏图片添加 `fetchpriority="high"` + `loading="eager"`
- CI Pipeline: type-check + lint + unit tests（`.github/workflows/ci.yml`）

### 新增功能工作流

```bash
# 1. 添加数据库迁移（如需要）
# 创建 supabase/migrations/0007_xxx.sql

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
| [CHANGELOG.md](./CHANGELOG.md) | 版本更新日志 |
| [docs/01-快速开始.md](./docs/01-快速开始.md) | 快速入门、环境变量、Mock DB、FAQ |
| [docs/02-项目架构.md](./docs/02-项目架构.md) | 技术栈、目录结构、路由与渲染策略 |
| [docs/03-渲染策略.md](./docs/03-渲染策略.md) | ISR/SWR/SSR 渲染策略深度对比 |
| [docs/04-Supabase数据库集成.md](./docs/04-Supabase数据库集成.md) | Supabase 数据库集成与迁移 |
| [docs/05-Vercel部署.md](./docs/05-Vercel部署.md) | Vercel 部署与域名配置 |
| [docs/06-GitHub与CI-CD.md](./docs/06-GitHub与CI-CD.md) | GitHub 代码托管与 CI/CD |
| [docs/07-用户认证.md](./docs/07-用户认证.md) | 用户认证体系 |
| [docs/08-支付集成.md](./docs/08-支付集成.md) | Stripe 支付集成 |
| [docs/09-社交分享与反馈.md](./docs/09-社交分享与反馈.md) | 社交分享与用户反馈 |
| [docs/10-Cloudflare配置.md](./docs/10-Cloudflare配置.md) | Cloudflare DNS 与安全（可选） |
| [docs/plan-payment-closure.md](./docs/plan-payment-closure.md) | StarPath 支付闭环计划 |

---

## Docker 部署

项目提供完整的 Docker 化支持，适合生产级容器化部署。

### 构建与启动

```bash
# 构建并启动（生产模式）
docker compose up -d

# 查看日志
docker compose logs -f

# 停止服务
docker compose down

# 启动时附加本地 PostgreSQL 数据库（开发用）
docker compose --profile db up -d
```

### 环境变量

参考 `.env.example` 创建 `.env` 文件，Docker Compose 会自动加载。

### 健康检查

容器内嵌健康检查端点（`/api/health`），Docker 自动监控容器状态。

---

## 测试体系

项目提供三层测试覆盖：

### 单元测试（Vitest）

```bash
# 运行全部单元测试
npm run test:unit

# 监听模式（开发时使用）
npm run test:unit:watch

# 生成覆盖率报告
npm run test:coverage
```

测试文件位于 `tests/unit/`，涵盖 `server/utils` 中的核心工具函数。

### E2E 测试（Playwright）

```bash
# 运行 E2E 测试（自动启动开发服务器）
npm run test:e2e

# 交互式 UI 模式
npm run test:e2e:ui
```

测试文件位于 `tests/e2e/`。

### 全部测试

```bash
npm run test:all
```

---

## License

MIT © HeHe App
