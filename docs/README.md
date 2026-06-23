# HeHe App 技术文档

> 单人全栈单仓混合技术架构 — Nuxt 4 + Supabase + Vercel 完整文档

---

## 阅读顺序（推荐）

| 序号 | 文档 | 简介 | 类型 |
|------|------|------|------|
| 01 | [快速开始](./01-快速开始.md) | 项目定位、前置条件、环境变量、Mock DB、快速启动、FAQ | 入门必读 |
| 02 | [项目架构](./02-项目架构.md) | 技术栈、目录结构、路由设计、中间件链、i18n 国际化 | 架构理解 |
| 03 | [渲染策略](./03-渲染策略.md) | ISR/SWR/SSR/SPA 渲染策略深度对比与选型决策 | 架构决策 |
| 04 | [Supabase 数据库集成](./04-Supabase数据库集成.md) | 数据库迁移、RLS 策略、Storage、Seed Data、管理员创建 | 基础设施 |
| 05 | [Vercel 部署](./05-Vercel部署.md) | Vercel 部署、域名配置、子域名路由、环境变量、SSL | 基础设施 |
| 06 | [GitHub 与 CI/CD](./06-GitHub与CI-CD.md) | GitHub 仓库管理、分支策略、Actions CI/CD、PR 流程 | 基础设施 |
| 07 | [用户认证](./07-用户认证.md) | Email/OAuth/匿名登录、Token 管理、中间件鉴权、H5 组件 | 业务模块 |
| 08 | [支付集成](./08-支付集成.md) | Stripe Checkout 支付流程、Webhook、金额安全、Admin 管理 | 业务模块 |
| 09 | [社交分享与反馈](./09-社交分享与反馈.md) | 社交分享组件、用户评价系统、星级评分、管理员审批 | 业务模块 |
| 10 | [Cloudflare 配置](./10-Cloudflare配置.md) | Cloudflare DNS 管理、CDN 加速、安全防护（可选增强） | 可选增强 |

---

## 相关资源

- **项目 README**：[../README.md](../README.md) — 项目简介与快速链接
- **设计系统**：[../DESIGN.md](../DESIGN.md) — Client/Admin/H5 三端统一设计规范
- **AGENTS.md**：[../AGENTS.md](../AGENTS.md) — AI 编码助手指南（完整项目约定）
- **CHANGELOG**：[../CHANGELOG.md](../CHANGELOG.md) — 版本变更记录

---

## 文档约定

- 文件名格式：`{序号}-{中文简称}.md`（如 `01-快速开始.md`）
- 跨文档链接统一使用相对路径 `[标题](./文件名.md)`
- 代码块标注语言类型（`bash` / `ts` / `sql` / `env` / `yaml`）
- 表格用于对比信息（技术栈、API 端点、配置项）
- 可选模块标注 ⚠️ 标记
