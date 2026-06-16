# Hehe 单人全栈独立闭环项目脚手架

本脚手架是专为 **单人全栈工程师 (Solo Hacker)** 设计的极速开发模板。采用 **Nuxt 4 全栈混合架构**，在同一套单仓中同时支撑了主站官网（SSR 渲染）与管理后台（SPA 客户端渲染），并内置了多语言国际化、全方位安全防护网与 AI 辅助开发工具链，赋能单个开发者高效、独立地进行项目全生命周期的开发、维护、上线、测试及运维。

---

## 核心架构特色

1.  **混合渲染模式隔离**：
    *   **主站官网 (`/`)**：使用 **SSR (服务端渲染)** 策略，保障首屏秒开率和完美的 SEO 收录。
    *   **管理后台 (`/admin`)**：通过 `routeRules` 强制指定 `ssr: false`。纯客户端渲染 (SPA) 隔离，彻底规避了 `window`/`localStorage` 在服务端构建及水合阶段的报错。
2.  **API 物理路径隔离与鉴权**：
    *   **管理员接口 (`/api/admin/**`)**：由前置中间件自动拦截，无条件执行管理员断言 `assertAdmin` 保护。
    *   **业务接口 (`/api/v1/**`)**：执行 `assertUser` 用户态断言，并在数据查询中追加项目数据隔离（基于用户 ID 的行级安全校验）。
3.  **开发期 MockDB 沙盒模式**：
    *   通过全局 `process.env.MOCK_DB === 'true'` 开箱即用，在 Node 内存中模拟数据增删改查。无需繁琐的云数据库配置，立即可进入前端逻辑与鉴权测试开发。在生产环境中无缝切换至真实的 Supabase 物理云数据库。
4.  **多域名重写与分流路由 (Subdomain Routing)**：
    *   内建 `server/middleware/01.subdomain-rewrite.ts` 中间件，自动根据请求 Host 解析，把主域名、`admin` 子域名、`api` 子域名和普通的活动营销子域名（如 `ai.yourdomain.localhost`）分别在服务端静默重写路由到对应页面目录。零跨域配置、零额外部署成本即可掌握一站式多端域名路由网关。
5.  **多语言国际化 (i18n)**：
    *   基于 `@nuxtjs/i18n` 模块，主站官网和 H5 营销页支持中英文双语切换。采用 `prefix_except_default` 路由策略（默认中文无前缀，英文 `/en` 前缀），内置浏览器语言检测 + Cookie 持久化 + 时区推断的智能语言识别，提供 `useLocaleDetect()` composable 和 `LanguageSwitcher` 组件实现一键切换。管理后台保持纯中文。

---

## 功能特性

### 1. 简易管理台登录
*   未登录时，后台工作区自动隐藏，呈现苹果极简风格的毛玻璃登录卡片。
*   默认测试账号：`admin`，密码：`admin888`。
*   登录成功后，状态持久化写入本地 `localStorage`，刷新后自动保持会话。在顶栏右上角支持一键"退出登录"并清除缓存。
*   未登录状态下，前端发起的管理后台数据拉取（`/api/admin/*`）自动携带 `'x-mock-unauthorized': 'true'` 探针头部，触发后端 401 拦截。

### 2. 系统健康监控与告警 (APM)
*   **性能指标追踪**：自动捕捉最近 100 次 API 的耗时、路径、状态码，计算滑动时窗下的**平均时延**、**P95 时延**、**P99 时延**及**报错率**。
*   **系统负荷图表**：实时抓取物理内存占用率（可用/共计 GB）、CPU 负载率及 Node 运行开机时长。
*   **异常告警系统**：当时延超过 800ms (Warning) 或 2000ms (Critical)、或是请求返回 5xx 错误时，自动记入警报并在 Node.js 后台终端输出带有 `🚨` 颜色高亮的彩色警报日志。
*   **一键模拟告警**：在监控面板底部提供一键触发 Warning 和 Critical 警报的调试按钮，方便开发者验证警报收录。

### 3. 基础审计日志管理与一键 CSV 导出
*   **动态条件筛选**：提供按"操作状态"过滤与按"操作内容/操作人/IP"进行模糊搜索，实时过滤安全流水。
*   **展示范围控制**：支持一键切换"展示前 5 条"与"展示全部流水"，方便轻量概览或深度追溯。
*   **中文无乱码 CSV 导出**：自动添加 `\uFEFF` UTF-8 BOM 标头防乱码机制，支持零后端消耗的前端一键极速报表下载。

### 4. 个人设置与安全凭据管理
*   **安全凭证重置**：点击顶栏右上角管理员头像，展开磨砂毛玻璃 Modal。管理员输入新密码并确认修改后，将调用受保护的 `PATCH /api/admin/profile/password` API 路由，成功后写入 `ADMIN_PASSWORD_CHANGED` 审计日志，并在本地 `localStorage` 同步持久化存储，下次登录自动对齐。

