# Security Policy

## 支持的版本

| 版本 | 支持状态 |
|------|----------|
| 1.0.x | ✅ 活跃支持 |

## 报告安全漏洞

如果你发现安全漏洞，**请不要在公开 Issue 中报告**。

请通过以下方式私下报告：

1. 发送邮件至项目维护者
2. 在 GitHub 上使用 "Report a vulnerability" 功能（如已启用）

我们会在 48 小时内确认收到报告，并在 7 天内提供初步评估和修复计划。

## 安全架构

HeHe App 采用 **5 层纵深防御模型**：

```
Layer 1: 管理员断言 (assertAdmin)
         → /api/admin/* 端点强制管理员身份

Layer 2: 用户认证守卫 (assertUser)
         → /api/v1/* 敏感端点强制登录

Layer 3: RLS 行级安全 (FORCE ROW LEVEL SECURITY)
         → 数据库层用户数据隔离

Layer 4: Zod 输入校验
         → API 入参类型与业务规则校验

Layer 5: API 安全扫描 (@api-auth 声明)
         → 自动化测试验证鉴权完整性
```

## 密钥管理

### 绝对禁止暴露到前端

以下密钥**永远不能**加 `NUXT_PUBLIC_` 前缀：

| 密钥 | 风险 |
|------|------|
| `SUPABASE_SERVICE_ROLE_KEY` | 绕过 RLS，可读写所有数据 |
| `STRIPE_SECRET_KEY` | 创建 PaymentIntent，发起扣款 |
| `STRIPE_WEBHOOK_SECRET` | 伪造 Webhook 事件 |

### 密钥存储位置

| 密钥 | 存储位置 |
|------|----------|
| Supabase 凭据 | `.env` → Vercel Environment Variables |
| Stripe 密钥 | `.env` → Vercel Environment Variables |
| OAuth Client Secret | Supabase Dashboard（永不在代码中） |

## 已知安全措施

- ✅ 所有数据库表启用 RLS + FORCE RLS
- ✅ 管理员权限使用 `is_admin()` SECURITY DEFINER 函数
- ✅ 审计日志 append-only（`activity_logs` 表不可删除）
- ✅ Auth Cookie 使用 SameSite=Strict + Secure（HTTPS）
- ✅ 金额字段使用 NUMERIC 类型（防浮点精度问题）
- ✅ API 安全扫描器自动检测鉴权缺失
- ✅ OpenAPI 文档开发与生产环境均支持直接访问
- ✅ `.env` 已加入 `.gitignore`

## 依赖安全

定期运行以下命令检查依赖漏洞：

```bash
npm audit
```

CI 流水线中应包含 `npm audit --audit-level=high` 步骤。

## 安全最佳实践

1. **永远不要**在代码中硬编码密钥或密码
2. **永远不要**将 `.env` 文件提交到版本控制
3. 使用 Vercel Environment Variables 管理生产环境密钥
4. 定期轮换 `SUPABASE_SERVICE_ROLE_KEY`
5. 为 Supabase 数据库启用 Point-in-Time Recovery（PITR）
6. 启用 Vercel 的 DDoS 防护和速率限制
