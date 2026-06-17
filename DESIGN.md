---
version: alpha
name: HeHe Design System
description: 三端统一设计规范 — Client（主站官网）/ Admin（管理后台）/ H5（营销落地页）
colors:
  # Shared semantic colors
  success: "#10b981"
  success-admin: "#30d158"
  action: "#4f8ef7"
  action-admin: "#007aff"
  action-h5: "#4f46e5"
  action-h5-hover: "#6366f1"
  warning: "#f59e0b"
  warning-admin: "#ff9f0a"
  error: "#ef4444"
  error-admin: "#ff453a"
  accent-cyan: "#22d3ee"
  accent-purple: "#8b5cf6"
  # Client backgrounds
  client-bg-primary: "#0a0e1a"
  client-bg-secondary: "#0f1628"
  client-bg-card: "#131d35"
  client-bg-card-hover: "#1a2540"
  client-bg-sidebar: "#080c18"
  client-bg-code: "#0d1626"
  client-text-primary: "#e2e8f0"
  client-text-secondary: "#94a3b8"
  client-text-muted: "#64748b"
  client-border: "#1e2d4d"
  # Admin backgrounds
  admin-bg: "#000000"
  admin-bg-elevated: "rgba(255,255,255,0.05)"
  admin-bg-hover: "rgba(255,255,255,0.08)"
  admin-bg-active: "rgba(255,255,255,0.10)"
  admin-bg-input: "rgba(255,255,255,0.06)"
  admin-text-primary: "#ffffff"
  admin-text-secondary: "rgba(255,255,255,0.6)"
  admin-text-muted: "rgba(255,255,255,0.3)"
  admin-border-subtle: "rgba(255,255,255,0.05)"
  admin-border-medium: "rgba(255,255,255,0.1)"
  # H5 backgrounds
  h5-bg-page: "#020617"
  h5-bg-phone-frame: "#0f172a"
  h5-bg-input: "#0f172a"
  h5-text-primary: "#ffffff"
  h5-text-secondary: "#94a3b8"
  h5-text-muted: "#64748b"
  h5-border-frame: "#1e293b"
  h5-border-input: "#1e293b"
  h5-border-input-hover: "#334155"
  h5-border-input-focus: "#4f46e5"
typography:
  # Client
  client-h1:
    fontFamily: Inter
    fontSize: 2rem
    fontWeight: 700
    lineHeight: 1.2
  client-h2:
    fontFamily: Inter
    fontSize: 1.375rem
    fontWeight: 700
    lineHeight: 1.3
  client-h3:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: 600
  client-body:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.7
  client-code:
    fontFamily: JetBrains Mono
    fontSize: 0.8rem
    fontWeight: 400
  # Admin
  admin-h1:
    fontFamily: Inter
    fontSize: 1.25rem
    fontWeight: 600
    lineHeight: 1.3
  admin-h2:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: 600
    lineHeight: 1.4
  admin-body:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: 400
    lineHeight: 1.5
  admin-label:
    fontFamily: Inter
    fontSize: 0.625rem
    fontWeight: 500
    letterSpacing: 0.05em
  admin-mono:
    fontFamily: JetBrains Mono
    fontSize: 0.6875rem
    fontWeight: 400
  # H5
  h5-h1:
    fontFamily: Inter
    fontSize: 1.25rem
    fontWeight: 800
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  h5-h2:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: 700
  h5-body:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: 400
    lineHeight: 1.6
  h5-label:
    fontFamily: Inter
    fontSize: 0.625rem
    fontWeight: 600
  h5-badge:
    fontFamily: Inter
    fontSize: 0.625rem
    fontWeight: 700
  h5-mono:
    fontFamily: JetBrains Mono
    fontSize: 0.625rem
    fontWeight: 400
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  "2xl": 48px
  "3xl": 64px
rounded:
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  "2xl": 20px
  full: 9999px
  phone-frame: 40px
  phone-screen: 32px
