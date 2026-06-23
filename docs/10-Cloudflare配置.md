# 10 Cloudflare DNS 与安全（可选）

> DNS 管理、CDN 加速与安全防护 — 可选增强方案

---

## 1. Cloudflare 是什么

Cloudflare 是全球最大的 CDN 和网络安全服务商，在本项目中可选用于：

- **DNS 管理**：统一管理域名解析记录
- **CDN 加速**：全球边缘缓存
- **安全防护**：DDoS 防御、WAF 防火墙、Bot 拦截

> **重要提醒**：Vercel 官方建议 **不要**在 Vercel 前面使用 Cloudflare 的反向代理模式（橙色云朵）。推荐用法：**Cloudflare 仅做 DNS 管理（灰色云朵 DNS-only），由 Vercel 处理 CDN 和安全**。

---

## 2. 何时需要 Cloudflare

| 场景 | 是否需要 |
|------|----------|
| 域名在 Namecheap/GoDaddy 注册 | 可选 |
| 需要比注册商更快的 DNS | ✅ 推荐 |
| 域名在国内注册，海外用户访问慢 | ✅ 推荐 |
| 需要 WAF 规则、Bot 拦截 | ✅ 推荐（DNS-only 模式） |
| 需要通配符 DNS 但 Vercel Nameservers 已满足 | 不需要 |

---

## 3. 前置准备

1. 注册 [cloudflare.com](https://www.cloudflare.com) → Free 计划
2. 确认已有域名

---

## 4. 添加站点

1. Cloudflare Dashboard → Add a site → 输入域名
2. 选择 Free 计划
3. Cloudflare 分配 Nameservers（如 `anna.ns.cloudflare.com`）
4. 去域名注册商修改 Nameservers
5. 等待 DNS 传播（5-30 分钟）

```bash
dig yourdomain.com NS   # 验证：应返回 xxx.ns.cloudflare.com
```

---

## 5. DNS 记录配置

> **核心原则**：Vercel 域名使用 **DNS-only（灰色云朵）**，不开启 Cloudflare 代理。

| 类型 | 名称 | 值 | 代理状态 |
|------|------|-----|----------|
| CNAME | `@` | `cname.vercel-dns.com` | DNS-only（灰色） |
| CNAME | `www` | `cname.vercel-dns.com` | DNS-only（灰色） |
| CNAME | `admin` | `cname.vercel-dns.com` | DNS-only（灰色） |
| CNAME | `api` | `cname.vercel-dns.com` | DNS-only（灰色） |
| CNAME | `*` | `cname.vercel-dns.com` | DNS-only（灰色） |

### 为什么用 DNS-only

1. 反向代理会干扰 Vercel 安全检测
2. 增加延迟（多一层代理）
3. 缓存冲突（Cloudflare vs Vercel ISR/SWR）
4. SSL 证书双层 HTTPS 可能出错

---

## 6. SSL/TLS 配置

进入 **SSL/TLS** → **Overview**：选择 **Full (Strict)**

进入 **Edge Certificates**：
- ✅ Always Use HTTPS
- ✅ Automatic HTTPS Rewrites

---

## 7. 安全功能（Free 计划可用）

### DDoS 防护

Free 计划自带不限量 DDoS 防护，无需额外配置。

### WAF

Free 计划包含基础 WAF 规则：SQL 注入、XSS、路径遍历自动拦截。

### Bot 防护

**Security → Bots** → 开启 **Bot Fight Mode**

### Rate Limiting

**Security → WAF → Rate limiting rules**：
- 100 requests per 1 minute → Block

---

## 8. 通配符 DNS 配置

H5 营销页矩阵需要 `*.yourdomain.com` 通配符解析。

1. DNS → Records → Add record
2. Type: CNAME / Name: `*` / Target: `cname.vercel-dns.com` / Proxy: DNS only

```bash
dig ai.yourdomain.com CNAME     # 验证通配符解析
```

> 在 Vercel 中也需添加 `*.yourdomain.com` 域名。

---

## 9. 纯 Cloudflare DNS vs Vercel Nameservers

| 对比项 | Cloudflare DNS（灰色） | Vercel Nameservers |
|--------|----------------------|-------------------|
| DNS 解析速度 | 全球最快（< 10ms） | 快（~ 20ms） |
| 安全功能 | WAF、Bot、Rate Limiting | Vercel Firewall |
| 通配符 DNS | ✅ | ✅ |
| 配置复杂度 | 两层维护 | 单平台 |
| 适合场景 | 需要高级安全功能 | 追求简单 |

**建议**：新手直接用 Vercel Nameservers；进阶用 Cloudflare DNS-only。

---

## 10. 常见问题

### Q: 开启 Cloudflare 代理后 Vercel 报 `Invalid Configuration`

将记录改为 **DNS-only（灰色云朵）**，等待 1-2 分钟。

### Q: SSL 证书报错

确保 Cloudflare SSL/TLS 选择 **Full (Strict)**，Vercel 自动签发证书。

### Q: DNS 记录更新后多久生效

Cloudflare DNS 更新 5-30 秒内生效。首次切换 Nameservers 可能最长 24 小时。

### Q: 免费计划够用吗

Free 计划完全够用：无限 DNS、无限 DDoS、基础 WAF、Bot Fight Mode、SSL。

---

## 11. 快速命令参考

```bash
dig yourdomain.com NS
dig admin.yourdomain.com CNAME
dig *.yourdomain.com CNAME
curl -I https://yourdomain.com
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
```

---

## 12. 相关文档

- Vercel 部署 → [05-Vercel部署.md](./05-Vercel部署.md)
- GitHub CI/CD → [06-GitHub与CI-CD.md](./06-GitHub与CI-CD.md)
- 项目架构 → [02-项目架构.md](./02-项目架构.md)
