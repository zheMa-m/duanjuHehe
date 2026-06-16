# 三方支付集成

> Stripe Checkout 支付流程 — 面向海外全球业务的支付网关

---

## 1. 架构概览

```
用户点击"支付"按钮
    ↓
POST /api/v1/payments/create  (创建订单 + Checkout Session)
    ↓
Stripe 托管支付页面 (checkout.stripe.com)
    ↓
用户完成支付
    ↓
┌──────────────────────────────────────────┐
│  双通道回调                                │
│  ├── GET /api/v1/payments/confirm        │  (前端 success_url 跳转)
│  └── POST /api/v1/payments/webhook       │  (Stripe 服务端异步通知)
└──────────────────────────────────────────┘
    ↓
更新 orders 表 status → paid
    ↓
审计日志记录
```

---

## 2. 双模式运行

| 模式 | 条件 | 行为 |
|------|------|------|
| **Mock** | `MOCK_DB=true` | 返回模拟 Checkout Session，无需 Stripe SDK |
| **真实** | `MOCK_DB=false` | 动态加载 Stripe SDK，调用真实 API |

Stripe SDK 仅在 `MOCK_DB=false` 时通过 `require('stripe')` 动态加载，避免开发环境依赖。

---

## 3. 环境变量

```env
# Stripe 服务端密钥（严禁 NUXT_PUBLIC_ 前缀）
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Stripe 前端公开密钥（安全暴露给浏览器）
STRIPE_PUBLIC_KEY=pk_test_xxx
```

> **安全原则**：`STRIPE_SECRET_KEY` 和 `STRIPE_WEBHOOK_SECRET` 只能出现在服务端代码中。

---

## 4. 数据库表 — ⚠️ 可选模块（0005_payment_optional.sql）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID | 主键 |
| `order_no` | TEXT (UNIQUE) | 订单号：`ORD-{timestamp}-{random}` |
| `product_id` | TEXT | 商品 ID |
| `product_name` | TEXT | 商品名称 |
| `amount` | NUMERIC(10,2) | 金额（数据库 + 服务端双重 NUMERIC 保障） |
| `currency` | TEXT | 币种：USD / EUR / ... |
| `status` | TEXT | pending → paid / failed / refunded |
| `user_id` | UUID | 关联用户（RLS 隔离） |
| `payment_provider` | TEXT | stripe / paypal / manual |
| `payment_intent_id` | TEXT | Stripe Payment Intent ID |

### RLS 策略

- `orders_user_select_own`：用户只能查看自己的订单
- `orders_user_insert_own`：认证用户可创建自己的订单（user_id = auth.uid）
- `orders_admin_all`：管理员全权限

---

## 5. 服务端 API

### 5.1 创建支付

`POST /api/v1/payments/create`

请求体：
```json
{
  "productId": "p1",
  "productName": "HEHE Pro 工具套件",
  "amount": 29.99,
  "currency": "USD"
}
```

处理流程：
1. 创建 orders 记录（status: pending）
2. 调用 `createCheckoutSession()` 创建 Stripe Session
3. 更新 orders 的 `payment_intent_id`
4. 记录审计日志
5. 返回 `checkoutUrl` 供前端跳转

### 5.2 支付确认

`GET /api/v1/payments/confirm?session_id=cs_xxx`

前端 `success_url` 跳转后的确认页面，查询订单状态并展示结果。

### 5.3 Webhook 接收

`POST /api/v1/payments/webhook`

**安全验证**：必须验证 `stripe-signature` 请求头签名。

处理的事件类型：
- `checkout.session.completed` → 更新订单为 paid
- `charge.refunded` → 更新订单为 refunded

**Auth 中间件白名单**：`02.auth.ts` 跳过此端点的 JWT 验证（使用 Stripe 签名替代）。

### 5.4 查询订单

`GET /api/v1/payments/[id]` — 查询单笔订单
`GET /api/v1/orders` — 用户订单列表（RLS 隔离）

---

## 6. 工具层 (server/utils/payments.ts)

| 函数 | 功能 |
|------|------|
| `getStripeClient()` | 初始化 Stripe Client（单例） |
| `generateOrderNo()` | 生成唯一订单号 `ORD-{ts}-{rand}` |
| `createCheckoutSession(params)` | 创建 Stripe Checkout Session |
| `verifyWebhookSignature(body, sig)` | 验证 Webhook 签名 |
| `formatCurrency(amount, currency)` | 多币种金额格式化 |

### Checkout Session 创建关键参数

```ts
stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  line_items: [{
    price_data: {
      currency: 'usd',
      product_data: { name: productName },
      unit_amount: Math.round(amount * 100),  // 最小单位（cents）
    },
    quantity: 1,
  }],
  mode: 'payment',
  success_url: '...',
  cancel_url: '...',
  metadata: { orderId },
})
```

---

## 7. 客户端 Composable

`app/composables/payments.ts` 提供 `usePayment()` composable：

```ts
const {
  createAndRedirect(params),  // 创建订单并跳转 Stripe
  checkOrderStatus(orderId),  // 查询订单状态
  pollOrderStatus(orderId),   // 轮询订单状态（用于 Webhook 异步确认）
} = usePayment()
```

### 使用示例

```vue
<button @click="handlePurchase">
  💳 Purchase VIP — $29.99
</button>

<script setup>
const { createAndRedirect } = usePayment()

const handlePurchase = async () => {
  await createAndRedirect({
    productId: 'p1',
    productName: 'HEHE VIP',
    amount: 29.99,
    currency: 'USD',
  })
}
</script>
```