components:
  # Client
  client-sidebar:
    width: 260px
    background: "{colors.client-bg-sidebar}"
    borderRight: "1px solid {colors.client-border}"
  client-nav-item-active:
    textColor: "{colors.action}"
    background: "rgba(79,142,247,0.08)"
    borderLeft: "2px solid {colors.action}"
  client-card:
    background: "{colors.client-bg-card}"
    hoverBackground: "{colors.client-bg-card-hover}"
    border: "1px solid {colors.client-border}"
    rounded: "{rounded.lg}"
    padding: 24px
  client-code-block:
    background: "{colors.client-bg-code}"
    textColor: "#c9d1d9"
    border: "1px solid {colors.client-border}"
    rounded: "{rounded.md}"
  # Admin
  admin-sidebar:
    width: 240px
    background: "{colors.admin-bg}"
    borderRight: "1px solid {colors.admin-border-subtle}"
  admin-sidebar-item-active:
    background: "{colors.admin-bg-active}"
    textColor: "{colors.admin-text-primary}"
  admin-header:
    height: 56px
    background: "rgba(0,0,0,0.4)"
    backdropFilter: "blur(12px)"
    borderBottom: "1px solid {colors.admin-border-subtle}"
  admin-table-row:
    height: 48px
    borderBottom: "1px solid {colors.admin-border-subtle}"
    hoverBackground: "rgba(255,255,255,0.02)"
  admin-pill-badge:
    padding: "2px 8px"
    fontSize: 0.625rem
    rounded: "{rounded.full}"
    background: "{colors.admin-bg-elevated}"
    border: "1px solid {colors.admin-border-medium}"
  # H5
  h5-phone-frame:
    maxWidth: 384px
    aspectRatio: "9/19"
    background: "{colors.h5-bg-phone-frame}"
    border: "1px solid {colors.h5-border-frame}"
    rounded: "{rounded.phone-frame}"
    ring: "12px solid rgba(30,41,59,0.4)"
  h5-input-field:
    background: "{colors.h5-bg-input}"
    border: "1px solid {colors.h5-border-input}"
    hoverBorder: "1px solid {colors.h5-border-input-hover}"
    focusBorder: "1px solid {colors.h5-border-input-focus}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  h5-button-primary:
    background: "{colors.action-h5}"
    hoverBackground: "{colors.action-h5-hover}"
    textColor: "#ffffff"
    fontWeight: 700
    rounded: "{rounded.md}"
    padding: 12px
    activeScale: 0.95
  h5-login-modal:
    background: "#ffffff"
    textColor: "#1a1a2e"
    rounded: "{rounded.lg}"
    maxWidth: 400px
    shadow: "0 20px 60px rgba(0,0,0,0.15)"
  h5-user-bar:
    background: "rgba(255,255,255,0.95)"
    backdropFilter: "blur(8px)"
    borderBottom: "1px solid #f0f0f0"
    padding: "12px 16px"
---

# HeHe Design System

## Overview

HeHe 是一个三端统一的全栈应用，包含 Client（主站官网白皮书）、Admin（管理后台）和 H5（营销落地页）三个平台。每个平台拥有独立的视觉性格，但共享基础设计语言——Inter 字体栈、8px 间距体系、以及统一的语义功能色体系。

- **Client**：深海暗色科技主题，侧边栏双栏布局，渐变光晕和荧光色点缀营造科技感
- **Admin**：纯黑极简，灵感来自 Apple 系统级管理工具，白色透明度层级区分状态
- **H5**：深色沉浸主题，拟真手机框架为核心视觉载体，动态渐变光晕由活动配置驱动

字体栈：UI 文字使用 `Inter, -apple-system, BlinkMacSystemFont, 'Noto Sans SC', sans-serif`，代码和技术标记使用 `'JetBrains Mono', monospace`。

## Colors

三端共享语义功能色体系（成功/操作/警告/错误），各平台在此基础上定义独立的背景与文字色。

### Client — 深蓝三层递进背景

背景从最深的侧边栏 `#080c18` 到页面主背景 `#0a0e1a` 再到卡片层 `#131d35`，形成空间纵深。强调色使用 `accent-blue: #4f8ef7`、`accent-purple: #8b5cf6`、`accent-cyan: #22d3ee`。文字使用柔和的 `#e2e8f0` 而非纯白，避免暗色背景下的视觉疲劳。

### Admin — 纯黑背景 + 白色透明度层级

全局唯一背景色 `#000000`，通过白色透明度建立视觉层次：elevated 5%、hover 8%、active 10%。功能色严格语义化——绿 `#30d158` = 成功、红 `#ff453a` = 错误、橙 `#ff9f0a` = 警告、蓝 `#007aff` = 操作。

### H5 — Slate 深色沉浸 + 动态渐变

Slate 色系三层递进（`#020617` → `#0f172a` → `#020617`）。活动 Badge、CTA 按钮和背景光晕的颜色由后台 `campaign.color_from` / `campaign.color_to` 动态驱动（默认 `rose-600 → orange-600`）。`accent-indigo: #4f46e5` 用于 CTA 和输入框聚焦。UserBar 是唯一的白色元素。

