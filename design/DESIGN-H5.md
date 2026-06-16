---
name: HeHe H5
description: 营销 H5 页面设计系统，深色沉浸主题，拟真手机框架 + 动态渐变光晕
colors:
  bg-page: "#020617"
  bg-phone-frame: "#0f172a"
  bg-phone-screen: "#020617"
  bg-elevated: "rgba(255,255,255,0.05)"
  bg-input: "#0f172a"
  accent-indigo: "#4f46e5"
  accent-indigo-hover: "#6366f1"
  accent-cyan: "#22d3ee"
  accent-cyan-dim: "rgba(34,211,238,0.15)"
  text-primary: "#ffffff"
  text-secondary: "#94a3b8"
  text-muted: "#64748b"
  text-placeholder: "#64748b"
  border-frame: "#1e293b"
  border-frame-ring: "rgba(30,41,59,0.4)"
  border-input: "#1e293b"
  border-input-hover: "#334155"
  border-input-focus: "#4f46e5"
  userbar-bg: "rgba(255,255,255,0.95)"
  userbar-text: "#1a1a2e"
  userbar-border: "#f0f0f0"
  modal-bg: "#ffffff"
  modal-text: "#1a1a2e"
  modal-input-border: "#e5e7eb"
typography:
  h1:
    fontFamily: Inter
    fontSize: 1.25rem
    fontWeight: 800
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  h2:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: 700
  body:
    fontFamily: Inter
    fontSize: 0.75rem
    lineHeight: 1.6
  label:
    fontFamily: Inter
    fontSize: 0.625rem
    fontWeight: 600
  badge:
    fontFamily: Inter
    fontSize: 0.625rem
    fontWeight: 700
  mono:
    fontFamily: JetBrains Mono
    fontSize: 0.625rem
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
rounded:
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  phone-frame: 40px
  phone-screen: 32px
  pill: 9999px
components:
  phone-frame:
    maxWidth: 384px
    aspectRatio: "9/19"
    background: "{colors.bg-phone-frame}"
    border: "1px solid {colors.border-frame}"
    rounded: "{rounded.phone-frame}"
    ring: "12px solid {colors.border-frame-ring}"
  phone-notch:
    width: 144px
    height: 24px
    background: "{colors.bg-page}"
    roundedBottom: 16px
  input-field:
    background: "{colors.bg-input}"
    border: "1px solid {colors.border-input}"
    hoverBorder: "1px solid {colors.border-input-hover}"
    focusBorder: "1px solid {colors.border-input-focus}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
    fontSize: 0.75rem
  button-primary:
    background: "#4f46e5"
    hoverBackground: "#6366f1"
    textColor: "#ffffff"
    fontWeight: 700
    fontSize: 0.75rem
    rounded: "{rounded.md}"
    padding: "12px"
    activeScale: 0.95
  button-cta:
    background: "linear-gradient(135deg, campaign.color_from, campaign.color_to)"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
  user-bar:
    background: "{colors.userbar-bg}"
    backdropFilter: "blur(8px)"
    borderBottom: "1px solid {colors.userbar-border}"
    padding: "12px 16px"
  login-modal:
    background: "{colors.modal-bg}"
    textColor: "{colors.modal-text}"
    rounded: "{rounded.lg}"
    maxWidth: 400px
    shadow: "0 20px 60px rgba(0,0,0,0.15)"
  login-input:
    border: "1.5px solid {colors.modal-input-border}"
    rounded: 10px
    padding: 12px
    focusBorder: "#6366f1"
  login-button:
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
  badge:
    background: "linear-gradient(campaign.color_from, campaign.color_to)"
    textColor: "#ffffff"
    fontSize: 0.625rem
    fontWeight: 700
    rounded: "{rounded.pill}"
    padding: "2px 10px"
  swr-tag:
    background: "{colors.accent-cyan-dim}"
    textColor: "{colors.accent-cyan}"
    border: "1px solid rgba(34,211,238,0.2)"
    fontSize: 0.625rem
    rounded: "{rounded.sm}"
---

# HeHe H5 Design System

## Overview

HeHe H5 是营销落地页系统，面向移动端用户。页面以拟真手机框架为核心视觉载体，深色沉浸式背景搭配动态渐变光晕（颜色由活动配置 `color_from` / `color_to` 驱动），营造高端科技感。内部屏幕模拟原生 App 体验，包含用户状态栏、营销内容、表单和电子票券。

## Colors

### 背景层次

H5 使用 Slate 色系深色背景，从页面到手机框体到屏幕内容形成三层递进。

| Token | Hex (Tailwind) | 用途 |
|-------|-----|------|
| `bg-page` | `#020617` (slate-950) | 页面最外层背景 |
| `bg-phone-frame` | `#0f172a` (slate-900) | 手机模拟框体 |
| `bg-phone-screen` | `#020617` (slate-950) | 手机屏幕内部背景 |
| `bg-elevated` | `rgba(255,255,255,0.05)` | 浮层卡片、子域名状态 |
| `bg-input` | `#0f172a` (slate-900) | 输入框背景 |

