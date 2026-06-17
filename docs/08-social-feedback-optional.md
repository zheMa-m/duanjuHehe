# 社交分享与用户反馈

> H5 营销页传播裂变 + 用户评价体系

---

## 1. 社交分享组件

纯前端实现，零后端依赖，支持 6 大主流社交平台一键分享。

### 支持平台

| 平台 | 实现方式 | 目标市场 |
|------|----------|----------|
| WhatsApp | `https://wa.me/?text=...` | 东南亚 / 拉美 |
| Facebook | FB Share SDK URL | 全球主流 |
| Twitter/X | `https://twitter.com/intent/tweet?text=...` | 科技圈 |
| Telegram | `https://t.me/share/url?url=...` | 加密社区 |
| 微信 | QR Code API (`api.qrserver.com`) | 国内市场 |
| 复制链接 | `navigator.clipboard.writeText()` | 通用兜底 |

### 组件路径

`app/components/shared/SocialShare.vue`

### 多语言支持

社交分享组件已接入 i18n，微信和复制链接的标签文案通过 `localizedLabels` computed 属性自动切换中英文。平台名称（WhatsApp/Facebook 等）保持英文不变。

### 使用方式

```vue
<!-- Icons 模式（默认） -->
<SocialShare
  title="HEHE AI 协作者首发"
  description="限时预约，锁定首月免费体验"
  :subdomain="subdomain"
  size="sm"
/>

<!-- Buttons 模式 -->
<SocialShare
  title="活动标题"
  variant="buttons"
  :platforms="['whatsapp', 'facebook', 'copy']"
/>
```

### Props

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `title` | string | 当前页面 title | 分享标题 |
| `description` | string | '' | 分享描述 |
| `url` | string | 当前页面 URL | 分享链接 |
| `image` | string | '' | 分享缩略图 |
| `subdomain` | string | '' | 活动子域名（事件追踪） |
| `platforms` | array | 全部 6 个 | 显示的平台列表 |
| `variant` | `'icons'` \| `'buttons'` | `'icons'` | 展示风格 |
| `size` | `'sm'` \| `'md'` | `'md'` | 图标尺寸 |

### 放置位置建议

- 预约/注册成功后（电子票券下方）
- 支付确认页
- 活动页底部

---

## 2. 用户反馈/评价系统

前后端完整实现，支持星级评分 + 文字评论 + 管理员回复。

### 数据库表 (feedbacks)

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID | 主键 |
| `user_id` | UUID | 关联用户 |
| `campaign_subdomain` | TEXT | 所属活动 |
| `type` | TEXT | review / bug / feature / general |
| `rating` | INTEGER (1-5) | 星级评分（review 类型必填） |
| `comment` | TEXT | 文字评论 |
| `display_name` | TEXT | 显示昵称 |
| `is_approved` | BOOLEAN | 是否已审批（默认 FALSE，需管理员审核） |
| `admin_reply` | TEXT | 管理员回复 |
| `updated_at` | TIMESTAMPTZ | 最后更新时间（自动更新） |

### RLS 策略

| 策略 | 说明 |
|------|------|
| `feedbacks_public_select` | 所有人可读取已审批评价 |
| `feedbacks_auth_insert` | 认证用户可写入（user_id = auth.uid） |
| `feedbacks_admin_all` | 管理员全权限（含回复/审批/删除） |

### 服务端 API

| 路由 | 方法 | 权限 | 功能 |
|------|------|------|------|
| `/api/v1/feedback` | GET | 公开 | 获取评价列表 + 统计 |
| `/api/v1/feedback` | POST | 需登录 | 提交评价 |

#### GET 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `subdomain` | string? | 按活动子域过滤 |
| `type` | `review` \| `bug` \| `feature` \| `general` | 评价类型 |
| `limit` | number (1-100) | 返回条数，默认 20 |

响应示例：
```json
{
  "success": true,
  "data": {
    "feedbacks": [...],
    "stats": {
      "total": 4,
      "averageRating": 4.0,
      "ratingDistribution": { "5": 2, "4": 1, "3": 0, "2": 1, "1": 0 }
    }
  }
}
```

#### POST Body

```json
{
  "campaignSubdomain": "promo",
  "type": "review",
  "rating": 5,
  "comment": "产品体验非常流畅！"
}
```

### 前端组件

`app/components/h5/H5ReviewSection.vue`

```vue
<H5ReviewSection
  :subdomain="subdomain"
  @login-required="showLoginModal = true"
/>
```

