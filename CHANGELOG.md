# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-06-23

### Added
- **StarPath 智能问卷 H5 模块**：问卷答题 → 智能分析 → 支付闭环完整链路
  - 问卷页面（StarpathQuestionListPage）+ 滚轮选择器（StarpathWheelPicker）+ 选项卡片（StarpathOptionCard）
  - 支付页面：信用卡支付表单 + PayPal 集成
  - 服务端 API：`/api/starpath/*`（questionnaire / payment / email / report / subscribe）
  - 组合式函数：`useStarpathFlow`（管理答题流程状态）
  - 组件库：`app/components/starpath/`（8 个专用组件）
- **多支付策略架构**：`server/utils/payment-strategies/` 策略工厂模式
  - Stripe / PayPal / Google Pay / Apple IAP / Manual（手动确认）五大支付渠道
  - 统一接口 `PaymentStrategy`：`createSession` + `verifyWebhook`
  - `PaymentTransaction` 事务封装，确保支付一致性
  - Mock DB 完整覆盖所有支付策略模拟
- **管理员双因素认证（2FA）**：TOTP 一次性密码 + 备用恢复码
  - API：`/api/admin/auth/2fa/setup` / `verify` / `status` / `disable`
  - 数据库迁移：`0014_two_factor.sql`（admin_2fa 表）
  - Mock DB 完整覆盖 2FA 流程
- **多支付提供商配置**：`/api/admin/config/payment.patch.ts` 支持 Stripe/PayPal 等动态切换
  - 数据库迁移：`0015_payment_providers.sql`
- **管理后台分析仪表盘**：`/api/admin/analytics/` 数据统计端点
- **管理后台用户管理**：`/api/admin/users/` 用户列表与操作
- **管理后台订阅管理**：`/api/admin/subscriptions/` 订阅查询
- **管理后台智能问卷管理**：`/api/admin/starpath/` 问卷与分析报告管理
- **管理后台安全中心**：`/api/admin/security/` API Key 与速率限制管理
- **审计日志统计 API**：`/api/admin/audit-logs/stats.get.ts`（总量/今日/分类分布/Top 用户）
- **H5 卡支付格式化**：信用卡号自动分组、有效期格式化输入
- **审计日志归档 + 回收站清理**：定时任务 SQL（0012/0013）
- **代码质量工具链**：ESLint Flat Config + Prettier + CI Pipeline（lint/format/type-check/tests）
- **新组合式函数**：`useExport`（CSV 导出）、`useAdminMenu`（管理菜单）、`useAdminNav`（导航状态）、`useAdminTheme`（主题切换）、`useAnalytics`（埋点统计）、`useLocaleDetect`（语言检测）
- **新脚本**：`test-signature.mjs`（HMAC-SHA256 签名测试）、`test-payment-strategies.mjs`（支付策略测试）、`seed-demo-data.mjs`（演示数据填充）、`seed-h5-v2.mjs`（H5 种子数据）
- **新命令**：`lint` / `lint:fix` / `format` / `format:check` / `seed:demo` / `deps:check` / `test:payment-strategies`
- **单元测试扩展**：composables (useExport)、API (audit-stats/2fa) 测试（从 39 增至 54 用例）
- **数据库迁移**：0003_campaign.sql（合并 questionnaire_sessions / questionnaire_answers / ai_reports + 新增 campaign_orders 活动订单关联表）/ 0012_archive_audit_logs.sql / 0013_trash_cleanup_cron.sql / 0014_two_factor.sql / 0015_payment_providers.sql

### Changed
- Mock DB 适配器新增 `lte` 方法、`admin_2fa` 表、`admin_2fa` upsert 主键映射
- AdminOverview 统计口径从客户端侧计算改为服务端 stats API 驱动
- AdminAudit / AdminApiSecurity CSV 导出统一使用 `useExport` composable
- 管理后台日期过滤统一转 UTC 避免时区偏差
- 2FA 错误处理：去掉硬编码 Supabase 错误码 `PGRST116`，改为通用 null 判断
- 硬编码的 `'zh-CN'` locale 和 `'HeHe Admin'` 应用名称改为环境驱动
- `nuxt.config.ts` 补充 `import { resolve } from 'path'`
- 支付配置 API 安全声明对齐：`@api-auth: admin`

