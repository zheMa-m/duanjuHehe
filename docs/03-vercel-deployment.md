# Vercel 部署与集成指南

> 从零开始将 HeHe SaaS 项目部署到 Vercel 的完整操作手册

---

## 1. Vercel 是什么

Vercel 是一个前端/全栈应用的云部署平台，核心优势：

- **零配置部署**：自动识别 Nuxt 项目，无需手写 Dockerfile
- **全球边缘网络**：自动就近分发，用户访问速度快
- **Git 集成**：push 代码自动构建部署，PR 自动生成预览环境
- **ISR/SWR 原生支持**：完美适配本项目的混合渲染策略
- **Serverless Functions**：API 路由自动编译为 Serverless 函数

---

## 2. 前置准备

### 2.1 注册 Vercel 账号

1. 打开 [vercel.com](https://vercel.com)
2. 点击 **Sign Up**，推荐用 GitHub 账号登录（方便后续 Git 集成）
3. 选择 **Hobby** 计划（免费，足够个人项目起步）

### 2.2 准备 GitHub 仓库

Vercel 通过 GitHub 集成实现自动部署。确保你的代码已推送到 GitHub：

```bash
# 初始化 git（如果还没有）
git init
git add .
git commit -m "Initial commit"

# 在 GitHub 上创建仓库并推送
# 方法 1: 使用 gh CLI
gh repo create hehe-saas --private
git remote add origin https://github.com/你的用户名/hehe-saas.git
git push -u origin main

# 方法 2: 手动在 github.com/new 创建仓库，然后：
git remote add origin https://github.com/你的用户名/hehe-saas.git
git push -u origin main
```

### 2.3 确认 .gitignore 包含敏感文件

```bash
# 确保 .env 不会被提交
cat .gitignore | grep ".env"
# 应输出包含 .env 的行

# 如果没有，添加以下到 .gitignore：
# .env
# .env.local
# .env.production
```

> **绝对不要**将 `.env` 文件（含密钥）提交到 GitHub。所有敏感信息通过 Vercel Dashboard 的环境变量面板配置。

---

## 3. 导入项目到 Vercel

### 3.1 通过 Dashboard 导入

1. 登录 [vercel.com/dashboard](https://vercel.com/dashboard)
2. 点击 **Add New… → Project**
3. 在 GitHub 仓库列表中找到 `hehe-saas`，点击 **Import**
4. Vercel 会自动检测为 Nuxt 项目，显示配置页面

### 3.2 配置构建设置

Vercel 会自动填充大部分配置，但需要确认以下设置：

| 设置项 | 值 | 说明 |
|--------|-----|------|
| Framework Preset | **Nuxt.js** | 自动检测，一般不用改 |
| Build Command | `npm run build` | 默认值，与 package.json 一致 |
| Output Directory | `.output` | Nuxt 构建产物目录（自动检测） |
| Install Command | `npm install` | 默认值 |
| Node.js Version | **20.x** | 选 ≥ 20 版本 |

### 3.3 或通过 Vercel CLI 部署

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 首次部署（会引导配置）
vercel

# 后续部署到生产
vercel --prod
```

---

## 4. 配置环境变量

这是最关键的一步。Vercel 的环境变量在 **Project Settings → Environment Variables** 中配置。

### 4.1 必须配置的变量

| 变量名 | 值示例 | 说明 |
|--------|--------|------|
| `MOCK_DB` | `false` | 关闭 Mock 沙盒，使用真实数据库 |
| `SUPABASE_URL` | `https://xxxxx.supabase.co` | Supabase 项目 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbG...` | Supabase 服务端密钥 |
| `NUXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | 前端公开 URL（与上面相同） |
| `NUXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbG...` | Supabase anon 公钥 |
| `STRIPE_SECRET_KEY` | `sk_test_...` | Stripe 密钥（测试阶段可用测试 key） |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Stripe Webhook 签名密钥 |
| `STRIPE_PUBLIC_KEY` | `pk_test_...` | Stripe 公钥 |

### 4.2 操作步骤

1. 进入 Vercel Dashboard → 你的项目 → **Settings** → **Environment Variables**
2. 逐个添加上述变量：
   - 在 **Name** 栏输入变量名
   - 在 **Value** 栏输入值
   - **Environments** 勾选 `Production`、`Preview`、`Development`（测试阶段三个都勾）
3. 点击 **Save**

### 4.3 NUXT_PUBLIC_ 前缀说明

Nuxt 在 Vercel 上构建时，只有以下变量会暴露给浏览器端代码：

- `NUXT_PUBLIC_*` 前缀的变量 → 浏览器可见（前端代码可访问）
- 其他变量 → 仅服务端可见（Serverless Functions / SSR）

```
浏览器可见: NUXT_PUBLIC_SUPABASE_URL, NUXT_PUBLIC_SUPABASE_ANON_KEY
仅服务端:   SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
```

> **安全红线**：`SUPABASE_SERVICE_ROLE_KEY` 和 `STRIPE_SECRET_KEY` 绝对不能加 `NUXT_PUBLIC_` 前缀。

### 4.4 环境隔离（进阶）

当项目稳定后，建议为不同环境设置不同的变量：

| 环境 | 用途 | Supabase 项目 |
|------|------|---------------|
| Production | 线上正式环境 | 生产 Supabase 项目 |
| Preview | PR 预览 / 测试 | 可复用生产项目或独立测试项目 |
| Development | 本地 `vercel dev` | 本地 Supabase 或测试项目 |

在 Vercel 环境变量面板中，每个变量可以单独选择适用于哪些环境。

---

## 5. 域名配置

本项目使用多子域名架构（主站、管理后台、API、H5 营销页矩阵），需要配置域名。

### 5.1 域名架构概览

```
yourdomain.com           → 主站官网 (/ → /client/)
admin.yourdomain.com     → 管理后台 (/ → /admin/)
api.yourdomain.com       → API 接口 (/ → /api/v1/)
*.yourdomain.com         → H5 营销页 (/ → /h5/{子域名}/)
  例: ai.yourdomain.com  → /h5/ai/
  例: promo.yourdomain.com → /h5/promo/
```

### 5.2 添加主域名

1. 进入 Vercel Dashboard → 你的项目 → **Settings** → **Domains**
2. 在输入框中输入你的域名，例如 `yourdomain.com`，点击 **Add**
3. Vercel 会显示需要配置的 DNS 记录

### 5.3 添加子域名

依次添加：

| 域名 | 类型 |
|------|------|
| `yourdomain.com` | 主域名（Apex） |
| `www.yourdomain.com` | 子域名（建议重定向到主域名） |
| `admin.yourdomain.com` | 管理后台 |
| `api.yourdomain.com` | API 接口 |
| `*.yourdomain.com` | 通配符域名（H5 营销页矩阵） |

### 5.4 配置 DNS 记录

根据你的域名注册商选择配置方式：

#### 方式 A：使用 Vercel Nameservers（推荐，通配符域名必须）

将域名的 Nameservers 改为 Vercel 提供的地址：

```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

在你的域名注册商（如 GoDaddy、Namecheap、Cloudflare）处修改 Nameservers。

> **通配符域名 `*.yourdomain.com` 必须使用 Vercel Nameservers 方式**，因为 Vercel 需要通过 DNS 验证来签发通配符 SSL 证书。

#### 方式 B：使用第三方 DNS（不支持通配符域名）

在 DNS 管理面板添加以下记录：

| 类型 | 名称 | 值 |
|------|------|-----|
| A | `@` | `76.76.21.21` |
| CNAME | `www` | `cname.vercel-dns.com` |
| CNAME | `admin` | `cname.vercel-dns.com` |
| CNAME | `api` | `cname.vercel-dns.com` |

> 注意：第三方 DNS 方式不支持通配符域名。如需 H5 子域名矩阵，必须使用方式 A。

### 5.5 SSL 证书

Vercel 自动为所有域名（含通配符）签发 Let's Encrypt SSL 证书，无需手动操作。证书自动续期。

---

## 6. 修改子域名路由中间件

项目中 `server/middleware/01.subdomain-rewrite.ts` 的 `ROOT_DOMAIN` 硬编码为 `yourdomain.localhost`（开发用）。部署到 Vercel 前需要改为读取环境变量。

### 6.1 新增环境变量

在 `.env`（本地）和 Vercel Dashboard 中添加：

```env
# 生产环境根域名（不含协议前缀）
ROOT_DOMAIN=yourdomain.com
```

### 6.2 修改中间件代码

将 `01.subdomain-rewrite.ts` 中的硬编码域名改为环境变量读取：

```ts
// 修改前
const ROOT_DOMAIN = 'yourdomain.localhost'

// 修改后
const ROOT_DOMAIN = process.env.ROOT_DOMAIN || 'yourdomain.localhost'
```

这样本地开发使用 `yourdomain.localhost`，Vercel 生产环境使用 `yourdomain.com`。

### 6.3 同步修改前端代码

检查项目中所有硬编码 `yourdomain.localhost` 的地方（如 `index.vue` 的链接、H5 页面的子域名提示等），按需替换：

```ts
// 通用写法：从当前请求 host 动态获取根域名
const rootDomain = computed(() => {
  if (import.meta.server) return process.env.ROOT_DOMAIN || 'yourdomain.localhost'
  return window.location.host.split('.').slice(-2).join('.')
})
```

---

## 7. 渲染策略在 Vercel 上的表现

本项目的 `routeRules` 与 Vercel 的能力完美匹配：

| 路由 | routeRules | Vercel 行为 |
|------|-----------|-------------|
| `/` `/tasks` | `isr: 3600` | ISR — Vercel 边缘缓存 1 小时，过期后后台再生 |
| `/h5/**` | `swr: 600` | SWR — 10 分钟缓存，过期后首次请求触发重验证 |
| `/admin/**` | `ssr: false` | SPA — Vercel 返回静态 HTML，客户端 hydration |
| `/api/**` | `no-store` | Serverless — 每次请求实时执行，零缓存 |

### ISR/SWR 在 Vercel 上的工作原理

```
用户请求 / (ISR 3600s)
  ↓
Vercel 边缘节点检查缓存
  ├── 缓存有效 → 直接返回（毫秒级）
  └── 缓存过期 → 返回旧缓存（用户无感）+ 后台异步重新生成
                   ↓
              下次请求拿到新页面
```

> Vercel 的 ISR/SWR 实现基于其 Data Cache 和 Incremental Static Regeneration 能力，Hobby 计划也支持。

---

## 8. Supabase 集成

### 8.1 Vercel Marketplace 一键集成（推荐）

Vercel 提供了 Supabase 的官方 Marketplace 集成：

1. 进入 Vercel Dashboard → 你的项目 → **Settings** → **Integrations**
2. 搜索 **Supabase** → 点击 **Add Integration**
3. 选择你的 Supabase 项目
4. Vercel 会自动注入以下环境变量：
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`（自动加 `NUXT_PUBLIC_` 前缀）
   - `SUPABASE_SERVICE_ROLE_KEY`

> **注意**：Marketplace 集成自动注入的变量名可能与手动配置的不同。建议手动配置环境变量（第 4 节），确保变量名与代码中的引用一致。

### 8.2 手动集成（推荐）

按第 4 节手动配置所有环境变量，从 Supabase Dashboard 复制凭据。这种方式变量名完全可控。

### 8.3 确认 Supabase 回调 URL

在 Supabase Dashboard → **Authentication → URL Configuration**：

- **Site URL**：`https://yourdomain.com`
- **Redirect URLs**：`https://yourdomain.com/auth/v1/callback`（OAuth 回调）

---

## 9. Stripe Webhook 配置

Stripe 支付需要 Webhook 回调地址。

### 9.1 配置 Webhook Endpoint

1. 进入 [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. 点击 **Add Endpoint**
3. **Endpoint URL**：`https://yourdomain.com/api/v1/payments/webhook`
4. **Events to send**：勾选 `checkout.session.completed`、`payment_intent.succeeded`
5. 保存后复制 **Signing Secret**（`whsec_...`）
6. 在 Vercel 环境变量中更新 `STRIPE_WEBHOOK_SECRET`

### 9.2 本地测试 Webhook

开发阶段使用 Stripe CLI 在本地转发 Webhook：

```bash
# 安装 Stripe CLI
brew install stripe/stripe-cli/stripe

# 登录
stripe login

# 转发到本地
stripe listen --forward-to http://localhost:3000/api/v1/payments/webhook
# 输出中包含 webhook signing secret，复制到 .env 的 STRIPE_WEBHOOK_SECRET
```

---

## 10. 部署后验证

部署完成后，按以下清单逐项验证：

### 10.1 基础验证

| 检查项 | 操作 | 预期 |
|--------|------|------|
| 主站首页 | 访问 `https://yourdomain.com` | 正常显示白皮书页面 |
| 管理后台 | 访问 `https://admin.yourdomain.com` | 正常显示登录页 |
| API 接口 | 访问 `https://yourdomain.com/api/v1/campaigns/promo` | 返回 JSON 数据 |
| H5 营销页 | 访问 `https://ai.yourdomain.com` | 正常渲染营销页 |
| SSL 证书 | 检查浏览器地址栏锁图标 | HTTPS 已启用 |

### 10.2 功能验证

| 检查项 | 操作 | 预期 |
|--------|------|------|
| 数据库连接 | 在 `/tasks` 创建一条任务 | 持久化到 Supabase |
| 管理员登录 | `/admin` 用 admin 账号登录 | 进入后台 |
| H5 表单提交 | 在 H5 页面填写手机号和邮箱提交 | 数据写入 campaigns |
| 多语言切换 | 主站点击语言切换按钮 | 中英文正常切换 |
| ISR 缓存 | 首次访问 `/` 较慢，第二次秒开 | ISR 缓存生效 |

### 10.3 日志查看

```
Vercel Dashboard → 你的项目 → Deployments → 最新部署 → Functions 标签
```

Serverless Functions（API 路由 + SSR）的运行时日志在这里查看，排查 500 错误。

---

## 11. Preview Deployments（预览部署）

Vercel 的杀手级功能之一：每个 Git 分支 / PR 自动生成独立的预览环境。

### 11.1 工作流程

```bash
# 1. 创建新分支
git checkout -b feature/new-page

# 2. 开发并推送
git add .
git commit -m "Add new page"
git push origin feature/new-page

# 3. Vercel 自动生成预览环境
# URL: https://hehe-saas-git-feature-new-page-你的用户名.vercel.app
```

### 11.2 创建 Pull Request

1. 在 GitHub 上创建 PR
2. Vercel Bot 自动在 PR 下评论，包含预览链接
3. 点击链接即可预览变更效果
4. 合并 PR 后自动部署到生产

### 11.3 预览环境的数据库

预览环境默认使用与 Production 相同的环境变量。如需隔离：

1. 在 Vercel 环境变量面板中，为 Preview 环境单独设置不同的 Supabase 凭据
2. 或使用 Supabase Branching（Pro 计划以上），每个 Git 分支自动对应独立数据库

---

## 12. 性能优化

### 12.1 Vercel Analytics（分析）

```bash
# 安装 Vercel Analytics
npm i @vercel/analytics
```

在 `app.vue` 或根布局中添加：

```vue
<script setup>
import { Analytics } from '@vercel/analytics/nuxt'
</script>

<template>
  <div>
    <Analytics />
    <!-- 你的应用内容 -->
  </div>
</template>
```

### 12.2 Vercel Speed Insights（速度洞察）

```bash
npm i @vercel/speed-insights
```

```vue
<script setup>
import { SpeedInsights } from '@vercel/speed-insights/nuxt'
</script>

<template>
  <div>
    <SpeedInsights />
    <!-- 你的应用内容 -->
  </div>
</template>
```

### 12.3 图片优化

项目已集成 `@nuxt/image`，Vercel 上自动使用 Sharp 进行图片压缩和格式转换（WebP/AVIF）。无需额外配置。

---

## 13. 常见问题排查

### Q1: 部署后页面白屏 / 500 错误

```
排查步骤：
1. Vercel Dashboard → Deployments → Functions 日志 → 看报错信息
2. 常见原因：
   - 环境变量未配置或变量名不对 → 重新检查第 4 节
   - MOCK_DB 仍为 true → 改为 false
   - SUPABASE_SERVICE_ROLE_KEY 不完整 → 重新从 Supabase Dashboard 复制
   - Node.js 版本过低 → 在 Settings → General → Node.js Version 改为 20.x
```

### Q2: API 路由返回 404

```
排查步骤：
1. 确认 API 路由格式正确：/api/v1/xxx 或 /api/admin/xxx
2. 检查子域名重写中间件是否正确识别了请求
3. 在 Functions 日志中查看 event.path 是否被正确重写
```

### Q3: 子域名不生效

```
排查步骤：
1. Vercel Dashboard → Settings → Domains → 确认所有域名/子域名已添加
2. DNS 记录已正确配置（使用 dig 命令验证）：
   dig yourdomain.com A
   dig admin.yourdomain.com CNAME
   dig *.yourdomain.com CNAME
3. 通配符域名必须使用 Vercel Nameservers
4. DNS 传播可能需要 5-48 小时（通常 10 分钟内）
```

### Q4: 环境变量修改后不生效

```
Vercel 环境变量在构建时注入。修改后需要重新部署：
1. Vercel Dashboard → Deployments → 最新部署 → ⋮ → Redeploy
2. 或推送一个空 commit 触发自动部署：
   git commit --allow-empty -m "chore: redeploy for env update" && git push
```

### Q5: ISR/SWR 缓存不更新

```
Vercel 的 ISR 缓存按 routeRules 中的时间自动过期。如需立即更新：
1. Vercel Dashboard → Deployments → Purge Cache
2. 或通过 API：POST /api/revalidate?path=/
3. 或直接推送代码触发新部署（部署会清空缓存）
```

### Q6: 构建超时或内存不足

```
Hobby 计划的构建限制：
- 构建时间上限：45 分钟（一般足够）
- 构建内存：约 3GB

如果构建失败：
1. 检查是否有超大依赖（如完整的 puppeteer）
2. 在 vercel.json 中调整函数内存：
   {
     "functions": {
       "api/**/*.ts": { "memory": 1024 }
     }
   }
```

---

## 14. Vercel 计划选择

| 计划 | 价格 | 适用场景 |
|------|------|----------|
| **Hobby** | 免费 | 个人项目起步，100GB 带宽/月 |
| **Pro** | $20/月 | 正式运营，1TB 带宽，Supabase Branching |
| **Enterprise** | 定制 | 大规模商业项目 |

Hobby 计划包含：
- 无限部署
- Serverless Functions
- ISR / SWR
- 自动 HTTPS
- Preview Deployments
- 100GB 带宽/月（个人项目足够）

---

## 15. 快速命令参考

```bash
# ── Vercel CLI ──
vercel login                   # 登录
vercel                         # 部署到预览环境
vercel --prod                  # 部署到生产
vercel env ls                  # 查看环境变量
vercel env add <NAME>          # 添加环境变量
vercel env pull .env.local     # 拉取远程环境变量到本地
vercel logs <deployment-url>   # 查看部署日志
vercel inspect                 # 查看项目信息

# ── DNS 验证 ──
dig yourdomain.com A            # 检查 A 记录
dig admin.yourdomain.com CNAME  # 检查 CNAME 记录
dig *.yourdomain.com CNAME      # 检查通配符记录

# ── Git 触发部署 ──
git push origin main            # 自动部署到生产
git push origin feature/xxx     # 自动生成预览环境
```

---

## 16. 部署检查清单

在正式部署前，逐项确认以下事项：

- [ ] 代码已推送到 GitHub 仓库
- [ ] `.env` 文件已加入 `.gitignore`
- [ ] Vercel 项目已创建并导入 GitHub 仓库
- [ ] 所有环境变量已在 Vercel Dashboard 配置（第 4 节清单）
- [ ] `MOCK_DB` 已设为 `false`
- [ ] `ROOT_DOMAIN` 已设为生产域名
- [ ] `01.subdomain-rewrite.ts` 已改为读取 `process.env.ROOT_DOMAIN`
- [ ] Supabase 数据库迁移已执行（4 个 SQL 文件）
- [ ] Supabase 中已创建管理员账号
- [ ] 域名已添加到 Vercel 并配置 DNS
- [ ] 通配符域名 `*.yourdomain.com` 已添加（使用 Vercel Nameservers）
- [ ] Stripe Webhook 已配置指向 `https://yourdomain.com/api/v1/payments/webhook`
- [ ] Supabase OAuth 回调 URL 已更新为生产地址
- [ ] `npm run check` 类型检查通过
- [ ] `npm run build` 本地构建通过