功能：
- 星级评分分布条形图
- 评价列表（昵称 + 星级 + 评论 + 时间）
- 管理员回复展示
- 写评价表单（需登录）
- 未登录时 emit `login-required` 事件引导登录
- 全量 i18n：标题、统计文案、时间显示、表单文案均支持中英文切换

### 权限设计

- **读取评价**：公开接口，匿名用户/未登录用户均可查看
- **提交评价**：需已登录（非匿名），未登录时弹出登录引导
- **审批/回复**：仅管理员，通过 Admin 后台操作

### Admin 管理审批流程

管理员在后台对评价进行审批和回复：

```
管理员登录后台 → 进入“用户评价”面板
    ↓
查看所有评价列表（包含未审批的）
    ↓
┌────────────────────────────────────┐
│  操作选项                            │
│  ├── 审批：is_approved = true        │
│  ├── 回复：填写 admin_reply         │
│  └── 删除：删除不当评价              │
└────────────────────────────────────┘
```

> 当前 Admin API 中评价管理接口待实现（`/api/admin/feedback` CRUD）。临时方案：通过 Supabase Dashboard → Table Editor → feedbacks 表直接操作 `is_approved` 和 `admin_reply` 字段。

### 评价提交限流

当前未设置服务端限流。建议在正式上线前添加以下防护：

1. **前端防护**：提交按钮点击后立即 `disabled`，防止重复提交
2. **服务端防护**（待实现）：基于 `user_id` + `campaign_subdomain` 限制每用户每天最多提交 N 条评价
3. **RLS 策略**：当前已通过 `feedbacks_auth_insert` 策略限制只有认证用户才能写入

---

## 3. 数据流全链路

```
H5 页面加载
    ↓
GET /api/v1/feedback?subdomain=xxx   ← 加载评价列表（公开）
    ↓
展示评分分布 + 评价列表
    ↓
用户点击"写评价"
    ↓
未登录 → 弹出登录弹窗（login-required 事件）
已登录 → 显示评分 + 评论表单
    ↓
POST /api/v1/feedback   ← 提交评价（需登录）
    ↓
写入 feedbacks 表 + 记录审计日志
    ↓
自动刷新评价列表
```

---

## 4. 与现有模块的集成

| 集成点 | 说明 |
|--------|------|
| 认证体系 | 评价提交依赖 `useAuth()` 登录状态 |
| 广告系统 | 评价区位于广告位上方，形成“内容+广告”组合 |
| 支付流程 | 预约成功页底部展示社交分享，推动二次传播 |
| Admin 管理 | 管理员可在后台审批/回复/删除评价 |

---

## 5. 常见问题

### Q: 社交分享链接打开后显示空白

分享链接使用 `window.location.href` 作为默认 URL。在 H5 页面中，确保 `subdomain` prop 已传入，组件会自动拼接正确的子域名 URL。如果分享链接在微信中打开白屏，可能是微信拦截了外部链接，需要在微信开放平台配置域名白名单。

### Q: 提交评价后看不到自己的评论

GET `/api/v1/feedback` 默认只返回 `is_approved = true` 的评价。新提交的评价默认 `is_approved = false`（需管理员审核后才公开显示）。如果已审核通过但仍看不到：
1. 检查 `feedbacks` 表是否有记录
2. 检查 `is_approved` 字段是否为 true
3. 检查查询的 `subdomain` 参数是否匹配

### Q: 未登录用户点击“写评价”无反应

组件会 emit `login-required` 事件。确保父组件已监听：
```vue
<H5ReviewSection :subdomain="subdomain" @login-required="showLoginModal = true" />
```

### Q: 评分分布显示不正确

统计由服务端计算，检查 GET 响应中的 `stats.ratingDistribution` 是否正确。如果分布与实际不符，可能是查询参数 `subdomain` 或 `type` 未正确过滤。

---

## 6. 相关文档

- 认证体系 → [05-user-auth.md](./05-user-auth.md)（评价提交依赖登录状态，未登录触发登录弹窗）
- 数据库配置 → [02-supabase-integration.md](./02-supabase-integration.md) 第 4 节（feedbacks 表迁移）
- 广告模块 → [07-ad-monetization-optional.md](./07-ad-monetization-optional.md)（评价区与广告位布局关系）
- 部署配置 → [03-vercel-deployment.md](./03-vercel-deployment.md)（社交分享链接依赖正确的域名配置）
