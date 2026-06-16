# Cloudflare 接入与使用指南（可选）

> DNS 管理、CDN 加速与安全防护 — 本文档为可选增强方案

---

## 1. Cloudflare 是什么

Cloudflare 是全球最大的 CDN 和网络安全服务商，在本项目中可选用于：

- **DNS 管理**：统一管理域名解析记录，比域名注册商的 DNS 更快更灵活
- **CDN 加速**：全球边缘缓存，加速静态资源访问
- **安全防护**：DDoS 防御、WAF 防火墙、Bot 拦截
- **通配符 DNS**：H5 营销页矩阵需要 `*.yourdomain.com` 通配符解析

> **重要提醒**：本项目部署在 Vercel 上。Vercel 官方建议 **不要**在 Vercel 前面使用 Cloudflare 的反向代理模式（橙色云朵），会干扰 Vercel 的安全检测和缓存管理。推荐的用法是：**Cloudflare 仅做 DNS 管理（灰色云朵 DNS-only），由 Vercel 处理 CDN 和安全**。

---

## 2. 何时需要 Cloudflare

| 场景 | 是否需要 Cloudflare |
|------|---------------------|
| 域名在 Namecheap/GoDaddy 注册，DNS 直接用注册商的 | 可选（注册商 DNS 够用） |
| 需要比注册商更快的 DNS 解析速度 | ✅ 推荐 |
| 域名在国内注册，海外用户访问慢 | ✅ 推荐（Cloudflare DNS 全球分布） |
| 需要通配符 DNS 但 Vercel Nameservers 已能满足 | 不需要（Vercel 已支持） |
| 需要 WAF 规则、Bot 拦截等高级安全 | ✅ 推荐（但用 DNS-only 模式） |
| 想要免费的 DDoS 防护 | ✅ 推荐 |

---

## 3. 前置准备

### 3.1 注册 Cloudflare 账号

