# 广告流量变现集成（可选）

> 统一广告位管理系统 — 支持多平台广告供应商的流量变现
>
> ⚠️ **本模块为可选功能**，项目核心业务不依赖广告模块，可按需开启或完全移除。

---

## 1. 架构概览

```
管理员后台创建广告位 (ad_slots 表)
    ↓
H5 页面加载
    ↓
ClientAdSlot 组件挂载 → GET /api/v1/ads?position=xxx
    ↓
渲染广告内容（AdSense / Meta / Custom HTML）
    ↓
┌──────────────────────────────────┐
│  事件追踪                         │
│  ├── 曝光 → POST impression      │
│  └── 点击 → POST click           │
└──────────────────────────────────┘
    ↓
ad_events 表记录（IP/UA/Referrer）
    ↓
Admin 收入分析面板汇总 CPM/CPC/CTR
```

---

## 2. 广告位形态

| 类型 | 位置 | 典型尺寸 | 场景 |
|------|------|----------|------|
| `header_banner` | H5 页面顶部 | 728×90 / 320×50 | 活动页顶部曝光 |
| `footer_banner` | H5 页面底部 | 728×90 | 表单提交后转化引导 |
| `native_inline` | 内容区域原生嵌入 | 自适应宽度 | 表单下方、文章中间 |
| `interstitial` | 全屏插屏 | 全屏 | 特殊活动推广 |

---

## 3. 数据库设计

### ad_slots 表（广告位配置）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID | 主键 |
| `name` | TEXT | 广告位名称 |
| `position` | TEXT | header_banner / footer_banner / native_inline / interstitial |
| `is_active` | BOOLEAN | 是否启用 |
| `campaign_id` | UUID | 关联特定营销活动（NULL = 全局广告位） |
| `ad_provider` | TEXT | adsense / meta / custom |
| `ad_config` | JSONB | 广告配置（HTML / ad-client / placement_id 等） |
| `sort_order` | INTEGER | 排序权重 |

### ad_events 表（事件追踪）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID | 主键 |
| `ad_slot_id` | UUID | 关联广告位 |
| `event_type` | TEXT | impression / click |
| `campaign_subdomain` | TEXT | 所属营销活动 |
| `ip` | TEXT | 用户 IP |
| `user_agent` | TEXT | 浏览器 UA |
| `referrer` | TEXT | 来源页面 |

### RLS 策略

| 表 | 策略 | 说明 |
|----|------|------|
| `ad_slots` | `ad_slots_public_select` | 所有人可读取 `is_active = true` 的广告位 |
| `ad_slots` | `ad_slots_admin_all` | 管理员全权限 |
| `ad_events` | `ad_events_public_insert` | 任何人可写入（H5 上报） |
| `ad_events` | `ad_events_admin_select` | 管理员可查看 |

---

## 4. 广告供应商支持

### Google AdSense

通过 `ad_config` JSONB 存储配置：

```json
{
  "data-ad-client": "ca-pub-xxxx",
  "data-ad-slot": "1234567890"
}
```

### Meta Audience Network

```json
{
  "placement_id": "your-placement-id"
}
```

### Custom HTML

管理员在后台直接编辑 `ad_config.html`：

```json
{
  "html": "<div class=\"ad-banner\">Sponsored Content</div>",
  "width": 728,
  "height": 90
}
```

> **安全注意**：第三方 script 必须通过 CSP 白名单控制。详见下方第 4.1 节 CSP 配置。

### 4.1 Content Security Policy (CSP) 配置

