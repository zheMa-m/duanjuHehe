# 移动端用户认证体系

> 支持 Email + Google + Facebook + Apple 四类登录 + 匿名用户浏览→后续绑定

---

## 1. 架构概览

```
H5 用户打开页面
    ↓ (匿名浏览)
匿名用户 cookie (device_id)
    ↓ (点击预约/支付)
弹出登录引导 Modal
    ├── Email 注册/登录 ──→ Supabase signUp / signInWithPassword
    ├── Google 登录 ──────→ Supabase OAuth (provider: google)
    ├── Facebook 登录 ────→ Supabase OAuth (provider: facebook)
    └── Apple 登录 ───────→ Supabase OAuth (provider: apple)
    ↓
access_token 写入 Cookie → server middleware 自动识别
    ↓
profiles 表自动创建 → orders 表 user_id 衔接
```

### 核心设计原则

- **客户端直连 Supabase Auth**：使用 `@supabase/supabase-js` SDK，不在服务端重复实现 OAuth 流程
- **Cookie + Bearer 双模式**：H5 走 Cookie，App 走 Bearer，server middleware 已支持两者
- **匿名→绑定无缝衔接**：匿名用户行为数据存 device_id，绑定后自动迁移到 user_id

---

## 2. 支持的登录方式

| 登录方式 | Provider | 实现机制 | 适用场景 |
|----------|----------|----------|----------|
| Email + Password | `email` | Supabase `signUp` / `signInWithPassword` | 通用注册登录 |
| Google | `google` | Supabase `signInWithOAuth` | 海外主流用户 |
| Facebook | `facebook` | Supabase `signInWithOAuth` | 东南亚/拉美用户 |
| Apple | `apple` | Supabase `signInWithOAuth` | iOS 用户（App Store 审核要求） |
| Anonymous | `anonymous` | Supabase `signInAnonymously` + device_id | 先浏览后登录 |

---

## 3. 数据库设计

### profiles 表字段 (0001_core.sql)

| 字段 | 类型 | 说明 |
|------|------|------|
| `email` | TEXT | 用户邮箱（从 auth.users 同步，方便业务查询） |
| `username` | TEXT | 用户名（最长 50 字符） |
| `avatar_url` | TEXT | 用户头像 URL |
| `display_name` | TEXT | 显示昵称 |
| `auth_provider` | TEXT | 登录来源：email/google/facebook/apple/anonymous |
| `provider_id` | TEXT | 三方平台原始 ID |
| `device_id` | TEXT | 设备指纹（匿名用户标识） |
| `is_anonymous` | BOOLEAN | 是否匿名用户 |
| `email_verified` | BOOLEAN | 邮箱是否已验证 |
| `phone` | TEXT | 手机号码 |
| `updated_at` | TIMESTAMPTZ | 最后更新时间（自动更新） |

### activity_logs 表（category = 'auth'）

登录日志已合并到统一活动日志表 `activity_logs`，认证类记录使用 `category = 'auth'`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | BIGINT | 自增主键 |
| `category` | TEXT | 值为 `'auth'` |
| `user_id` | UUID | 关联用户 |
| `action` | TEXT | 动作（login/register/link_account） |
| `ip` | TEXT | 登录 IP |
| `metadata` | JSONB | 扩展字段（provider/user_agent/device_id/success/error_msg） |

### 自动 Profile 创建触发器

`handle_new_user()` 函数在 `auth.users` INSERT 时自动触发，从 `raw_user_meta_data` 提取 username/display_name/provider 写入 profiles 表，同时将 `auth.users.email` 同步到 `profiles.email` 字段以便业务查询。OAuth 用户（google/facebook/apple）自动设置 `email_verified=TRUE`，邮箱注册用户设为 `FALSE`。

---

## 4. 服务端 API

| 路由 | 方法 | 功能 |
|------|------|------|
| `/api/v1/auth/register` | POST | 邮箱注册 + 自动创建 profile |
| `/api/v1/auth/login` | POST | 统一登录入口（邮箱/OAuth/匿名） |
| `/api/v1/auth/callback` | GET | OAuth 回调（code→token 交换） |
| `/api/v1/auth/me` | GET | 获取当前用户 profile |
| `/api/v1/auth/profile` | PATCH | 更新用户信息（昵称/头像/手机） |
| `/api/v1/auth/link` | POST | 匿名用户绑定邮箱 |
| `/api/v1/auth/logout` | POST | 登出 + 清理 Cookie |