### 强调色

| Token | Hex | 用途 |
|-------|-----|------|
| `accent-indigo` | `#4f46e5` (indigo-600) | 主 CTA 按钮、输入框聚焦 |
| `accent-indigo-hover` | `#6366f1` (indigo-500) | 按钮悬停态 |
| `accent-cyan` | `#22d3ee` (cyan-400) | SWR 标签、技术亮点 |

### 动态渐变色

活动 Badge 和背景光晕的颜色由后台动态配置：

```ts
// Campaign 数据驱动
campaign.color_from  // 渐变起始色，默认 'from-rose-600'
campaign.color_to    // 渐变终止色，默认 'to-orange-600'
```

### 文字色

| Token | Hex (Tailwind) | 用途 |
|-------|-----|------|
| `text-primary` | `#ffffff` | 标题、按钮文字 |
| `text-secondary` | `#94a3b8` (slate-400) | 描述段落 |
| `text-muted` | `#64748b` (slate-500) | 辅助信息、placeholder |

## Typography

字体栈：`Inter, system-ui, sans-serif`。

| 级别 | 大小 | 字重 | 用途 |
|------|------|------|------|
| h1 | 1.25rem | 800 (extrabold) | 活动标题 |
| h2 | 1rem | 700 (bold) | 区块标题 |
| body | 0.75rem | 400 | 描述文字、表单文字 |
| label | 0.625rem | 600 | 输入框标签 |
| badge | 0.625rem | 700 | 活动徽章 |
| mono | 0.625rem | 400 | SWR 标签、技术标记 |

活动标题使用 `tracking-tight` + `leading-snug` 增强视觉冲击力。

## Layout

### 拟真手机框架

```
┌─────────────────────────────────┐
│  ·  ───────────  ·              │  ← Notch (144px × 24px)
│ ┌─────────────────────────────┐ │
│ │ UserBar (白底)              │ │
│ ├─────────────────────────────┤ │
│ │ Header Info                 │ │
│ │ Subdomain Status Card       │ │
│ │                             │ │
│ │ ┌─── Badge ───┐            │ │
│ │ │             │            │ │
│ │ Title (h1)    │            │ │
│ │ Subtitle      │            │ │
│ │                             │ │
│ │ ┌── Form ──────────────┐   │ │
│ │ │ Phone Input          │   │ │
│ │ │ Email Input          │   │ │
│ │ │ Submit Button        │   │ │
│ │ └──────────────────────┘   │ │
│ │                             │ │
│ │ Social Share               │ │
│ │ Review Section             │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

- 手机框体：`max-w-sm (384px); aspect-ratio: 9/19; rounded-[40px]`
- 屏幕区域：`rounded-[32px]; overflow-y-auto`
- 外环光晕：`ring-12 ring-slate-800/40`
- 背景光球：`w-[80vw] h-[80vw]; blur-[100px]`（移动端），`w-[40vw] h-[40vw]`（桌面端）

### 响应式适配

- 移动端：全屏模式，隐藏手机框架，直接展示内容
- 桌面端：居中展示手机模拟框架，内含完整 H5 页面

## Components

### UserBar

白色半透明用户状态栏，通过 `backdrop-filter: blur(8px)` 实现毛玻璃效果。三种状态：

- 未登录：显示"登录"和"注册"按钮
- 游客：显示游客图标 + "注册享更多"
- 已登录：显示头像 + 昵称 + "退出"按钮

### Login Modal

白底弹窗，圆角 16px。支持三种模式：登录、注册、绑定。渐变按钮（`#6366f1 → #8b5cf6`）作为主操作。社交登录按钮（Google/Facebook/Apple）排列在表单下方。

### Input Fields

深色背景输入框，`slate-900` 底色 + `slate-800` 描边，悬停时描边变为 `slate-700`，聚焦时变为 `indigo-500`。圆角 12px，内边距 `10px 16px`。

### CTA Button

主操作按钮使用 `indigo-600` 实色背景，悬停变为 `indigo-500`，点击时 `scale(0.95)` 微缩反馈。加载中状态 `opacity-50` + 禁用。

### Dynamic Badge

活动徽章使用 `campaign.color_from → color_to` 渐变背景 + 白色文字 + 全圆角。

### Electronic Ticket

提交成功后展示的赛博风格电子票券，包含随机编号、渐变边框和发光效果。

### SWR Tag

技术状态标签，使用 cyan 色系半透明背景 + 等宽字体，标注当前页面的渲染策略。

## Do's and Don'ts

**Do:**
- 使用 UnoCSS/Tailwind 工具类实现样式，保持与现有代码一致
- 活动相关颜色从 `campaign` 数据对象动态获取
- 输入框 placeholder 使用 `t()` i18n 翻译函数
- 表单提交按钮包含加载状态和成功动画

**Don't:**
- 不要在手机框架外使用 `rounded-[40px]` 圆角
- 不要硬编码活动颜色，始终使用动态配置
- 不要在 H5 页面使用亮色背景（保持深色沉浸感）
- 不要在 UserBar 使用深色背景（它是唯一的白色元素）