如果使用第三方广告脚本（如 AdSense JS SDK），需要在 `nuxt.config.ts` 中添加 CSP 白名单：

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  routeRules: {
    '/**': {
      headers: {
        'Content-Security-Policy': "script-src 'self' https://pagead2.googlesyndication.com https://www.googletagservices.com; frame-src https://googleads.g.doubleclick.net;"
      }
    }
  }
})
```

> 当前项目的 Custom HTML 广告位已通过 `sanitizeHtml()` 消毒，移除了 script/iframe/event handler。如果使用 AdSense 等第三方脚本，需要额外放开 CSP。

---

## 5. 服务端 API

### 5.1 公开接口

| 路由 | 方法 | 功能 |
|------|------|------|
| `/api/v1/ads` | GET | 获取活跃广告位（支持 position/subdomain 过滤） |
| `/api/v1/ads/event` | POST | 广告事件上报（impression/click） |

**广告事件上报为公开接口**，无需鉴权，但必须记录 IP 和 User-Agent。

### 5.2 Admin 管理接口

| 路由 | 方法 | 功能 |
|------|------|------|
| `/api/admin/ad-slots` | GET | 获取所有广告位 |
| `/api/admin/ad-slots` | POST | 创建广告位 |
| `/api/admin/ad-slots/[id]` | PATCH | 更新广告位 |
| `/api/admin/ad-slots/[id]` | DELETE | 删除广告位 |
| `/api/admin/revenue` | GET | 收入分析数据 |

---

## 6. 工具层 (server/utils/ads.ts)

| 函数 | 功能 |
|------|------|
| `getActiveAdSlots(event, position?, subdomain?)` | 获取活跃广告位列表 |
| `recordAdEvent(event, eventData)` | 记录广告事件（自动采集 IP/UA/Referrer） |
| `getAdRevenueSummary(event, days)` | 获取广告收入汇总（CPM/CPC/CTR 估算） |

### 收入估算模型

当前使用简单 CPM 模型：
- **CPM**：$2.00 / 1000 impressions
- **CTR** = clicks / impressions × 100%
- **Estimated Revenue** = impressions / 1000 × $2.00

---

## 7. 前端组件

### ClientAdSlot

`app/components/client/AdSlot.vue` — 通用广告位渲染组件

```vue
<ClientAdSlot position="header_banner" :subdomain="subdomain" />
```

组件行为：
1. `onMounted` 时调用 `GET /api/v1/ads?position=xxx` 获取广告位配置
2. 渲染广告内容（AdSense 代码 / Custom HTML / 占位符）
3. 自动上报 `impression` 事件
4. 用户点击时上报 `click` 事件

### useAdSlot Composable

`app/composables/ads.ts`：

```ts
const {
  slots,          // 广告位配置列表
  fetchSlots(),   // 拉取广告位
  trackImpression(adSlotId, subdomain?),
  trackClick(adSlotId, subdomain?),
} = useAdSlot('header_banner', subdomain)
```

---

## 8. Admin 管理端组件

| 组件 | 路径 | 功能 |
|------|------|------|
| AdminAdSlots | `app/components/admin/AdminAdSlots.vue` | 广告位 CRUD 管理面板 |
| AdminRevenue | `app/components/admin/AdminRevenue.vue` | 收入分析仪表盘 |
| AdminToast | `app/components/admin/AdminToast.vue` | 操作反馈 Toast 通知 |

### 收入分析面板展示

- 总收入估算（支付 + 广告）
- 每日收入趋势（从 orders + ad_events 实时聚合）
- 按广告位分组的曝光/点击统计
- CTR（点击率）指标

---

## 9. 广告位与 Campaign 绑定

广告位支持两种作用域：

| 作用域 | campaign_id | 说明 |
|--------|-------------|------|
| 全局 | `NULL` | 所有 H5 页面都展示 |
| 特定活动 | 关联 campaigns.id | 仅对应子域名的 H5 页面展示 |

`getActiveAdSlots()` 函数在返回时自动过滤：
- 全局广告位始终包含
- 绑定特定 campaign 的广告位仅在 subdomain 匹配时包含

---

## 10. 索引优化

已创建的索引：

| 索引名 | 表 | 字段 | 用途 |
|--------|----|------|------|
| `idx_ad_events_slot_type_time` | ad_events | (ad_slot_id, event_type, created_at DESC) | 收入面板按广告位 + 事件类型统计 |
| `idx_ad_slots_position_active` | ad_slots | (position, is_active) | 按位置获取活跃广告位 |

高频查询场景（如统计面板）建议使用 Materialized View 预聚合。

---

## 11. 广告平台申请指南

### Google AdSense

1. 打开 [adsense.google.com](https://www.google.com/adsense/) 登录 Google 账号
2. 填写网站 URL 和收款信息
3. 提交审核（通常 1-2 周）
4. 审核通过后获取 `ca-pub-xxxx` ID 和广告单元 slot ID
5. 在 Admin 后台创建广告位，`ad_provider` 选 `adsense`，填入配置

> 测试阶段无需真实 AdSense 账号，用 Custom HTML 模拟即可。

### Meta Audience Network

1. 打开 [business.facebook.com](https://business.facebook.com/) → Monetization
2. 创建应用并添加 Audience Network
3. 获取 `placement_id`
4. 在 Admin 后台创建广告位，`ad_provider` 选 `meta`

---

## 12. 常见问题

### Q: 广告位不显示

排查步骤：
1. 检查 `ad_slots` 表是否有数据（种子数据见 [02-supabase-integration.md](./02-supabase-integration.md) 第 5.3 节）
2. 确认广告位 `is_active = true`
3. 确认 `GET /api/v1/ads?position=xxx` 返回非空列表
4. 浏览器控制台是否有 CSP 拦截报错

### Q: 广告事件上报报 403

`POST /api/v1/ads/event` 是公开接口，不应返回 403。检查 `04.auth-guard.ts` 中间件是否误拦截了该路径。

### Q: 收入数据始终为 0

收入估算基于广告曝光量（`impressions / 1000 × $2.00`）。如果曝光量为 0，检查：
1. 广告位组件是否正确上报 impression 事件
2. `ad_events` 表是否有记录
3. Admin 收入面板是否查询了正确的日期范围

### Q: Custom HTML 广告位渲染但点击无反应

`sanitizeHtml()` 会移除所有 `on*` 事件属性（`onclick`、`onmouseover` 等）。如果广告依赖事件交互，改用 `<a href="...">` 链接标签包裹，这些不会被消毒移除。

---

## 13. 相关文档

- 数据库配置 → [02-supabase-integration.md](./02-supabase-integration.md) 第 5.3 节（广告位种子数据）
- 认证体系 → [05-user-auth.md](./05-user-auth.md)（Admin 管理接口依赖管理员身份）
- 支付模块 → [06-payment-integration-optional.md](./06-payment-integration-optional.md)（收入分析面板汇总支付 + 广告收入）
- 社交反馈 → [08-social-feedback-optional.md](./08-social-feedback-optional.md)（评价区位于广告位上方）