### login.post.ts 三种模式

```ts
// 模式 1: 邮箱密码
POST /api/v1/auth/login  { email, password }

// 模式 2: OAuth 跳转
POST /api/v1/auth/login  { provider: 'google', redirect_to: '...' }

// 模式 3: 匿名登录
POST /api/v1/auth/login  { anonymous: true, device_id: 'dev-xxx' }
```

---

## 5. 客户端 Composable

`app/composables/auth.ts` 提供 `useAuth()` composable：

```ts
const {
  user,           // 当前用户信息 (readonly)
  session,        // 当前 session (readonly)
  isLoggedIn,     // 是否已登录（非匿名）
  isAnonymous,    // 是否匿名用户
  isAdmin,        // 是否管理员

  signUpWithEmail(email, password, username?),
  signInWithEmail(email, password),
  signInWithOAuth('google' | 'facebook' | 'apple'),
  signInAnonymously(),
  linkAnonymousToEmail(email, password),
  linkAnonymousToOAuth(provider),
  signOut(),
  refreshUser(),
  updateProfile({ display_name, avatar_url, phone }),
  initAuth(),     // 页面加载时从 Cookie 恢复
} = useAuth()
```

---

## 6. Token 生命周期管理

| Token 类型 | 有效期 | 存储位置 | 说明 |
|------------|--------|----------|------|
| Access Token | 1h | `sb-access-token` Cookie | 短期 JWT，server middleware 验证 |
| Refresh Token | 30d | `sb-refresh-token` Cookie | 自动续期 access_token |
| Device ID | 365d | `device-id` Cookie | 设备指纹，匿名用户标识 |

### Cookie 同步机制

`app/plugins/supabase-auth.client.ts` 插件监听 `onAuthStateChange`：

- `SIGNED_IN` / `TOKEN_REFRESHED` → 写入 Cookie（`SameSite=Strict; Secure` for HTTPS）
- `SIGNED_OUT` → 删除 Cookie

`app/composables/auth.ts` 中 `saveTokensToCookie()` 同样使用 `SameSite=Strict` 策略，最大化 CSRF 防护。

---

## 7. Server Middleware 身份解析

`02.auth.ts` 中间件 Token 来源优先级：

1. **Bearer header**（`Authorization: Bearer xxx`）
2. **Cookie**（`sb-access-token`）
3. **匿名**（`device-id` Cookie → role: `anonymous`）

---

## 8. 权限守卫

`04.auth-guard.ts` 中间件对以下路由强制要求登录：

| 路由前缀 | 要求 |
|----------|------|
| `/api/v1/payments/*` | 必须已登录（非匿名） |
| `/api/v1/orders/*` | 必须已登录 |
| `/api/v1/auth/profile` | 必须已登录 |
| `/api/v1/auth/me` | 必须已登录 |
| `/api/v1/ads/*` | 公开（匿名可访问） |
| `/api/v1/campaigns/*` | 公开 |

### 站点访问密码

`05.access-guard.ts` 中间件在所有鉴权之后执行。当 `SITE_ACCESS_PASSWORD` 配置时，对所有页面和 API 文档路径（`/_swagger`、`/_scalar`、`/_openapi`）进行密码保护。认证相关 API（`/api/v1/auth/*`）和 Stripe Webhook 回调始终放行。本地 `MOCK_DB=true` 模式自动跳过。

---

## 9. 匿名→绑定数据迁移策略

```
1. 匿名用户浏览 → 广告事件/行为数据关联 device_id
2. 触发绑定 → 调用 POST /api/v1/auth/link 绑定邮箱
3. 身份转换 → profiles.is_anonymous=false, auth_provider=email
4. 数据归属 → 新数据关联 user_id，历史数据可通过 device_id 回溯
```

---

## 10. H5 前端组件

| 组件 | 路径 | 功能 |
|------|------|------|
| H5UserBar | `app/components/h5/H5UserBar.vue` | 顶部状态栏（登录/游客/已登录） |
| H5LoginModal | `app/components/h5/H5LoginModal.vue` | 登录弹窗（邮箱表单 + 4社交按钮） |

### 多语言支持

H5 登录相关组件已全量接入 i18n，包括：
- H5UserBar：登录/游客/已登录三种状态文案
- H5LoginModal：标题、表单标签、placeholder、按钮文案、错误提示、模式切换文案