## Typography

三端共享 Inter 字体栈，代码和技术标记使用 JetBrains Mono。

### Client 排版

Headlines 使用 Inter Bold 建立权威感。h1 为 2rem/700 用于 Hero 标题，h2 为 1.375rem/700 用于 Section 标题，h3 为 1rem/600 用于卡片标题。正文 body 为 0.875rem/400，行高 1.7 保证长文可读性。代码块使用 JetBrains Mono 0.8rem。

### Admin 排版

整体更紧凑——h1 为 1.25rem/600，body 为 0.75rem/400。字段标签 label 为 0.625rem/500，使用 `uppercase` + `letter-spacing: 0.05em` 增强可读性。代码、ID、时间戳使用 JetBrains Mono 0.6875rem。

### H5 排版

活动标题 h1 为 1.25rem/800（extrabold），使用 `tracking-tight` + `leading-snug` 增强视觉冲击力。描述文字 body 为 0.75rem/400。活动徽章 badge 为 0.625rem/700。

## Layout

### Client — 侧边栏双栏布局

```
┌──────────┬──────────────────────────────┐
│ Sidebar  │ Header (fixed, blur 12px)    │
│ 260px    ├──────────────────────────────┤
│ fixed    │ Content (max-w 960px)        │
│ left     │ padding: 0 40px 64px         │
└──────────┴──────────────────────────────┘
```

Sidebar 固定左侧 `position: fixed; width: 260px; height: 100vh`，Content 区 `margin-left: 260px`。Header 固定顶部 `height: 56px; backdrop-filter: blur(12px)`。Section 间距 80px，卡片内边距 24px。响应式断点 1024px，侧边栏折叠为抽屉。

### Admin — 侧边栏 + 工作区

```
┌──────────┬──────────────────────────────────┐
│ Sidebar  │ Header (h-14, backdrop-blur-md)  │
│ 240px    ├──────────────────────────────────┤
│ fixed    │ Workspace (p-8, flex-1)          │
└──────────┴──────────────────────────────────┘
```

Sidebar `w-60 (240px)`，`≥ lg` 可见，`< lg` 隐藏由汉堡菜单唤出。Header `h-14 (56px)` 毛玻璃效果。Workspace `flex-1; padding: 32px`。表格在 `< md` 时切换为卡片列表。

### H5 — 拟真手机框架

```
┌─────────────────────────────────┐
│  ·  ─── Notch ───  ·            │  144px × 24px
│ ┌─────────────────────────────┐ │
│ │ UserBar (白底 blur)         │ │
│ │ Title (h1) + Badge          │ │
│ │ Subtitle                    │ │
│ │ ┌── Form ──────────────┐   │ │
│ │ │ Phone / Email Input  │   │ │
│ │ │ Submit Button         │   │ │
│ │ └──────────────────────┘   │ │
│ │ Social Share / Reviews      │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

手机框体 `max-w-sm (384px); aspect-ratio 9/19; rounded-[40px]; ring-12 ring-slate-800/40`。屏幕 `rounded-[32px]; overflow-y-auto`。背景光球 `w-[80vw] h-[80vw]; blur-[100px]`（移动端）。响应式：移动端全屏隐藏框架，桌面端居中展示手机框架。

间距体系遵循 8px 基准网格：xs 4px / sm 8px / md 16px / lg 24px / xl 32px / 2xl 48px。

## Elevation & Depth

三端采用不同的深度表达策略：

- **Client**：通过背景色三层递进（`#080c18` → `#0a0e1a` → `#131d35`）和卡片悬停微上移 `translateY(-2px)` 表达层次，不使用投影
- **Admin**：通过白色透明度层级（5% → 8% → 10%）区分浮层、悬停、激活态。Header 使用 `backdrop-blur-md` 毛玻璃效果
- **H5**：通过动态渐变光球 `blur-[100px]` 和手机框架的外环光晕 `ring-12` 营造空间纵深。背景光晕颜色由活动配置驱动

## Shapes

三端共享统一圆角体系：sm 6px（小元素）、md 8px（卡片、输入框）、lg 12px（面板、弹窗）、xl 16px（大卡片）、full 9999px（Pill Badge）。

H5 手机框架使用特殊圆角：外框 `rounded-[40px]`，屏幕 `rounded-[32px]`。不要在手机框架外使用这些超大圆角。

Admin 圆角不超过 16px（Pill Badge 除外），保持极简锐利感。

