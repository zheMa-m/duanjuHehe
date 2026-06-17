# Contributing to HeHe App

感谢你对 HeHe App 的关注！本项目是单人全栈独立闭环脚手架，但也欢迎社区贡献。

## 行为准则

- 保持专业和尊重的沟通方式
- 聚焦技术讨论，避免无关话题
- 提交前确保代码通过所有检查

## 如何贡献

### 报告 Bug

1. 使用 GitHub Issues 提交 Bug 报告
2. 描述复现步骤、预期行为和实际行为
3. 提供环境信息（Node 版本、操作系统、浏览器等）

### 提交功能建议

1. 在 Issues 中描述功能需求和使用场景
2. 说明该功能如何提升项目价值
3. 标注优先级（P0 必须 / P1 重要 / P2 锦上添花）

### Pull Request 流程

1. **Fork** 本仓库
2. 创建功能分支：`git checkout -b feature/your-feature`
3. 遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范编写 commit
4. 确保通过所有检查：
   ```bash
   npm run check          # TypeScript 类型检查
   npm run test:api-safety # API 安全扫描
   npm run build          # 构建验证
   ```
5. 提交 PR 到 `main` 分支
6. PR 标题遵循 Conventional Commits 格式（如 `feat: add xxx`）

## 开发环境

### 前置要求

- Node.js ≥ 18
- npm ≥ 9
- （可选）Supabase CLI

### 本地开发

```bash
# 克隆项目
git clone <repo-url> && cd hehe-app

# 安装依赖
npm install

# 复制环境变量模板
cp .env.example .env

# 启动开发（Mock DB 模式，无需数据库）
npm run dev

# 或启动完整环境（需要 Supabase CLI）
npm run dev:all
```

## 分支策略

| 分支 | 用途 |
|------|------|
| `main` | 生产分支，自动部署到 Vercel Production |
| `feature/*` | 功能分支，合并到 main 后自动预览部署 |
| `fix/*` | 修复分支，同 feature 流程 |
| `hotfix/*` | 紧急修复，直接基于 main 创建 |

## 代码规范

### Vue 组件

- 使用 **Composition API** + `<script setup lang="ts">`，禁止 Options API
- 图片使用 `<NuxtImg>` 替代原生 `<img>`
- 首屏图片添加 `fetchpriority="high"` + `loading="eager"`
- 用户可见文案使用 `t()` 函数，禁止硬编码中文

### API 端点

- 所有入参使用 **Zod** 校验
- 统一使用 `sendSuccess()` / `throwError()` 响应
- 服务端错误消息用英文，前端通过 i18n 翻译
- 必须声明 `@api-auth` 注释：`admin` / `user` / `public`
- 必须包含 `defineRouteMeta` OpenAPI 元数据

### 数据库

- 所有表必须启用 RLS + FORCE RLS
- 管理员检查使用 `is_admin(auth.uid())` 函数
- 金额字段使用 `NUMERIC` 类型
- 列表查询上限 `pageSize <= 100`

## Commit 规范

本项目遵循 [Conventional Commits](https://www.conventionalcommits.org/)：

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**类型**：`feat` / `fix` / `docs` / `style` / `refactor` / `perf` / `test` / `chore` / `ci`

**示例**：
```
feat(admin): add task CRUD endpoints
fix(auth): resolve JWT refresh race condition
docs(readme): update deployment guide
```

## 项目结构

详见 [README.md](./README.md#项目结构) 和 [AGENTS.md](./AGENTS.md)。

## 参考文档

| 文档 | 说明 |
|------|------|
| [README.md](./README.md) | 项目总览 |
| [AGENTS.md](./AGENTS.md) | AI Agent 开发手册 |
| [DESIGN.md](./DESIGN.md) | 设计系统规范 |
| [docs/](./docs/) | 详细技术文档（9 篇） |
| [CHANGELOG.md](./CHANGELOG.md) | 版本变更记录 |