1. 打开 [cloudflare.com](https://www.cloudflare.com)
2. 点击 **Sign up**，填写邮箱和密码
3. 完成邮箱验证
4. 选择 **Free** 计划（免费，包含 DNS、CDN、基础安全）

### 3.2 确认已有域名

Cloudflare 需要你已有一个域名。如果还没有，可以在以下平台购买：

| 注册商 | 价格参考 | 说明 |
|--------|----------|------|
| [Namecheap](https://www.namecheap.com) | $10-15/年 | 性价比高，界面友好 |
| [GoDaddy](https://www.godaddy.com) | $12-20/年 | 全球最大注册商 |
| [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/) | 成本价 | Cloudflare 自家注册，无加价 |

> 如果域名在 Cloudflare Registrar 购买，DNS 自动配置，无需手动添加站点。

---

## 4. 添加站点到 Cloudflare

### 4.1 操作步骤

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 点击 **Add a site**
3. 输入你的域名（如 `yourdomain.com`），点击 **Add site**
4. 选择 **Free** 计划，点击 **Continue**
5. Cloudflare 会扫描现有 DNS 记录并导入，确认后点击 **Continue**
6. Cloudflare 会分配两个 Nameservers，例如：
   ```
   anna.ns.cloudflare.com
   bob.ns.cloudflare.com
   ```
7. 去你的域名注册商，将 Nameservers 改为 Cloudflare 提供的地址
8. 等待 DNS 传播（通常 5-30 分钟，最长 24 小时）
9. 回到 Cloudflare Dashboard，点击 **Check nameservers**

### 4.2 验证生效

```bash
# 检查域名 NS 记录是否指向 Cloudflare
dig yourdomain.com NS
# 应该看到 xxx.ns.cloudflare.com
```

---

## 5. DNS 记录配置

### 5.1 与 Vercel 配合的推荐配置

> **核心原则**：Vercel 域名记录使用 **DNS-only（灰色云朵）** 模式，不要开启 Cloudflare 代理（橙色云朵）。

| 类型 | 名称 | 内容 | 代理状态 | 说明 |
|------|------|------|----------|------|
| CNAME | `@` | `cname.vercel-dns.com` | DNS-only（灰色） | 主站指向 Vercel |
| CNAME | `www` | `cname.vercel-dns.com` | DNS-only（灰色） | www 子域 |
| CNAME | `admin` | `cname.vercel-dns.com` | DNS-only（灰色） | 管理后台 |
| CNAME | `api` | `cname.vercel-dns.com` | DNS-only（灰色） | API 接口 |
| CNAME | `*` | `cname.vercel-dns.com` | DNS-only（灰色） | H5 通配符子域 |

### 5.2 为什么用 DNS-only 而非代理模式

Vercel 官方明确指出：

1. **反向代理会干扰 Vercel 安全**：Cloudflare 代理模式会遮挡 Vercel 的 Bot 检测和 DDoS 防护信号
2. **增加延迟**：请求多经过一层代理，响应变慢
3. **缓存冲突**：Cloudflare 缓存和 Vercel ISR/SWR 缓存可能不一致
4. **SSL 证书问题**：双层 HTTPS 可能导致证书配置错误

> **例外情况**：如果你使用 Cloudflare 仅做 DNS 解析（灰色云朵），请求直达 Vercel，不存在以上问题。Cloudflare 的 DNS 解析速度全球最快（平均 < 10ms），这本身就带来了性能提升。

### 5.3 如何切换代理状态

在 Cloudflare Dashboard → DNS → Records：
- 点击记录右侧的 **Edit**
- **Proxy status**：点击云朵图标切换
  - 🟠 橙色 = Proxied（代理模式，不推荐用于 Vercel）
  - ⚪ 灰色 = DNS only（仅 DNS 解析，推荐）

---

## 6. SSL/TLS 配置

### 6.1 推荐设置

进入 Cloudflare Dashboard → **SSL/TLS** → **Overview**：

| 模式 | 说明 | 推荐度 |
|------|------|--------|
| **Off** | 不加密 | ❌ 不要用 |
| **Flexible** | Cloudflare → 用户 HTTPS，Cloudflare → 源站 HTTP | ❌ 不安全 |
| **Full** | 端到端 HTTPS，但不验证源站证书 | ⚠️ 可以用 |
| **Full (Strict)** | 端到端 HTTPS，验证源站证书 | ✅ 推荐 |

> Vercel 自动为所有域名签发 Let's Encrypt 证书，所以选择 **Full (Strict)** 即可。

### 6.2 强制 HTTPS

进入 **SSL/TLS** → **Edge Certificates**：
- 开启 **Always Use HTTPS**
- 开启 **Automatic HTTPS Rewrites**

---

## 7. 安全功能（Free 计划可用）

### 7.1 DDoS 防护

Cloudflare Free 计划自带不限量的 DDoS 防护，无需额外配置。

### 7.2 WAF（Web Application Firewall）

Free 计划包含基础 WAF 规则，自动拦截常见攻击：
- SQL 注入
- XSS 跨站脚本
- 路径遍历

进入 **Security** → **WAF** 可以查看拦截日志。

### 7.3 Bot 防护

进入 **Security** → **Bots**：
- **Bot Fight Mode**：开启后自动挑战可疑 Bot（Free 计划可用）
- 对于合法的搜索引擎爬虫（Googlebot、Bingbot），Cloudflare 自动放行

### 7.4 Rate Limiting

如果需要限制单个 IP 的请求频率：

1. 进入 **Security** → **WAF** → **Rate limiting rules**
2. 创建规则：
   - **Field**：IP Address
   - **Requests per period**：100 requests per 1 minute
   - **Action**：Block

> 本项目已有服务端 APM 中间件（`00.apm.ts`）记录响应时间。Cloudflare Rate Limiting 可以作为额外防护层。

---

## 8. 缓存规则

### 8.1 推荐缓存配置

进入 **Caching** → **Configuration**：

| 设置 | 推荐值 | 说明 |
|------|--------|------|
| Browser Cache TTL | Respect Existing Headers | 遵循 Vercel 返回的缓存头 |
| Always Online | ✅ On | 源站不可用时显示缓存版本 |
| Development Mode | ❌ Off | 生产环境关闭（开启会跳过缓存） |

### 8.2 Page Rules（页面规则）

进入 **Rules** → **Page Rules**，可以针对特定 URL 设置规则：

| URL Pattern | 设置 | 说明 |
|-------------|------|------|
| `yourdomain.com/api/*` | Cache Level: Bypass | API 接口不缓存 |
| `yourdomain.com/_nuxt/*` | Cache Level: Cache Everything, Edge TTL: 1 month | 静态资源长期缓存 |

> **注意**：由于推荐 DNS-only 模式（不经过 Cloudflare 代理），Page Rules 实际上不会生效（它们需要代理模式）。如果使用 DNS-only，缓存完全由 Vercel 的 routeRules 控制。

---

## 9. 通配符 DNS 配置

本项目的 H5 营销页矩阵需要 `*.yourdomain.com` 通配符解析。

### 9.1 在 Cloudflare 中添加通配符记录

1. 进入 DNS → Records → **Add record**
2. 配置：
   - **Type**：CNAME
   - **Name**：`*`
   - **Target**：`cname.vercel-dns.com`
   - **Proxy status**：DNS only（灰色云朵）
3. 点击 **Save**

### 9.2 验证通配符解析

```bash
# 测试任意子域名是否解析到 Vercel
dig ai.yourdomain.com CNAME
dig promo.yourdomain.com CNAME
dig test123.yourdomain.com CNAME
# 都应该返回 cname.vercel-dns.com
```

### 9.3 与 Vercel 通配符域名的配合

在 Vercel 中也需要添加通配符域名：

1. Vercel Dashboard → 项目 → **Settings** → **Domains**
2. 添加 `*.yourdomain.com`
3. Vercel 会签发通配符 SSL 证书

> 详见 [03-vercel-deployment.md](./03-vercel-deployment.md) 第 5 节。

---

## 10. 纯 Cloudflare DNS 方案 vs Vercel Nameservers 方案

| 对比项 | Cloudflare DNS（灰色云朵） | Vercel Nameservers |
|--------|--------------------------|-------------------|
| DNS 解析速度 | 全球最快（< 10ms） | 快（~ 20ms） |
| DNS 管理界面 | 功能丰富，可视化强 | 简洁够用 |
| 安全功能 | WAF、Bot 防护、Rate Limiting | Vercel Firewall |
| 通配符 DNS | ✅ 支持 | ✅ 支持（必须用 Vercel NS） |
| 配置复杂度 | 需要维护两层（Cloudflare + Vercel） | 只维护 Vercel |
| 适合场景 | 需要高级 DNS 管理或安全功能 | 追求简单，一个平台搞定 |

**建议**：
- **新手**：直接用 Vercel Nameservers，少一层配置
- **进阶**：用 Cloudflare DNS-only 做解析，享受更快的 DNS 和免费安全功能

---

## 11. 常见问题

### Q: 开启 Cloudflare 代理后 Vercel 报 `Invalid Configuration`

这是因为 Vercel 检测到反向代理干扰。解决方法：
1. 在 Cloudflare DNS 中将对应记录改为 **DNS-only（灰色云朵）**
2. 等待 1-2 分钟让 DNS 传播
3. Vercel 警告会自动消失

### Q: SSL 证书报错 `ERR_SSL_VERSION_OR_CIPHER_MISMATCH`

检查 Cloudflare SSL/TLS 设置：
1. 确保选择了 **Full (Strict)** 模式
2. Vercel 会自动签发证书，Cloudflare 不需要额外配置证书
3. 如果刚添加域名，证书签发可能需要 5-10 分钟

### Q: 更改 DNS 记录后多久生效

Cloudflare DNS 更新速度通常在 5-30 秒内生效（比其他 DNS 提供商快得多）。但如果之前用的是其他 DNS，首次切换 Nameservers 可能需要最长 24 小时。

### Q: Cloudflare 和 Vercel 的缓存冲突

如果使用 DNS-only 模式，不存在缓存冲突（请求直达 Vercel）。如果使用了代理模式（不推荐），可能出现 Vercel ISR 缓存和 Cloudflare 边缘缓存不一致。解决方法：在 Cloudflare 的缓存规则中，对动态页面设置 `Cache Level: Bypass`。

### Q: 免费计划够用吗

Cloudflare Free 计划对个人项目完全够用：
- 无限 DNS 记录
- 无限 DDoS 防护
- 基础 WAF 规则
- Bot Fight Mode
- SSL 证书
- Page Rules（3 条）

---

## 12. 快速命令参考

```bash
# ── DNS 验证 ──
dig yourdomain.com NS              # 检查 NS 记录
dig yourdomain.com A               # 检查 A 记录
dig admin.yourdomain.com CNAME     # 检查子域名 CNAME
dig *.yourdomain.com CNAME         # 检查通配符记录

# ── SSL 验证 ──
curl -I https://yourdomain.com     # 检查 HTTPS 响应头
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com  # 查看 SSL 证书详情

# ── Cloudflare API（可选）──
# 列出 DNS 记录
curl -X GET "https://api.cloudflare.com/client/v4/zones/<zone-id>/dns_records" \
  -H "Authorization: Bearer <api-token>"
```

---

## 13. 相关文档

- Vercel 部署 → [03-vercel-deployment.md](./03-vercel-deployment.md) 第 5 节（域名配置）、第 14 节（计划选择）
- GitHub 集成 → [04-github-integration.md](./04-github-integration.md)（代码托管与 CI/CD）
- 项目基础 → [01-scaffold-basics.md](./01-scaffold-basics.md)（多域名路由设计）