### 5. 营销 H5 矩阵子系统 (Marketing H5 System)
*   **云端实时发布与更新**：项目后台内置 `campaigns` 标签页，支持直接编辑特定营销活动的 Badge 徽章、Title 标题和 Subtitle 介绍。通过 `PATCH /api/admin/campaigns/[subdomain]` 提交后即刻落库并记入安全审计流水，前端秒级生效。
*   **基于 SWR 驱动的极速页面渲染**：营销单页 `app/pages/(h5)/h5/[subdomain]/index.vue` 使用 SWR 模式，以零等待响应的方式拉取最新的活动配置，保证活动变更在秒级传达给客户端，无需任何前端打包部署流程。
*   **高端拟真与微交互**：内置苹果拟物手机外壳框架，配合高端的磨砂玻璃与背景渐变光圈微动画。在登记表单提交成功后，动态展现出具有随机编号和赛博风格的发光电子票券，提升用户留存。
*   **多语言支持**：H5 页面全量接入 i18n，表单 placeholder、按钮文案、成功提示、评价区文案等均支持中英文自动切换，适配海外用户访问场景。

---

## 真实 Supabase 数据库集成

脚手架设计了平滑过渡真实的 Supabase 生产云数据库的机制，保障从沙盒到生产环境的极速切换：

1.  **版本化数据库迁移脚本**：
    *   所有 SQL 迁移文件统一存放在 `supabase/migrations/` 目录下，按版本号递增命名：
        *   `0001_core.sql` — 核心基础表（`profiles`、`tasks`、`activity_logs`）+ 触发器函数（必选）
        *   `0002_campaign_optional.sql` — 营销活动配置 + 预约注册（`campaigns`、`campaign_registrations`）（⚠️ 可选）
        *   `0003_ad_optional.sql` — 广告变现（`ad_slots`、`ad_events`）（⚠️ 可选）
        *   `0004_feedback_optional.sql` — 用户反馈与评价（`feedbacks`）（⚠️ 可选）
        *   `0005_payment_optional.sql` — 支付模块（`products`、`orders`）（⚠️ 可选）
    *   最小部署只需执行 `0001_core.sql` 即可运行核心业务（用户认证 + 任务管理）。
2.  **Cookie + Bearer 双模式鉴权**：
    *   在真实生产环境下，鉴权中间件 [02.auth.ts](./server/middleware/02.auth.ts) 支持从 Bearer Header 或 Cookie（`sb-access-token`）中提取 JWT 令牌，同时联合 profiles 数据库表对用户权限角色进行最终校验。H5 移动端走 Cookie、App 端走 Bearer，匿名用户通过 `device-id` Cookie 标识。
3.  **极简环境变量切换**：
    *   修改本地 `.env` 文件即可实现零代码更改迁移：
        ```env
        MOCK_DB=false
        SUPABASE_URL=https://您的项目ID.supabase.co
        SUPABASE_SERVICE_ROLE_KEY=您的service_role密钥
        NUXT_PUBLIC_SUPABASE_URL=https://您的项目ID.supabase.co
        NUXT_PUBLIC_SUPABASE_ANON_KEY=您的anon公钥
        ```

---

## 自动化开发工具链 (AI 辅助提效)

为最大化提升单个开发者配合 AI 的开发效率，脚手架内置了三套提效生成器与测试工具：

### 1. CRUD API 生成器
一键为指定的单数资源自动在 `server/api/v1/` 下生成全套符合项目数据隔离规范的 RESTful CRUD 控制器：
```bash
node scripts/gen-crud-api.mjs [资源单数名称]

# 示例: 快速生成 product 资源的列表拉取、创建、修改及回收删除接口
node scripts/gen-crud-api.mjs product
```
*   生成的文件自动附加 `// @api-auth: user` 安全声明。

### 2. RLS 隔离 SQL 策略生成器
读取指定的表名，快速在 `scripts/rls-output/` 导出符合 Supabase 安全合规的 PostgreSQL 行级安全防护 SQL 脚本：
```bash
node scripts/generate-rls-sql.mjs [表名称]

# 示例: 快速生成 products 表的数据行级隔离策略 SQL
node scripts/generate-rls-sql.mjs products
```

### 3. 声明式 API 越权扫描器
升级后的测试探针会自动提取 API 代码顶部的 `// @api-auth: admin | user | public` 声明，对声明与接口实际拦截状态进行 401 未授权探针双向测试，并在终端打印合规评估汇总：
```bash
npm run test:api-safety
```
*   **安全防线**：任何新增接口在未设置保护或测试泄露（返回 200）时，自测程序将直接标红（FAIL）并拦截 Git 合入，安全缺陷防御率 100%。

### 4. 多语言翻译管理
翻译文件统一维护在 `locales/zh.json` 和 `locales/en.json`，按功能分组（common / nav / header / hero / tasks / h5 / login / review / share）。新增页面或组件时，只需在翻译文件中添加对应 key-value，并在组件中使用 `t('key')` 调用即可。

---

## 启动与编译指令

### 1. 安装依赖
```bash
npm install
```

### 2. 启动本地开发服务 (热监听)
```bash
npm run dev
```

### 3. 运行 TypeScript 与 Vue SFC 类型静态校验
```bash
npm run check
```

### 4. 运行全栈 API 越权漏洞自动化安全自测
```bash
npm run test:api-safety
```

### 5. 生成生产包或进行本地预览
```bash
# 构建生产包
npm run build

# 本地预览构建产物
npm run preview
```
