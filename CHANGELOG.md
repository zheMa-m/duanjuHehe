# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-25

### Added
- Nuxt 4 全栈混合渲染（SSR + SPA + ISR + SWR），按路由自动选择策略
- Supabase PostgreSQL 集成，全表 RLS 行级安全 + FORCE ROW LEVEL SECURITY
- Vercel Serverless 部署 + PWA 离线缓存
- 子域名自动路由：`admin.*` → 管理后台、`api.*` → REST API、任意其他子域名 → H5 营销页
- 管理后台（SPA）：仪表盘 / 用户管理 / 订单中心 / 营销活动 / 智能问卷 / 媒体库 / 安全中心 / 系统配置
- 管理员双因素认证（2FA）：TOTP + 备用恢复码
- 多支付策略架构：Stripe / PayPal / Google Pay / Apple IAP / 微信支付 / 手动确认
- StarPath 智能问卷 H5 模块：问卷答题 → 智能分析 → 支付闭环
- 营销 H5 矩阵：新增页面只需创建目录，零配置自动上线
- 用户认证体系：邮箱密码 + Google/GitHub OAuth + 匿名登录
- Supabase Storage 媒体库：上传 / 预览 / 回收站 / 批量操作
- 站点访问密码保护（Cookie / Bearer / Query）
- OpenAPI 3.1 自动文档（Scalar / Swagger UI）
- CRUD / 脚手架 / RLS 策略生成器
- API 安全扫描 + Supabase 健康检查 + Storage / 支付策略集成测试
- Mock DB 离线开发适配器（链式查询 + Auth 模拟）
- i18n 国际化：中文（默认）+ 英文
- ESLint Flat Config + Prettier + CI Pipeline
- Vitest 单元测试 + Playwright E2E 测试
- 审计日志统计 API + 定时归档 + 回收站清理（Cron Jobs）
- Vercel Analytics + Speed Insights + APM 中间件
- 帮助文档中心（/help）+ 完整项目文档体系（10 篇）
- 社交分享组件（6 大平台）+ 用户反馈系统
- 广告位系统（可选），多广告源轮播 + 曝光/点击追踪

### Security
- 访问密码 → 管理员断言 → 用户认证 → RLS → Zod 校验 → API 扫描
- 密钥分级管理，service_role 永不暴露到前端
- 所有表强制 RLS（FORCE ROW LEVEL SECURITY）
- 金额字段使用 NUMERIC 类型，禁止浮点数
- 审计日志 append-only（activity_logs 表）
- 支付密钥全部迁移至 DB，不再通过环境变量管理
