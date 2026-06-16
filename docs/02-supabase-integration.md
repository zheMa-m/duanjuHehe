# Supabase 数据库集成与迁移指南

> 从 Mock DB 沙盒模式切换到真实 Supabase 云数据库的完整操作流程

---

## 1. 前置条件

| 工具 | 版本要求 | 安装方式 |
|------|----------|----------|
| Supabase CLI | ≥ 2.x | `brew install supabase/tap/supabase` (macOS) |
| Docker | ≥ 20.x | [docker.com](https://www.docker.com/get-started/) |
| Node.js | ≥ 20.x | `nvm install 20` |
| Supabase 账号 | — | [supabase.com/dashboard](https://supabase.com/dashboard) |

```bash
# 验证 CLI 安装
supabase --version
```

---

## 2. 创建 Supabase 云项目

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 点击 **New Project**，填写：
   - **Name**：`hehe-app`
   - **Database Password**：强密码（记录下来，后续要用） 0YBwaTKwFrrnvCFU
   - **Region**：选离用户最近的区域（如 `Southeast Asia (Singapore)` 或 `Northeast Asia (Tokyo)`）
   - **Pricing Plan**：Free 即可起步
3. 等待项目初始化完成（约 2 分钟）
4. 进入 **Settings → API**，复制以下凭据：
   - `Project URL` → 填入 `.env` 的 `SUPABASE_URL` 和 `NUXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → 填入 `.env` 的 `NUXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role key`（需展开显示）→ 填入 `.env` 的 `SUPABASE_SERVICE_ROLE_KEY`

---

## 3. 配置环境变量

编辑项目根目录 `.env` 文件，将 `MOCK_DB` 切换为 `false` 并填入真实凭据：

```env
# 关闭 Mock 沙盒，启用真实数据库
MOCK_DB=false

# Supabase 服务端凭据（仅 server 端可见）
SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...

# Supabase 前端公开凭据（NUXT_PUBLIC_ 前缀，浏览器可见）
NUXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NUXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...

# Stripe（测试阶段可先留空或填测试 key）
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PUBLIC_KEY=pk_test_xxx
```

> **安全原则**：`SUPABASE_SERVICE_ROLE_KEY` 绝对不能出现在 `NUXT_PUBLIC_` 前缀的变量中。这个 key 拥有绕过所有 RLS 策略的权限。

---

## 4. 执行数据库迁移

### 4.1 方式一：Supabase SQL Editor 手动执行（推荐首次）

适用于初次接入，直接在 Supabase Dashboard 中手动执行 SQL。

1. 打开 Supabase Dashboard → **SQL Editor**
2. 按版本号顺序依次执行迁移文件：

| 顺序 | 文件 | 内容 |
|------|------|------|
| 1 | `supabase/migrations/0001_core.sql` | profiles, campaigns, tasks, activity_logs |
| 2 | `supabase/migrations/0002_user_auth.sql` | profiles 扩展字段, 自动 profile 触发器 |
| 3 | `supabase/migrations/0003_payment.sql` | products, orders |
| 4 | `supabase/migrations/0004_ad_optional.sql` | ad_slots, ad_events（可选） |
| 5 | `supabase/migrations/0005_feedback.sql` | feedbacks 评价表 |

3. 每次执行一个文件，确认无报错后再执行下一个
4. 执行完成后进入 **Table Editor**，确认所有表已创建：

```
profiles         ← 用户档案（含 admin 角色）
campaigns        ← 营销活动配置
tasks            ← 业务任务
activity_logs    ← 统一活动日志（auth/admin/system）
products         ← 商品
orders           ← 支付订单
ad_slots         ← 广告位配置
ad_events        ← 广告事件
feedbacks        ← 用户评价
```

### 4.2 方式二：Supabase CLI 自动推送（推荐后续迭代）

适用于已有本地开发环境的持续迭代。

```bash
# 1. 登录 Supabase CLI（首次需要）
supabase login
# 浏览器会自动打开，确认后返回 access token

# 2. 关联远程项目（首次需要）
#    project-ref 获取方式：Supabase Dashboard → Settings → General → Reference ID
#    格式示例：abcdefghijklmnop
supabase link --project-ref <your-project-ref>

# 3. 推送所有迁移文件到远程数据库
supabase db push

# 4. 查看迁移状态
supabase migration list
```

> **注意**：如果已经通过 SQL Editor 手动执行过迁移，再执行 `db push` 会报重复错误。此时需要用 `supabase migration repair --status applied <timestamp>` 手动标记已应用的迁移。详见第 12 节。

---

## 5. 填充初始数据

数据库迁移只创建表结构，不包含业务数据。项目中的 Mock 数据（营销活动、商品等）只存在于内存中，不会自动迁移到真实数据库。**切换后 H5 页面会因 campaigns 表为空而白屏**，必须手动插入种子数据。

### 5.1 营销活动数据（必须）

H5 营销页面依赖 `campaigns` 表，在 SQL Editor 中执行：

```sql
INSERT INTO campaigns (subdomain, title, subtitle, badge, color_from, color_to) VALUES
('ai', '🤖 HEHE AI 协作者首发', '基于先进智能体的全自动化提效工作流上线。立即预约，锁定首月免费体验资格。', '限时 10,000 名', 'from-purple-600', 'to-indigo-600'),
('cloud', '☁️ HEHE 云原生企业私有化', '一键输出物理隔离安全沙盒，专为合规与核心系统容灾设计。首发限时 7 折特惠。', '企业专属首发', 'from-blue-600', 'to-cyan-600'),
('promo', '🚀 HEHE 全栈单仓极速版', '仅需单人即可撬动完整的全球边缘分发与 Supabase 强类型契约防御。', '开发者特惠季', 'from-rose-600', 'to-orange-600');
```

### 5.2 商品数据（支付功能需要）

```sql
-- 种子数据专用 tenant 占位 ID（后续创建管理员时使用此 ID）
INSERT INTO products (name, price, tenant_id) VALUES
('HEHE Pro 工具套件', 29.99, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
('HEHE Enterprise 全套方案', 299.00, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
```

### 5.3 广告位配置（可选）

```sql
INSERT INTO ad_slots (name, position, is_active, ad_provider, ad_config) VALUES
('Top Header Banner', 'header_banner', true, 'custom', '{"html": "<div class=\"ad-banner\">Sponsored Content</div>", "width": 728, "height": 90}'::jsonb),
('Footer Banner', 'footer_banner', true, 'adsense', '{"data-ad-client": "ca-pub-xxxx", "data-ad-slot": "1234567890"}'::jsonb),
('Native Inline Ad', 'native_inline', true, 'custom', '{"html": "<div class=\"native-ad\">Promoted</div>"}'::jsonb);
```

### 5.4 验证种子数据

```sql
SELECT subdomain, title FROM campaigns;
SELECT id, name, price FROM products;
SELECT position, is_active FROM ad_slots;
-- 各返回 3 行即表示成功
```

---

## 6. 创建管理员账号

数据库迁移完成后，需要手动创建第一个管理员用户。

### 6.1 通过 Supabase Dashboard 创建

1. 进入 **Authentication → Users → Add User**
2. 填写邮箱和密码，勾选 **Auto Confirm User**
3. 创建完成后，进入 **Table Editor → profiles**
4. 找到刚创建的用户行，将 `role` 字段改为 `admin`

### 6.2 通过 SQL 快速设置

在 SQL Editor 中执行：

```sql
-- 将指定邮箱的用户设为管理员
UPDATE profiles
SET role = 'admin'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'your-email@example.com'
);

-- 验证
SELECT id, username, role, plan_status FROM profiles;
```

---

## 7. 配置 OAuth 社交登录（可选）

如果需要 H5 页面的 Google / Facebook / Apple 登录：

1. 进入 **Authentication → Providers**
2. 启用对应 Provider 并填入凭据：

| Provider | 获取凭据地址 | 回调 URL |
|----------|-------------|----------|
| Google | [console.cloud.google.com](https://console.cloud.google.com/apis/credentials) | `https://xxxxxxxx.supabase.co/auth/v1/callback` |
| Facebook | [developers.facebook.com](https://developers.facebook.com/apps/) | 同上 |
| Apple | [developer.apple.com](https://developer.apple.com/account/resources/identifiers/list/serviceId) | 同上 |

3. 在 **Authentication → URL Configuration** 中设置：
   - **Site URL**：`http://yourdomain.localhost:3000`（开发）或 `https://yourdomain.com`（生产）
   - **Redirect URLs**：添加上述回调 URL

### 7.1 邮箱登录设置

项目默认使用邮箱 + 密码登录。需要配置以下选项：

1. 进入 **Authentication → Providers → Email**
2. 确认 **Enable Email provider** 已开启
3. 进入 **Authentication → Email Templates**，可自定义：
   - **Confirm signup**：注册确认邮件模板
   - **Reset password**：密码重置邮件模板
4. 进入 **Authentication → Settings → Email Auth**：
   - **Confirm email**：开发测试阶段可先关闭（注册即激活），生产环境建议开启
   - **Secure password change** / **Secure email change**：按需开启

### 7.2 OAuth 回调端点

项目代码中的 OAuth 回调路径为 `/api/v1/auth/callback`，对应的 Supabase 回调 URL 格式：

```
https://your-project-id.supabase.co/auth/v1/callback
```

Supabase 完成 OAuth 认证后会重定向回你的站点，中间件自动处理 session cookie。

> **注意**：如果同时在生产和本地测试 OAuth，需要在 Supabase **Redirect URLs** 中添加多个地址（`http://localhost:3000` 和 `https://yourdomain.com`）。

---

## 8. 本地开发环境（可选：Supabase 本地实例）

如果需要完全离线开发（不依赖云端数据库），可以启动本地 Supabase：

```bash
# 初始化本地 Supabase 项目（仅首次）
supabase init

# 启动本地 Supabase 全套服务（PG + Auth + Storage + Studio）
supabase start

# 查看本地服务状态和凭据
# 会输出：
#   API URL:         http://127.0.0.1:54321
#   Studio URL:      http://127.0.0.1:54323
#   anon key:        eyJ...（本地测试用）
#   service_role key: eyJ...（本地测试用）

# 将输出的本地凭据填入 .env
# 然后 npm run dev 即可联调

# 停止本地服务
supabase stop

# 重置本地数据库（重新执行所有迁移）
supabase db reset
```

> 本地开发时 Supabase Studio 在 `http://127.0.0.1:54323` 提供完整的数据库管理界面。

---

## 9. 验证连接

切换 `.env` 后启动项目，逐步验证：

```bash
# 1. 启动项目
npm run dev

# 2. 打开浏览器访问
# http://localhost:3000
```

### 验证清单

| 检查项 | 操作 | 预期 |
|--------|------|------|
| 数据库连接 | 打开 `/tasks` 页面创建一条任务 | 任务持久化到 DB，刷新不丢失 |
| 管理员登录 | 打开 `/admin` 用 admin 账号登录 | 正常进入后台 |
| H5 营销页 | 访问 `http://ai.localhost:3000` | 页面正常渲染（campaigns 表有数据） |
| 用户注册 | H5 页面用邮箱注册 | profiles 表自动创建记录 |
| RLS 隔离 | 用两个不同用户登录 `/tasks` | 各自只能看到自己的任务 |
| 活动日志 | 后台执行一个写操作 | activity_logs 表有记录 |
| 种子数据 | 访问 H5 营销页，检查标题和颜色 | 显示真实数据库中的 campaign 配置 |

### 常见问题排查

```bash
# 如果 API 返回 500 或连接失败，检查：
# 1. .env 中的 MOCK_DB 是否为 false
# 2. SUPABASE_URL 是否正确（含 https://）
# 3. SUPABASE_SERVICE_ROLE_KEY 是否完整复制（无截断）
# 4. 数据库迁移是否已执行（Table Editor 中能看到表）
# 5. 种子数据是否已插入（campaigns 表有 3 条记录）

# 如果 RLS 报错 "permission denied"：
# → 确认 profiles 表中你的用户 role = 'admin'
# → 确认 RLS 已启用（Table Editor → 表 → RLS 状态为 Enabled）

# 如果 anon key 鉴权失败：
# → 确认 NUXT_PUBLIC_SUPABASE_ANON_KEY 是 anon key 而非 service_role

# 如果 H5 页面白屏或显示"活动不存在"：
# → campaigns 表为空，需要执行第 5 节的种子数据 SQL

# 如果多个 API 请求报连接数超限：
# → 参见第 10 节 Connection Pooler 配置
```

---

## 10. Connection Pooler（Serverless 必配）

Supabase 的直连模式每个连接占用一个 PostgreSQL 连接。**Vercel Serverless Functions 每次请求都可能创建新连接**，很容易打满 Supabase Free 计划的 10 个直连上限，导致 `FATAL: too many connections` 错误。

### 10.1 连接数限制

| Supabase 计划 | 直连上限 | Pooler 连接上限 |
|---------------|---------|----------------|
| Free | 10 | 200 |
| Pro | 60 | 1000 |
| Team | 100 | 1000 |

> 如果部署到 Vercel 后频繁出现 500 错误和 `too many connections`，就是连接数耗尽，必须启用 Pooler。

### 10.2 启用 Connection Pooler

1. 进入 Supabase Dashboard → **Settings → Database**
2. 找到 **Connection Pooler** 区域，点击 **Enable connection pooler**
3. 启用后会生成一个新的连接 URL（格式为 `postgresql://...@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`）
4. 复制这个 Pooler URL

### 10.3 配置方式

Connection Pooler 主要用于 Supabase Dashboard 的 SQL Editor 和外部工具连接。项目代码通过 `@supabase/supabase-js` SDK 走 HTTP API，不直接持有 PG 连接，因此 **代码无需修改**。

但如果你使用 `supabase db push` 等 CLI 命令操作远程数据库，建议在 `supabase/config.toml` 中配置 Pooler URL 以节省直连：

```toml
[db.pooler]
enabled = true
pool_mode = "transaction"
default_pool_size = 15
```

### 10.4 监控连接数

在 Supabase Dashboard → **Settings → Database → Connections** 可以实时查看当前连接数。如果直连数接近上限，说明需要开启 Pooler 或升级计划。

---

## 11. 配置 Supabase Storage（头像上传）

项目的 `profiles` 表有 `avatar_url` 字段，管理后台支持用户头像上传。需要创建 Storage Bucket。

### 11.1 创建 Bucket

1. 进入 Supabase Dashboard → **Storage → New Bucket**
2. 名称填 `avatars`
3. **Public bucket**：勾选（头像需要公开访问）
4. 点击 **Create bucket**

### 11.2 设置存储策略

进入 `avatars` Bucket → **Policies**，添加：

```sql
-- 允许认证用户上传自己的头像
CREATE POLICY "users_upload_own_avatar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 允许所有人读取头像（公开 bucket 自动生效）
-- 如未设为 public bucket，需手动添加：
CREATE POLICY "public_read_avatars" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'avatars');
```

> 上传时文件路径格式为 `{user_id}/avatar.png`，确保每个用户只能覆盖自己的头像。

---

## 12. 迁移同步问题排查

当 `supabase db push` 失败时，通常是因为本地迁移文件和远程数据库状态不一致。

### 9.1 查看同步状态

```bash
supabase migration list
```

输出示例：

```
  LOCAL  │ REMOTE  │ TIME (UTC)
  ───────┼─────────┼──────────────────
    ✓    │    ✓    │ 0001_init
    ✓    │         │ 0002_user_auth      ← 远程未应用
         │    ✓    │ 0003_monetization   ← 本地缺失
```

### 9.2 修复方法

| 场景 | 命令 |
|------|------|
| 远程有但本地没有 | `supabase db pull` 拉取远程 schema 生成本地迁移文件 |
| 本地有但远程未应用 | `supabase db push` 推送 |
| 远程已手动改过，标记为已应用 | `supabase migration repair --status applied <文件名前缀>` |
| 远程标记为已应用但实际未执行 | `supabase migration repair --status reverted <文件名前缀>` |

### 9.3 黄金法则

> **远程数据库一旦使用迁移管理后，禁止通过 SQL Editor 或 Table Editor 直接修改 schema。** 所有变更必须通过迁移文件 → `db push` 的标准流程，否则会导致 `db push` 报同步错误。

---

## 13. 新增迁移的标准流程

当需要新增表或修改 schema 时：

```bash
# 1. 创建新迁移文件
supabase migration new add_xxx_table

# 2. 在生成的文件中编写 SQL
# 文件路径: supabase/migrations/<timestamp>_add_xxx_table.sql

# 3. 本地验证（如果用本地 Supabase）
supabase db reset

# 4. 推送到远程
supabase db push

# 5. 生成最新类型定义
npm run gen:types

# 6. 提交到 git
git add supabase/migrations/
git commit -m "db: add xxx table"
```

### 迁移文件编写规范

```sql
-- 文件顶部注释说明用途
-- ====================================================================
-- Module: xxx — 简要描述
-- Tables: table_name
-- ====================================================================

-- 建表
CREATE TABLE IF NOT EXISTS "table_name" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- ... 字段定义 ...
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用 RLS（必须）
ALTER TABLE "table_name" ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略
CREATE POLICY "policy_name" ON "table_name"
  FOR SELECT USING (...);

-- 创建索引（可选，用于高频查询字段）
CREATE INDEX idx_table_column ON table_name(column);
```

---

## 14. 生成 TypeScript 类型定义

迁移完成后，生成最新的数据库类型供前端代码使用：

```bash
# 从远程数据库生成类型（项目已配置 npm script）
npm run gen:types

# 或手动执行（project-ref 同上，在 Dashboard → Settings → General 中获取）
npx supabase gen types typescript --project-id <your-project-ref> > database.types.ts
```

> 项目当前使用 `server/utils/db.ts` 中的手工类型定义。后续可迁移至自动生成的 `database.types.ts` 以获得完整的类型安全。
> 
> `npm run gen:types` 使用的是 `--local` 模式（从本地 Supabase 生成），如果要生成远程数据库的类型，使用手动命令加 `--project-id`。

---

## 15. 从生产环境回滚

如果迁移导致问题，可以在 Supabase Dashboard 中：

1. 进入 **Database → Backups** 查看自动备份
2. 使用 **Point-in-Time Recovery** 恢复到迁移前的时间点（Pro 计划以上）
3. 或通过 SQL Editor 手动执行回滚 SQL

```sql
-- 回滚示例：删除新增表和策略
DROP POLICY IF EXISTS "policy_name" ON "table_name";
DROP TABLE IF EXISTS "table_name" CASCADE;
```

---

## 16. 完整数据库 Schema 概览

```
┌─────────────────────────────────────────────────────────┐
│                    Supabase Auth                         │
│  auth.users (Supabase 内置)                             │
└────────────┬────────────────────────────────────────────┘
             │ handle_new_user() 触发器自动创建
             ▼
┌─────────────────────────────────────────────────────────┐
│ profiles                                                │
│ id (UUID, PK → auth.users)                              │
│ username, role (user/admin), plan_status                │
│ avatar_url, display_name, auth_provider, device_id      │
│ is_anonymous, email_verified, phone                     │
│ RLS: 自己可读 + 管理员全权限                             │
├─────────────────────────────────────────────────────────┤
│ campaigns                                               │
│ subdomain (UNIQUE), title, subtitle, badge              │
│ color_from, color_to                                    │
│ RLS: 公开读 + 管理员全权限                               │
├─────────────────────────────────────────────────────────┤
│ tasks                     │ products                    │
│ tenant_id (用户隔离)       │ tenant_id (用户隔离)        │
│ RLS: tenant_id = uid      │ RLS: tenant_id = uid       │
├─────────────────────────────────────────────────────────┤
│ orders                    │ ad_slots                    │
│ user_id, amount, status   │ position, ad_config (JSONB) │
│ RLS: 自己可读 + 管理员     │ RLS: 公开读 + 管理员全权限  │
├─────────────────────────────────────────────────────────┤
│ ad_events                 │ activity_logs               │
│ impression/click 追踪      │ 按日收入汇总               │
│ RLS: 公开写 + 管理员读     │ RLS: 管理员只读            │
├─────────────────────────────────────────────────────────┤
│ activity_logs             │ feedbacks                   │
│ 操作审计流水               │ 登录日志                   │
│ RLS: 管理员只读            │ RLS: 自己读 + 管理员读     │
├─────────────────────────────────────────────────────────┤
│ feedbacks                                               │
│ rating (1-5), comment, is_approved, admin_reply         │
│ RLS: 公开读(已审批) + 认证用户写 + 管理员全权限          │
└─────────────────────────────────────────────────────────┘
```

---

## 17. 快速参考命令

```bash
# ── 环境管理 ──
supabase login                    # 登录 CLI
supabase link                     # 关联远程项目
supabase status                   # 查看本地/远程项目状态

# ── 迁移操作 ──
supabase migration new <name>     # 创建新迁移文件
supabase migration up             # 本地应用迁移
supabase db push                  # 推送迁移到远程
supabase db pull                  # 从远程拉取 schema 差异
supabase db reset                 # 重置本地数据库
supabase db diff -f <name>        # 对比本地与远程差异

# ── 诊断修复 ──
supabase migration list           # 查看迁移同步状态
supabase migration repair <ts>    # 修复迁移历史记录

# ── 类型生成 ──
npm run gen:types                 # 生成 TypeScript 类型

# ── 本地开发 ──
supabase start                    # 启动本地 Supabase 全套服务
supabase stop                     # 停止本地服务
```
