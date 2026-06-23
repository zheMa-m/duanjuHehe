# 06 GitHub 与 CI/CD

> 代码托管、分支策略、CI/CD 自动化与 Vercel 部署联动

---

## 1. GitHub 是什么

GitHub 是全球最大的代码托管平台，在本项目中承担：

- **代码仓库**：所有源码的版本控制和备份
- **自动部署**：与 Vercel 联动，push 代码自动构建部署
- **CI/CD**：通过 GitHub Actions 自动执行类型检查和构建验证
- **协作**：即使单人项目，PR 流程也能帮你回顾代码质量

---

## 2. 前置准备

### 2.1 注册 GitHub 账号

[github.com](https://github.com) → Sign up → 完成邮箱验证 → Free 计划

### 2.2 安装 Git

```bash
brew install git
git config --global user.name "你的名字"
git config --global user.email "your-email@example.com"
```

### 2.3 安装 GitHub CLI（可选）

```bash
brew install gh
gh auth login
```

---

## 3. 创建仓库

### 3.1 通过 gh CLI

```bash
gh repo create hehe-app --private --description "单人全栈项目"
```

### 3.2 推送本地代码

```bash
cd /path/to/hehe-app
git init
git branch -M main
git remote add origin https://github.com/你的用户名/hehe-app.git
git add .
git commit -m "Initial commit: Nuxt 4 + Supabase + Vercel scaffold"
git push -u origin main
```

---

## 4. .gitignore 配置

```gitignore
node_modules/
.nuxt/
.output/
.data/
.nitro/
.cache/

# 环境变量（严禁提交密钥）
.env
.env.*
!.env.example

.vscode/
.idea/
*.swp
.DS_Store
dist/
build/
.vercel
```

> **安全红线**：`.env` 文件包含密钥，绝对不能提交。如果误提交，立即轮换所有密钥。

---

## 5. 分支策略

| 分支 | 用途 | 部署行为 |
|------|------|----------|
| `main` | 生产代码 | Vercel 自动部署到 Production |
| `feature/*` | 新功能 | Vercel 自动生成 Preview 环境 |
| `fix/*` | Bug 修复 | Vercel 自动生成 Preview 环境 |
| `hotfix/*` | 紧急修复 | 合并后立即部署 |

### Commit 规范（Conventional Commits）

```
feat: 新增用户评价功能
fix: 修复 H5 页面支付按钮状态卡死
docs: 更新 Supabase 集成指南
chore: 更新依赖版本
```

---

## 6. Branch Protection Rules

保护 `main` 分支：Settings → Branches → Add branch protection rule

| 选项 | 值 |
|------|-----|
| Branch name pattern | `main` |
| Require a pull request before merging | ✅ |
| Require status checks to pass | ✅ |
| Do not allow force pushes | ✅ |
| Do not allow deletions | ✅ |

---

## 7. GitHub Actions CI/CD

### 7.1 创建 CI Workflow

`.github/workflows/ci.yml`：

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  check:
    name: Typecheck & Build
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run check

      - name: Build
        run: npm run build
```

### 7.2 工作流程

```
push → GitHub Actions 触发 → check + build
  ├── 全部通过 → PR 绿色 ✓ → 可合并
  └── 任一失败 → PR 红色 ✗ → 必须修复
```

---

## 8. Pull Request 工作流

```bash
git checkout -b feature/add-login-page
git add .
git commit -m "feat: add login form UI"
git push origin feature/add-login-page
# → Vercel 自动生成预览环境
# → 创建 PR，CI 自动运行
# → 合并后 Vercel 自动部署到生产
```

### PR 模板（可选）

`.github/pull_request_template.md`：

```markdown
## 变更说明
## 测试方式
## 检查清单
- [ ] `npm run check` 通过
- [ ] `npm run build` 成功
- [ ] 已更新相关文档
```

---

## 9. 与 Vercel 联动

- **push 到 main** → 自动部署到 Production
- **push 到任意分支** → 自动生成 Preview 环境
- **PR 创建** → Vercel Bot 评论预览链接

> 详细部署配置见 [05-Vercel部署.md](./05-Vercel部署.md)。

---

## 10. 安全实践

### 密钥泄露应急

```bash
# 1. 立即从 git 移除
git rm --cached .env
git commit -m "security: remove .env from tracking"

# 2. 轮换所有泄露的密钥（Supabase / Stripe）

# 3. 清理 git 历史
brew install git-filter-repo
git filter-repo --invert-paths --path .env
```

> **重要**：仅 `git rm` 不会从历史中删除文件。必须使用 `git-filter-repo` 清理。

### GitHub Secrets

CI/CD 中敏感信息存储在 Settings → Secrets and variables → Actions 中，日志自动隐藏显示为 `***`。

---

## 11. 常见问题

### Q: `git push` 报 `Permission denied`

```bash
git remote set-url origin https://github.com/你的用户名/hehe-app.git
```

### Q: CI 检查失败

进入 Actions → 失败 job → 查看日志 → 修复后重新 push

### Q: 恢复误删的文件

```bash
git checkout HEAD~1 -- path/to/deleted-file
```

### Q: 撤销最近一次 commit（保留修改）

```bash
git reset --soft HEAD~1   # 修改回到暂存区
git reset HEAD~1           # 修改回到工作区
```

---

## 12. 快速命令参考

```bash
# 日常开发
git status / git add . / git commit -m "feat: xxx" / git push origin HEAD

# 分支管理
git checkout -b feature/xxx / git checkout main / git pull origin main
git branch -d feature/xxx

# PR 流程
gh pr create / gh pr merge --squash / gh pr list

# 历史与回退
git log --oneline -10 / git stash / git stash pop
```

---

## 13. 相关文档

- 部署配置 → [05-Vercel部署.md](./05-Vercel部署.md)
- 项目架构 → [02-项目架构.md](./02-项目架构.md)
- 数据库集成 → [04-Supabase数据库集成.md](./04-Supabase数据库集成.md)
- Cloudflare（可选） → [10-Cloudflare配置.md](./10-Cloudflare配置.md)
