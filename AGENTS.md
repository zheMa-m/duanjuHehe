# AGENTS.md

> Nuxt 4 + Supabase + Vercel — 单人全栈独立闭环脚手架
>
> **Version**: 1.4.0 | **Last Updated**: 2026-06-24

## Commands

| 命令 | 说明 |
|---|---|
| `npm run dev` | Mock DB 开发 |
| `npm run dev:all` | Supabase 本地实例 |
| `npm run check` | TypeScript 类型检查 (vue-tsc) |
| `npm run build` | 生产构建 |
| `npm run lint` / `lint:fix` | ESLint 检查/修复 |
| `npm run format` / `format:check` | Prettier 格式化/检查 |
| `npm run gen:crud <res>` | CRUD API 生成器 |
| `npm run gen:rls <table> [--admin]` | RLS 策略生成器 |
| `npm run scaffold <name>` | API + 页面脚手架 |
| `npm run gen:types` | 生成 Supabase TypeScript 类型 |
| `npm run seed:demo` | 演示数据填充 |
| `npm run test:api-safety` | API 安全扫描 |
| `npm run test:supabase` | 数据库健康检查 |
| `npm run test:storage` | Storage 集成测试 |
| `npm run test:payment-strategies` | 支付策略测试 |
| `npm run test:unit` / `test:e2e` | 单元/E2E 测试 |
| `npm run deps:check` | 依赖更新检查 |

## Project Structure (Key Paths)

```
app/
  components/   admin/ client/ h5/ shared/ starpath/
  composables/  auth/ payments/ seo/ storage/ + useAdmin*/useStarpathFlow/useLocaleDetect/useExport
  pages/        (admin)/ (client)/ (h5)/
  plugins/      supabase-auth.client.ts + 01.subdomain-router.client.ts
  utils/        http-client.ts (含 #shell/http 类型声明) + subdomain.ts (子域名路由配置)
server/
  api/          admin/ starpath/ v1/
  middleware/   00.apm → 01.subdomain → 02.auth → 03.admin → 04.auth-guard → 05.api-security
                (01.subdomain: api 重定向 + 子域名放行，路由重写由 router.options.ts + 客户端插件完成)
  utils/        db.ts auth.ts payments.ts logger.ts response.ts
                payment-strategies/ (stripe/paypal/google-pay/apple-iap/manual + factory + types)
supabase/migrations/  0001_core → 0099_cron_jobs (顺序编号)
scripts/        gen-crud-api / scaffolder / generate-rls-sql / seed-demo-data / test-* / _shared.mjs
docs/           10 篇中文文档 + plan-payment-closure.md
```

## Rendering Strategy

| Route | Strategy | Rationale |
|-------|----------|-----------|
| `/` `/architecture` `/help` | ISR 3600s | SEO 友好 |
| `/h5/**` `/starpath/**` | ISR 600s | 营销页快速更新 |
| `/admin/**` | SPA (ssr: false) | 纯客户端，隔离 SSR |
| `/api/**` | no-store | 实时，零缓存 |

## Subdomain Routing

子域名自动路由，无需手动注册：

| 子域名 | 映射路径 | 类型 |
|--------|----------|------|
| `www.*` / 根域名 | 主站路由（过滤 /admin /h5） | 固定 |
| `admin.*` | `/admin` | 固定 |
| `api.*` | REST API（非 API 路径 301→www） | 固定 |
| 任意其他子域名 | `/h5/{子域名}` | 动态 |

**架构**：
- `app/utils/subdomain.ts` — 单一切入点（纯函数配置）
- `app/router.options.ts` — SSR/客户端路由表重写
- `app/plugins/01.subdomain-router.client.ts` — 全局拦截 `router.push`，自动剥离前缀
- `server/middleware/01.subdomain.ts` — 仅处理 api 重定向 + 放行

新增营销 H5：只需创建 `app/pages/(h5)/h5/{子域名}/`，零配置。

## Code Style (Mandatory)

- **Composition API** `<script setup lang="ts">` — 禁止 Options API
- **Zod** 校验所有 API 入参
- **`sendSuccess()`** / **`throwError()`** 统一响应（注意：非 sendError，避免 h3 冲突）
- 服务端错误消息用英文，前端通过 `t()` 翻译
- 用户可见文案用 i18n `t()`，禁止硬编码中文（admin 和 help 页面除外）
- `<NuxtImg>` 替代原生 `<img>`，首屏图加 `fetchpriority="high"` + `loading="eager"`

## Security (Critical)

**禁止 `NUXT_PUBLIC_` 前缀的密钥：**
- `SUPABASE_SERVICE_ROLE_KEY`

> Stripe 密钥已全部迁移至 DB（`system_configs.payment_secrets` + `payment_configs`），不再通过环境变量管理。

**鉴权：**
- 前端 Supabase 客户端仅用 anon key
- 服务端中间件读 token: Bearer header > Cookie (`sb-access-token`) > device-id
- 支付/订单端点拒绝匿名用户 (04.auth-guard 返回 403)
- OAuth `client_secret` 存在 Supabase Dashboard，永不在代码中出现

**API 安全声明（`test:api-safety` 扫描依据）：**
```
// @api-auth: admin   → 仅管理员
// @api-auth: user    → 需认证用户
// @api-auth: public  → 无需认证
```

## Database (Critical)

- 所有表**必须** ENABLE + FORCE ROW LEVEL SECURITY
- RLS 管理员检查**必须**用 `is_admin(auth.uid())` — 禁止内联 EXISTS 子查询（导致无限递归）
- SQL 迁移顺序编号，不修改已有迁移文件
- 列表查询 `pageSize <= 100`
- 统计 API 用 Materialized Views，禁止内存聚合 >1000 行
- 金额字段用 `NUMERIC`，禁止浮点数

## Platform Rules

- 数据库：仅 Supabase PG — 不用 Vercel Postgres
- API：仅 `/server/api/` — 不用 Supabase Edge Functions
- 限流：Vercel KV — 不用 DB 模拟
- 静态资源：`public/`；用户上传：Supabase Storage — 不用 Vercel Blob
- Stripe SDK：仅 `MOCK_DB=false` 时懒加载
- 支付策略：通过 `server/utils/payment-strategies/factory.ts` 获取 — 禁止硬编码 Stripe

## Audit

- 每次 admin 写/删/状态变更前调用 `logAuditEvent()`
- `activity_logs` 表仅追加，永不删除

## i18n

- 策略：`prefix_except_default`，默认 `zh`
- 检测链：URL path > Cookie > 浏览器语言 > 时区 > fallback `zh`
- admin 页面和 help 页面保持纯中文

## OpenAPI

- 每个路由需 `defineRouteMeta({ openAPI: { ... } } as any)`
- 端点：`/_openapi.json` / `/_scalar` / `/_swagger`（开发+生产均可访问）
- 保留 `@api-auth` 注释供安全扫描器读取

## Do Not Modify

- `.env` — 含密钥，不提交
- `supabase/migrations/` 已有文件 — 创建新编号文件
- `server/middleware/` 编号 — 顺序不可变
- `server/utils/db.ts` Mock DB 适配器链式 API
- `server/utils/payment-strategies/` — types.ts 和 factory.ts 接口必须一致

## Mock DB Development

`MOCK_DB=true` 离线开发，内存适配器支持：
- 链式查询 `.eq().order().single()`
- 插入返回 `.insert(data).select('*')`
- 聚合 `{ count: 'exact', head: true }`
- Auth 模拟 `signUp / signInWithPassword / signInWithOAuth / signOut`
