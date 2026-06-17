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
   - **Database Password**：强密码（记录下来，后续要用） 
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

| 顺序 | 文件 | 内容 | 类型 |
|------|------|------|------|
| 1 | `supabase/migrations/0001_core.sql` | profiles, tasks, activity_logs + `is_admin()` 函数 + 触发器函数 | 必选 |
| 2 | `supabase/migrations/0002_campaign_optional.sql` | campaigns（营销模块） | ⚠️ 可选 |
| 3 | `supabase/migrations/0003_ad_optional.sql` | ad_slots, ad_events | ⚠️ 可选 |
| 4 | `supabase/migrations/0004_feedback_optional.sql` | feedbacks 评价表 | ⚠️ 可选 |
| 5 | `supabase/migrations/0005_payment_optional.sql` | products, orders（支付模块） | ⚠️ 可选 |

3. 每次执行一个文件，确认无报错后再执行下一个
4. 执行完成后进入 **Table Editor**，确认所有表已创建：

```
profiles         ← 用户档案（含 admin 角色, OAuth email_verified 区分）
campaigns        ← 营销活动配置（⚠️ 可选，含 is_active/cta/cover_image/features）
tasks            ← 业务任务（CRUD 示例 + tenant_id 行级隔离）
activity_logs    ← 统一活动日志（auth/admin/system）
products         ← 商品（⚠️ 可选，tenant_id 行级隔离）
orders            ← 支付订单（⚠️ 可选，含 orders_user_insert_own INSERT 策略）
ad_slots         ← 广告位配置（⚠️ 可选）
ad_events        ← 广告事件（⚠️ 可选）
feedbacks        ← 用户评价（⚠️ 可选）
storage.buckets  ← Supabase Storage Bucket（avatars + campaign-assets + uploads，内置于 0001_core）
```

### 4.2 方式二：Supabase CLI 自动推送（推荐）

适用于已关联远程项目的标准流程。

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
INSERT INTO campaigns (subdomain, title, subtitle, badge, color_from, color_to, is_active, cta_text, description, features) VALUES
('ai', '🤖 HEHE AI 协作者首发', '基于先进智能体的全自动化提效工作流上线。立即预约，锁定首月免费体验资格。', '限时 10,000 名', 'from-purple-600', 'to-indigo-600', true, '立即预约', '基于先进智能体的全自动化提效工作流', '[{"icon":"⚡","text":"一键生成"},{"icon":"🔒","text":"安全沙盒"},{"icon":"🌐","text":"全球分发"}]'::jsonb),
('cloud', '☁️ HEHE 云原生企业私有化', '一键输出物理隔离安全沙盒，专为合规与核心系统容灾设计。首发限时 7 折特惠。', '企业专属首发', 'from-blue-600', 'to-cyan-600', true, '立即预约', '专为合规与核心系统容灾设计', '[{"icon":"🛡️","text":"物理隔离"},{"icon":"📊","text":"实时监控"},{"icon":"🔄","text":"自动容灾"}]'::jsonb),
('promo', '🚀 HEHE 全栈单仓极速版', '仅需单人即可撬动完整的全球边缘分发与 Supabase 强类型契约防御。', '开发者特惠季', 'from-rose-600', 'to-orange-600', true, '立即预约', '单人全栈闭环交付', '[{"icon":"🧑‍💻","text":"单人交付"},{"icon":"💰","text":"降本提效"},{"icon":"🚀","text":"极速上线"}]'::jsonb);
```

### 5.2 商品数据（⚠️ 可选，支付功能需要）

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
   - **Site URL**：本地开发填 `http://localhost:3000`，生产填 `https://yourdomain.com`
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

> **注意**：如果同时在生产和本地测试 OAuth，需要在 Supabase **Redirect URLs** 中添加多个地址：
> - `http://localhost:3000/api/v1/auth/callback`（本地开发）
> - `https://yourdomain.com/api/v1/auth/callback`（生产环境）

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
| 数据库连接 | 管理员登录 `/admin` 后在任务管理中创建任务 | 任务持久化到 DB，刷新不丢失 |
| 管理员登录 | 打开 `/admin` 用 admin 账号登录 | 正常进入后台 |
| H5 营销页 | 访问 `/h5/promo` 页面 | 页面正常渲染（campaigns 表有数据） |
| 帮助文档 | 访问 `/help` 页面 | 正常显示帮助文档中心 |
| 用户注册 | H5 页面用邮箱注册 | profiles 表自动创建记录 |
| RLS 隔离 | Admin 后台查看任务列表 | 按 tenant_id 隔离，各自只能看到自己的任务 |
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

## 11. 配置 Supabase Storage（文件上传）

项目内置 Supabase Storage 支持，提供三个 Bucket 覆盖全部业务场景。Storage 功能已集成在 `0001_core.sql` 迁移中，执行核心迁移后 Bucket 及 RLS 策略自动创建。

