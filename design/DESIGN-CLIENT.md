---
name: HeHe Client
description: 主站官网白皮书页面设计系统，深海暗色主题，科技感侧边栏导航布局
colors:
  bg-primary: "#0a0e1a"
  bg-secondary: "#0f1628"
  bg-card: "#131d35"
  bg-card-hover: "#1a2540"
  bg-sidebar: "#080c18"
  accent-blue: "#4f8ef7"
  accent-purple: "#8b5cf6"
  accent-cyan: "#22d3ee"
  accent-green: "#10b981"
  accent-orange: "#f59e0b"
  accent-red: "#ef4444"
  text-primary: "#e2e8f0"
  text-secondary: "#94a3b8"
  text-muted: "#64748b"
  border: "#1e2d4d"
  border-light: "#243558"
typography:
  h1:
    fontFamily: Inter
    fontSize: 2rem
    fontWeight: 700
    lineHeight: 1.2
  h2:
    fontFamily: Inter
    fontSize: 1.375rem
    fontWeight: 700
    lineHeight: 1.3
  h3:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: 600
  body:
    fontFamily: Inter
    fontSize: 0.875rem
    lineHeight: 1.7
  code:
    fontFamily: JetBrains Mono
    fontSize: 0.8rem
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
gradients:
  primary: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
  tech: "linear-gradient(135deg, #4f8ef7 0%, #22d3ee 100%)"
  success: "linear-gradient(135deg, #10b981 0%, #059669 100%)"
components:
  sidebar:
    width: 260px
    background: "{colors.bg-sidebar}"
    borderRight: "1px solid {colors.border}"
  nav-item:
    fontSize: 0.8rem
    padding: "7px 20px"
    textColor: "{colors.text-secondary}"
    activeColor: "{colors.accent-blue}"
    activeBackground: "rgba(79,142,247,0.08)"
  card:
    background: "{colors.bg-card}"
    hoverBackground: "{colors.bg-card-hover}"
    border: "1px solid {colors.border}"
    rounded: "{rounded.lg}"
    padding: 24px
  code-block:
    background: "#0d1626"
    textColor: "#c9d1d9"
    border: "1px solid {colors.border}"
    rounded: "{rounded.md}"
  badge:
    isrBackground: "rgba(34,211,238,0.15)"
    isrColor: "#67e8f9"
    spaBackground: "rgba(139,92,246,0.15)"
    spaColor: "#a78bfa"
    apiBackground: "rgba(245,158,11,0.15)"
    apiColor: "#fbbf24"
---

# HeHe Client Design System

## Overview

HeHe Client 是主站官网白皮书页面，采用深海暗色科技主题。左侧固定 260px 侧边栏导航 + 右侧主内容区的双栏布局，内容区包含顶部固定 header 和滚动的 section 内容。整体氛围沉稳专业，通过渐变光晕和荧光色点缀营造科技感。

## Colors

### 背景层次

背景采用三层深蓝递进体系，从最深的外层到稍浅的卡片层，形成空间纵深感。

| Token | Hex | 用途 |
|-------|-----|------|
| `bg-primary` | `#0a0e1a` | 页面主背景 |
| `bg-secondary` | `#0f1628` | 二级区块背景 |
| `bg-card` | `#131d35` | 卡片/面板背景 |
| `bg-card-hover` | `#1a2540` | 卡片悬停态 |
| `bg-sidebar` | `#080c18` | 侧边栏背景（最深） |

### 强调色

| Token | Hex | 用途 |
|-------|-----|------|
| `accent-blue` | `#4f8ef7` | 主品牌色、激活态、链接 |
| `accent-purple` | `#8b5cf6` | 辅助强调、SPA 标签 |
| `accent-cyan` | `#22d3ee` | 科技亮点、ISR 标签、Logo 光点 |
| `accent-green` | `#10b981` | 成功状态、运行中 |
| `accent-orange` | `#f59e0b` | 警告、API 标签 |
| `accent-red` | `#ef4444` | 错误状态、危险操作 |

### 文字色

| Token | Hex | 用途 |
|-------|-----|------|
| `text-primary` | `#e2e8f0` | 标题、正文 |
| `text-secondary` | `#94a3b8` | 描述文字、导航项 |
| `text-muted` | `#64748b` | 辅助提示、版本号 |

## Typography

字体栈：`'Inter', 'Noto Sans SC', sans-serif`（中英文混排）。代码块使用 `'JetBrains Mono', monospace`。

| 级别 | 大小 | 字重 | 用途 |
|------|------|------|------|
| h1 | 2rem | 700 | Hero 标题、章节大标题 |
| h2 | 1.375rem | 700 | Section 标题 |
| h3 | 1rem | 600 | 卡片标题、小节标题 |
| body | 0.875rem | 400 | 正文、段落 |
| code | 0.8rem | 400 | 代码块内容 |

行高：正文 1.7，标题 1.2–1.3。

## Layout

### 双栏结构

```
┌──────────┬──────────────────────────────┐
│          │  ┌────────────────────────┐  │
│ Sidebar  │  │ Header (fixed top)     │  │
│ 260px    │  ├────────────────────────┤  │
│ fixed    │  │                        │  │
│ left: 0  │  │  Content Area          │  │
│          │  │  max-width: 960px      │  │
│          │  │  margin: 0 auto        │  │
│          │  │                        │  │
└──────────┴──┴────────────────────────┘  │
```

- Sidebar：`position: fixed; width: 260px; height: 100vh`
- Content：`margin-left: 260px; padding: 0 40px 64px`
- Header：`position: fixed; top: 0; height: 56px; backdrop-filter: blur(12px)`

### 间距体系

- Section 间距：`80px`
- 卡片内边距：`24px`
- 侧边栏导航项垂直间距：`2px`
- 响应式断点：`1024px`（侧边栏折叠为抽屉）

## Components

### Sidebar Navigation

侧边栏包含 Logo 区 + 分组导航。分组标题用 `text-muted` 小号字（10px uppercase），导航项悬停时文字变为 `text-primary`。

激活态：左侧 2px `accent-blue` 竖线 + 蓝色半透明背景 + 文字变为 `accent-blue`。

### Cards

卡片使用 `bg-card` 背景 + `border` 描边 + `lg` 圆角，悬停时背景过渡为 `bg-card-hover` 并微上移（`translateY(-2px)`）。

### Code Blocks

深色代码块使用 `#0d1626` 背景 + `border` 描边。关键字颜色使用 `accent-cyan`（类型）和 `accent-blue`（函数名）。

### Badges

渲染策略标签使用半透明背景 + 同色系文字 + 同色系描边的统一样式：

- ISR：cyan 系
- SPA：purple 系
- API：orange 系

## Do's and Don'ts

**Do:**
- 保持暗色主题一致性，所有新增 section 使用 CSS 变量
- 导航项编号使用两位数字（01–18）
- 代码块使用 JetBrains Mono 字体
- 响应式：≤1024px 时侧边栏折叠为汉堡菜单抽屉

**Don't:**
- 不要在暗色背景上使用纯白文字（用 `#e2e8f0` 代替）
- 不要使用内联颜色值，统一走 CSS 变量
- 不要在非代码区域使用等宽字体