### Fixed
- 修复 `card.vue` 中 `v-model` 与 `:value` 冲突（Vite Vue pre-transform 错误）
- 修复 `manual.ts` 中 `logAuditEvent` 错误导入路径（`../audit` → `../logger`）
- 修复 2FA disable 接口缺少 backup codes 更新错误处理
- 恢复码生成字符集修正 `IJKL` → `JKLM`（exclude `I`）
- 修复 `starPath` → `starpath` 命名不一致

## [1.0.1] - 2026-06-17

### Changed
- 帮助文档中心（/help）全面补全，与 docs/ 目录内容对齐
- 文档概览卡片编号与左侧导航、section 编号统一
- 种子数据 SQL 替换为项目实际版本（含 campaigns/subdomain/features 等完整字段）
- 迁移文件清单对齐实际文件名（0002_campaign_optional / 0003_ad_optional / 0004_feedback_optional）
- 新增 Supabase Storage 完整说明（路径规范/RLS隔离/混合上传/API端点/useStorage composable）
- 新增执行数据库迁移 + 创建管理员账号操作指南
- 新增快速启动命令 + 渲染策略归纳到 S1 概览
- 移除 OPENAPI_TOKEN 环境变量（已废弃），API 文档鉴权统一使用 SITE_ACCESS_PASSWORD
- 清理帮助文档相关的 i18n help 命名空间（/help 使用硬编码中文）
- /tasks 功能已迁移至 admin，所有文档同步移除客户端 tasks 引用

### Fixed
- 修复 help.vue 中种子数据 SQL 导致 Vue 编译错误（Unquoted attribute value）

## [1.0.0] - 2026-06-17

### Added
- Nuxt 4 全栈混合渲染架构（SSR + SPA + SWR + API）
- Supabase PostgreSQL 集成，含 RLS 行级安全策略
- 内置管理员 Auth 用户自动 seed（固定 UUID，幂等创建）
- 管理后台（SPA）：Overview / Tasks / Campaigns / Orders / Ad Slots / Revenue / APM / Audit Logs / Config
- 任务看板完整 CRUD（创建 / 列表 / 切换完成 / 删除），含审计日志与租户隔离
- 营销 H5 矩阵（SWR 600s），含拟真手机框架 + 赛博风电子票券
- 主站官网（ISR 3600s），含首页 / 技术架构白皮书 / 帮助文档中心
- 用户认证体系：邮箱密码 + Google/GitHub OAuth + 匿名登录
- Stripe 支付集成（可选），双模式（Mock/真实）运行
- 广告位系统（可选），支持多广告源轮播 + 曝光/点击追踪
- 社交分享组件（6 大平台）+ 用户反馈系统（星级评分 + 评论）
- Supabase Storage：三个业务 Bucket（avatars / campaign-assets / uploads）
- i18n 国际化：中文（默认）+ 英文，prefix_except_default 策略
- 中间件责任链（00.apm → 01.subdomain → 02.auth → 03.admin → 04.auth-guard → 05.access-guard）
- 站点访问密码保护（页面 + API 文档），支持 Cookie/Bearer/Query 三种方式
- Nitro OpenAPI 3.1 自动文档（/_scalar + /_swagger + /_openapi.json）
- AI 辅助工具链：CRUD 生成器 / 脚手架生成器 / RLS 策略生成器
- API 安全扫描器（test:api-safety）+ Supabase 健康检查 + Storage 集成测试
- Mock DB 离线开发适配器（内存 PostgreSQL，支持链式查询 + Auth 模拟）
- Vercel Serverless 部署（nitro.preset: 'vercel'）
- PWA 支持（管理后台离线缓存）
- Vercel Analytics + Speed Insights 性能监控
- 完整项目文档体系：README / AGENTS.md / DESIGN.md / docs/ (9 篇)
- 帮助文档中心（/help），含搜索 + 侧边导航 + FAQ 折叠 + 明暗主题
- AdminToast 组件替代原生 alert()

### Security
- 6 层纵深防御模型（访问密码 → 管理员断言 → 用户认证 → RLS → Zod 校验 → API 扫描）
- 密钥分级管理：service_role / secret 绝不暴露到前端
- 所有表强制 RLS（FORCE ROW LEVEL SECURITY）
- 金额字段使用 NUMERIC 类型，禁止浮点数
- 审计日志 append-only（activity_logs 表）
