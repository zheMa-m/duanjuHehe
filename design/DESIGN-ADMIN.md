---
name: HeHe Admin
description: 管理后台设计系统，纯黑极简主题，Apple 风格毛玻璃交互
colors:
  bg-primary: "#000000"
  bg-sidebar: "#000000"
  bg-workspace: "#000000"
  bg-elevated: "rgba(255,255,255,0.05)"
  bg-hover: "rgba(255,255,255,0.08)"
  bg-active: "rgba(255,255,255,0.10)"
  bg-input: "rgba(255,255,255,0.06)"
  accent-green: "#30d158"
  accent-blue: "#007aff"
  accent-orange: "#ff9f0a"
  accent-red: "#ff453a"
  text-primary: "#ffffff"
  text-secondary: "rgba(255,255,255,0.6)"
  text-muted: "rgba(255,255,255,0.3)"
  border-subtle: "rgba(255,255,255,0.05)"
  border-medium: "rgba(255,255,255,0.1)"
typography:
  h1:
    fontFamily: Inter
    fontSize: 1.25rem
    fontWeight: 600
    lineHeight: 1.3
  h2:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: Inter
    fontSize: 0.75rem
    lineHeight: 1.5
  label:
    fontFamily: Inter
    fontSize: 0.625rem
    fontWeight: 500
    letterSpacing: 0.05em
  mono:
    fontFamily: JetBrains Mono
    fontSize: 0.6875rem
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  "2xl": 32px
rounded:
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  full: 9999px
components:
  sidebar:
    width: 240px
    background: "{colors.bg-sidebar}"
    borderRight: "1px solid {colors.border-subtle}"
  sidebar-item:
    padding: "10px 12px"
    fontSize: 0.75rem
    textColor: "{colors.text-secondary}"
    iconSize: 0.875rem
  sidebar-item-active:
    background: "{colors.bg-active}"
    textColor: "{colors.text-primary}"
  header:
    height: 56px
    background: "rgba(0,0,0,0.4)"
    backdropFilter: "blur(12px)"
    borderBottom: "1px solid {colors.border-subtle}"
  card:
    background: "rgba(255,255,255,0.03)"
    border: "1px solid {colors.border-subtle}"
    rounded: "{rounded.lg}"
  table-row:
    height: 48px
    borderBottom: "1px solid {colors.border-subtle}"
    hoverBackground: "rgba(255,255,255,0.02)"
  pill-badge:
    padding: "2px 8px"
    fontSize: 0.625rem
    rounded: "{rounded.full}"
    background: "{colors.bg-elevated}"
    border: "1px solid {colors.border-medium}"
---

# HeHe Admin Design System

## Overview

HeHe Admin 是管理后台，采用纯黑极简设计语言，灵感来自 Apple 系统级管理工具。全黑背景消除视觉噪声，让数据和操作成为焦点。交互元素使用白色透明度层级区分状态，毛玻璃（backdrop-blur）效果用于顶栏和弹窗。

## Colors

### 背景

整个管理后台使用纯黑 `#000000` 作为唯一背景色，通过白色透明度层级建立视觉层次。

| Token | 值 | 用途 |
|-------|-----|------|
| `bg-primary` | `#000000` | 全局背景 |
| `bg-elevated` | `rgba(255,255,255,0.05)` | 浮层、输入框、Badge |
| `bg-hover` | `rgba(255,255,255,0.08)` | 悬停态 |
| `bg-active` | `rgba(255,255,255,0.10)` | 激活/选中态 |

### 功能色

| Token | Hex | 用途 |
|-------|-----|------|
| `accent-green` | `#30d158` | 在线/运行中/成功状态点 |
| `accent-blue` | `#007aff` | 文字选中高亮、操作链接 |
| `accent-orange` | `#ff9f0a` | 警告、待处理 |
| `accent-red` | `#ff453a` | 错误、删除、危险操作 |

### 文字色

| Token | 值 | 用途 |
|-------|-----|------|
| `text-primary` | `#ffffff` | 标题、重要数据 |
| `text-secondary` | `rgba(255,255,255,0.6)` | 描述、导航项 |
| `text-muted` | `rgba(255,255,255,0.3)` | 辅助信息、版本号 |

## Typography

字体栈：`Inter, -apple-system, BlinkMacSystemFont, sans-serif`。

| 级别 | 大小 | 字重 | 用途 |
|------|------|------|------|
| h1 | 1.25rem | 600 | 页面标题 |
| h2 | 1rem | 600 | 区块标题、卡片标题 |
| body | 0.75rem | 400 | 正文、表格内容 |
| label | 0.625rem | 500 | 字段标签、Badge 文字 |
| mono | 0.6875rem | 400 | 代码、ID、时间戳 |

标签类文字使用 `uppercase` + `letter-spacing: 0.05em` 增强可读性。

## Layout

### 三栏结构

```
┌──────────┬──────────────────────────────────┐
│          │  ┌──────────────────────────────┐│
│ Sidebar  │  │ Header (backdrop-blur)       ││
│ 240px    │  ├──────────────────────────────┤│
│ fixed    │  │                              ││
│          │  │  Workspace Content           ││
│          │  │  p-8                         ││
│          │  │                              ││
└──────────┴──┴──────────────────────────────┘│
```

- Sidebar：`w-60 (240px)`，隐藏于 `< lg` 断点
- Header：`h-14 (56px)`，毛玻璃效果 `backdrop-blur-md`
- Workspace：`flex-1; padding: 32px`

### 响应式

- `≥ lg (1024px)`：三栏布局，侧边栏可见
- `< lg`：侧边栏隐藏，通过汉堡菜单唤出
- 所有表格在 `< md` 时切换为卡片列表

## Components

### Sidebar

左侧固定导航，Logo 区为白底黑字方块 + 项目名称。导航项使用图标 + 文字排列，激活态为白色半透明背景 + 纯白文字。底部显示版本号。

### Header

顶部栏使用 `bg-black/40` + `backdrop-blur-md` 实现毛玻璃效果。左侧显示环境标签（MOCK_DB / PRODUCTION），右侧显示管理员头像和快捷操作。

### Data Tables

表格行高 48px，行间使用 `border-subtle` 分隔线。悬停行使用极浅白色透明度 `rgba(255,255,255,0.02)` 高亮。

### Stat Cards

数据统计卡片使用 `rgba(255,255,255,0.03)` 背景 + 同色系描边，数值用大号粗体白色字显示。

### Pill Badges

状态标签使用全圆角 + 半透明背景 + 同色系描边，文字为 `0.625rem`。

### Modal

弹窗使用纯白背景（登录卡片 `#fff`）或深色毛玻璃（配置弹窗 `backdrop-blur`），根据场景选择。

## Do's and Don'ts

**Do:**
- 所有背景保持纯黑，通过白色透明度层级区分元素
- 功能色严格对应语义（绿=成功、红=错误、橙=警告、蓝=操作）
- 状态指示点使用 4px 圆形 + 对应功能色
- 表格操作列固定在右侧，使用图标按钮

**Don't:**
- 不要在管理后台使用彩色背景
- 不要使用渐变（除了登录卡片毛玻璃）
- 不要使用圆角超过 16px（除了 Pill Badge）
- 不要添加不必要的装饰元素
