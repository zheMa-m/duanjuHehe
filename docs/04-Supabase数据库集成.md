# 04 Supabase 数据库集成

> 从零接入 Supabase 云数据库 — 迁移、RLS、Storage 与本地开发全流程

---

## 1. Supabase 是什么

Supabase 是 Firebase 的开源替代方案，本质是「PostgreSQL + 即时 API + 实时订阅」的一站式后端平台。在本项目中承担：

- **托管 PostgreSQL**：生产级关系数据库，支持行级安全（RLS）策略
- **内置用户认证**：Email / OAuth / 匿名登录，自动签发 JWT
- **Storage 文件存储**：S3 兼容的对象存储，RLS 控制访问权限
- **自动生成 REST API**：每张表自动暴露 CRUD 接口
- **实时订阅**：数据库变更实时推送到前端（WebSocket）
- **Row Level Security**：数据库层权限隔离，无需应用层手动鉴权

> 本项目通过 `@supabase/supabase-js` SDK 在 Nuxt Nitro 服务端使用 service_role 操作数据库，前端通过 anon key 调用。Mock DB 模式下由内存适配器完全模拟。

---

## 2. 前置准备

### 2.1 注册 Supabase 账号

1. 打开 [supabase.com](https://supabase.com)
2. 点击 **Start your project** → 用 GitHub 登录
3. 选择 **Free** 计划（2 个项目、500MB 数据库、5GB 带宽，个人项目足够）

### 2.2 安装必要工具

| 工具 | 版本要求 | 安装方式 | 用途 |
|------|----------|----------|------|
| Supabase CLI | ≥ 2.x | `brew install supabase/tap/supabase` (macOS) | 本地开发、迁移管理 |
| Docker | ≥ 20.x | [docker.com](https://www.docker.com/get-started/) | 本地 Supabase 运行时 |
| Node.js | ≥ 20.x | `nvm install 20` | 项目运行环境 |

```bash
# 验证 CLI 安装
supabase --version
# 验证 Docker
docker --version
```

---

## 3. 创建 Supabase 云项目

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 点击 **New Project**，填写：

| 配置项 | 推荐值 | 说明 |
|--------|--------|------|
| **Name** | `hehe-app` | 项目名称 |
| **Database Password** | 强密码 | 记录下来，命令行要用 |
| **Region** | Southeast Asia (Singapore) | 亚洲用户首选 |
| **Pricing Plan** | Free | 起步足够 |

3. 等待初始化（约 2 分钟）
4. 进入 **Settings → API**，复制以下凭据：

| Dashboard 字段 | 对应 `.env` 变量 | 可见性 |
|----------------|------------------|--------|
| `Project URL` | `SUPABASE_URL` + `NUXT_PUBLIC_SUPABASE_URL` | 双端 |
| `anon public key` | `NUXT_PUBLIC_SUPABASE_ANON_KEY` | 浏览器可见 |
| `service_role key` | `SUPABASE_SERVICE_ROLE_KEY` | **仅服务端** |

> **安全红线**：`service_role key` 拥有绕过所有 RLS 策略的最高权限，绝对不能加 `NUXT_PUBLIC_` 前缀暴露给浏览器。

---

## 4. 配置环境变量

编辑项目根目录 `.env` 文件：

```env
# 关闭 Mock 沙盒，启用真实数据库
MOCK_DB=false

# Supabase 服务端凭据（仅 server 端）
SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...

# Supabase 前端公开凭据（浏览器可见）
NUXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NUXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
```


### 凭据可见性对照

```
浏览器可见（NUXT_PUBLIC_）： SUPABASE_URL、SUPABASE_ANON_KEY
仅服务端（无前缀）：         SUPABASE_SERVICE_ROLE_KEY
```

---

## 5. 执行数据库迁移

### 5.1 方式一：SQL Editor 手动执行（推荐首次）

直接粘贴迁移 SQL，逐文件执行：

1. Supabase Dashboard → **SQL Editor** → **New Query**
2. 按顺序执行以下文件：

| 顺序 | 文件 | 内容 | 类型 |
|------|------|------|------|
| 1 | `0001_core.sql` | profiles、tasks、activity_logs、Storage Buckets、RLS、触发器 | **必选** |
| 2 | `0002_iap.sql` | products、orders、payment_configs、payment_transactions、subscriptions | 可选 |
| 3 | `0003_campaign.sql` | campaigns + campaign_registrations + questionnaire_sessions/answers + ai_reports + campaign_orders | 可选 |
| 4 | `0004_feedback.sql` | feedbacks 评价表 | 可选 |
| 5 | `0005_system.sql` | system_configs 通用配置 + 埋点种子 | 可选 |
| 6 | `0099_cron_jobs.sql` | pg_cron 定时任务（审计归档 + 回收站清理） | 可选 |

3. 逐个执行，确认无报错后再下一个
4. 进入 **Table Editor**，确认表已创建：

```
profiles         ← 用户档案（admin 角色 + OAuth email_verified）
campaigns        ← 营销活动配置（⚠️ 可选）
tasks            ← CRUD 示例 + tenant_id 行级隔离
activity_logs    ← 操作审计流水
products         ← 商品（⚠️ 可选）
orders           ← 支付订单（⚠️ 可选）
feedbacks        ← 用户评价（⚠️ 可选）
storage.buckets  ← avatars / campaign-assets / uploads
```

### 5.2 方式二：Supabase CLI 自动推送

关联远程项目后一条命令完成：

```bash
# 1. 登录 CLI（首次）
supabase login

# 2. 关联远程项目（project-ref 在 Dashboard → Settings → General）
supabase link --project-ref <your-project-ref>

# 3. 推送所有迁移
supabase db push

# 4. 确认状态
supabase migration list
```

> 如果已通过 SQL Editor 手动执行过，再跑 `db push` 会报重复错误。需 `supabase migration repair --status applied <timestamp>` 标记。

---

## 6. 填充初始数据

迁移只建表不写数据。**切换后 campaigns 表为空会导致 H5 页面白屏**，必须插入种子数据。

### 6.1 营销活动数据（必须）

在 SQL Editor 中执行：

```sql
INSERT INTO campaigns (subdomain, title, subtitle, badge, color_from, color_to, is_active, cta_text, description, features) VALUES
('ai', '🤖 HEHE AI 协作者首发', '基于先进智能体的全自动化提效工作流上线。立即预约，锁定首月免费体验资格。', '限时 10,000 名', 'from-purple-600', 'to-indigo-600', true, '立即预约', '基于先进智能体的全自动化提效工作流', '[{"icon":"⚡","text":"一键生成"},{"icon":"🔒","text":"安全沙盒"},{"icon":"🌐","text":"全球分发"}]'::jsonb),
('cloud', '☁️ HEHE 云原生企业私有化', '一键输出物理隔离安全沙盒，专为合规与核心系统容灾设计。首发限时 7 折特惠。', '企业专属首发', 'from-blue-600', 'to-cyan-600', true, '立即预约', '专为合规与核心系统容灾设计', '[{"icon":"🛡️","text":"物理隔离"},{"icon":"📊","text":"实时监控"},{"icon":"🔄","text":"自动容灾"}]'::jsonb),
('promo', '🚀 HEHE 全栈单仓极速版', '仅需单人即可撬动完整的全球边缘分发与 Supabase 强类型契约防御。', '开发者特惠季', 'from-rose-600', 'to-orange-600', true, '立即预约', '单人全栈闭环交付', '[{"icon":"🧑‍💻","text":"单人交付"},{"icon":"💰","text":"降本提效"},{"icon":"🚀","text":"极速上线"}]'::jsonb);
```

### 6.2 商品数据（⚠️ 可选，支付功能需要）

```sql
INSERT INTO products (name, price, tenant_id) VALUES
('HEHE Pro 工具套件', 29.99, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
('HEHE Enterprise 全套方案', 299.00, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
```

---

## 7. 创建管理员账号

### 7.1 Dashboard 创建

1. **Authentication → Users → Add User**
2. 填写邮箱密码，勾选 **Auto Confirm User**
3. **Table Editor → profiles** → 将该用户 `role` 改为 `admin`

### 7.2 SQL 快速设置

```sql
UPDATE profiles SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');

-- 验证
SELECT id, username, role FROM profiles;
```

---

## 8. 配置 OAuth 社交登录（可选）

如需 H5 页面的 Google / Facebook / Apple 登录：

### 8.1 启用 Provider

进入 **Authentication → Providers**，按需启用：

| Provider | 凭据获取入口 | 回调 URL |
|----------|-------------|----------|
| Google | [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials) | `https://<project>.supabase.co/auth/v1/callback` |
| Facebook | [developers.facebook.com](https://developers.facebook.com/apps/) | 同上 |
| Apple | [developer.apple.com](https://developer.apple.com/account/resources/identifiers/list/serviceId) | 同上 |

### 8.2 邮箱登录设置

进入 **Authentication → Providers → Email**：
- 开发阶段关闭 **Confirm email**（注册即激活）
- 生产环境建议开启以提高安全性

### 8.3 回调 URL 配置

**Authentication → URL Configuration**：
- **Site URL**：本地 `http://localhost:3000`，生产 `https://yourdomain.com`
- **Redirect URLs**：同时添加本地和生产回调地址

---

## 9. 本地开发环境（可选）

完全离线开发时启动本地 Supabase：

```bash
# 初始化（仅首次）
supabase init

# 启动全套服务（PG + Auth + Storage + Studio）
supabase start
# 输出本地凭据 → 填入 .env

# 停止
supabase stop

# 重置数据库（重新执行迁移）
supabase db reset
```

> 本地 Supabase Studio 在 `http://127.0.0.1:54323`。

---

## 10. 验证连接

```bash
# 启动项目
npm run dev
# 打开 http://localhost:3000
```

### 验证清单

| 检查项 | 操作 | 预期 |
|--------|------|------|
| 数据库连接 | `/admin` 创建任务 | 持久化，刷新不丢失 |
| 管理员登录 | `/admin` 用 admin 邮箱登录 | 进入后台 |
| H5 营销页 | `/h5/promo` | 正常渲染（campaigns 有数据） |
| 用户注册 | H5 页面邮箱注册 | profiles 表自动创建 |
| RLS 隔离 | 后台查看任务列表 | 按 tenant_id 隔离 |
| 活动日志 | 后台写操作 | activity_logs 有记录 |

### 常见问题

```bash
# 500 / 连接失败
→ MOCK_DB=false？SUPABASE_URL 含 https://？service_role key 无截断？

# RLS "permission denied"
→ profiles 表中 role = 'admin'？RLS 状态 Enabled？

# H5 白屏
→ campaigns 表为空 → 执行第 6 节种子数据

# "too many connections"
→ 见第 11 节 Connection Pooler
```

---

## 11. Connection Pooler（Serverless 必配）

Vercel Serverless Functions 每次请求可能新建数据库连接，容易打满 Free 计划的 10 个直连上限。

| 计划 | 直连上限 | Pooler 上限 |
|------|---------|------------|
| Free | 10 | 200 |
| Pro | 60 | 1000 |

### 启用方式

1. Supabase Dashboard → **Settings → Database → Connection Pooler** → Enable
2. 生成 Pooler URL（端口 6543）
3. 代码通过 HTTP API 不直连 PG，**无需修改代码**

### CLI 使用时建议

```toml
# supabase/config.toml
[db.pooler]
enabled = true
pool_mode = "transaction"
default_pool_size = 15
```

> 监控：Dashboard → Settings → Database → Connections 查看实时连接数。

---

## 12. 配置 Supabase Storage（文件上传）

Storage 功能已集成在 `0001_core.sql` 中，执行核心迁移后自动创建。

### 12.1 Bucket 清单

| Bucket | 可见性 | 大小 | 允许格式 | 写入权限 |
|--------|--------|------|----------|----------|
| `avatars` | 公开 | 2 MB | png/jpeg/gif/webp | 认证用户写自己目录 |
| `campaign-assets` | 公开 | 10 MB | png/jpeg/gif/webp/mp4 | 仅管理员 |
| `uploads` | 私有 | 50 MB | 不限 | 认证用户写自己目录 |

### 12.2 混合上传策略

| 文件大小 | 模式 | 流程 |
|----------|------|------|
| < 5 MB | 服务端中转 | 客户端 → `POST /api/v1/storage/upload` → service_role 写入 |
| ≥ 5 MB | 客户端直传 | `POST /api/v1/storage/signed-url` 获取签名 → 直传 Storage |

### 12.3 API 端点

| 方法 | 路径 | 权限 |
|------|------|------|
| POST | `/api/v1/storage/upload` | 需登录 |
| POST | `/api/v1/storage/signed-url` | 需登录 |
| DELETE | `/api/v1/storage/{bucket}/{user_id}/{filename}` | 需登录 |
| GET | `/api/v1/storage/signed-url/{bucket}/{user_id}/{filename}` | 需登录 |

### 12.4 RLS 安全加固

`0001_core.sql` 内置 3 条 RESTRICTIVE 策略防止越权：

| 策略 | 作用 |
|------|------|
| `storage_scope_restrict` | 限制操作仅在 3 个业务 bucket 内 |
| `campaign_assets_restrict_delete` | campaign-assets 禁止非管理员删除 |
| `uploads_restrict_anon` | anon 用户禁止访问 uploads bucket |

### 12.5 客户端使用

```typescript
const { upload, remove, getSignedUrl, getPublicUrl } = useStorage()

const result = await upload(file, 'avatars')           // 自动选择中转/直传
await remove('avatars', 'uid/1234_photo.png')          // 删除
const url = await getSignedUrl('uploads', 'uid/doc.pdf') // 私有文件访问
const publicUrl = getPublicUrl('avatars', 'uid/pic.png')  // 公开 URL
```

---

## 13. 迁移管理

### 13.1 新增迁移流程

```bash
supabase migration new add_xxx_table     # 1. 创建迁移文件
# 编辑 supabase/migrations/<ts>_add_xxx_table.sql
supabase db reset                        # 2. 本地验证
supabase db push                         # 3. 推送远程
npm run gen:types                        # 4. 生成类型
git add supabase/migrations/ && git commit -m "db: add xxx"
```

### 13.2 迁移文件规范

```sql
-- Module: xxx — 简要描述
-- Tables: table_name

CREATE TABLE IF NOT EXISTS "table_name" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE "table_name" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "table_name" FORCE ROW LEVEL SECURITY;

-- 管理员策略必须用 is_admin() 函数，禁止 inline EXISTS（避免无限递归）
CREATE POLICY "policy_admin" ON "table_name"
  FOR ALL TO authenticated USING ("is_admin"(auth.uid()));

CREATE INDEX idx_table_column ON table_name(column);
```

### 13.3 同步问题排查

```bash
supabase migration list    # 查看 LOCAL / REMOTE 差异
```

| 场景 | 命令 |
|------|------|
| 本地缺失远程迁移 | `supabase db pull` |
| 远程未应用本地迁移 | `supabase db push` |
| 标记远程迁移已应用 | `supabase migration repair --status applied <前缀>` |

> **黄金法则**：远程数据库一旦纳入迁移管理，禁止通过 Dashboard 直接修改 schema。

### 13.4 回滚

```sql
DROP POLICY IF EXISTS "policy_name" ON "table_name";
DROP TABLE IF EXISTS "table_name" CASCADE;
```

Pro 计划以上支持 Dashboard → Database → Backups → Point-in-Time Recovery。

---

## 14. 生成 TypeScript 类型

```bash
npm run gen:types

# 手动命令：
npx supabase gen types typescript --project-id <project-ref> > database.types.ts
```

---

## 15. 完整 Schema 概览

```
┌───────────────────────────────────────────────────────────┐
│                    Supabase Auth                           │
│  auth.users (内置) → handle_new_user() 触发器 → profiles  │
└────────────┬──────────────────────────────────────────────┘
             ▼
┌───────────────────────────────────────────────────────────┐
│ profiles  id(PK→auth.users), username, role(user/admin),   │
│   avatar_url, display_name, auth_provider, device_id       │
│   is_anonymous, email_verified, phone                      │
│   RLS: 自己可读 + is_admin() 管理员全权限                  │
├───────────────────────────────────────────────────────────┤
│ campaigns ⚠️ subdomain(UNIQUE), title, badge, is_active     │
│   cta_text, cover_image, features(JSONB), config(JSONB)    │
│   RLS: 公开读(is_active=true) + 管理员全权限              │
├───────────────────────────────────────────────────────────┤
│ tasks(tenant_id隔离)  │ activity_logs(审计流水, append-only) │
│ orders ⚠️(多渠支付)    │ products ⚠️(tenant_id隔离)        │
│ feedbacks ⚠️(1-5评分)  │                                   │
├───────────────────────────────────────────────────────────┤
│ Storage Buckets (0001_core 内置)                            │
│   avatars(public,2MB) | campaign-assets(public,10MB)       │
│   uploads(private,50MB) | RLS: foldername[1]=uid            │
│   RESTRICTIVE 策略防 anon 越权                              │
├───────────────────────────────────────────────────────────┤
│ is_admin(uuid) SECURITY DEFINER 函数                        │
│   以 owner 身份执行，绕过 RLS，打破策略无限递归              │
└───────────────────────────────────────────────────────────┘
```

---

## 16. 快速参考命令

```bash
# ── 环境管理 ──
supabase login                       # CLI 登录
supabase link --project-ref <ref>    # 关联远程
supabase start / stop                # 本地环境启停

# ── 迁移操作 ──
supabase migration new <name>        # 创建迁移
supabase db push / pull              # 推送/拉取迁移
supabase db reset                    # 重置本地 DB
supabase migration list              # 查看同步状态
supabase migration repair <ts>       # 修复迁移记录

# ── 测试工具 ──
npm run test:supabase                # 数据库连接检查
npm run test:storage                 # Storage 集成测试
npm run test:api-safety              # API 安全扫描
npm run gen:types                    # 生成 TS 类型
npm run gen:crud <resource>          # 生成 CRUD API
npm run gen:rls <table> --admin      # 生成 RLS SQL
npm run scaffold <name>              # 脚手架生成
```
