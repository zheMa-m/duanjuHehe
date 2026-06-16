# GitHub 使用与集成指南

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

1. 打开 [github.com](https://github.com)
2. 点击 **Sign up**，填写邮箱、密码、用户名
3. 完成邮箱验证
4. 选择 **Free** 计划（免费，足够个人项目）

### 2.2 安装 Git

```bash
# macOS（如果还没装）
brew install git

# 验证安装
git --version

# 首次使用配置身份
git config --global user.name "你的名字"
git config --global user.email "your-email@example.com"
```

### 2.3 安装 GitHub CLI（可选但推荐）

```bash
# macOS
brew install gh

# 登录
gh auth login
# 选择 GitHub.com → HTTPS → 用浏览器登录
```

---

## 3. 创建仓库

### 3.1 通过 GitHub 网页创建

1. 登录 GitHub → 右上角 **+** → **New repository**
2. 填写：
   - **Repository name**：`hehe-app`
   - **Description**：单人全栈项目 — Nuxt 4 + Supabase + Vercel
   - **Public/Private**：选 **Private**（项目含商业逻辑，建议私有）
   - **Initialize**：勾选 ✅ Add a README file
3. 点击 **Create repository**

### 3.2 通过 gh CLI 创建

```bash
gh repo create hehe-app --private --description "单人全栈项目"
```

### 3.3 推送本地代码到远程

```bash
# 进入项目目录
cd /path/to/hehe-app

# 初始化 git（如果还没有）
git init
git branch -M main

# 关联远程仓库
git remote add origin https://github.com/你的用户名/hehe-app.git

# 首次提交
git add .
git commit -m "Initial commit: Nuxt 4 + Supabase + Vercel scaffold"
git push -u origin main
```

---

## 4. .gitignore 配置

确保敏感文件和不必要的文件不会被提交到仓库。

### 4.1 检查现有 .gitignore

项目根目录应已有 `.gitignore`，确认包含以下内容：

```gitignore
# 依赖
node_modules/
.nuxt/
.output/

# 环境变量（严禁提交密钥）
.env
.env.local
.env.production

# 编辑器
.vscode/
.idea/
*.swp

# 系统文件
.DS_Store
Thumbs.db

# 构建产物
dist/
build/
```

> **安全红线**：`.env` 文件包含 Supabase 密钥和 Stripe 密钥，绝对不能提交到 GitHub。如果误提交，需要立即轮换（rotate）所有密钥。

### 4.2 验证 .gitignore 生效

```bash
# 检查 .env 是否被 git 追踪
git ls-files | grep ".env"
# 应该没有输出

# 如果 .env 已被追踪，需要移除（但不删除本地文件）
git rm --cached .env
git commit -m "chore: remove .env from tracking"
```

---

## 5. 分支策略

### 5.1 推荐的分支模型

单人项目不需要复杂的分支模型，但保持基本规范很有价值：

| 分支 | 用途 | 部署行为 |
|------|------|----------|
| `main` | 生产代码，始终保持可部署状态 | Vercel 自动部署到 Production |
| `feature/*` | 新功能开发 | Vercel 自动生成 Preview 环境 |
| `fix/*` | Bug 修复 | Vercel 自动生成 Preview 环境 |
| `hotfix/*` | 紧急修复 | 合并到 main 后立即部署 |

### 5.2 日常开发流程

```bash
# 1. 开始新功能前，确保 main 是最新的
git checkout main
git pull origin main

# 2. 创建功能分支
git checkout -b feature/add-login-page

# 3. 开发过程中定期提交
git add .
git commit -m "feat: add login form UI"

# 4. 推送到远程
git push origin feature/add-login-page
# → Vercel 自动生成预览环境
# → 预览 URL: https://hehe-app-git-feature-add-login-page-xxx.vercel.app

# 5. 验证预览环境无误后，创建 Pull Request

# 6. PR 合并到 main 后，Vercel 自动部署到生产

# 7. 清理已合并的分支
git branch -d feature/add-login-page
git push origin --delete feature/add-login-page
```

### 5.3 Commit 消息规范

推荐使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```
feat: 新增用户评价功能
fix: 修复 H5 页面支付按钮状态卡死
docs: 更新 Supabase 集成指南
style: 统一管理后台卡片圆角
refactor: 重构 auth 中间件逻辑
perf: 优化广告事件上报性能
chore: 更新依赖版本
```

格式：`<type>: <description>`

---

## 6. Branch Protection Rules（分支保护）

保护 `main` 分支不被意外强制推送或删除。

### 6.1 配置步骤

1. 进入 GitHub 仓库 → **Settings** → **Branches**
2. 点击 **Add branch protection rule**
3. 配置：

| 选项 | 值 | 说明 |
|------|-----|------|
| **Branch name pattern** | `main` | 保护 main 分支 |
| **Require a pull request before merging** | ✅ | 禁止直接 push 到 main |
| Require approvals | 0 | 单人项目不需要他人审批 |
| **Require status checks to pass** | ✅ | CI 检查通过才能合并 |
| Status checks | `typecheck`, `build` | 下方 Actions 配置的检查名 |
| **Do not allow force pushes** | ✅ | 禁止强制推送 |
| **Do not allow deletions** | ✅ | 禁止删除分支 |

4. 点击 **Create**

> 单人项目建议至少开启「禁止 force push」和「需要 status checks」。PR 流程可以按需关闭。

---

## 7. GitHub Actions CI/CD

GitHub Actions 可以在每次 push / PR 时自动执行类型检查和构建验证，在代码合并前发现问题。

### 7.1 创建 CI Workflow

在项目根目录创建 `.github/workflows/ci.yml`：

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

### 7.2 Workflow 工作原理

```
push 代码到 GitHub
    ↓
GitHub Actions 自动触发
    ↓
┌──────────────────────────────┐
│  Job: Typecheck & Build       │
│  1. checkout 代码              │
│  2. 安装 Node.js 20           │
│  3. npm ci 安装依赖            │
│  4. npm run check 类型检查     │
│  5. npm run build 构建验证     │
└──────────────────────────────┘
    ↓
├── 全部通过 → PR 显示绿色 ✓ → 可以合并
└── 任一失败 → PR 显示红色 ✗ → 必须修复后才能合并
```

### 7.3 查看 CI 结果

- **PR 页面**：底部会显示 CI 状态（✓ 通过 / ✗ 失败）
- **Actions 标签**：仓库顶部的 Actions 标签可以查看所有 CI 运行历史和详细日志
- **失败排查**：点击失败的 job → 查看具体哪一步报错

### 7.4 环境变量与 CI

GitHub Actions 运行环境中没有 `.env` 文件。如果 CI 需要环境变量：

1. 进入仓库 → **Settings** → **Secrets and variables** → **Actions**
2. 点击 **New repository secret**
3. 添加 CI 需要的变量（如 `MOCK_DB=true` 让构建不依赖真实数据库）

> 本项目的 `npm run check` 和 `npm run build` 不需要 Supabase 或 Stripe 凭据，所以 CI 中无需配置 Secrets。

---

## 8. Pull Request 工作流

### 8.1 创建 PR

1. 推送功能分支后，GitHub 页面顶部会出现黄色横幅：**Compare & pull request**
2. 点击后填写：
   - **Title**：简要描述变更（如 `feat: add user review component`）
   - **Description**：详细说明改了什么、为什么改、如何测试
3. 点击 **Create pull request**

### 8.2 PR 模板（可选）

在仓库根目录创建 `.github/pull_request_template.md`：

```markdown
## 变更说明

<!-- 简要描述这次 PR 做了什么 -->

## 测试方式

<!-- 说明如何验证了这些变更 -->

## 检查清单

- [ ] `npm run check` 类型检查通过
- [ ] `npm run build` 构建成功
- [ ] 已更新相关文档
```

### 8.3 合并 PR

确认 CI 通过后：

1. 点击 **Merge pull request**
2. 选择合并方式：
   - **Merge commit**：保留完整历史（推荐）
   - **Squash and merge**：将所有 commit 压缩为一个（适合小功能）
   - **Rebase and merge**：线性历史（适合强迫症）
3. 点击 **Confirm merge**
4. 合并后 Vercel 自动部署到生产环境

---

## 9. 与 Vercel 联动

### 9.1 Vercel GitHub 集成

Vercel 通过 GitHub App 实现自动部署：

1. 在 Vercel Dashboard 导入项目时，选择 GitHub 仓库
2. Vercel 会请求 GitHub 授权，允许访问仓库
3. 授权后：
   - **push 到 main** → 自动部署到 Production
   - **push 到任意分支** → 自动生成 Preview 环境
   - **PR 创建** → Vercel Bot 在 PR 下评论预览链接

### 9.2 Preview Deployments

每个 PR 自动获得独立的预览环境：

```
PR #15: feature/new-login
    ↓
Vercel 自动构建并部署
    ↓
预览 URL: https://hehe-app-git-feature-new-login-yourname.vercel.app
    ↓
Vercel Bot 在 PR 中评论预览链接和构建状态
    ↓
点击链接验证 → 确认无误 → 合并 PR → 自动部署到生产
```

### 9.3 环境变量同步

Vercel 的环境变量（在 Vercel Dashboard 中配置）自动应用于所有部署：

- **Production** 变量 → main 分支的部署
- **Preview** 变量 → 功能分支的部署
- **Development** 变量 → `vercel dev` 本地开发

> 详细的环境变量配置见 [03-vercel-deployment.md](./03-vercel-deployment.md) 第 4 节。

---

## 10. .gitattributes 配置

统一换行符，避免跨平台协作时出现格式问题：

在项目根目录创建 `.gitattributes`：

```
* text=auto eol=lf
```

---

## 11. 安全实践

### 11.1 密钥泄露应急

如果不小心将 `.env` 提交到 GitHub：

```bash
# 1. 立即从 git 历史中移除
git rm --cached .env
git commit -m "security: remove .env from tracking"

# 2. 轮换（rotate）所有泄露的密钥：
#    - Supabase Dashboard → Settings → API → 重新生成 service_role key
#    - Stripe Dashboard → Developers → API Keys → 滚动 Secret key
#    - 更新 Vercel Dashboard 中的环境变量

# 3. 清理 git 历史（彻底删除 .env 文件）
#    使用 git-filter-repo（需要额外安装）
brew install git-filter-repo
git filter-repo --invert-paths --path .env
```

> **重要**：仅 `git rm` 不会从历史中删除文件。任何有仓库访问权限的人都能从历史 commit 中看到旧的密钥内容。必须使用 `git-filter-repo` 清理，或直接删除仓库重建。

### 11.2 GitHub Secrets

CI/CD 中需要的敏感信息存储在 GitHub Secrets 中，而不是代码中：

- 仓库 → **Settings** → **Secrets and variables** → **Actions**
- Secrets 在日志中自动隐藏（显示为 `***`）
- 支持 Repository、Environment、Organization 三个层级

---

## 12. 常见问题

### Q: `git push` 报 `Permission denied (publickey)`

本地使用 HTTPS 协议而非 SSH：

```bash
# 检查当前 remote 协议
git remote -v

# 如果是 git@github.com:... (SSH)，改为 HTTPS
git remote set-url origin https://github.com/你的用户名/hehe-app.git

# 或使用 gh CLI 自动处理认证
gh auth setup-git
```

### Q: `git push` 报 `Updates were rejected` (远程有新提交)

```bash
# 先拉取远程变更再推送
git pull --rebase origin main
git push origin main
```

### Q: CI 检查失败，PR 无法合并

1. 进入仓库 → Actions → 找到失败的 workflow
2. 点击失败 job → 查看日志定位错误
3. 常见原因：
   - 类型错误 → `npm run check` 失败 → 修复类型后重新 push
   - 构建失败 → `npm run build` 失败 → 查看构建日志
   - 依赖缺失 → `npm ci` 失败 → 确认 `package-lock.json` 已提交

### Q: 如何恢复误删的文件

```bash
# 从 git 历史中恢复
git checkout HEAD~1 -- path/to/deleted-file
git add path/to/deleted-file
git commit -m "revert: restore accidentally deleted file"
```

### Q: 如何查看某个文件的所有修改历史

```bash
git log --follow -p -- path/to/file
```

### Q: 如何撤销最近一次 commit（但保留修改）

```bash
# 撤销 commit，修改回到暂存区
git reset --soft HEAD~1

# 撤销 commit，修改回到工作区（不暂存）
git reset HEAD~1
```

---

## 13. 快速命令参考

```bash
# ── 日常开发 ──
git status                      # 查看当前变更状态
git add .                       # 暂存所有变更
git commit -m "feat: xxx"       # 提交
git push origin HEAD            # 推送到当前分支的远程

# ── 分支管理 ──
git branch -a                   # 查看所有分支（含远程）
git checkout -b feature/xxx     # 创建并切换到新分支
git checkout main               # 切换回 main
git pull origin main            # 拉取最新 main
git branch -d feature/xxx       # 删除已合并的本地分支

# ── PR 流程 ──
git push origin feature/xxx     # 推送功能分支
gh pr create                    # 用 gh CLI 创建 PR
gh pr merge --squash            # 合并 PR (Squash)
gh pr list                      # 列出所有 PR

# ── 历史与回退 ──
git log --oneline -10           # 查看最近 10 条 commit
git diff                        # 查看未暂存的变更
git stash                       # 临时保存未提交的变更
git stash pop                   # 恢复保存的变更

# ── GitHub CLI ──
gh repo view                    # 查看仓库信息
gh run list                     # 查看 Actions 运行历史
gh run view <run-id>            # 查看某次运行详情
```

---

## 14. 相关文档

- 部署配置 → [03-vercel-deployment.md](./03-vercel-deployment.md) 第 2 节（GitHub 仓库准备）、第 11 节（Preview Deployments）
- 项目基础 → [01-scaffold-basics.md](./01-scaffold-basics.md)（项目结构和环境变量）
- 数据库集成 → [02-supabase-integration.md](./02-supabase-integration.md)（迁移文件需提交到 git）
- Cloudflare（可选） → [09-cloudflare-optional.md](./09-cloudflare-optional.md)（DNS 管理与 CDN 加速）