### 11.1 Bucket 清单

| Bucket | 可见性 | 大小限制 | 允许类型 | 写入权限 |
|--------|--------|----------|----------|----------|
| `avatars` | 公开 | 2 MB | `image/png`, `image/jpeg`, `image/gif`, `image/webp` | 认证用户写自己目录 |
| `campaign-assets` | 公开 | 10 MB | `image/png`, `image/jpeg`, `image/gif`, `image/webp`, `video/mp4` | 仅管理员 |
| `uploads` | 私有 | 50 MB | 不限制 | 认证用户写自己目录 |

> **注意**：`allowed_mime_types` 必须使用 PostgreSQL `ARRAY['image/png', ...]` 语法，不支持通配符（如 `'image/*'`）。详见 0006 迁移文件。

### 11.2 路径规范与 RLS 隔离

所有文件路径遵循 `{user_id}/{timestamp}_{filename}` 格式。RLS 策略通过 `(storage.foldername(name))[1] = auth.uid()::text` 校验路径首段与用户 uid 一致，实现行级隔离：

- **avatars**：认证用户可上传/更新/删除自己目录下的文件，所有人可公开读取，管理员全权限
- **campaign-assets**：仅管理员可写入/更新/删除，所有人可公开读取
- **uploads**：认证用户仅可读写自己目录下的文件，管理员全权限

### 11.3 混合上传策略

项目采用混合上传模式，兼顾安全与性能：

| 文件大小 | 模式 | 流程 |
|----------|------|------|
| < 5 MB | 服务端中转 | 客户端 → `POST /api/v1/storage/upload` → Nitro 用 service_role 写入 Storage |
| >= 5 MB | 客户端直传 | 客户端 → `POST /api/v1/storage/signed-url` 获取签名 → 直传 Supabase Storage |

### 11.4 API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/storage/upload` | 服务端中转上传（小文件） |
| POST | `/api/v1/storage/signed-url` | 生成直传签名 URL（大文件） |
| DELETE | `/api/v1/storage/{bucket}/{user_id}/{filename}` | 删除文件 |
| GET | `/api/v1/storage/signed-url/{bucket}/{user_id}/{filename}` | 获取私有文件临时访问 URL |

所有端点均需认证（`@api-auth: user`），由 `04.auth-guard.ts` 中间件统一拦截。

### 11.5 客户端 Composable

前端使用 `useStorage()` composable 进行文件操作，自动选择上传模式：

```typescript
const { upload, remove, getSignedUrl, getPublicUrl } = useStorage()

// 上传文件（自动判断大小，选择中转或直传）
const result = await upload(file, 'avatars')
console.log(result.path, result.publicUrl)

// 删除文件
await remove('avatars', 'user-id/1234_photo.png')

// 获取私有文件临时访问链接
const url = await getSignedUrl('uploads', 'user-id/5678_doc.pdf')

// 获取公开文件 URL（无需 API 请求）
const publicUrl = getPublicUrl('avatars', 'user-id/1234_photo.png')
```

### 11.6 Storage RLS 安全加固（0001_core 内置）

Supabase 对 public bucket 默认创建的 DELETE 策略过于宽松（anon 用户可删除任意文件）。`0001_core.sql` 中的 4d 节添加了 3 条 RESTRICTIVE 策略进行加固：

| 策略 | 类型 | 作用 |
|------|------|------|
| `storage_scope_restrict` | RESTRICTIVE | 限制所有操作只能在 3 个业务 bucket 范围内（FOR ALL 同时声明 USING + WITH CHECK） |
| `campaign_assets_restrict_delete` | RESTRICTIVE | campaign-assets bucket 禁止非管理员删除 |
| `uploads_restrict_anon` | RESTRICTIVE | anon 用户完全禁止访问 uploads bucket（USING + WITH CHECK） |

> **注意**：RESTRICTIVE 策略的 `FOR ALL` 必须同时声明 `USING` 和 `WITH CHECK`，因为 PostgreSQL 对 `INSERT` 操作只看 `WITH CHECK`。另外，permissive 策略中 auth.uid() 使用 `(SELECT auth.uid())` 子查询形式，避免每行重复调用函数，提升性能。

> **注意**：RESTRICTIVE 策略与 PERMISSIVE 策略是 AND 逻辑。Supabase Storage API 的 `remove()` 在 RLS 阻止删除时返回 `error=null, data=[]`（假成功），但文件实际未被删除。验证删除是否成功需检查文件是否仍存在。详见 `0001_core.sql` 中的 4d 节。

### 11.7 手动创建 Bucket（备选方案）

如果不使用迁移文件，也可以在 Supabase Dashboard 手动创建：

1. 进入 **Storage → New Bucket**
2. 分别创建 `avatars`（Public）、`campaign-assets`（Public）、`uploads`（Private）
3. 在各 Bucket 的 **Policies** 页面，参照 `0001_core.sql` 中第 4 节的 RLS 策略手动添加

