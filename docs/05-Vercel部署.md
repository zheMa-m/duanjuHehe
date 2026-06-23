# 05 Vercel 部署与集成指南

> 从零开始将 HeHe 项目部署到 Vercel 的完整操作手册

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
gh repo create hehe-app --private
git remote add origin https://github.com/你的用户名/hehe-app.git
git push -u origin main
```

### 2.3 确认 .gitignore 包含敏感文件

```bash
cat .gitignore | grep ".env"
```

> **绝对不要**将 `.env` 文件（含密钥）提交到 GitHub。所有敏感信息通过 Vercel Dashboard 的环境变量面板配置。

---

## 3. 导入项目到 Vercel

### 3.1 通过 Dashboard 导入

1. 登录 [vercel.com/dashboard](https://vercel.com/dashboard)
2. 点击 **Add New… → Project**
3. 在 GitHub 仓库列表中找到 `hehe-app`，点击 **Import**
4. Vercel 会自动检测为 Nuxt 项目，显示配置页面

### 3.2 配置构建设置

| 设置项 | 值 | 说明 |
|--------|-----|------|
| Framework Preset | **Nuxt.js** | 自动检测，一般不用改 |
| Build Command | `npm run build` | 默认值，与 package.json 一致 |
| Output Directory | `.output` | Nuxt 构建产物目录（自动检测） |
| Install Command | `npm install` | 默认值 |
| Node.js Version | **20.x** | 选 ≥ 20 版本 |

### 3.3 或通过 Vercel CLI 部署

```bash
npm i -g vercel
vercel login
vercel                    # 首次部署（会引导配置）
vercel --prod             # 部署到生产
```

---

## 4. 配置环境变量

这是最关键的一步。Vercel 的环境变量在 **Project Settings → Environment Variables** 中配置。

### 4.1 必须配置的变量

| 变量名 | 值示例 | 说明 |
|--------|--------|------|
| `MOCK_DB` | `false` | 关闭 Mock 沙盒 |
| `SUPABASE_URL` | `https://xxxxx.supabase.co` | Supabase 项目 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbG...` | Supabase 服务端密钥 |
| `NUXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | 前端公开 URL |
| `NUXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbG...` | Supabase anon 公钥 |
| `SITE_ACCESS_PASSWORD` | `hehe2024` | 统一访问密码（留空不启用） |

### 4.2 NUXT_PUBLIC_ 前缀说明

```
浏览器可见: NUXT_PUBLIC_SUPABASE_URL, NUXT_PUBLIC_SUPABASE_ANON_KEY
仅服务端:   SUPABASE_SERVICE_ROLE_KEY, SITE_ACCESS_PASSWORD
```
> 支付密钥（Stripe/PayPal/Apple IAP）已迁移至 DB，通过管理后台配置，不在此处管理。

> **安全红线**：`SUPABASE_SERVICE_ROLE_KEY` 绝对不能加 `NUXT_PUBLIC_` 前缀。

### 4.3 环境隔离（进阶）

| 环境 | 用途 | Supabase 项目 |
|------|------|---------------|
| Production | 线上正式环境 | 生产 Supabase 项目 |
| Preview | PR 预览 / 测试 | 可复用生产项目或独立测试项目 |
| Development | 本地 `vercel dev` | 本地 Supabase 或测试项目 |

---

## 5. 域名配置

### 5.1 域名架构概览

```
yourdomain.com           → 主站官网 (/ → /client/)
admin.yourdomain.com     → 管理后台 (/ → /admin/)
api.yourdomain.com       → API 接口 (/ → /api/v1/)
*.yourdomain.com         → H5 营销页 (/ → /h5/{子域名}/)
```

### 5.2 添加域名

1. Vercel Dashboard → 项目 → **Settings** → **Domains**
2. 依次添加：

| 域名 | 类型 |
|------|------|
| `yourdomain.com` | 主域名（Apex） |
| `www.yourdomain.com` | 子域名（建议重定向到主域名） |
| `admin.yourdomain.com` | 管理后台 |
| `api.yourdomain.com` | API 接口 |
| `*.yourdomain.com` | 通配符域名（H5 营销页矩阵） |

### 5.3 配置 DNS 记录

#### 方式 A：Vercel Nameservers（推荐，通配符域名必须）

```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

> **通配符域名 `*.yourdomain.com` 必须使用 Vercel Nameservers**。

#### 方式 B：第三方 DNS（不支持通配符域名）

| 类型 | 名称 | 值 |
|------|------|-----|
| A | `@` | `76.76.21.21` |
| CNAME | `www` | `cname.vercel-dns.com` |
| CNAME | `admin` | `cname.vercel-dns.com` |
| CNAME | `api` | `cname.vercel-dns.com` |

### 5.4 SSL 证书

Vercel 自动为所有域名（含通配符）签发 Let's Encrypt SSL 证书，无需手动操作。

---

## 6. 站点 URL 与子域名路由