语言切换通过 `useI18n().setLocale()` 实现，用户偏好持久化在 `i18n_locale` Cookie 中。

### 使用模式

```vue
<!-- 用户状态栏 -->
<H5UserBar @login="showLogin = true" @register="showRegister = true" />

<!-- 登录弹窗 -->
<H5LoginModal :visible="showLogin" @close="showLogin = false" @success="onLogin" />
```

### 支付前置登录拦截

H5 页面点击支付按钮时，若未登录则弹出登录弹窗并缓存 `pendingAction`，登录成功后自动执行。

---

## 11. OAuth Provider 申请指南

在 Supabase Dashboard 配置 OAuth 前，需要先在对应平台注册应用获取 Client ID 和 Secret。

| Provider | 申请入口 | 关键步骤 |
|----------|----------|----------|
| Google | [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials) | 创建 OAuth 2.0 客户端 ID → 类型选 Web application → 回调填 Supabase URL |
| Facebook | [developers.facebook.com/apps](https://developers.facebook.com/apps/) | 创建应用 → 添加 Facebook Login 产品 → 获取 App ID 和 Secret |
| Apple | [developer.apple.com/account/resources/identifiers/list/serviceId](https://developer.apple.com/account/resources/identifiers/list/serviceId) | 创建 Services ID → 启用 Sign in with Apple → 配置回调域 |

所有 Provider 的回调 URL 统一为：

```
https://<your-project-id>.supabase.co/auth/v1/callback
```

> 开发测试阶段可先只配置 Google（最容易申请），其他两个按需添加。

---

## 12. 测试指引

### Mock 模式测试（无需真实账号）

`MOCK_DB=true` 时，所有认证操作走内存 Mock：

```bash
# 启动后直接访问，默认已登录为 admin
npm run dev
# 访问 http://localhost:3000/admin → 直接进入后台
```

### 真实数据库测试

```bash
# 1. 确认 MOCK_DB=false 且 Supabase 凭据已配置
# 2. 启动项目
npm run dev
# 3. 测试流程：
#    - 注册新邮箱账号 → 检查 profiles 表自动创建
#    - 登录 → 检查 Cookie 中 sb-access-token 已写入
#    - 访问 /api/v1/auth/me → 返回当前用户 profile
#    - 登出 → Cookie 已清理
```

### OAuth 测试

1. 在 Supabase Dashboard → Authentication → URL Configuration → Site URL 设为 `http://localhost:3000`
2. 在 H5 登录弹窗点击 Google 按钮
3. 完成 Google 授权后自动回调到站点，检查登录状态

---

## 13. 常见问题

### Q: 邮箱注册后用户无法登录

检查 Supabase Dashboard → Authentication → Settings → Email Auth：
- 如果 **Confirm email** 开启，用户注册后需点击确认邮件中的链接才能登录
- 测试阶段可关闭此选项，注册即激活

### Q: OAuth 回调报错 `Invalid redirect URL`

在 Supabase Dashboard → Authentication → URL Configuration → Redirect URLs 中添加当前域名：
- 本地开发：`http://localhost:3000`
- 生产环境：`https://yourdomain.com`

### Q: Token 过期后请求返回 401

正常情况下 `supabase-auth.client.ts` 插件会在 token 过期前自动用 refresh_token 续期。如果仍然 401：
1. 检查 Cookie 中 `sb-refresh-token` 是否存在
2. 检查 Supabase Dashboard → Authentication → Settings → JWT → JWT Expiry 是否过短（建议 3600s）
3. 强制用户重新登录

### Q: 匿名用户绑定邮箱后历史数据丢失

匿名用户的广告事件数据关联在 `device_id` 上。绑定后新用户数据关联 `user_id`。当前策略是新数据走 `user_id`，历史 `device_id` 数据可通过后台脚本批量迁移。

---

## 14. 相关文档

- 数据库设计 → [02-supabase-integration.md](./02-supabase-integration.md) 第 5 节（种子数据）、第 6 节（管理员创建）、第 7 节（profiles RLS 策略）
- 部署配置 → [03-vercel-deployment.md](./03-vercel-deployment.md) 第 5 节（域名 + OAuth 回调）
- 支付模块 → [06-payment-integration-optional.md](./06-payment-integration-optional.md)（登录状态是支付前置条件）
- 用户评价 → [08-social-feedback-optional.md](./08-social-feedback-optional.md)（评价提交依赖登录状态）