## Components

### Client 组件

**侧边栏导航**：激活态使用左侧 2px `accent-blue` 竖线 + 蓝色半透明背景 `rgba(79,142,247,0.08)` + 文字变为 `accent-blue`。分组标题用 `text-muted` 小号字 10px uppercase。

**卡片**：使用 `bg-card` 背景 + `border` 描边 + `lg` 圆角，悬停时背景过渡为 `bg-card-hover` 并微上移。内边距 24px。

**代码块**：`#0d1626` 背景 + `border` 描边 + `md` 圆角。关键字颜色使用 `accent-cyan`（类型）和 `accent-blue`（函数名）。

**Badge**：渲染策略标签使用半透明背景 + 同色系文字。ISR = cyan 系、SPA = purple 系、API = orange 系。

**渐变**：`primary: linear-gradient(135deg, #667eea, #764ba2)`、`tech: linear-gradient(135deg, #4f8ef7, #22d3ee)`、`success: linear-gradient(135deg, #10b981, #059669)`。

### Admin 组件

**Sidebar**：Logo 白底黑字方块 + 项目名。导航项使用图标 + 文字，激活态为白色半透明背景 `bg-active` + 纯白文字。底部显示版本号。

**Header**：`bg-black/40` + `backdrop-blur-md` 毛玻璃。左侧环境标签（MOCK_DB / PRODUCTION），右侧管理员头像。

**Data Table**：行高 48px，`border-subtle` 分隔线，hover 行 `rgba(255,255,255,0.02)`。操作列固定在右侧，使用图标按钮。

**Stat Card**：`rgba(255,255,255,0.03)` 背景 + 同色描边，数值大号粗体白字。

**Pill Badge**：全圆角 + `bg-elevated` 背景 + `border-medium` 描边，文字 `0.625rem`。

**Modal**：登录卡片使用纯白 `#fff` 背景；配置弹窗使用深色毛玻璃 `backdrop-blur`。

**状态点**：4px 圆形 + 对应功能色（绿/红/橙/蓝）。

### H5 组件

**UserBar**：白色半透明 `rgba(255,255,255,0.95)` + `backdrop-filter: blur(8px)`。三种状态：未登录（登录+注册按钮）、游客（注册享更多）、已登录（头像+昵称+退出）。

**Login Modal**：白底圆角 16px，`max-width: 400px`，`shadow: 0 20px 60px rgba(0,0,0,0.15)`。渐变按钮 `#6366f1 → #8b5cf6`。社交登录按钮（Google/Facebook/Apple）排列在表单下方。

**Input**：`slate-900` 底 + `slate-800` 边，hover → `slate-700`，focus → `indigo-500`。圆角 12px，内边距 `10px 16px`。

**CTA Button**：`indigo-600` 背景，hover → `indigo-500`，active → `scale(0.95)`。加载中 `opacity-50` + 禁用。

**Dynamic Badge**：`campaign.color_from → color_to` 渐变 + 白字 + 全圆角。

**Electronic Ticket**：提交成功后赛博风票券，包含随机编号、渐变边框和发光效果。

**SWR Tag**：cyan 半透明背景 `rgba(34,211,238,0.15)` + 等宽字体，标注渲染策略。

## Do's and Don'ts

- Do 所有颜色走 CSS 变量，新增组件保持当前平台暗色主题一致
- Do 活动颜色从 `campaign` 数据动态获取，不硬编码
- Do 输入框 placeholder 使用 `t()` i18n 翻译函数
- Do 表单按钮包含加载状态和成功动画
- Do Admin 功能色严格语义（绿=成功、红=错误、橙=警告、蓝=操作）
- Do Client 导航项编号使用两位数字（01–18）
- Do 代码块使用 JetBrains Mono 字体
- Don't 在暗色背景使用纯白文字（Client 用 `#e2e8f0`，Admin 用 `#ffffff`）
- Don't 使用内联颜色值，统一走 CSS 变量或设计 Token
- Don't 在 Admin 使用彩色背景或渐变（登录卡片毛玻璃除外）
- Don't 在 Admin 使用圆角超过 16px（Pill Badge 除外）
- Don't 在 H5 页面使用亮色背景（保持深色沉浸感）
- Don't 在 H5 UserBar 使用深色背景（它是唯一的白色元素）
- Don't 在 H5 手机框架外使用 `rounded-[40px]` 圆角
- Don't 在非代码区域使用等宽字体
- Don't 硬编码 H5 活动颜色，始终使用动态配置