项目采用零配置方案：

| 环境 | URL 来源 | 示例 |
|------|----------|------|
| 本地开发 | 默认值 | `http://localhost:3000` |
| Vercel Preview | `VERCEL_URL` | `https://hehe-app-git-main.vercel.app` |
| Vercel Production | `VERCEL_URL` | `https://yourdomain.com` |

### 6.1 手动覆盖（可选）

```env
NUXT_PUBLIC_BASE_URL=https://yourdomain.com
```

---

## 7. 渲染策略在 Vercel 上的表现

| 路由 | routeRules | Vercel 行为 |
|------|-----------|-------------|
| `/` `/architecture` `/help` | `isr: 3600` | ISR — 边缘缓存 1 小时 |
| `/h5/**` | `swr: 600` | SWR — 10 分钟缓存 |
| `/admin/**` | `ssr: false` | SPA — 静态 HTML，客户端 hydration |
| `/api/**` | `no-store` | Serverless — 每次实时执行 |

> 渲染策略深入分析见 [03-渲染策略.md](./03-渲染策略.md)。

---

## 8. Supabase 集成

### 8.1 手动集成（推荐）

按第 4 节手动配置所有环境变量，从 Supabase Dashboard 复制凭据。

### 8.2 确认 Supabase 回调 URL

在 Supabase Dashboard → **Authentication → URL Configuration**：

- **Site URL**：`https://yourdomain.com`
- **Redirect URLs**：`https://yourdomain.com/auth/v1/callback`

---

## 9. Stripe Webhook 配置

1. 进入 [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. **Endpoint URL**：`https://yourdomain.com/api/v1/payments/webhook`
3. 勾选 `checkout.session.completed`、`payment_intent.succeeded`
4. 复制 Signing Secret，配置到管理后台「业务运营 → 支付管理」→ Stripe Webhook Secret。

本地测试：
```bash
stripe listen --forward-to http://localhost:3000/api/v1/payments/webhook
```

---

## 10. 部署后验证

| 检查项 | 操作 | 预期 |
|--------|------|------|
| 主站首页 | `https://yourdomain.com` | 正常显示 |
| 帮助文档 | `https://yourdomain.com/help` | 正常显示 |
| 管理后台 | `https://admin.yourdomain.com` | 登录页正常 |
| H5 营销页 | `https://ai.yourdomain.com` | 正常渲染 |
| SSL 证书 | 浏览器锁图标 | HTTPS 已启用 |

---

## 11. Preview Deployments（预览部署）

```bash
git checkout -b feature/new-page
git push origin feature/new-page
# → Vercel 自动生成预览: https://hehe-app-git-feature-new-page-xxx.vercel.app
# → PR 中 Vercel Bot 自动评论预览链接
```

---

## 12. 性能优化

### Vercel Analytics

```bash
npm i @vercel/analytics @vercel/speed-insights
```

### 图片优化

项目已集成 `@nuxt/image`，Vercel 上自动使用 Sharp 压缩和 WebP/AVIF 转换。

---

## 13. 常见问题排查

### Q1: 部署后页面白屏 / 500 错误

检查：环境变量未配置 → `MOCK_DB` 仍为 true → `SUPABASE_SERVICE_ROLE_KEY` 不完整 → Node.js 版本过低

### Q2: 子域名不生效

确认所有域/子域名已添加到 Vercel Domains，DNS 已正确配置。通配符域名必须用 Vercel Nameservers。

### Q3: 环境变量修改后不生效

Vercel 环境变量在构建时注入，修改后需重新部署（Redeploy 或空 commit push）。

### Q4: ISR/SWR 缓存不更新

Vercel Dashboard → Deployments → Purge Cache，或推送代码触发新部署。

---

## 14. Vercel 计划选择

| 计划 | 价格 | 适用 |
|------|------|------|
| **Hobby** | 免费 | 个人项目，100GB 带宽/月 |
| **Pro** | $20/月 | 正式运营，1TB 带宽 |
| **Enterprise** | 定制 | 大规模商业项目 |

---

## 15. 快速命令参考

```bash
vercel                   # 部署到预览
vercel --prod            # 部署到生产
vercel env ls            # 查看环境变量
vercel env pull .env.local  # 拉取远程变量
vercel logs <url>        # 查看日志

dig yourdomain.com A
dig admin.yourdomain.com CNAME
```

---

## 16. 部署检查清单

- [ ] 代码已推送到 GitHub
- [ ] `.env` 已加入 `.gitignore`
- [ ] Vercel 项目已导入 GitHub 仓库
- [ ] 所有环境变量已在 Vercel Dashboard 配置
- [ ] `MOCK_DB` 已设为 `false`
- [ ] 自定义域名已添加，DNS 已配置
- [ ] Supabase 数据库迁移已执行
- [ ] 管理员账号已创建
- [ ] Stripe Webhook 已配置
- [ ] `npm run check` + `npm run build` 本地通过