---

## 8. Admin 管理端 API

| 路由 | 方法 | 功能 |
|------|------|------|
| `/api/admin/orders` | GET | 管理员查看所有订单 |
| `/api/admin/orders/[id]` | PATCH | 管理员更新订单状态 |
| `/api/admin/revenue` | GET | 收入分析数据 |

---

## 9. 金额安全

- **数据库层**：`amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0)`
- **服务端层**：`Math.round(amount * 100)` 转换为最小单位（cents）
- **严禁浮点数**：数据库 + 服务端双重保障，不使用 JavaScript 浮点运算处理金额

---

## 10. 审计日志

所有支付操作强制记录审计日志：

- 创建订单 → `ORDER_CREATED`
- Webhook 回调成功 → `PAYMENT_CONFIRMED`
- Webhook 退款 → `PAYMENT_REFUNDED`
- 管理员更新订单 → `ORDER_STATUS_UPDATED`

---

## 11. Stripe 账号注册与配置

### 11.1 创建 Stripe 账号

1. 打开 [dashboard.stripe.com/register](https://dashboard.stripe.com/register)
2. 填写邮箱、密码，完成注册
3. 默认进入 **Test mode**（测试模式），所有交易不会真实扣款

### 11.2 获取 API 密钥

进入 **Developers → API Keys**：

| 密钥 | 用途 | 填入 .env |
|------|------|----------|
| Publishable key (`pk_test_...`) | 前端公钥，浏览器端使用 | `STRIPE_PUBLIC_KEY` |
| Secret key (`sk_test_...`) | 服务端密钥，创建 Checkout Session | `STRIPE_SECRET_KEY` |

> 严禁将 Secret key 暴露到前端代码中。

### 11.3 配置 Webhook

进入 **Developers → Webhooks → Add Endpoint**：

- **Endpoint URL**：`https://yourdomain.com/api/v1/payments/webhook`（生产）或 `http://localhost:3000/api/v1/payments/webhook`（本地用 Stripe CLI 转发）
- **Events**：勾选 `checkout.session.completed`、`charge.refunded`
- 创建后复制 **Signing Secret** (`whsec_...`) 填入 .env 的 `STRIPE_WEBHOOK_SECRET`

### 11.4 测试卡号

Stripe 提供了一系列测试卡号，用于模拟不同支付结果：

| 卡号 | 结果 |
|------|------|
| `4242 4242 4242 4242` | 支付成功 |
| `4000 0000 0000 9995` | 余额不足 |
| `4000 0000 0000 0002` | 卡被拒绝 |
| `4000 002760 003184` | 需要 3D 验证 |

所有测试卡使用任意未来日期、任意 CVC、任意邮编。

---

## 12. 测试验证清单

| 检查项 | 操作 | 预期 |
|--------|------|------|
| Mock 模式支付 | `MOCK_DB=true`，点击支付按钮 | 跳转模拟 Checkout 页面，返回后订单状态更新 |
| 真实 Checkout | `MOCK_DB=false`，点击支付按钮 | 跳转 Stripe 托管支付页面 |
| 支付成功 | 用测试卡 `4242...` 完成支付 | success_url 回调，订单状态变为 `paid` |
| Webhook 接收 | 支付成功后检查 orders 表 | 订单状态已更新（异步确认） |
| 支付失败 | 用测试卡 `4000...0002` | cancel_url 回调，订单状态保持 `pending` |
| 订单查询 | 访问 `/api/v1/orders` | 返回当前用户的订单列表 |
| 管理后台 | Admin 访问订单管理 | 能看到所有用户订单 |

---

## 13. 常见问题

### Q: 点击支付后报 500 错误

检查以下配置：
1. `STRIPE_SECRET_KEY` 是否正确填写（以 `sk_test_` 开头）
2. `MOCK_DB` 是否为 `false`（Mock 模式不需要真实 key）
3. Stripe SDK 是否已安装：`npm ls stripe`

### Q: 支付成功但订单状态仍是 pending

Webhook 未正确接收：
1. 检查 Stripe Dashboard → Developers → Webhooks → 查看事件是否发送成功
2. 确认 `STRIPE_WEBHOOK_SECRET` 是否正确（以 `whsec_` 开头）
3. 本地开发时使用 Stripe CLI 转发：`stripe listen --forward-to http://localhost:3000/api/v1/payments/webhook`

### Q: Webhook 签名验证失败

常见原因：
- `STRIPE_WEBHOOK_SECRET` 复制不完整
- 请求体被中间件提前解析（Stripe 需要原始 body 来验证签名）
- 生产环境确认 Vercel 的 Serverless Function 未对 body 做预处理

### Q: 金额显示不正确

Stripe API 要求金额使用最小单位（分），代码中用 `Math.round(amount * 100)` 转换。确认传入的金额是 `number` 类型而非字符串。

---

## 14. 相关文档

- 认证体系 → [05-user-auth.md](./05-user-auth.md)（支付前需要登录状态）
- 数据库配置 → [02-supabase-integration.md](./02-supabase-integration.md) 第 5.2 节（商品种子数据）
- 部署配置 → [03-vercel-deployment.md](./03-vercel-deployment.md) 第 9 节（Stripe Webhook 生产配置）
- 广告变现 → [07-ad-monetization-optional.md](./07-ad-monetization-optional.md)（收入分析面板汇总支付 + 广告收入）