> 推荐使用迁移文件方式，确保本地与远程环境一致。

---

## 12. 迁移同步问题排查

当 `supabase db push` 失败时，通常是因为本地迁移文件和远程数据库状态不一致。

### 12.1 查看同步状态

```bash
supabase migration list
```

输出示例：

```
  LOCAL  │ REMOTE  │ TIME (UTC)
  ───────┼─────────┼──────────────────
    ✓    │    ✓    │ 0001_core
    ✓    │         │ 0002_campaign_optional  ← 远程未应用
         │    ✓    │ 0003_ad_optional         ← 本地缺失
```

### 12.2 修复方法

| 场景 | 命令 |
|------|------|
| 远程有但本地没有 | `supabase db pull` 拉取远程 schema 生成本地迁移文件 |
| 本地有但远程未应用 | `supabase db push` 推送 |
| 远程已手动改过，标记为已应用 | `supabase migration repair --status applied <文件名前缀>` |
| 远程标记为已应用但实际未执行 | `supabase migration repair --status reverted <文件名前缀>` |

### 12.3 黄金法则

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

-- 启用 RLS + FORCE（必须）
ALTER TABLE "table_name" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "table_name" FORCE ROW LEVEL SECURITY;

-- 创建 RLS 策略
-- 管理员全权限策略必须使用 is_admin() 函数，禁止 inline EXISTS 子查询（避免无限递归）
CREATE POLICY "policy_name_admin" ON "table_name"
  FOR ALL TO authenticated USING ("is_admin"(auth.uid()));
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
             │ （区分 OAuth email_verified=TRUE）
             ▼
┌─────────────────────────────────────────────────────────┐
│ profiles                                                │
│ id (UUID, PK → auth.users)                              │
│ username, role (user/admin), plan_status                │
│ avatar_url, display_name, auth_provider, device_id      │
│ is_anonymous, email_verified, phone                     │
│ RLS: 自己可读 + 管理员全权限(is_admin())                │
├─────────────────────────────────────────────────────────┤
│ campaigns ⚠️ 可选                                          │
│ subdomain (UNIQUE), title, subtitle, badge              │
│ is_active, cta_text, cta_url, cover_image               │
│ description, features (JSONB), sort_order               │
│ color_from, color_to                                    │
│ RLS: 公开读(is_active=true) + 管理员全权限(is_admin()) │
├─────────────────────────────────────────────────────────┤
│ tasks                     │ activity_logs               │
│ CRUD 示例 + tenant_id 隔离 │ 操作审计流水               │
│ RLS: tenant_id = uid      │ RLS: 管理员只读            │
├─────────────────────────────────────────────────────────┤
│ orders ⚠️ 可选              │ ad_slots ⚠️ 可选            │
│ user_id, amount, status   │ position, ad_config (JSONB) │
│ RLS: 自己读+写 + 管理员   │ RLS: 公开读 + 管理员全权限  │
├─────────────────────────────────────────────────────────┤
│ products ⚠️ 可选            │ ad_events ⚠️ 可选          │
│ tenant_id 行级隔离          │ impression/click 追踪      │
│ RLS: tenant_id = uid       │ RLS: 公开写 + 管理员读     │
├─────────────────────────────────────────────────────────┤
│ feedbacks ⚠️ 可选                                       │
│ rating (1-5), comment, is_approved, admin_reply         │
│ RLS: 公开读(已审批) + 认证用户写 + 管理员全权限          │
├─────────────────────────────────────────────────────────┤
│ Storage Buckets（内置于 0001_core）                        │
│ avatars (public, 2MB, image/png+jpeg+gif+webp)          │
│ campaign-assets (public, 10MB, image+video, 管理员写) │
│ uploads (private, 50MB, 不限类型, uid 路径隔离)         │
│ RLS: foldername[1]=uid 隔离 + is_admin() 管理员全权限   │
│ RESTRICTIVE 策略防 anon 写入/删除公共 bucket            │
├─────────────────────────────────────────────────────────┤
│ is_admin(uuid) SECURITY DEFINER STABLE 函数              │
│ 以表 owner 身份执行，绕过 RLS，打破策略无限递归链       │
│ 必须在 profiles 表创建后、RLS 策略创建前定义             │
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

# ── 脚本工具 ──
npm run test:api-safety          # API 越权安全扫描
npm run test:supabase             # 数据库连接健康检查
npm run test:storage              # Storage 全链路集成测试
npm run gen:crud <resource>       # 生成 CRUD API 控制器组
npm run gen:rls <table> --admin   # 生成 RLS 策略 SQL（含管理员）
npm run scaffold <name>           # 生成 API + 前端页面脚手架

# ── 本地开发 ──
supabase start                    # 启动本地 Supabase 全套服务
supabase stop                     # 停止本地服务
```
