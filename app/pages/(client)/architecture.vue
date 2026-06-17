<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'

const { t } = useI18n()

useAppSEO({
  title: () => t('architecture.title'),
  description: () => t('architecture.description'),
})

const sidebarOpen = ref(false)
const toggleSidebar = () => { sidebarOpen.value = !sidebarOpen.value }
const closeSidebar = () => { sidebarOpen.value = false }

let scrollObserver: IntersectionObserver | null = null

onMounted(() => {
  // 导航栏激活高亮
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-item[href^="#"]');

scrollObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(l => l.classList.remove('active'));
      const link = document.querySelector(`.nav-item[href="#${entry.target.id}"]`);
      if (link) link.classList.add('active');
    }
  });
}, { rootMargin: '-30% 0px -60% 0px' });

sections.forEach(s => scrollObserver!.observe(s));
})

onBeforeUnmount(() => {
  scrollObserver?.disconnect()
  scrollObserver = null
})
</script>

<template>
  <div class="app-arch-root">
    <!-- SIDEBAR BACKDROP (mobile) -->
    <div v-if="sidebarOpen" class="sidebar-backdrop" @click="closeSidebar"></div>

    <!-- SIDEBAR -->
<nav class="sidebar" :class="{ 'sidebar-open': sidebarOpen }">
  
  <div class="sidebar-logo">
    <div class="logo-badge">
      <div class="logo-dot"></div>
      <span class="logo-text">SOLO ARCH v1.0</span>
    </div>
    <div class="sidebar-title">单人全栈单仓混合技术架构方案</div>
    <div class="sidebar-version">Vue 3 · Nuxt 4 · Supabase · Vercel</div>
  </div>

  <nav class="sidebar-nav" @click="closeSidebar">
    <div class="nav-section">{{ t('nav.architecture') }}</div>
    <a class="nav-item active" href="#s1"><span class="nav-num">01</span>{{ t('nav.s1') }}</a>
    <a class="nav-item" href="#s2"><span class="nav-num">02</span>{{ t('nav.s2') }}</a>
    <a class="nav-item" href="#s3"><span class="nav-num">03</span>{{ t('nav.s3') }}</a>
    <div class="nav-section">{{ t('nav.routing') }}</div>
    <a class="nav-item" href="#s4"><span class="nav-num">04</span>{{ t('nav.s4') }}</a>
    <a class="nav-item" href="#s5"><span class="nav-num">05</span>{{ t('nav.s5') }}</a>
    <div class="nav-section">{{ t('nav.security') }}</div>
    <a class="nav-item" href="#s6"><span class="nav-num">06</span>{{ t('nav.s6') }}</a>
    <a class="nav-item" href="#s7"><span class="nav-num">07</span>{{ t('nav.s7') }}</a>
    <a class="nav-item" href="#s8"><span class="nav-num">08</span>{{ t('nav.s8') }}</a>
    <div class="nav-section">{{ t('nav.performance') }}</div>
    <a class="nav-item" href="#s9"><span class="nav-num">09</span>{{ t('nav.s9') }}</a>
    <a class="nav-item" href="#s10"><span class="nav-num">10</span>{{ t('nav.s10') }}</a>
    <a class="nav-item" href="#s11"><span class="nav-num">11</span>{{ t('nav.s11') }}</a>
    <a class="nav-item" href="#s12"><span class="nav-num">12</span>{{ t('nav.s12') }}</a>
    <div class="nav-section">{{ t('nav.standards') }}</div>
    <a class="nav-item" href="#s13"><span class="nav-num">13</span>{{ t('nav.s13') }}</a>
    <a class="nav-item" href="#s14"><span class="nav-num">14</span>{{ t('nav.s14') }}</a>
    <a class="nav-item" href="#s15"><span class="nav-num">15</span>{{ t('nav.s15') }}</a>
    <a class="nav-item" href="#s16"><span class="nav-num">16</span>{{ t('nav.s16') }}</a>
    <div class="nav-section">{{ t('nav.optimization') }}</div>
    <a class="nav-item" href="#s17"><span class="nav-num">17</span>{{ t('nav.s17') }}</a>
    <div class="nav-section">{{ t('nav.business') }}</div>
    <a class="nav-item" href="#s18"><span class="nav-num">18</span>{{ t('nav.s18') }}</a>
    <a class="nav-item" href="#s19"><span class="nav-num">19</span>{{ t('nav.s19') }}</a>
    <a class="nav-item" href="#s20"><span class="nav-num">20</span>{{ t('nav.s20') }}</a>
  </nav>
</nav>

<!-- MAIN -->

<main class="main">
  <!-- 苹果风顶部极简控制台 -->
  <header class="top-header">
    <div class="top-header-left">
      <button class="hamburger-btn" @click="toggleSidebar" aria-label="Toggle navigation">
        <span class="hamburger-line"></span>
        <span class="hamburger-line"></span>
        <span class="hamburger-line"></span>
      </button>
      <span class="top-header-indicator">●</span>
      <span class="top-header-title">{{ t('header.console') }}</span>
    </div>
    <div class="top-header-menu">
      <NuxtLink to="/" class="menu-btn">
        ← {{ t('architecture.backHome') }}
      </NuxtLink>
    </div>
  </header>


  <!-- HERO -->
  <div class="hero" id="top">
    <div class="hero-bg"></div>
    <div class="hero-grid"></div>
    <div class="hero-content">
      <div class="hero-tags">
        <span class="hero-tag tag-blue">⚡ Nuxt 4</span>
        <span class="hero-tag tag-green">🗄️ Supabase</span>
        <span class="hero-tag tag-purple">▲ Vercel</span>
        <span class="hero-tag tag-cyan">☁️ Cloudflare</span>
        <span class="hero-tag tag-orange">🔷 Vue 3</span>
      </div>
      <h1>{{ t('hero.title') }}</h1>
      <p style="color:var(--text-secondary);font-size:14px;max-width:640px;">{{ t('hero.description') }}</p>
      <div class="hero-meta">
        <div class="meta-card">
          <div class="meta-label">{{ t('hero.projectType') }}</div>
          <div class="meta-value">{{ t('hero.projectTypeValue') }}</div>
        </div>
        <div class="meta-card">
          <div class="meta-label">{{ t('hero.archPattern') }}</div>
          <div class="meta-value">{{ t('hero.archPatternValue') }}</div>
        </div>
        <div class="meta-card">
          <div class="meta-label">{{ t('hero.devParadigm') }}</div>
          <div class="meta-value">{{ t('hero.devParadigmValue') }}</div>
        </div>
        <div class="meta-card">
          <div class="meta-label">{{ t('hero.subsystemCount') }}</div>
          <div class="meta-value" style="font-size:22px;font-weight:700;color:var(--accent-blue);">{{ t('hero.subsystemCountValue') }}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- S1: 架构总览 -->
  <section class="section" id="s1">
    <div class="section-header">
      <div class="section-num num-blue">01</div>
      <h2>架构全景总览</h2>
    </div>

    <div class="subsection">
      <h3>系统分层架构图</h3>
      <div class="arch-visual">

        <!-- 图例 -->
        <div class="av-legend">
          <span class="avl-item"><span class="avl-dot" style="background:#4f8ef7"></span>客户端入口</span>
          <span class="avl-item"><span class="avl-dot" style="background:#f59e0b"></span>Cloudflare 边缘</span>
          <span class="avl-item"><span class="avl-dot" style="background:#8b5cf6"></span>Vercel 运行时</span>
          <span class="avl-item"><span class="avl-dot" style="background:#22d3ee"></span>Nuxt 4 单仓</span>
          <span class="avl-item"><span class="avl-dot" style="background:#10b981"></span>后端数据服务</span>
        </div>

        <!-- 第一层：客户端 -->
        <div class="av-layer av-layer-client">
          <div class="av-layer-label">① 外部客户端层</div>
          <div class="av-nodes av-nodes-4">
            <div class="av-node an-client">
              <div class="an-icon">📱</div>
              <div class="an-name">移动端 App</div>
              <div class="an-sub">iOS / Android</div>
            </div>
            <div class="av-node an-client">
              <div class="an-icon">📲</div>
              <div class="an-name">独立 H5</div>
              <div class="an-sub">微信 / 抖音</div>
            </div>
            <div class="av-node an-client">
              <div class="an-icon">🖥️</div>
              <div class="an-name">官网浏览器</div>
              <div class="an-sub">yourdomain.com</div>
            </div>
            <div class="av-node an-client">
              <div class="an-icon">⚙️</div>
              <div class="an-name">管理后台</div>
              <div class="an-sub">admin.yourdomain.com</div>
            </div>
          </div>
        </div>

        <div class="av-arrow-block">
          <div class="av-arrow-line"></div>
          <div class="av-arrow-label">HTTPS 加密传输</div>
        </div>

        <!-- 第二层：Cloudflare -->
        <div class="av-layer av-layer-cf">
          <div class="av-layer-label">② Cloudflare 边缘层（可选·免费）</div>
          <div class="av-nodes av-nodes-4">
            <div class="av-node an-cf">
              <div class="an-icon">🌐</div>
              <div class="an-name">DNS 代理</div>
              <div class="an-sub">泛域名通配符解析</div>
            </div>
            <div class="av-node an-cf">
              <div class="an-icon">🚀</div>
              <div class="an-name">全球 CDN</div>
              <div class="an-sub">静态资源加速</div>
            </div>
            <div class="av-node an-cf">
              <div class="an-icon">🛡️</div>
              <div class="an-name">WAF 防火墙</div>
              <div class="an-sub">DDoS / 恶意流量</div>
            </div>
            <div class="av-node an-cf">
              <div class="an-icon">🔒</div>
              <div class="an-name">SSL 终止</div>
              <div class="an-sub">Full (Strict) 模式</div>
            </div>
          </div>
        </div>

        <div class="av-arrow-block">
          <div class="av-arrow-line"></div>
          <div class="av-arrow-label">回源 HTTPS · Full Strict</div>
        </div>

        <!-- 第三层：Vercel -->
        <div class="av-layer av-layer-vercel">
          <div class="av-layer-label">③ Vercel Edge Runtime 层</div>
          <div class="av-nodes av-nodes-3">
            <div class="av-node an-vercel">
              <div class="an-icon">🔀</div>
              <div class="an-name">Edge Middleware</div>
              <div class="an-sub">子域名分流路由</div>
            </div>
            <div class="av-node an-vercel">
              <div class="an-icon">⚡</div>
              <div class="an-name">ISR / SWR 缓存</div>
              <div class="an-sub">静态边缘缓存策略</div>
            </div>
            <div class="av-node an-vercel">
              <div class="an-icon">🖼️</div>
              <div class="an-name">图片优化</div>
              <div class="an-sub">AVIF / WebP 转换</div>
            </div>
          </div>
        </div>

        <div class="av-arrow-block">
          <div class="av-arrow-line"></div>
          <div class="av-arrow-label">路由分发至 Nuxt 4 单仓三大子系统</div>
        </div>

        <!-- 第四层：三大子系统 -->
        <div class="av-layer av-layer-nuxt" style="background:none;border:none;padding:0;">
          <div class="av-subsystems">
            <div class="av-subsys av-subsys-web">
              <div class="avs-header">
                <span class="avs-badge" style="background:rgba(34,211,238,0.15);color:#67e8f9;border-color:rgba(34,211,238,0.3);">ISR · SWR</span>
                <span class="avs-title">官网 / 营销 H5</span>
              </div>
              <div class="avs-domain">yourdomain.com &amp; *.yourdomain.com</div>
              <div class="avs-tags">
                <span>Vue 3 SSR</span><span>Nuxt 4</span><span>UnoCSS</span><span>SEO 100分</span>
              </div>
              <div class="avs-path">app/pages/(client)/ &amp; (h5)/</div>
            </div>
            <div class="av-subsys av-subsys-admin">
              <div class="avs-header">
                <span class="avs-badge" style="background:rgba(139,92,246,0.15);color:#a78bfa;border-color:rgba(139,92,246,0.3);">SPA · ssr:false</span>
                <span class="avs-title">管理后台 Admin</span>
              </div>
              <div class="avs-domain">admin.yourdomain.com</div>
              <div class="avs-tags">
                <span>Vue 3 SPA</span><span>权限隔离</span><span>审计日志</span><span>数据大盘</span>
              </div>
              <div class="avs-path">app/pages/(admin)/</div>
            </div>
            <div class="av-subsys av-subsys-api">
              <div class="avs-header">
                <span class="avs-badge" style="background:rgba(245,158,11,0.15);color:#fbbf24;border-color:rgba(245,158,11,0.3);">纯 JSON · no-store</span>
                <span class="avs-title">API 引擎</span>
              </div>
              <div class="avs-domain">api.yourdomain.com</div>
              <div class="avs-tags">
                <span>Nitro Server</span><span>Bearer/Cookie</span><span>OpenAPI</span><span>多端兼容</span>
              </div>
              <div class="avs-path">server/api/v1/</div>
            </div>
          </div>
        </div>

        <!-- Nuxt 4 单仓横条 -->
        <div class="av-monorepo-bar">
          <span class="avmb-icon">⚡</span>
          <span class="avmb-text"><strong>Nuxt 4 混合单仓 · Nitro 引擎</strong>  统一 Auth 中间件 · 统一响应格式 · 统一错误处理</span>
          <span class="avmb-path">server/middleware/ · server/utils/</span>
        </div>

        <div class="av-arrow-block">
          <div class="av-arrow-line"></div>
          <div class="av-arrow-label">服务端调用后端数据服务</div>
        </div>

        <!-- 第五层：数据服务 -->
        <div class="av-layer av-layer-data">
          <div class="av-layer-label">⑤ 后端数据与服务层</div>
          <div class="av-nodes av-nodes-3">
            <div class="av-node an-data an-supabase">
              <div class="an-icon">🗄️</div>
              <div class="an-name">Supabase</div>
              <div class="an-chips">
                <span>PostgreSQL</span><span>Auth</span><span>RLS</span><span>Realtime</span><span>Storage</span>
              </div>
            </div>
            <div class="av-node an-data an-analytics">
              <div class="an-icon">📊</div>
              <div class="an-name">Analytics</div>
              <div class="an-chips">
                <span>Dashboard</span><span>Reports</span><span>实时监控</span>
              </div>
            </div>
            <div class="av-node an-data an-third">
              <div class="an-icon">🔗</div>
              <div class="an-name">第三方服务</div>
              <div class="an-chips">
                <span>Resend 邮件</span><span>短信</span><span>AI API</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <div class="subsection">
      <h3>四大子系统对应关系</h3>
      <div class="domain-grid">
        <div class="domain-card dc-blue">
          <div class="domain-badge badge-blue">官网 Corporate</div>
          <div class="domain-url">yourdomain.com</div>
          <div class="domain-route">→ /app/pages/(client)/</div>
          <div><span class="domain-render render-isr">ISR · 1h</span></div>
          <div class="domain-desc">品牌展示、产品介绍、SEO 主力阵地。增量静态再生，首字节延迟趋近 0ms。</div>
        </div>
        <div class="domain-card dc-purple">
          <div class="domain-badge badge-purple">营销 H5 矩阵</div>
          <div class="domain-url">*.yourdomain.com</div>
          <div class="domain-route">→ /app/pages/(h5)/h5/[subdomain]/</div>
          <div><span class="domain-render render-swr">SWR · 10min</span></div>
          <div class="domain-desc">各类活动推广、拉新转化落地页。动态配置驱动，无代码发布新活动。</div>
        </div>
        <div class="domain-card dc-green">
          <div class="domain-badge badge-green">管理后台 Admin</div>
          <div class="domain-url">admin.yourdomain.com</div>
          <div class="domain-route">→ /app/pages/(admin)/admin/</div>
          <div><span class="domain-render render-spa">SPA · 无缓存</span></div>
          <div class="domain-desc">用户管理、数据大盘与运营工具。强权限隔离，完全禁止 SSR。</div>
        </div>
        <div class="domain-card dc-orange">
          <div class="domain-badge badge-orange">API 引擎 Engine</div>
          <div class="domain-url">api.yourdomain.com</div>
          <div class="domain-route">→ /server/api/v1/</div>
          <div><span class="domain-render render-api">纯接口 · 无缓存</span></div>
          <div class="domain-desc">面向 App/H5 提供纯净 RESTful 接口，双模式鉴权，OpenAPI 自动生成。</div>
        </div>
      </div>
    </div>
  </section>

  <!-- S2: 技术栈 -->
  <section class="section" id="s2">
    <div class="section-header">
      <div class="section-num num-purple">02</div>
      <h2>技术栈选型与职责划分</h2>
    </div>
    <div class="tech-grid">
      <div class="tech-card"><div class="tech-emoji">🔷</div><div><div class="tech-name">Vue 3</div><div class="tech-role">管理后台 UI 与官网渲染</div><div class="tech-version">3.5+ · script setup · Composition API</div></div></div>
      <div class="tech-card"><div class="tech-emoji">⚡</div><div><div class="tech-name">Nuxt 4 + Nitro</div><div class="tech-role">SSR/ISR/SWR 路由 · Server API 引擎</div><div class="tech-version">4.x · Hybrid Rendering</div></div></div>
      <div class="tech-card"><div class="tech-emoji">🗄️</div><div><div class="tech-name">Supabase 团队版</div><div class="tech-role">PostgreSQL · RLS · Auth · Realtime · DB Branching</div><div class="tech-version">Team Plan · $25/mo/project</div></div></div>
      <div class="tech-card"><div class="tech-emoji">▲</div><div><div class="tech-name">Vercel 团队版</div><div class="tech-role">Serverless 部署 · 边缘函数 · 图片优化</div><div class="tech-version">Team Plan · $20/mo/member</div></div></div>
      <div class="tech-card"><div class="tech-emoji">🐙</div><div><div class="tech-name">GitHub 团队版</div><div class="tech-role">代码审查 · 分支保护 · Actions CI/CD</div><div class="tech-version">Team Plan · Actions 2000min/mo</div></div></div>
      <div class="tech-card"><div class="tech-emoji">☁️</div><div><div class="tech-name">Cloudflare 免费版</div><div class="tech-role">泛域名代理 · 全球 CDN · WAF · SSL</div><div class="tech-version">Free · 100G 出口流量免费</div></div></div>
      <div class="tech-card"><div class="tech-emoji">📊</div><div><div class="tech-name">Google Analytics</div><div class="tech-role">用户行为分析 · 转化漏斗 · 实时监控</div><div class="tech-version">GA4 · 免费额度充足</div></div></div>
      <div class="tech-card"><div class="tech-emoji">🎨</div><div><div class="tech-name">UnoCSS</div><div class="tech-role">轻量原子化 CSS · 官网/H5 零全局污染</div><div class="tech-version">Atomic CSS · 极轻量打包</div></div></div>
    </div>
  </section>

  <!-- S3: 目录结构 -->
  <section class="section" id="s3">
    <div class="section-header">
      <div class="section-num num-green">03</div>
      <h2>单仓目录结构规范</h2>
    </div>
    <div class="alert alert-important">
      <div class="alert-icon">📌</div>
      <div class="alert-body"><strong>AI Coding 强制约束</strong>此目录结构是所有 AI Agent 的强制约束。不允许在根目录下随意创建新的顶层目录。前台/后台/API 三层物理隔离，防止样式污染与安全越权。</div>
    </div>
    <div class="code-block">
      <div class="code-header"><span class="code-lang">Directory Structure</span><div class="code-dots"><div class="code-dot dot-red"></div><div class="code-dot dot-yellow"></div><div class="code-dot dot-green"></div></div></div>
      <pre>hehe-app/                            <span class="cm"># 单仓根目录</span>
├── app/                              <span class="cm"># Nuxt 4 前端渲染层（Vue 3 组件与页面）</span>
│   ├── components/
│   │   ├── client/                   <span class="cm"># 官网/H5 专用轻量组件</span>
│   │   ├── admin/                    <span class="cm"># 管理后台专用重型组件（ECharts 等）</span>
│   │   └── shared/                   <span class="cm"># 前后台通用的极轻量组件</span>
│   ├── composables/
│   │   ├── seo.ts                    <span class="cm"># useAppSEO：SEO 注入统一入口（官网/H5 必须调用）</span>
│   │   └── auth.ts                   <span class="cm"># useAuth：客户端会话状态管理</span>
│   └── pages/
│       ├── (client)/                 <span class="cm"># 官网路由分组 → yourdomain.com</span>
│       ├── (h5)/h5/[subdomain]/      <span class="cm"># 营销 H5 → *.yourdomain.com</span>
│       └── (admin)/admin/            <span class="cm"># 管理后台 → admin.yourdomain.com</span>
│
├── server/                           <span class="cm"># Nitro 服务端层（Node.js API 引擎）</span>
│   ├── middleware/
│   │   ├── 01.subdomain-rewrite.ts  <span class="cm"># 子域名动态路由重写</span>
│   │   ├── 02.auth.ts               <span class="cm"># 全局 Auth 解析（Bearer + Cookie 双兼容）</span>
│   │   └── 03.admin.ts              <span class="cm"># Admin API 路由强拦截</span>
│   ├── api/
│   │   ├── v1/                       <span class="cm"># 对外公开 API（api.yourdomain.com）</span>
│   │   └── admin/                    <span class="cm"># 管理员专用私有 API</span>
│   └── utils/
│       ├── auth.ts                   <span class="cm"># assertUser / assertAdmin 鉴权断言</span>
│       ├── audit.ts                  <span class="cm"># writeAuditLog 操作审计日志</span>
│       ├── ip.ts                     <span class="cm"># getClientRealIP（优先 CF-Connecting-IP）</span>
│       └── analytics.ts             <span class="cm"># 数据分析埋点与上报</span>
│
├── supabase/migrations/              <span class="cm"># 数据库迁移 SQL（版本控制严格管理）</span>
├── .github/workflows/                <span class="cm"># CI 流水线（类型/安全/性能/DB 四道防线）</span>
├── .cursorrules                      <span class="cm"># AI Coding 强制规范（Cursor/Claude 读取）</span>
└── nuxt.config.ts                    <span class="cm"># 核心配置（路由规则·渲染模式·缓存·图片）</span></pre>
    </div>
  </section>

  <!-- S4: 路由设计 -->
  <section class="section" id="s4">
    <div class="section-header">
      <div class="section-num num-cyan">04</div>
      <h2>多域名流量路由设计</h2>
    </div>
    <div class="subsection">
      <h3>Edge Middleware 核心实现</h3>
      <div class="code-block">
        <div class="code-header"><span class="code-lang">TypeScript · server/middleware/01.subdomain-rewrite.ts</span><div class="code-dots"><div class="code-dot dot-red"></div><div class="code-dot dot-yellow"></div><div class="code-dot dot-green"></div></div></div>
        <pre><span class="kw">export default</span> <span class="fn">defineEventHandler</span>((event) => {
  <span class="kw">const</span> host = <span class="fn">getHeader</span>(event, <span class="str">'host'</span>) || <span class="str">''</span>
  <span class="kw">const</span> path = event.path
  <span class="cm">// 跳过静态资源与内部 Nuxt 路由</span>
  <span class="kw">if</span> (path.<span class="fn">startsWith</span>(<span class="str">'/_nuxt/'</span>) || path.<span class="fn">startsWith</span>(<span class="str">'/api/'</span>)) <span class="kw">return</span>

  <span class="kw">const</span> ROOT_DOMAIN = <span class="fn">useRuntimeConfig</span>().<span class="str">rootDomain</span>

  <span class="cm">// 1. 官网：主域名或 www</span>
  <span class="kw">if</span> (host === ROOT_DOMAIN || host === <span class="str">`www.<span class="op">${</span>ROOT_DOMAIN<span class="op">}</span>`</span>) {
    <span class="kw">if</span> (!path.<span class="fn">startsWith</span>(<span class="str">'/client'</span>))
      event.node.req.url = <span class="str">`/client<span class="op">${</span>path === <span class="str">'/'</span> ? <span class="str">''</span> : path<span class="op">}</span>`</span>
    <span class="kw">return</span>
  }

  <span class="cm">// 2. 管理后台</span>
  <span class="kw">if</span> (host.<span class="fn">startsWith</span>(<span class="str">'admin.'</span>)) {
    <span class="kw">if</span> (!path.<span class="fn">startsWith</span>(<span class="str">'/admin'</span>))
      event.node.req.url = <span class="str">`/admin<span class="op">${</span>path<span class="op">}</span>`</span>
    <span class="kw">return</span>
  }

  <span class="cm">// 3. API 引擎（禁止前台路由越界）</span>
  <span class="kw">if</span> (host.<span class="fn">startsWith</span>(<span class="str">'api.'</span>)) {
    <span class="kw">if</span> (!path.<span class="fn">startsWith</span>(<span class="str">'/api/v1/'</span>))
      <span class="kw">throw</span> <span class="fn">createError</span>({ statusCode: <span class="num">404</span>, statusMessage: <span class="str">'API Not Found'</span> })
    <span class="kw">return</span>
  }

  <span class="cm">// 4. 动态营销 H5 子域名 *.yourdomain.com</span>
  <span class="kw">const</span> parts = host.<span class="fn">split</span>(<span class="str">'.'</span>)
  <span class="kw">if</span> (parts.length >= <span class="num">3</span>) {
    <span class="kw">const</span> subdomain = parts[<span class="num">0</span>]
    <span class="kw">if</span> (!path.<span class="fn">startsWith</span>(<span class="str">`/h5/<span class="op">${</span>subdomain<span class="op">}</span>`</span>))
      event.node.req.url = <span class="str">`/h5/<span class="op">${</span>subdomain<span class="op">}</span><span class="op">${</span>path === <span class="str">'/'</span> ? <span class="str">''</span> : path<span class="op">}</span>`</span>
  }
})</pre>
      </div>
    </div>
  </section>

  <!-- S5: 渲染策略 -->
  <section class="section" id="s5">
    <div class="section-header">
      <div class="section-num num-blue">05</div>
      <h2>混合渲染模式与边缘缓存策略</h2>
    </div>
    <div class="render-grid">
      <div class="render-card" style="border-color:rgba(16,185,129,0.3);">
        <div class="render-icon">🚀</div>
        <div class="render-name">ISR</div>
        <div class="render-full">Incremental Static Regeneration</div>
        <div class="render-ttl" style="color:var(--accent-green);">3600s</div>
        <div class="render-ttl-label">边缘缓存生命周期</div>
        <div class="render-path">/client/**</div>
        <div class="render-detail">官网页面。首字节 0ms，SEO 100 分，边缘节点后台异步刷新，完全不阻塞用户请求。</div>
      </div>
      <div class="render-card" style="border-color:rgba(34,211,238,0.3);">
        <div class="render-icon">⚡</div>
        <div class="render-name">SWR</div>
        <div class="render-full">Stale While Revalidate</div>
        <div class="render-ttl" style="color:var(--accent-cyan);">600s</div>
        <div class="render-ttl-label">边缘缓存生命周期</div>
        <div class="render-path">/h5/**</div>
        <div class="render-detail">营销 H5。支持动态配置实时更新，活动高峰流量直接命中边缘节点，零服务器压力。</div>
      </div>
      <div class="render-card" style="border-color:rgba(139,92,246,0.3);">
        <div class="render-icon">🔒</div>
        <div class="render-name">SPA</div>
        <div class="render-full">Client-Side Rendering (ssr: false)</div>
        <div class="render-ttl" style="color:var(--accent-purple);">无缓存</div>
        <div class="render-ttl-label">权限敏感，实时交互</div>
        <div class="render-path">/admin/**</div>
        <div class="render-detail">管理后台。完全禁用 SSR，防止敏感数据在服务端泄露，彻底隔离重型 Admin 组件包。</div>
      </div>
      <div class="render-card" style="border-color:rgba(245,158,11,0.3);">
        <div class="render-icon">🌐</div>
        <div class="render-name">API</div>
        <div class="render-full">Pure Serverless API (No Render)</div>
        <div class="render-ttl" style="color:var(--accent-orange);">no-store</div>
        <div class="render-ttl-label">绝对禁止任何缓存</div>
        <div class="render-path">/api/**</div>
        <div class="render-detail">对外 API 引擎。支持 CORS 多端访问，Bearer/Cookie 双模式鉴权，实时响应移动端 App。</div>
      </div>
    </div>
  </section>

  <!-- S6: 鉴权 -->
  <section class="section" id="s6">
    <div class="section-header">
      <div class="section-num num-purple">06</div>
      <h2>鉴权体系设计（多端兼容）</h2>
    </div>
    <div class="subsection">
      <h3>五层纵深安全防御</h3>
      <div class="security-layers">
        <div class="security-layer sl-1">
          <div class="sl-icon">🛡️</div>
          <div class="sl-content">
            <div class="sl-title">第一层：Cloudflare WAF</div>
            <div class="sl-desc">拦截恶意爬虫、DDoS 流量，对 /api/admin/** 来源非 admin 域名的请求直接封锁</div>
          </div>
          <div class="sl-badge">CF 边缘</div>
        </div>
        <div class="security-layer sl-2">
          <div class="sl-icon">🌐</div>
          <div class="sl-content">
            <div class="sl-title">第二层：Edge Middleware 域名重写</div>
            <div class="sl-desc">api 域名强制限制在 /api/v1/* 路由，admin 域名拦截非后台请求越界访问</div>
          </div>
          <div class="sl-badge">Vercel Edge</div>
        </div>
        <div class="security-layer sl-3">
          <div class="sl-icon">🔑</div>
          <div class="sl-content">
            <div class="sl-title">第三层：全局 Auth 中间件（02.auth.ts）</div>
            <div class="sl-desc">解析 Cookie（Web/H5）或 Bearer JWT（App），将 Supabase 用户态注入 event.context.user</div>
          </div>
          <div class="sl-badge">Nitro 中间件</div>
        </div>
        <div class="security-layer sl-4">
          <div class="sl-icon">🚫</div>
          <div class="sl-content">
            <div class="sl-title">第四层：Admin API 强拦截（03.admin.ts）</div>
            <div class="sl-desc">匹配 /api/admin/** 自动执行 assertAdmin(event)，无管理员 role 强制返回 403</div>
          </div>
          <div class="sl-badge">Nitro 中间件</div>
        </div>
        <div class="security-layer sl-5">
          <div class="sl-icon">🔐</div>
          <div class="sl-content">
            <div class="sl-title">第五层：Supabase RLS 行级安全</div>
            <div class="sl-desc">数据库层最后一道防线，即使绕过前四层，RLS Policy 保证用户只能访问属于自己的数据</div>
          </div>
          <div class="sl-badge">Supabase PG</div>
        </div>
      </div>
    </div>
    <div class="subsection">
      <h3>双模式 Token 解析</h3>
      <div class="code-block">
        <div class="code-header"><span class="code-lang">TypeScript · server/utils/auth.ts</span><div class="code-dots"><div class="code-dot dot-red"></div><div class="code-dot dot-yellow"></div><div class="code-dot dot-green"></div></div></div>
        <pre><span class="cm">// assertUser: 验证用户身份（支持 Cookie + Bearer 双模式）</span>
<span class="kw">export async function</span> <span class="fn">assertUser</span>(event: <span class="type">any</span>) {
  <span class="kw">const</span> user = event.context.user
  <span class="kw">if</span> (!user) <span class="kw">throw</span> <span class="fn">createError</span>({ statusCode: <span class="num">401</span>, statusMessage: <span class="str">'Unauthorized'</span> })
  <span class="kw">return</span> user
}

<span class="cm">// assertAdmin: 在 assertUser 基础上额外验证管理员角色</span>
<span class="kw">export async function</span> <span class="fn">assertAdmin</span>(event: <span class="type">any</span>) {
  <span class="kw">const</span> user = <span class="kw">await</span> <span class="fn">assertUser</span>(event)
  <span class="kw">const</span> { data: profile } = <span class="kw">await</span> client.<span class="fn">from</span>(<span class="str">'profiles'</span>)
    .<span class="fn">select</span>(<span class="str">'role'</span>).<span class="fn">eq</span>(<span class="str">'id'</span>, user.id).<span class="fn">single</span>()

  <span class="kw">if</span> (profile?.role !== <span class="str">'admin'</span>)
    <span class="kw">throw</span> <span class="fn">createError</span>({ statusCode: <span class="num">403</span>, statusMessage: <span class="str">'Admin Access Forbidden'</span> })
  <span class="kw">return</span> user
}</pre>
      </div>
    </div>
  </section>

  <!-- S7: 管理后台 -->
  <section class="section" id="s7">
    <div class="section-header">
      <div class="section-num num-green">07</div>
      <h2>管理后台模块设计</h2>
    </div>
    <div class="subsection">
      <h3>核心功能模块</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>模块</th><th>路由</th><th>核心功能</th></tr></thead>
          <tbody>
            <tr><td><strong>数据大盘</strong></td><td><code>/admin</code></td><td>用户活跃趋势；注册转化漏斗；实时数据快照</td></tr>
            <tr><td><strong>用户管理</strong></td><td><code>/admin/users</code></td><td>用户列表（分页 ≤ 100）；账号禁用/启用；会员等级手动调整</td></tr>
            <tr><td><strong>商品管理</strong></td><td><code>/admin/products</code></td><td>商品列表；价格调整；库存状态管理；批量操作</td></tr>
            <tr><td><strong>营销活动</strong></td><td><code>/admin/campaigns</code></td><td>新建/编辑/下线 H5 活动；二级子域名绑定；实时预览</td></tr>
            <tr><td><strong>审计日志</strong></td><td><code>/admin/audit-logs</code></td><td>管理员所有操作记录；时间/操作人/IP 多维筛选；不可删除</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="alert alert-caution">
      <div class="alert-icon">⚠️</div>
      <div class="alert-body"><strong>AI 编码强制约束</strong>所有 /api/admin/ 路由中涉及数据写入、删除、状态变更的操作，必须在业务逻辑执行后、响应返回前调用 writeAuditLog()。否则 CI 静态扫描将阻断合入。</div>
    </div>
  </section>

  <!-- S8: 系统监控 -->
  <section class="section" id="s8">
    <div class="section-header">
      <div class="section-num num-orange">08</div>
      <h2>APM 系统健康监控</h2>
    </div>
    <div class="subsection">
      <h3>监控流程</h3>
      <div class="flow-steps">
        <div class="flow-step"><div class="flow-num">1</div><div class="flow-content"><div class="flow-title">请求拦截埋点</div><div class="flow-desc">中间件 00.apm.ts 自动记录每次 API 请求的路径、耗时、状态码</div></div></div>
        <div class="flow-step"><div class="flow-num">2</div><div class="flow-content"><div class="flow-title">滑动窗口计算</div><div class="flow-desc">实时计算最近 100 次请求的平均时延、P95、P99 与报错率</div></div></div>
        <div class="flow-step"><div class="flow-num">3</div><div class="flow-content"><div class="flow-title">阈值告警触发</div><div class="flow-desc">时延超 800ms (Warning) 或 2000ms (Critical) 自动记录警报并高亮输出</div></div></div>
        <div class="flow-step"><div class="flow-num">4</div><div class="flow-content"><div class="flow-title">系统资源快照</div><div class="flow-desc">采集物理内存占用、CPU 负载与 Node 运行时长写入 APM 数据池</div></div></div>
        <div class="flow-step"><div class="flow-num">5</div><div class="flow-content"><div class="flow-title">后台可视化展示</div><div class="flow-desc">Admin 监控面板实时轮询渲染图表，支持一键模拟告警验证</div></div></div>
        <div class="flow-step"><div class="flow-num">6</div><div class="flow-content"><div class="flow-title">活动日志写入</div><div class="flow-desc">关键操作自动记录至 activity_logs 表，不可删除，可一键导出 CSV</div></div></div>
      </div>
    </div>
  </section>

  <!-- S9: 性能 SEO -->
  <section class="section" id="s9">
    <div class="section-header">
      <div class="section-num num-blue">09</div>
      <h2>性能与 SEO 防线</h2>
    </div>
    <div class="subsection">
      <h3>Core Web Vitals 指标目标</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>指标</th><th>目标值</th><th>CI 强制阻断阈值</th></tr></thead>
          <tbody>
            <tr><td><strong>LCP 最大内容绘制</strong></td><td style="color:var(--accent-green);">&lt; 1.5s</td><td style="color:var(--accent-red);">⛔ &gt; 2.0s 强制打回</td></tr>
            <tr><td><strong>INP 交互延迟</strong></td><td style="color:var(--accent-green);">&lt; 100ms</td><td style="color:var(--accent-orange);">⚠️ &gt; 200ms 警告</td></tr>
            <tr><td><strong>CLS 布局偏移</strong></td><td style="color:var(--accent-green);">&lt; 0.05</td><td style="color:var(--accent-red);">⛔ &gt; 0.1 强制打回</td></tr>
            <tr><td><strong>SEO 评分 Lighthouse</strong></td><td style="color:var(--accent-green);">100 分</td><td style="color:var(--accent-red);">⛔ &lt; 95 分强制打回</td></tr>
            <tr><td><strong>无障碍 a11y</strong></td><td style="color:var(--accent-green);">≥ 95 分</td><td style="color:var(--accent-orange);">⚠️ &lt; 90 分警告</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="alert alert-tip">
      <div class="alert-icon">💡</div>
      <div class="alert-body"><strong>AI 图片规范</strong>官网和 H5 中所有图片必须使用 &lt;NuxtImg&gt; 代替原生 &lt;img&gt;。首屏 Banner 必须添加 preload、fetchpriority="high" 和 loading="eager"，确保 LCP 资产最优先下载。</div>
    </div>
  </section>

  <!-- S10: Cloudflare -->
  <section class="section" id="s10">
    <div class="section-header">
      <div class="section-num num-orange">10</div>
      <h2>Cloudflare 接入方案（可选·免费）</h2>
    </div>
    <div class="alert alert-note">
      <div class="alert-icon">ℹ️</div>
      <div class="alert-body"><strong>透明叠加，零侵入</strong>Cloudflare 作为前置 DNS 代理与 CDN 加速层接入。接入后不需要修改任何 Nuxt 4 代码或 Vercel 配置，完全透明叠加在现有架构之上。</div>
    </div>
    <div class="subsection">
      <h3>DNS 配置规则</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>类型</th><th>名称</th><th>目标（Content）</th><th>代理状态</th></tr></thead>
          <tbody>
            <tr><td>CNAME</td><td><code>yourdomain.com</code></td><td><code>cname.vercel-dns.com</code></td><td style="color:var(--accent-orange);">🟠 已代理</td></tr>
            <tr><td>CNAME</td><td><code>www</code></td><td><code>cname.vercel-dns.com</code></td><td style="color:var(--accent-orange);">🟠 已代理</td></tr>
            <tr><td>CNAME</td><td><code>admin</code></td><td><code>cname.vercel-dns.com</code></td><td style="color:var(--accent-orange);">🟠 已代理</td></tr>
            <tr><td>CNAME</td><td><code>api</code></td><td><code>cname.vercel-dns.com</code></td><td style="color:var(--accent-orange);">🟠 已代理</td></tr>
            <tr><td>CNAME</td><td><code>*</code>（泛解析）</td><td><code>cname.vercel-dns.com</code></td><td style="color:var(--accent-orange);">🟠 已代理</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="alert alert-caution">
      <div class="alert-icon">🚨</div>
      <div class="alert-body"><strong>SSL/TLS 必须设为"完全（严格）Full (Strict)"</strong>绝对不能选择"灵活 Flexible"模式。否则 Cloudflare 用 HTTP 回源 Vercel，Vercel 强制 301 跳转 HTTPS，导致浏览器触发 ERR_TOO_MANY_REDIRECTS 无限重定向死循环崩溃。</div>
    </div>
  </section>

  <!-- S11: 数据库 -->
  <section class="section" id="s11">
    <div class="section-header">
      <div class="section-num num-green">11</div>
      <h2>数据库设计规范（Supabase 团队版）</h2>
    </div>
    <div class="subsection">
      <h3>核心数据表</h3>
      <div class="code-block">
        <div class="code-header"><span class="code-lang">SQL · supabase/migrations/init.sql</span><div class="code-dots"><div class="code-dot dot-red"></div><div class="code-dot dot-yellow"></div><div class="code-dot dot-green"></div></div></div>
        <pre><span class="cm">-- 用户档案表（与 auth.users 关联）</span>
<span class="kw">CREATE TABLE</span> <span class="type">profiles</span> (
  id                 <span class="type">UUID</span> <span class="kw">PRIMARY KEY REFERENCES</span> auth.users(id) <span class="kw">ON DELETE CASCADE</span>,
  username           <span class="type">TEXT UNIQUE NOT NULL</span>,
  role               <span class="type">TEXT NOT NULL DEFAULT</span> <span class="str">'user'</span> <span class="kw">CHECK</span> (role <span class="kw">IN</span> (<span class="str">'user'</span>, <span class="str">'admin'</span>)),
  plan_status        <span class="type">TEXT NOT NULL DEFAULT</span> <span class="str">'free'</span> <span class="kw">CHECK</span> (plan_status <span class="kw">IN</span> (<span class="str">'free'</span>, <span class="str">'pro'</span>, <span class="str">'enterprise'</span>)),
  created_at         <span class="type">TIMESTAMP WITH TIME ZONE DEFAULT</span> <span class="fn">NOW</span>()
);

<span class="cm">-- 营销活动配置表（驱动动态 H5 渲染）</span>
<span class="kw">CREATE TABLE</span> <span class="type">marketing_campaigns</span> (
  id          <span class="type">UUID PRIMARY KEY DEFAULT</span> <span class="fn">gen_random_uuid</span>(),
  subdomain   <span class="type">TEXT UNIQUE NOT NULL</span>,
  title       <span class="type">TEXT NOT NULL</span>,
  config      <span class="type">JSONB NOT NULL DEFAULT</span> <span class="str">'{}'</span>,
  is_active   <span class="type">BOOLEAN NOT NULL DEFAULT TRUE</span>,
  created_at  <span class="type">TIMESTAMP WITH TIME ZONE DEFAULT</span> <span class="fn">NOW</span>()
);

<span class="cm">-- 必须开启 RLS（CI 门禁自动检查）</span>
<span class="kw">ALTER TABLE</span> profiles <span class="kw">ENABLE ROW LEVEL SECURITY</span>;
<span class="kw">ALTER TABLE</span> marketing_campaigns <span class="kw">ENABLE ROW LEVEL SECURITY</span>;
<span class="kw">ALTER TABLE</span> activity_logs <span class="kw">ENABLE ROW LEVEL SECURITY</span>;</pre>
      </div>
    </div>
  </section>

  <!-- S12: CI/CD -->
  <section class="section" id="s12">
    <div class="section-header">
      <div class="section-num num-red">12</div>
      <h2>CI/CD 工程化防线（GitHub 团队版）</h2>
    </div>
    <div class="ci-pipeline">
      <div class="ci-gate">
        <div class="ci-num" style="color:var(--accent-blue);">防线 01</div>
        <div class="ci-title">静态类型与代码合规</div>
        <code class="ci-cmd">npx vue-tsc --noEmit</code>
        <div class="ci-desc">TS 类型全检，验证前台/后台/API 三层的接口契约是否完全对齐。同时运行 ESLint 代码风格检查。</div>
        <span class="ci-result">类型漂移 → 强制打回</span>
      </div>
      <div class="ci-gate">
        <div class="ci-num" style="color:var(--accent-red);">防线 02</div>
        <div class="ci-title">API 安全越权自动化测试</div>
        <code class="ci-cmd">curl /api/admin/users → 必须 401/403</code>
        <div class="ci-desc">自动模拟匿名用户和普通用户请求 /api/admin/** 管理接口，验证必须被强拦截。</div>
        <span class="ci-result">越权放行 → 立即阻断</span>
      </div>
      <div class="ci-gate">
        <div class="ci-num" style="color:var(--accent-green);">防线 03</div>
        <div class="ci-title">Supabase RLS 安全检查</div>
        <code class="ci-cmd">npx supabase db lint</code>
        <div class="ci-desc">检查所有 SQL 迁移文件语法正确性，验证新增数据表是否已开启 RLS，防止数据越权读取。</div>
        <span class="ci-result">RLS 缺失 → 强制阻断</span>
      </div>
      <div class="ci-gate">
        <div class="ci-num" style="color:var(--accent-orange);">防线 04</div>
        <div class="ci-title">Web Vitals 性能门禁</div>
        <code class="ci-cmd">Lighthouse CI Action</code>
        <div class="ci-desc">仅在 /pages/(client)/ 或 /pages/(h5)/ 有改动时触发。LCP &gt; 2s 或 SEO &lt; 95 直接阻断合入。</div>
        <span class="ci-result">LCP 退化 → 打回修复</span>
      </div>
    </div>
  </section>

  <!-- S13: AI Coding -->
  <section class="section" id="s13">
    <div class="section-header">
      <div class="section-num num-purple">13</div>
      <h2>AI Coding 开发规范与 Harness 防线</h2>
    </div>
    <div class="subsection">
      <h3>多 Agent 协作分工</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Agent</th><th>工作范围</th><th>禁止触碰</th></tr></thead>
          <tbody>
            <tr><td><strong>前台 Agent (A)</strong></td><td><code>app/pages/(client)/</code> <code>app/pages/(h5)/</code> <code>app/components/client/</code></td><td>admin 组件 · server/ 目录</td></tr>
            <tr><td><strong>后台 UI Agent (B)</strong></td><td><code>app/pages/(admin)/</code> <code>app/components/admin/</code></td><td>官网/H5 样式文件</td></tr>
            <tr><td><strong>API Agent (C)</strong></td><td><code>server/api/</code> <code>server/utils/</code> <code>supabase/migrations/</code></td><td>前端 Vue 组件</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="subsection">
      <h3>.cursorrules 核心禁令（节选）</h3>
      <div class="code-block">
        <div class="code-header"><span class="code-lang">Markdown · .cursorrules</span><div class="code-dots"><div class="code-dot dot-red"></div><div class="code-dot dot-yellow"></div><div class="code-dot dot-green"></div></div></div>
        <pre><span class="cm">## 目录规范</span>
<span class="attr">- 严禁在根目录创建非规范的顶层目录</span>
<span class="attr">- 官网/H5 组件必须放在 app/components/client/ 或 shared/</span>
<span class="attr">- 管理端组件必须放在 app/components/admin/ 并使用局部导入</span>

<span class="cm">## 安全规范</span>
<span class="attr">- 严禁将 SUPABASE_SERVICE_ROLE_KEY 出现在任何前端代码中</span>
<span class="attr">- APM 告警阈值必须配置多级梯度，防止误报干扰</span>

<span class="cm">## 平台职责边界规范</span>
<span class="attr">- 严禁开通或使用 Vercel Postgres：数据库统一使用 Supabase PG</span>
<span class="attr">- 严禁将 HTTP API 路由写入 Supabase Edge Functions</span>
<span class="attr">- 限流计数器必须使用 Vercel KV，不得用 Supabase DB 表模拟</span>

<span class="cm">## 数据库规范</span>
<span class="attr">- 严禁在 Node.js 中对 &gt;1000 条数据做内存级 reduce/map 聚合</span>
<span class="attr">- 统计类 API 必须命中 Materialized View 或预聚合表</span>
<span class="attr">- 所有列表查询必须限制 pageSize ≤ 100</span>

<span class="cm">## 审计规范</span>
<span class="attr">- 管理端所有写入/删除操作，必须在返回前调用 writeAuditLog()</span>

<span class="cm">## IP 规范</span>
<span class="attr">- 必须使用 getClientRealIP(event)，禁止使用 getRequestIP()</span></pre>
      </div>
    </div>
  </section>

  <!-- S14: 本地沙盒 -->
  <section class="section" id="s14">
    <div class="section-header">
      <div class="section-num num-cyan">14</div>
      <h2>本地开发沙盒配置</h2>
    </div>
    <div class="subsection">
      <h3>一键启动脚本</h3>
      <div class="code-block">
        <div class="code-header"><span class="code-lang">JSON · package.json scripts</span><div class="code-dots"><div class="code-dot dot-red"></div><div class="code-dot dot-yellow"></div><div class="code-dot dot-green"></div></div></div>
        <pre>{
  <span class="attr">"scripts"</span>: {
    <span class="attr">"supabase:start"</span>:  <span class="str">"supabase start"</span>,
    <span class="attr">"apm:monitor"</span>:     <span class="str">"node scripts/test-supabase-connection.mjs"</span>,
    <span class="attr">"dev"</span>:             <span class="str">"nuxt dev"</span>,
    <span class="attr">"dev:all"</span>:         <span class="str">"concurrently \"npm:supabase:start\" \"npm:dev\""</span>,
    <span class="attr">"gen:types"</span>:       <span class="str">"supabase gen types typescript --local > app/types/database.types.ts"</span>,
    <span class="attr">"check"</span>:           <span class="str">"vue-tsc --noEmit && eslint 'app/**/*.vue' 'server/**/*.ts'"</span>,
    <span class="attr">"test:api-safety"</span>: <span class="str">"vitest run server/tests/security"</span>
  }
}</pre>
      </div>
    </div>
    <div class="subsection">
      <h3>本地多域名仿真（/etc/hosts）</h3>
      <div class="code-block">
        <div class="code-header"><span class="code-lang">Hosts File</span><div class="code-dots"><div class="code-dot dot-red"></div><div class="code-dot dot-yellow"></div><div class="code-dot dot-green"></div></div></div>
        <pre><span class="num">127.0.0.1</span>  yourdomain.localhost
<span class="num">127.0.0.1</span>  www.yourdomain.localhost
<span class="num">127.0.0.1</span>  admin.yourdomain.localhost
<span class="num">127.0.0.1</span>  api.yourdomain.localhost
<span class="num">127.0.0.1</span>  promo-test.yourdomain.localhost  <span class="cm"># 测试营销 H5 子域名</span></pre>
      </div>
    </div>
  </section>

  <!-- S15: 检查清单 -->
  <section class="section" id="s15">
    <div class="section-header">
      <div class="section-num num-blue">15</div>
      <h2>项目启动检查清单</h2>
    </div>
    <div class="checklist-grid">
      <div class="checklist-group">
        <h4>🏗️ 基础设施</h4>
        <div class="check-item"><div class="check-box"></div>Supabase 团队版项目创建，DB 分支功能开启</div>
        <div class="check-item"><div class="check-box"></div>Vercel 团队版项目配置，绑定 GitHub 仓库</div>
        <div class="check-item"><div class="check-box"></div>Cloudflare 添加域名，配置泛解析 CNAME</div>
        <div class="check-item"><div class="check-box"></div>GitHub 团队版分支保护规则配置</div>
      </div>
      <div class="checklist-group">
        <h4>💻 代码工程</h4>
        <div class="check-item"><div class="check-box"></div>nuxt.config.ts 路由规则与渲染模式配置完成</div>
        <div class="check-item"><div class="check-box"></div>子域名重写中间件配置并通过本地测试</div>
        <div class="check-item"><div class="check-box"></div>Auth 中间件（Cookie + Bearer 双模式）配置完成</div>
        <div class="check-item"><div class="check-box"></div>.cursorrules AI 编码规范文件就绪</div>
      </div>
      <div class="checklist-group">
        <h4>🔐 安全与合规</h4>
        <div class="check-item"><div class="check-box"></div>所有数据表已开启 RLS（supabase db lint 通过）</div>
        <div class="check-item"><div class="check-box"></div>APM 监控告警系统就绪，P95/P99 时延基线已校准</div>
        <div class="check-item"><div class="check-box"></div>getClientRealIP 工具函数覆盖所有 IP 读取场景</div>
        <div class="check-item"><div class="check-box"></div>GitHub Actions CI 四道防线全部配置</div>
      </div>
      <div class="checklist-group">
        <h4>🚀 性能</h4>
        <div class="check-item"><div class="check-box"></div>@nuxt/image 模块配置，官网首屏图片使用 preload</div>
        <div class="check-item"><div class="check-box"></div>useAppSEO() 封装完成，官网/H5 强制调用</div>
        <div class="check-item"><div class="check-box"></div>Lighthouse CI 预算文件配置（LCP &lt; 2s 门禁）</div>
        <div class="check-item"><div class="check-box"></div>Cloudflare HTTP/3 与 Brotli 压缩开启</div>
      </div>
      <div class="checklist-group">
        <h4>📋 平台职责确认</h4>
        <div class="check-item"><div class="check-box"></div>确认未开通 Vercel Postgres，数据库完全由 Supabase 承接</div>
        <div class="check-item"><div class="check-box"></div>确认用户上传文件使用 Supabase Storage（RLS 隔离）</div>
        <div class="check-item"><div class="check-box"></div>确认 Vercel KV 用于限流计数器等高频 KV 场景</div>
        <div class="check-item"><div class="check-box"></div>确认所有 HTTP API 在 /server/api/，无 Edge Function 承接路由</div>
      </div>
    </div>
  </section>

  <!-- S16: 平台决策 -->
  <section class="section" id="s16">
    <div class="section-header">
      <div class="section-num num-red">16</div>
      <h2>平台职责边界决策（Supabase vs Vercel）</h2>
    </div>

    <div class="alert alert-important">
      <div class="alert-icon">📌</div>
      <div class="alert-body"><strong>架构硬性决策</strong>Supabase 负责"数据与身份"，Vercel 负责"计算与交付"。两者都不应越界。错误使用将导致重复付费、数据孤岛、安全漏洞 and 架构混乱。</div>
    </div>

    <div class="subsection">
      <h3>6 大重叠能力裁判结果</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>重叠能力</th><th>选择平台</th><th>核心决策理由</th></tr></thead>
          <tbody>
            <tr><td><strong>关系型数据库</strong></td><td style="color:var(--accent-green);font-weight:700;">✅ Supabase PG</td><td>RLS 行级安全 + Auth 深度集成 + DB 分支不可替代；Vercel Postgres 不具备 these 企业级能力</td></tr>
            <tr><td><strong>文件存储</strong></td><td style="color:var(--accent-cyan);font-weight:700;">✅ 场景分治</td><td>用户私密文件 → Supabase Storage（RLS）；公开营销素材 → public/ 目录 + Cloudflare CDN</td></tr>
            <tr><td><strong>HTTP API 路由</strong></td><td style="color:var(--accent-blue);font-weight:700;">✅ Vercel Nitro</td><td>所有业务 HTTP API 由 Nuxt 4 Nitro 承接；Supabase Edge Functions 仅用于 DB 触发器增强</td></tr>
            <tr><td><strong>KV 缓存（限流）</strong></td><td style="color:var(--accent-blue);font-weight:700;">✅ Vercel KV</td><td>Supabase 无内置 Redis；Vercel KV（Upstash Redis）直接补位</td></tr>
            <tr><td><strong>用户身份鉴权</strong></td><td style="color:var(--accent-green);font-weight:700;">✅ Supabase Auth</td><td>Vercel 无原生 Auth；Supabase Auth 提供完整 OAuth/邮箱验证并与 DB/RLS 深度集成</td></tr>
            <tr><td><strong>Analytics 监控</strong></td><td style="color:var(--accent-cyan);font-weight:700;">✅ 两者互补</td><td>Supabase 看后端基础设施（DB 负载）；Vercel 看前端体验（Web Vitals）；维度不重叠</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="subsection">
      <h3>职责边界全景图</h3>
      <div class="boundary-grid">
        <div class="boundary-box bb-supabase">
          <h4>🗄️ Supabase 专属领土</h4>
          <div class="boundary-item"><div class="bi-icon">✅</div><div class="bi-text"><strong>数据持久化</strong><span>PostgreSQL 所有业务表与关系设计</span></div></div>
          <div class="boundary-item"><div class="bi-icon">✅</div><div class="bi-text"><strong>用户身份</strong><span>Auth：邮箱 / OAuth / Magic Link / JWT</span></div></div>
          <div class="boundary-item"><div class="bi-icon">✅</div><div class="bi-text"><strong>行级安全</strong><span>RLS Policy 所有权限控制逻辑</span></div></div>
          <div class="boundary-item"><div class="bi-icon">✅</div><div class="bi-text"><strong>用户私密文件</strong><span>上传文件：头像 / 文档 / 付费内容</span></div></div>
          <div class="boundary-item"><div class="bi-icon">✅</div><div class="bi-text"><strong>实时推送</strong><span>Realtime WebSocket 数据变更订阅</span></div></div>
          <div class="boundary-item"><div class="bi-icon">✅</div><div class="bi-text"><strong>数据库分支</strong><span>PR 级别的 Schema 隔离测试</span></div></div>
          <div class="boundary-item"><div class="bi-icon">✅</div><div class="bi-text"><strong>定时任务</strong><span>pg_cron 刷新物化视图 / 定期清理</span></div></div>
        </div>
        <div class="boundary-box bb-vercel">
          <h4>▲ Vercel 专属领土</h4>
          <div class="boundary-item"><div class="bi-icon">✅</div><div class="bi-text"><strong>代码构建与托管</strong><span>Nuxt 4 全栈应用 Serverless 部署</span></div></div>
          <div class="boundary-item"><div class="bi-icon">✅</div><div class="bi-text"><strong>静态资源 CDN</strong><span>JS / CSS / 字体 / 公开图片全球分发</span></div></div>
          <div class="boundary-item"><div class="bi-icon">✅</div><div class="bi-text"><strong>图片优化</strong><span>边缘压缩与 AVIF/WebP 格式转换</span></div></div>
          <div class="boundary-item"><div class="bi-icon">✅</div><div class="bi-text"><strong>Preview 部署</strong><span>PR 自动生成隔离预览环境</span></div></div>
          <div class="boundary-item"><div class="bi-icon">✅</div><div class="bi-text"><strong>API 路由执行</strong><span>Nitro Serverless & Edge Runtime</span></div></div>
          <div class="boundary-item"><div class="bi-icon">✅</div><div class="bi-text"><strong>Web Vitals 监控</strong><span>真实用户 LCP / INP / CLS 数据采集</span></div></div>
          <div class="boundary-item"><div class="bi-icon">✅</div><div class="bi-text"><strong>KV 高频缓存</strong><span>Vercel KV（Upstash Redis）限流 / 计数</span></div></div>
        </div>
      </div>
      <div class="boundary-box bb-forbidden" style="margin-top:16px;">
        <h4>🚫 灰色地带——明确禁止重复使用</h4>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:8px;">
          <div class="boundary-item"><div class="bi-icon">🚫</div><div class="bi-text"><strong>Vercel Postgres</strong><span>禁止开通，DB 全部走 Supabase PG</span></div></div>
          <div class="boundary-item"><div class="bi-icon">🚫</div><div class="bi-text"><strong>双平台存储冗余</strong><span>同类文件禁止同时走两个存储服务</span></div></div>
          <div class="boundary-item"><div class="bi-icon">🚫</div><div class="bi-text"><strong>Edge Fn 承接路由</strong><span>HTTP API 路由禁止写入 Supabase Edge Fn</span></div></div>
        </div>
      </div>
    </div>

    <div class="subsection">
      <h3>AI Coding 三大平台陷阱</h3>
      <div class="alert alert-caution">
        <div class="alert-icon">⚠️</div>
        <div class="alert-body">
          <strong>陷阱一：双平台存储冗余</strong>
          AI 可能在 Nuxt 4 API 层先上传文件到 Vercel Blob，再触发 Supabase Storage 同步，造成同一份文件两处冗余、成本翻倍。<br>→ .cursorrules 约束：公开静态资产走 public/ 目录，用户上传走 Supabase Storage，禁止引入 Vercel Blob。
        </div>
      </div>
      <div class="alert alert-caution">
        <div class="alert-icon">⚠️</div>
        <div class="alert-body">
          <strong>陷阱二：HTTP 路由写入 Supabase Edge Function</strong>
          AI 有时将新业务接口写成 Supabase Edge Function，导致两套 API 体系并行，安全策略无法统一。<br>→ .cursorrules 约束：所有 HTTP API 路由只能在 /server/api/ 下，严禁写 Supabase Edge Function 承接 HTTP 路由。
        </div>
      </div>
      <div class="alert alert-caution">
        <div class="alert-icon">⚠️</div>
        <div class="alert-body">
          <strong>陷阱三：Service Role Key 位置错误</strong>
          AI 可能将 SUPABASE_SERVICE_ROLE_KEY 误打包进前端 Bundle，造成超级管理员权限泄漏。<br>→ .cursorrules 约束：Service Role Key 只能存放在 Vercel 服务端专用环境变量（非 NUXT_PUBLIC_ 前缀）。
        </div>
      </div>
    </div>

    <div class="alert alert-tip">
      <div class="alert-icon">💡</div>
      <div class="alert-body">
        <strong>成本控制三问原则</strong>
        In 引入任何新服务前，先回答：① 这个能力是否已被 Supabase 或 Vercel 其中之一覆盖？② 若两者都覆盖，与"数据安全/用户身份"更强相关？→ 选 Supabase。③ 若两者都覆盖，与"交付性能/计算速度"更强相关？→ 选 Vercel。
      </div>
    </div>
  </section>
  <!-- S17: AI 极致提效 -->
  <section class="section" id="s17">
    <div class="section-header">
      <div class="section-num num-purple">17</div>
      <h2>AI 极致提效与单人进阶黑科技 (v1.0 增补)</h2>
    </div>
    
    <div class="alert alert-important">
      <div class="alert-icon">🚀</div>
      <div class="alert-body">
        <strong>极致人机协同与自动化</strong>
        单人全栈模式的精髓在于“消除人机协同摩擦力，裁剪一切繁琐开发流程，由 AI + 自动化安全栅栏提供 10x 效能支撑”。以下是精选的 10 大提效高级黑科技。
      </div>
    </div>

    <!-- 维度一：契约与类型 -->
    <div class="subsection">
      <h3>一、人机协同与类型契约 (Type &amp; Contract)</h3>
      <div class="decision-grid">
        <div class="decision-box">
          <h4>1. 端到端全自动类型闭环</h4>
          <div class="decision-item">
            <div class="di-icon" style="color:var(--accent-green)">✓</div>
            <div class="di-content">
              <div class="di-title">自动抽取 DB Schema 类型</div>
              <div class="di-desc">通过自动化脚本将 Supabase 生成的 database.types.ts 转换为前端/API 复用的 TableRow&lt;T&gt; 强类型。</div>
            </div>
          </div>
          <div class="decision-item">
            <div class="di-icon" style="color:var(--accent-green)">✓</div>
            <div class="di-content">
              <div class="di-title">Nuxt 4 接口自动推断</div>
              <div class="di-desc">借助 Nitro 引擎，前端 useFetch 调用 API 时完全无需手动声明返回类型，AI 在前端编码时可 100% 自动补全。</div>
            </div>
          </div>
          <div class="decision-item">
            <div class="di-icon" style="color:var(--accent-green)">✓</div>
            <div class="di-content">
              <div class="di-title">Zod/Valibot 统一契约</div>
              <div class="di-desc">用 Schema-Driven 方式编写输入校验，AI 可据此同步生成前端 UI 表单验证与后端过滤逻辑，消灭类型漂移。</div>
            </div>
          </div>
        </div>

        <div class="decision-box">
          <h4>2. AI 友好自动脚手架生成器</h4>
          <p class="di-desc" style="margin-bottom:12px;color:var(--text-secondary);">运行本地 <code>scripts/scaffolder.mjs</code>，为 AI 搭建严格符合架构规范的前后端“毛坯房”，规避 AI 因理解大上下文产生的幻觉。</p>
          <div class="code-block" style="margin:0;">
            <div class="code-header"><span class="code-lang">CLI</span><div class="code-dots"><div class="code-dot dot-red"></div><div class="code-dot dot-yellow"></div><div class="code-dot dot-green"></div></div></div>
            <pre><span class="kw">node</span> scripts/scaffolder.mjs billing
<span class="cm"># [OK] Created API: server/api/v1/billing/index.post.ts</span>
<span class="cm"># [OK] Created Page: app/pages/(client)/billing.vue</span></pre>
          </div>
        </div>
      </div>
      
      <div class="decision-grid" style="margin-top:16px;">
        <div class="decision-box" style="grid-column: span 2;">
          <h4>3. UnoCSS × AI 审美护城河</h4>
          <p class="di-desc" style="margin-bottom:12px;color:var(--text-secondary);">在 unocss.config.ts 中将高质感视觉设计（如 Glassmorphism 玻璃拟态卡片、现代微动效按钮、深色渐变背景）固化为别名 Shortcuts，禁止 AI 任意硬编码颜色，通过 .cursorrules 指引 AI 拼装出 Apple/Stripe 级别的极致现代设计。</p>
          <div class="code-block" style="margin:0;">
            <div class="code-header"><span class="code-lang">unocss.config.ts</span><div class="code-dots"><div class="code-dot dot-red"></div><div class="code-dot dot-yellow"></div><div class="code-dot dot-green"></div></div></div>
            <pre><span class="cm">// shortcuts 示例</span>
<span class="attr">shortcuts</span>: {
  <span class="str">'glass-card'</span>: <span class="str">'bg-white/70 backdrop-blur-md border border-white/20 shadow-lg rounded-2xl'</span>,
  <span class="str">'btn-premium'</span>: <span class="str">'bg-brand-primary hover:bg-brand-primary/90 text-white px-6 py-3 rounded-xl transition-all duration-200 hover:-translate-y-0.5 shadow-md'</span>
}</pre>
          </div>
        </div>
      </div>
    </div>

    <!-- 维度二：离线沙盒 -->
    <div class="subsection">
      <h3>二、离线沙盒与安全栅栏 (Sandbox &amp; Security)</h3>
      <div class="decision-grid">
        <div class="decision-box">
          <h4>4. 本地零依赖快速沙盒引擎 (Mock Mode)</h4>
          <p class="di-desc" style="margin-bottom:12px;color:var(--text-secondary);">无需启动庞大笨重的 Supabase Docker 镜像。在 /server/utils/db.ts 中通过 MOCK_DB=true 开启内存/JSON 伪装层。支持高铁、咖啡厅、笔记本低电量等移动办公场景下秒级冷启动，预览流转，精细联调时再切回真实 DB。</p>
          <div class="code-block" style="margin:0;">
            <div class="code-header"><span class="code-lang">TypeScript</span><div class="code-dots"><div class="code-dot dot-red"></div><div class="code-dot dot-yellow"></div><div class="code-dot dot-green"></div></div></div>
            <pre><span class="kw">export function</span> <span class="fn">getDB</span>(event: <span class="type">any</span>) {
  <span class="kw">if</span> (process.env.MOCK_DB === <span class="str">'true'</span>) {
    <span class="kw">return</span> <span class="fn">getLocalMockDB</span>() <span class="cm">// 返回内存伪装层</span>
  }
  <span class="kw">return</span> dbClient <span class="cm">// 返回真实 Supabase Client</span>
}</pre>
          </div>
        </div>

        <div class="decision-box">
          <h4>5. SQL 注释驱动 RLS 与安全测试环</h4>
          <div class="decision-item">
            <div class="di-icon" style="color:var(--accent-orange)">🛡️</div>
            <div class="di-content">
              <div class="di-title">SQL 注释驱动声明</div>
              <div class="di-desc">在 migrations 中使用 <code>-- @rls: enable</code> 等元数据声明，本地校验脚本强制 AI 必须同步编写安全策略。</div>
            </div>
          </div>
          <div class="decision-item">
            <div class="di-icon" style="color:var(--accent-orange)">🛡️</div>
            <div class="di-content">
              <div class="di-title">单元越权模拟测试</div>
              <div class="di-desc">编写 <code>rls.test.ts</code>，模拟不同权限的越权请求，100% 阻断 AI 因不理解 RLS policy 而导致的写表越权和漏配漏洞。</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 维度三：跨端融合与合规 -->
    <div class="subsection">
      <h3>三、多端融合与全球合规 (Cross-platform &amp; Compliance)</h3>
      <div class="decision-grid">
        <div class="decision-box">
          <h4>6. Capacitor 移动端融合架构 (多端同源)</h4>
          <p class="di-desc" style="margin-bottom:12px;color:var(--text-secondary);">在 Nuxt 单仓中直接引入 Capacitor，免去重写 React Native/Flutter 带来的人力耗费。打包 App 路由为 Native 壳，配合 Vercel 静态导出，在合规红线内实现 Bug 修复的秒级热更新。</p>
          <div class="code-block" style="margin:0;">
            <div class="code-header"><span class="code-lang">Shell</span><div class="code-dots"><div class="code-dot dot-red"></div><div class="code-dot dot-yellow"></div><div class="code-dot dot-green"></div></div></div>
            <pre><span class="cm"># 安装 Capacitor 并创建原生壳</span>
<span class="kw">npm i</span> @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
<span class="kw">npx cap init</span> "MyApp" "com.myapp.app" --web-dir=.output/public
<span class="kw">npx cap sync</span></pre>
          </div>
        </div>

        <div class="decision-box">
          <h4>7. 全球合规与安全基线</h4>
          <div class="decision-item">
            <div class="di-icon" style="color:var(--accent-cyan)">✓</div>
            <div class="di-content">
              <div class="di-title">RLS + JWT 双重防御</div>
              <div class="di-desc">数据库层面通过 RLS Policy 强制数据隔离，API 层面通过 JWT 令牌 + assertUser 断言双重保障，任何越权操作在物理层被拦截。</div>
            </div>
          </div>
          <div class="decision-item">
            <div class="di-icon" style="color:var(--accent-cyan)">✓</div>
            <div class="di-content">
              <div class="di-title">GDPR Cookie 声明代码化</div>
              <div class="di-desc">在 Layout 中使用轻量 <code>cookieconsent</code> 声明，仅在用户同意后才初始化第三方分析统计，彻底规避欧盟巨额罚款风险。</div>
            </div>
          </div>
        </div>
      </div>

      <div class="alert alert-caution" style="margin-top:16px;">
        <div class="alert-icon">⚠️</div>
        <div class="alert-body" style="font-size:12.5px;">
          <strong style="margin-bottom:6px;color:#fca5a5;">Capacitor 移动端与热更新审核红线警告 (Apple App Store Compliance)</strong>
          <ul style="padding-left:18px;margin-top:4px;line-height:1.6;">
            <li><strong>禁止套壳直连</strong>：严禁直接加载远程 Vercel URL 作为 App 主内容（违反 Guideline 4.2 最小功能网页套壳禁令）。必须将静态资源构建后使用 <code>npx cap sync</code> 打包进 Native 本地包体内。</li>
            <li><strong>热更新界限</strong>：热更新只能用于修复 Bug 和 UI 微调。严禁通过热更新更改 App 核心特征/主要功能（违反 Guideline 2.5.2），更不得绕过审核上架违规功能，否则面临直接下架或封号风险。</li>
            <li><strong>支付双轨制限制</strong>：iOS 原生 App 中严禁使用 Stripe 等第三方支付绕过 App 内购买 (IAP)（违反 Guideline 3.1.1）。针对数字虚拟商品，必须走 Apple IAP 支付，或者做成“Reader App（仅提供登录消费，去掉 App 内购买按钮）”。</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- 维度四：AI 运维与全球化 -->
    <div class="subsection">
      <h3>四、AI 运维与全球化 (AI Ops &amp; Localization)</h3>
      <div class="decision-grid">
        <div class="decision-box">
          <h4>8. GitHub Actions AI 自愈 (Self-Healing CI)</h4>
          <p class="di-desc" style="margin-bottom:12px;color:var(--text-secondary);">当 CI 步骤如 ESLint 或 TypeScript 校验失败时，触发 AI Healer 机器人，自动读取最后一次运行报错日志，调用大模型 API 修复文件并自动 Push 回分支。人类只需专注核心商业逻辑。</p>
          <div class="code-block" style="margin:0;">
            <div class="code-header"><span class="code-lang">YAML</span><div class="code-dots"><div class="code-dot dot-red"></div><div class="code-dot dot-yellow"></div><div class="code-dot dot-green"></div></div></div>
            <pre><span class="cm"># ci-self-heal step 核心逻辑</span>
<span class="kw">if:</span> failure() && github.event_name == 'pull_request'
<span class="kw">run:</span> |
  node scripts/ai_healer.js
  git commit -am "style: [AI Auto-Heal] fix issues" && git push</pre>
          </div>
        </div>

        <div class="decision-box">
          <h4>9. LLM 全自动 i18n 提取与语义化翻译</h4>
          <p class="di-desc" style="margin-bottom:12px;color:var(--text-secondary);">借助 <code>@nuxtjs/i18n</code>，配合扫描脚本自动提取代码中的 <code>$t()</code> Key，使用大模型扮演多语言本地化专家，进行地道、专业的产品语义翻译（如 <code>locales/en.json</code>、<code>locales/ja.json</code> 自动写入），告别生硬机翻。</p>
          <div class="code-block" style="margin:0;">
            <div class="code-header"><span class="code-lang">JavaScript</span><div class="code-dots"><div class="code-dot dot-red"></div><div class="code-dot dot-yellow"></div><div class="code-dot dot-green"></div></div></div>
            <pre><span class="kw">node</span> scripts/auto-translate.mjs
<span class="cm"># 1. 扫描 app/ 目录提取未翻译 $t() Key</span>
<span class="cm"># 2. 调用 LLM 翻译为地道多国语言，自动对齐写入 locales/*.json</span></pre>
          </div>
        </div>
      </div>

      <div class="decision-grid" style="margin-top:16px;">
        <div class="decision-box" style="grid-column: span 2;">
          <h4>10. 零配置 Telemetry 极简监控</h4>
          <div class="table-wrap">
            <table>
              <thead><tr><th>监控维度</th><th>选型</th><th>提效原理解析</th></tr></thead>
              <tbody>
                <tr><td><strong>异常采集</strong></td><td><strong>Sentry (Nuxt SDK)</strong></td><td>Nitro Server 中统一拦截，崩溃错误秒级捕获，无需编写臃肿逻辑。</td></tr>
                <tr><td><strong>全局日志流</strong></td><td><strong>Axiom</strong></td><td>零部署零维护。Vercel 产生的控制台日志自动导流，每月 500GB 免费，配合 SQL 级多维搜索。</td></tr>
                <tr><td><strong>用户行为分析</strong></td><td><strong>Vercel Web Analytics</strong></td><td>开箱即用，隐私合规，无需配置庞大的 Google Analytics 自定义埋点。</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- S18: 三方支付系统集成 -->
  <section class="section" id="s18">
    <div class="section-header">
      <div class="section-num num-purple">18</div>
      <h2>三方支付系统集成 (Stripe Checkout)</h2>
    </div>
    <div class="subsection">
      <h3>Stripe Checkout 支付流程</h3>
      <div class="flow-steps">
        <div class="flow-step"><div class="flow-num">1</div><div class="flow-content"><div class="flow-title">前端发起支付</div><div class="flow-desc">H5 页面调用 usePayment() composable，POST /api/v1/payments/create 创建订单</div></div></div>
        <div class="flow-step"><div class="flow-num">2</div><div class="flow-content"><div class="flow-title">创建 Checkout Session</div><div class="flow-desc">服务端调用 Stripe API 创建托管支付会话，返回支付 URL 与 Session ID</div></div></div>
        <div class="flow-step"><div class="flow-num">3</div><div class="flow-content"><div class="flow-title">跳转 Stripe 托管页</div><div class="flow-desc">用户重定向至 Stripe 托管支付页，完成信用卡/Apple Pay/Google Pay 支付</div></div></div>
        <div class="flow-step"><div class="flow-num">4</div><div class="flow-content"><div class="flow-title">Webhook 回调</div><div class="flow-desc">Stripe 向 /api/v1/payments/webhook 推送 checkout.session.completed 事件</div></div></div>
        <div class="flow-step"><div class="flow-num">5</div><div class="flow-content"><div class="flow-title">订单状态更新</div><div class="flow-desc">服务端验证 Webhook 签名后更新订单状态为 paid，写入审计日志</div></div></div>
        <div class="flow-step"><div class="flow-num">6</div><div class="flow-content"><div class="flow-title">前端确认展示</div><div class="flow-desc">用户返回 /payments/confirm 页面，展示支付成功状态与订单详情</div></div></div>
      </div>
    </div>
    <div class="subsection">
      <h3>Webhook 安全验证</h3>
      <div class="code-block">
        <div class="code-header"><span class="code-lang">TypeScript · server/utils/payments.ts</span><div class="code-dots"><div class="code-dot dot-red"></div><div class="code-dot dot-yellow"></div><div class="code-dot dot-green"></div></div></div>
        <pre><span class="cm">// Stripe Webhook 签名验证（防止伪造请求）</span>
<span class="kw">export function</span> <span class="fn">verifyWebhookSignature</span>(rawBody, signature) {
  <span class="kw">const</span> event = stripe.webhooks.<span class="fn">constructEvent</span>(
    rawBody, signature, process.env.<span class="cm">STRIPE_WEBHOOK_SECRET</span>
  )
  <span class="kw">return</span> event
}

<span class="cm">// 支持事件类型：checkout.session.completed / charge.refunded</span></pre>
      </div>
    </div>
    <div class="alert alert-caution">
      <div class="alert-icon">⚠️</div>
      <div class="alert-body"><strong>安全强制约束</strong>Stripe Secret Key 严禁出现在前端代码；Webhook 端点必须验证签名（02.auth.ts 中已加白名单）；所有金额计算必须使用 NUMERIC 类型，严禁浮点数。</div>
    </div>
    <div class="subsection">
      <h3>数据库表设计</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>表名</th><th>核心字段</th><th>用途</th></tr></thead>
          <tbody>
            <tr><td><strong>orders</strong></td><td>order_no, amount, currency, status, payment_intent_id</td><td>订单全生命周期追踪（pending→paid→refunded）</td></tr>
            <tr><td><strong>activity_logs</strong></td><td>category, user_id, action, ip, metadata, created_at</td><td>统一日志（auth/admin/system），JSONB metadata 灵活扩展</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>

  <!-- S20: 移动端用户认证体系 -->
  <section class="section" id="s20">
    <div class="section-header">
      <div class="section-num num-purple">20</div>
      <h2>移动端用户认证体系</h2>
    </div>
    <div class="subsection">
      <h3>认证流程全链路</h3>
      <div class="flow-steps">
        <div class="flow-step"><div class="flow-num">1</div><div class="flow-content"><div class="flow-title">匿名用户浏览</div><div class="flow-desc">H5 页面加载时自动 signInAnonymously()，device_id 写入 Cookie 标识设备，用户可浏览活动信息</div></div></div>
        <div class="flow-step"><div class="flow-num">2</div><div class="flow-content"><div class="flow-title">触发登录引导</div><div class="flow-desc">用户点击支付/预约时，若未登录则弹出 H5LoginModal，缓存待执行操作（pendingAction）</div></div></div>
        <div class="flow-step"><div class="flow-num">3</div><div class="flow-content"><div class="flow-title">多方式登录</div><div class="flow-desc">支持 Email+Password、Google OAuth、Facebook OAuth、Apple OAuth，客户端直连 Supabase Auth</div></div></div>
        <div class="flow-step"><div class="flow-num">4</div><div class="flow-content"><div class="flow-title">Token 同步</div><div class="flow-desc">登录成功后 access_token 写入 sb-access-token Cookie，supabase-auth.client.ts 插件监听 onAuthStateChange 自动同步</div></div></div>
        <div class="flow-step"><div class="flow-num">5</div><div class="flow-content"><div class="flow-title">服务端识别</div><div class="flow-desc">02.auth.ts 中间件从 Cookie/Bearer 提取 token，调用 Supabase getUser() 解析身份，写入 event.context.user</div></div></div>
        <div class="flow-step"><div class="flow-num">6</div><div class="flow-content"><div class="flow-title">权限守卫</div><div class="flow-desc">04.auth-guard.ts 拦截支付/订单接口，拒绝匿名用户访问，返回 403 引导登录</div></div></div>
      </div>
    </div>
    <div class="subsection">
      <h3>支持的登录方式对照</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>登录方式</th><th>Provider</th><th>实现机制</th><th>适用场景</th></tr></thead>
          <tbody>
            <tr><td><strong>Email + Password</strong></td><td>email</td><td>Supabase signUp / signInWithPassword</td><td>通用注册登录</td></tr>
            <tr><td><strong>Google</strong></td><td>google</td><td>Supabase OAuth (signInWithOAuth)</td><td>海外主流用户</td></tr>
            <tr><td><strong>Facebook</strong></td><td>facebook</td><td>Supabase OAuth (signInWithOAuth)</td><td>东南亚/拉美用户</td></tr>
            <tr><td><strong>Apple</strong></td><td>apple</td><td>Supabase OAuth (signInWithOAuth)</td><td>iOS 用户（App Store 审核要求）</td></tr>
            <tr><td><strong>Anonymous</strong></td><td>anonymous</td><td>Supabase signInAnonymously + device_id</td><td>先浏览后登录</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="subsection">
      <h3>Token 生命周期管理</h3>
      <div class="decision-grid">
        <div class="decision-box">
          <h4>Access Token (1h)</h4>
          <p class="di-desc">短期有效 JWT，存储在 <code>sb-access-token</code> Cookie。每次 API 请求由 server middleware 验证。过期后自动用 Refresh Token 续期。</p>
        </div>
        <div class="decision-box">
          <h4>Refresh Token (30d)</h4>
          <p class="di-desc">长期有效 token，存储在 <code>sb-refresh-token</code> Cookie。Supabase SDK 自动在 access_token 过期前调用 refreshSession()。</p>
        </div>
        <div class="decision-box">
          <h4>Device ID (365d)</h4>
          <p class="di-desc">设备指纹，存储在 <code>device-id</code> Cookie。用于匿名用户标识和行为数据关联，绑定账号后迁移到 user_id。</p>
        </div>
      </div>
    </div>
    <div class="subsection">
      <h3>匿名→绑定数据迁移策略</h3>
      <div class="flow-steps">
        <div class="flow-step"><div class="flow-num">1</div><div class="flow-content"><div class="flow-title">匿名用户行为记录</div><div class="flow-desc">页面浏览等行为数据关联 device_id，存储在 activity_logs 等表中</div></div></div>
        <div class="flow-step"><div class="flow-num">2</div><div class="flow-content"><div class="flow-title">触发绑定</div><div class="flow-desc">用户点击“绑定账号”或“注册享更多”，调用 POST /api/v1/auth/link 绑定邮箱</div></div></div>
        <div class="flow-step"><div class="flow-num">3</div><div class="flow-content"><div class="flow-title">身份转换</div><div class="flow-desc">profiles 表更新 is_anonymous=false, auth_provider=email。Supabase Auth linkIdentity 合并身份</div></div></div>
        <div class="flow-step"><div class="flow-num">4</div><div class="flow-content"><div class="flow-title">数据归属</div><div class="flow-desc">后续新数据直接关联 user_id，历史行为数据可通过 device_id 回溯（审计用途）</div></div></div>
      </div>
    </div>
    <div class="subsection">
      <h3>数据库表设计</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>表名</th><th>关键字段</th><th>RLS 策略</th></tr></thead>
          <tbody>
            <tr><td><strong>profiles</strong></td><td>avatar_url, display_name, auth_provider, provider_id, device_id, is_anonymous, email_verified</td><td>用户读写自己，admin 全权限</td></tr>
            
          </tbody>
        </table>
      </div>
    </div>
    <div class="alert alert-note">
      <div class="alert-icon">ℹ️</div>
      <div class="alert-body"><strong>自动 Profile 创建</strong>迁移脚本 0003_user_auth.sql 包含 <code>handle_new_user()</code> 触发器函数，新用户通过 Supabase Auth 注册时自动在 profiles 表创建记录，无需前端额外处理。</div>
    </div>
  </section>

  <!-- FOOTER -->
  <div class="footer">
    <div class="footer-badges">
      <span class="footer-badge">v1.0</span>
      <span class="footer-badge">20 Chapters</span>
      <span class="footer-badge">Nuxt 4 · Supabase · Vercel</span>
      <span class="footer-badge">AI Coding Ready</span>
    </div>
    <div>单人全栈单仓混合技术架构方案 v1.0 · Protocol-First × Harness Engineering × AI Coding × Solo AI Hacks</div>
  </div>

</main>


  </div>
</template>

<style scoped>
:global(:root) {
      --bg-primary: #0a0e1a;
      --bg-secondary: #0f1628;
      --bg-card: #131d35;
      --bg-card-hover: #1a2540;
      --bg-sidebar: #080c18;
      --border: #1e2d4d;
      --border-light: #243558;
      --accent-blue: #4f8ef7;
      --accent-purple: #8b5cf6;
      --accent-cyan: #22d3ee;
      --accent-green: #10b981;
      --accent-orange: #f59e0b;
      --accent-red: #ef4444;
      --text-primary: #e2e8f0;
      --text-secondary: #94a3b8;
      --text-muted: #64748b;
      --code-bg: #0d1626;
      --tag-bg: #1e3a5f;
      --gradient-1: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      --gradient-2: linear-gradient(135deg, #4f8ef7 0%, #22d3ee 100%);
      --gradient-3: linear-gradient(135deg, #10b981 0%, #059669 100%);
    }

    :global(*) { margin: 0; padding: 0; box-sizing: border-box; }

    :global(html) { scroll-behavior: smooth; }

    :global(body) {
      font-family: 'Inter', 'Noto Sans SC', sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.7;
      overflow-x: hidden;
    }

    /* ===== SIDEBAR ===== */
    .sidebar {
      position: fixed;
      left: 0; top: 0;
      width: 260px;
      height: 100vh;
      background: var(--bg-sidebar);
      border-right: 1px solid var(--border);
      overflow-y: auto;
      z-index: 100;
      display: flex;
      flex-direction: column;
    }

    .sidebar::-webkit-scrollbar { width: 4px; }
    .sidebar::-webkit-scrollbar-track { background: transparent; }
    .sidebar::-webkit-scrollbar-thumb { background: var(--border-light); border-radius: 2px; }

    .sidebar-logo {
      padding: 24px 20px 16px;
      border-bottom: 1px solid var(--border);
    }

    .logo-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: linear-gradient(135deg, #1e3a6e, #2d1b69);
      border: 1px solid #3b4f8a;
      border-radius: 10px;
      padding: 8px 14px;
      margin-bottom: 10px;
    }

    .logo-dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      background: var(--accent-cyan);
      box-shadow: 0 0 8px var(--accent-cyan);
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(0.8); }
    }

    .logo-text {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.5px;
      color: var(--accent-cyan);
    }

    .sidebar-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
      line-height: 1.4;
    }

    .sidebar-version {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 4px;
    }

    .sidebar-nav { padding: 12px 0; flex: 1; }

    .nav-section {
      padding: 6px 16px 2px;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 1px;
      color: var(--text-muted);
      text-transform: uppercase;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 20px;
      font-size: 12.5px;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s;
      border-left: 2px solid transparent;
      text-decoration: none;
    }

    .nav-item:hover {
      color: var(--text-primary);
      background: rgba(79, 142, 247, 0.06);
      border-left-color: var(--accent-blue);
    }

    .nav-item.active {
      color: var(--accent-blue);
      background: rgba(79, 142, 247, 0.1);
      border-left-color: var(--accent-blue);
    }

    .nav-num {
      font-size: 10px;
      font-weight: 700;
      color: var(--text-muted);
      min-width: 18px;
      font-family: 'JetBrains Mono', monospace;
    }

    /* ===== MAIN ===== */
    .main {
      margin-left: 260px;
      min-height: 100vh;
    }

    /* ===== HERO HEADER ===== */
    .hero {
      position: relative;
      padding: 60px 60px 50px;
      border-bottom: 1px solid var(--border);
      overflow: hidden;
    }

    .hero-bg {
      position: absolute;
      inset: 0;
      background:
        radial-gradient(ellipse 60% 60% at 80% -10%, rgba(79, 142, 247, 0.12) 0%, transparent 60%),
        radial-gradient(ellipse 40% 40% at 10% 100%, rgba(139, 92, 246, 0.08) 0%, transparent 60%);
      pointer-events: none;
    }

    .hero-grid {
      position: absolute;
      inset: 0;
      background-image: linear-gradient(rgba(79,142,247,0.03) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(79,142,247,0.03) 1px, transparent 1px);
      background-size: 40px 40px;
      pointer-events: none;
    }

    .hero-content { position: relative; z-index: 1; }

    .hero-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 20px;
    }

    .hero-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 500;
      border: 1px solid;
    }

    .tag-blue { background: rgba(79,142,247,0.1); border-color: rgba(79,142,247,0.3); color: #7db3ff; }
    .tag-purple { background: rgba(139,92,246,0.1); border-color: rgba(139,92,246,0.3); color: #a78bfa; }
    .tag-green { background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.3); color: #34d399; }
    .tag-cyan { background: rgba(34,211,238,0.1); border-color: rgba(34,211,238,0.3); color: #67e8f9; }
    .tag-orange { background: rgba(245,158,11,0.1); border-color: rgba(245,158,11,0.3); color: #fbbf24; }

    .hero h1 {
      font-size: 32px;
      font-weight: 700;
      background: linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 16px;
      line-height: 1.3;
    }

    .hero-meta {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
      margin-top: 28px;
    }

    .meta-card {
      background: rgba(255,255,255,0.03);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 14px 16px;
    }

    .meta-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--text-muted);
      margin-bottom: 6px;
      font-weight: 600;
    }

    .meta-value {
      font-size: 12.5px;
      color: var(--text-primary);
      font-weight: 500;
    }

    /* ===== SECTION ===== */
    .section {
      padding: 50px 60px;
      border-bottom: 1px solid var(--border);
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 32px;
    }

    .section-num {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
      flex-shrink: 0;
    }

    .num-blue { background: rgba(79,142,247,0.15); color: var(--accent-blue); border: 1px solid rgba(79,142,247,0.3); }
    .num-purple { background: rgba(139,92,246,0.15); color: var(--accent-purple); border: 1px solid rgba(139,92,246,0.3); }
    .num-green { background: rgba(16,185,129,0.15); color: var(--accent-green); border: 1px solid rgba(16,185,129,0.3); }
    .num-cyan { background: rgba(34,211,238,0.15); color: var(--accent-cyan); border: 1px solid rgba(34,211,238,0.3); }
    .num-orange { background: rgba(245,158,11,0.15); color: var(--accent-orange); border: 1px solid rgba(245,158,11,0.3); }
    .num-red { background: rgba(239,68,68,0.15); color: var(--accent-red); border: 1px solid rgba(239,68,68,0.3); }

    .section-header h2 {
      font-size: 22px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .subsection { margin-bottom: 36px; }

    .subsection h3 {
      font-size: 15px;
      font-weight: 600;
      color: #93c5fd;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .subsection h3::before {
      content: '';
      display: block;
      width: 3px;
      height: 16px;
      border-radius: 2px;
      background: var(--accent-blue);
      flex-shrink: 0;
    }

    /* ===== ARCH DIAGRAM ===== */
    .arch-diagram {
      background: var(--code-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 28px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11.5px;
      line-height: 1.9;
      color: #94a3b8;
      overflow-x: auto;
      position: relative;
    }

    .arch-diagram::before {
      content: 'ARCHITECTURE DIAGRAM';
      position: absolute;
      top: 12px;
      right: 16px;
      font-size: 9px;
      letter-spacing: 1.5px;
      color: var(--text-muted);
    }

    /* ===== TABLES ===== */
    .table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid var(--border); }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    th {
      background: rgba(79,142,247,0.08);
      color: var(--accent-blue);
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }

    td {
      padding: 11px 16px;
      border-bottom: 1px solid rgba(30,45,77,0.5);
      color: var(--text-secondary);
      vertical-align: top;
    }

    tr:last-child td { border-bottom: none; }

    tr:hover td { background: rgba(255,255,255,0.02); }

    td strong { color: var(--text-primary); }

    td code {
      background: rgba(79,142,247,0.12);
      color: #93c5fd;
      padding: 1px 6px;
      border-radius: 4px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11.5px;
    }

    /* ===== CODE BLOCKS ===== */
    .code-block {
      background: var(--code-bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      overflow: hidden;
      margin: 16px 0;
    }

    .code-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 16px;
      border-bottom: 1px solid var(--border);
      background: rgba(255,255,255,0.02);
    }

    .code-lang {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--text-muted);
    }

    .code-dots {
      display: flex;
      gap: 6px;
    }

    .code-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    .dot-red { background: #ff5f57; }
    .dot-yellow { background: #febc2e; }
    .dot-green { background: #28c840; }

    pre {
      padding: 20px;
      overflow-x: auto;
      font-size: 12px;
      line-height: 1.8;
      font-family: 'JetBrains Mono', monospace;
      color: #cbd5e1;
    }

    pre::-webkit-scrollbar { height: 4px; }
    pre::-webkit-scrollbar-track { background: transparent; }
    pre::-webkit-scrollbar-thumb { background: var(--border-light); border-radius: 2px; }

    /* 语法高亮配色 */
    .kw { color: #c792ea; }
    .fn { color: #82aaff; }
    .str { color: #c3e88d; }
    .cm { color: #546e7a; font-style: italic; }
    .num { color: #f78c6c; }
    .op { color: #89ddff; }
    .type { color: #ffcb6b; }
    .attr { color: #f07178; }

    /* ===== FLOW CARDS ===== */
    .flow-steps {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .flow-step {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      padding: 14px 16px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 8px;
      position: relative;
    }

    .flow-step::after {
      content: '↓';
      position: absolute;
      bottom: -14px;
      left: 50%;
      transform: translateX(-50%);
      color: var(--text-muted);
      font-size: 12px;
      z-index: 1;
    }

    .flow-step:last-child::after { display: none; }

    .flow-num {
      width: 24px;
      height: 24px;
      background: rgba(79,142,247,0.15);
      border: 1px solid rgba(79,142,247,0.3);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      color: var(--accent-blue);
      flex-shrink: 0;
      font-family: 'JetBrains Mono', monospace;
    }

    .flow-content { flex: 1; }
    .flow-title { font-size: 13px; font-weight: 600; color: var(--text-primary); }
    .flow-desc { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }

    /* ===== DOMAIN CARDS ===== */
    .domain-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 16px;
    }

    .domain-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      transition: all 0.3s;
      position: relative;
      overflow: hidden;
    }

    .domain-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 2px;
    }

    .dc-blue::before { background: linear-gradient(90deg, var(--accent-blue), var(--accent-cyan)); }
    .dc-purple::before { background: linear-gradient(90deg, var(--accent-purple), #ec4899); }
    .dc-green::before { background: linear-gradient(90deg, var(--accent-green), #34d399); }
    .dc-orange::before { background: linear-gradient(90deg, var(--accent-orange), #f97316); }

    .domain-card:hover { border-color: var(--border-light); transform: translateY(-2px); }

    .domain-badge {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      padding: 3px 8px;
      border-radius: 4px;
      margin-bottom: 10px;
      display: inline-block;
    }

    .badge-blue { background: rgba(79,142,247,0.15); color: var(--accent-blue); }
    .badge-purple { background: rgba(139,92,246,0.15); color: var(--accent-purple); }
    .badge-green { background: rgba(16,185,129,0.15); color: var(--accent-green); }
    .badge-orange { background: rgba(245,158,11,0.15); color: var(--accent-orange); }

    .domain-url {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12.5px;
      color: var(--text-primary);
      font-weight: 600;
      margin-bottom: 6px;
    }

    .domain-route {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: var(--text-muted);
      margin-bottom: 10px;
    }

    .domain-render {
      font-size: 11px;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 12px;
      display: inline-block;
    }

    .render-isr { background: rgba(16,185,129,0.15); color: var(--accent-green); }
    .render-swr { background: rgba(34,211,238,0.15); color: var(--accent-cyan); }
    .render-spa { background: rgba(139,92,246,0.15); color: var(--accent-purple); }
    .render-api { background: rgba(245,158,11,0.15); color: var(--accent-orange); }

    .domain-desc { font-size: 12px; color: var(--text-secondary); margin-top: 8px; }

    /* ===== RENDER MODE CARDS ===== */
    .render-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px;
    }

    .render-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
    }

    .render-icon {
      font-size: 24px;
      margin-bottom: 10px;
    }

    .render-name {
      font-size: 14px;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 4px;
    }

    .render-full {
      font-size: 10px;
      color: var(--text-muted);
      margin-bottom: 10px;
    }

    .render-ttl {
      font-family: 'JetBrains Mono', monospace;
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .render-ttl-label { font-size: 10px; color: var(--text-muted); margin-bottom: 10px; }
    .render-path { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text-muted); }
    .render-detail { font-size: 12px; color: var(--text-secondary); margin-top: 8px; }

    /* ===== SECURITY LAYERS ===== */
    .security-layers {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .security-layer {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 14px 18px;
      border-radius: 10px;
      border: 1px solid;
    }

    .sl-1 { background: rgba(239,68,68,0.05); border-color: rgba(239,68,68,0.2); }
    .sl-2 { background: rgba(245,158,11,0.05); border-color: rgba(245,158,11,0.2); }
    .sl-3 { background: rgba(139,92,246,0.05); border-color: rgba(139,92,246,0.2); }
    .sl-4 { background: rgba(79,142,247,0.05); border-color: rgba(79,142,247,0.2); }
    .sl-5 { background: rgba(16,185,129,0.05); border-color: rgba(16,185,129,0.2); }

    .sl-icon {
      font-size: 20px;
      flex-shrink: 0;
    }

    .sl-content { flex: 1; }
    .sl-title { font-size: 13px; font-weight: 600; color: var(--text-primary); }
    .sl-desc { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }

    .sl-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 10px;
      background: rgba(255,255,255,0.06);
      color: var(--text-secondary);
    }

    /* ===== DECISION MATRIX ===== */
    .decision-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .decision-box {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 22px;
    }

    .decision-box h4 {
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .decision-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 8px 0;
      border-bottom: 1px solid rgba(30,45,77,0.4);
      font-size: 12.5px;
    }

    .decision-item:last-child { border-bottom: none; }

    .di-icon { font-size: 14px; flex-shrink: 0; margin-top: 1px; }
    .di-content { flex: 1; }
    .di-title { font-weight: 600; color: var(--text-primary); }
    .di-desc { color: var(--text-secondary); font-size: 11.5px; margin-top: 2px; }

    /* ===== ALERTS ===== */
    .alert {
      border-radius: 10px;
      padding: 16px 18px;
      margin: 16px 0;
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }

    .alert-important {
      background: rgba(79,142,247,0.08);
      border: 1px solid rgba(79,142,247,0.25);
    }

    .alert-caution {
      background: rgba(239,68,68,0.08);
      border: 1px solid rgba(239,68,68,0.25);
    }

    .alert-tip {
      background: rgba(16,185,129,0.08);
      border: 1px solid rgba(16,185,129,0.25);
    }

    .alert-note {
      background: rgba(245,158,11,0.08);
      border: 1px solid rgba(245,158,11,0.25);
    }

    .alert-icon { font-size: 18px; flex-shrink: 0; line-height: 1; }
    .alert-body { flex: 1; font-size: 13px; }
    .alert-body strong { display: block; margin-bottom: 4px; }
    .alert-important .alert-body strong { color: #93c5fd; }
    .alert-caution .alert-body strong { color: #fca5a5; }
    .alert-tip .alert-body strong { color: #6ee7b7; }
    .alert-note .alert-body strong { color: #fcd34d; }

    /* ===== CI PIPELINE ===== */
    .ci-pipeline {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 14px;
    }

    .ci-gate {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 18px;
      position: relative;
    }

    .ci-num {
      position: absolute;
      top: -10px;
      left: 16px;
      background: var(--bg-primary);
      padding: 0 8px;
      font-size: 10px;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
    }

    .ci-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 6px;
    }

    .ci-cmd {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      background: var(--code-bg);
      color: var(--accent-cyan);
      padding: 5px 10px;
      border-radius: 6px;
      margin-bottom: 8px;
      display: block;
    }

    .ci-desc { font-size: 12px; color: var(--text-secondary); }

    .ci-result {
      margin-top: 10px;
      font-size: 11px;
      padding: 4px 10px;
      border-radius: 6px;
      background: rgba(239,68,68,0.1);
      color: #fca5a5;
      border: 1px solid rgba(239,68,68,0.2);
      display: inline-block;
    }

    /* ===== CHECKLIST ===== */
    .checklist-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }

    .checklist-group {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 18px;
    }

    .checklist-group h4 {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
      margin-bottom: 12px;
    }

    .check-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 6px 0;
      font-size: 12.5px;
      color: var(--text-secondary);
      border-bottom: 1px solid rgba(30,45,77,0.3);
    }

    .check-item:last-child { border-bottom: none; }

    .check-box {
      width: 16px; height: 16px;
      border: 1.5px solid var(--border-light);
      border-radius: 4px;
      flex-shrink: 0;
      margin-top: 1px;
    }

    /* ===== BOUNDARY BOX ===== */
    .boundary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .boundary-box {
      border-radius: 12px;
      padding: 22px;
      border: 1px solid;
    }

    .bb-supabase {
      background: linear-gradient(135deg, rgba(16,185,129,0.05), rgba(5,150,105,0.03));
      border-color: rgba(16,185,129,0.25);
    }

    .bb-vercel {
      background: linear-gradient(135deg, rgba(79,142,247,0.05), rgba(34,211,238,0.03));
      border-color: rgba(79,142,247,0.25);
    }

    .bb-forbidden {
      background: rgba(239,68,68,0.04);
      border-color: rgba(239,68,68,0.2);
    }

    .boundary-box h4 {
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 14px;
    }

    .bb-supabase h4 { color: var(--accent-green); }
    .bb-vercel h4 { color: var(--accent-blue); }
    .bb-forbidden h4 { color: var(--accent-red); }

    .boundary-item {
      display: flex;
      gap: 8px;
      padding: 6px 0;
      font-size: 12.5px;
      color: var(--text-secondary);
      border-bottom: 1px solid rgba(30,45,77,0.3);
    }

    .boundary-item:last-child { border-bottom: none; }
    .bi-icon { flex-shrink: 0; }
    .bi-text strong { color: var(--text-primary); display: block; font-size: 12px; }
    .bi-text span { font-size: 11px; }

    /* ===== TECH STACK ICONS ===== */
    .tech-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
    }

    .tech-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 16px;
      display: flex;
      gap: 12px;
      align-items: flex-start;
      transition: all 0.2s;
    }

    .tech-card:hover { border-color: var(--border-light); }

    .tech-emoji { font-size: 22px; flex-shrink: 0; }
    .tech-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
    .tech-role { font-size: 11px; color: var(--text-muted); margin-top: 3px; }
    .tech-version { font-size: 10px; color: var(--accent-cyan); font-family: 'JetBrains Mono', monospace; margin-top: 4px; }

    /* ===== FOOTER ===== */
    .footer {
      padding: 40px 60px;
      text-align: center;
      color: var(--text-muted);
      font-size: 12px;
      border-top: 1px solid var(--border);
    }

    .footer-badges {
      display: flex;
      gap: 10px;
      justify-content: center;
      margin-bottom: 16px;
    }

    .footer-badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      border: 1px solid var(--border);
      color: var(--text-secondary);
    }

    /* ===== SCROLLBAR ===== */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: var(--bg-primary); }
    ::-webkit-scrollbar-thumb { background: var(--border-light); border-radius: 3px; }

    /* ===== RESPONSIVE ===== */
    @media (max-width: 1100px) {
      .sidebar { position: fixed; top: 0; left: 0; z-index: 200; height: 100vh; display: flex; transform: translateX(-100%); transition: transform 0.3s ease; }
      .sidebar.sidebar-open { transform: translateX(0); }
      .sidebar-backdrop { position: fixed; inset: 0; z-index: 199; background: rgba(0,0,0,0.5); backdrop-filter: blur(2px); }
      .hamburger-btn { display: flex; }
      .main { margin-left: 0; }
      .hero, .section { padding: 40px 32px; }
      .decision-grid, .boundary-grid { grid-template-columns: 1fr; }
    }

    @media (max-width: 700px) {
      .hero h1 { font-size: 22px; }
      .domain-grid, .render-grid, .ci-pipeline, .checklist-grid { grid-template-columns: 1fr; }
    }

    /* 动画效果 */
    .fade-in {
      opacity: 0;
      transform: translateY(16px);
      transition: opacity 0.5s ease, transform 0.5s ease;
    }
    /* ===== ARCH VISUAL DIAGRAM ===== */
    .arch-visual {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 28px 24px;
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    /* 图例 */
    .av-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      justify-content: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border);
    }

    .avl-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      color: var(--text-secondary);
    }

    .avl-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    /* 层容器 */
    .av-layer {
      border-radius: 12px;
      padding: 16px 16px 14px;
      border: 1px solid;
      position: relative;
    }

    .av-layer-client  { background: rgba(79,142,247,0.05);  border-color: rgba(79,142,247,0.2); }
    .av-layer-cf      { background: rgba(245,158,11,0.05);  border-color: rgba(245,158,11,0.2); }
    .av-layer-vercel  { background: rgba(139,92,246,0.05);  border-color: rgba(139,92,246,0.2); }
    .av-layer-data    { background: rgba(16,185,129,0.05);  border-color: rgba(16,185,129,0.2); }

    .av-layer-label {
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--text-muted);
      margin-bottom: 12px;
    }

    /* 节点行 */
    .av-nodes {
      display: grid;
      gap: 10px;
    }

    .av-nodes-3 { grid-template-columns: repeat(3, 1fr); }
    .av-nodes-4 { grid-template-columns: repeat(4, 1fr); }

    /* 单个节点 */
    .av-node {
      border-radius: 10px;
      padding: 12px 10px;
      text-align: center;
      border: 1px solid;
      transition: transform 0.2s;
    }

    .av-node:hover { transform: translateY(-2px); }

    .an-client  { background: rgba(79,142,247,0.08);  border-color: rgba(79,142,247,0.25); }
    .an-cf      { background: rgba(245,158,11,0.08);  border-color: rgba(245,158,11,0.25); }
    .an-vercel  { background: rgba(139,92,246,0.08);  border-color: rgba(139,92,246,0.25); }
    .an-supabase { background: rgba(16,185,129,0.08); border-color: rgba(16,185,129,0.25); }
    .an-analytics  { background: rgba(99,102,241,0.08);  border-color: rgba(99,102,241,0.25); }
    .an-third   { background: rgba(100,116,139,0.08); border-color: rgba(100,116,139,0.25); }

    .an-icon { font-size: 20px; margin-bottom: 6px; }
    .an-name { font-size: 12px; font-weight: 600; color: var(--text-primary); margin-bottom: 3px; }
    .an-sub  { font-size: 10.5px; color: var(--text-muted); }

    /* 能力 chip */
    .an-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      justify-content: center;
      margin-top: 8px;
    }

    .an-chips span {
      font-size: 10px;
      padding: 2px 7px;
      border-radius: 8px;
      background: rgba(255,255,255,0.06);
      color: var(--text-secondary);
      border: 1px solid rgba(255,255,255,0.06);
    }

    /* 箭头连接 */
    .av-arrow-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0;
      padding: 6px 0;
    }

    .av-arrow-line {
      width: 2px;
      height: 28px;
      background: linear-gradient(to bottom, rgba(79,142,247,0.5), rgba(79,142,247,0.1));
      position: relative;
    }

    .av-arrow-line::after {
      content: '';
      position: absolute;
      bottom: -6px;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-top: 6px solid rgba(79,142,247,0.5);
    }

    .av-arrow-label {
      font-size: 10px;
      color: var(--text-muted);
      letter-spacing: 0.3px;
      margin-top: 8px;
    }

    /* 三大子系统 */
    .av-subsystems {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }

    .av-subsys {
      border-radius: 12px;
      padding: 16px;
      border: 1px solid;
    }

    .av-subsys-web   { background: rgba(34,211,238,0.05);  border-color: rgba(34,211,238,0.25); }
    .av-subsys-admin { background: rgba(139,92,246,0.05);  border-color: rgba(139,92,246,0.25); }
    .av-subsys-api   { background: rgba(245,158,11,0.05);  border-color: rgba(245,158,11,0.25); }

    .avs-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }

    .avs-badge {
      font-size: 9.5px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 8px;
      border: 1px solid;
      white-space: nowrap;
    }

    .avs-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .avs-domain {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10.5px;
      color: var(--text-muted);
      margin-bottom: 10px;
    }

    .avs-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-bottom: 10px;
    }

    .avs-tags span {
      font-size: 10px;
      padding: 2px 8px;
      border-radius: 8px;
      background: rgba(255,255,255,0.05);
      color: var(--text-secondary);
      border: 1px solid rgba(255,255,255,0.06);
    }

    .avs-path {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      color: var(--accent-blue);
      background: rgba(79,142,247,0.08);
      padding: 4px 8px;
      border-radius: 6px;
      display: inline-block;
    }

    /* Nuxt 4 单仓横条 */
    .av-monorepo-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(34,211,238,0.06);
      border: 1px solid rgba(34,211,238,0.2);
      border-radius: 10px;
      padding: 12px 16px;
      margin-top: 12px;
    }

    .avmb-icon { font-size: 18px; flex-shrink: 0; }

    .avmb-text {
      flex: 1;
      font-size: 12.5px;
      color: var(--text-primary);
    }

    .avmb-text strong { color: var(--accent-cyan); }

    .avmb-path {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      color: var(--text-muted);
      flex-shrink: 0;
    }

    @media (max-width: 900px) {
      .av-nodes-4 { grid-template-columns: repeat(2, 1fr); }
      .av-nodes-3 { grid-template-columns: repeat(2, 1fr); }
      .av-subsystems { grid-template-columns: 1fr; }
      .av-monorepo-bar { flex-direction: column; align-items: flex-start; }
    }


    /* ===== PRINT MEDIA QUERIES ===== */
    @media print {
      :global(body) {
        background: #0a0e1a !important;
        color: #e2e8f0 !important;
        font-size: 11px !important;
        line-height: 1.4 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .sidebar {
        display: none !important;
      }
      .main {
        margin-left: 0 !important;
        padding: 0 !important;
        width: 100% !important;
      }
      .hero {
        padding: 24px !important;
        background: #0a0e1a !important;
      }
      .hero h1 {
        font-size: 24px !important;
        margin-bottom: 8px !important;
        background: none !important;
        -webkit-background-clip: initial !important;
        -webkit-text-fill-color: #e2e8f0 !important;
        color: #e2e8f0 !important;
      }
      .hero-meta {
        margin-top: 14px !important;
        gap: 8px !important;
      }
      .meta-card {
        padding: 8px 12px !important;
      }
      .section {
        padding: 20px !important;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .section-header {
        margin-bottom: 16px !important;
      }
      .subsection {
        margin-bottom: 18px !important;
      }
      .subsection h3 {
        font-size: 13px !important;
        margin-bottom: 8px !important;
      }
      .decision-grid, .boundary-grid, .domain-grid, .render-grid, .ci-pipeline, .checklist-grid {
        gap: 8px !important;
      }
      .decision-box, .av-layer, .domain-card, .render-card, .ci-gate, .checklist-group, .boundary-box {
        padding: 12px 14px !important;
        margin-bottom: 0 !important;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      pre {
        padding: 10px 14px !important;
        font-size: 10px !important;
        line-height: 1.4 !important;
      }
      .code-block {
        margin: 8px 0 !important;
      }
      table {
        font-size: 11px !important;
      }
      th, td {
        padding: 6px 10px !important;
      }
      .flow-steps {
        gap: 2px !important;
      }
      .flow-step {
        padding: 8px 12px !important;
      }
      .alert {
        padding: 8px 12px !important;
        margin: 8px 0 !important;
      }
      .alert-body strong {
        margin-bottom: 2px !important;
      }
      pre, code {
        white-space: pre-wrap !important;
        word-wrap: break-word !important;
      }
    }

/* 补充根容器样式，使页面能够优雅容纳 Sidebar */
.app-arch-root {
  background: var(--bg-primary);
  color: var(--text-primary);
  min-height: 100vh;
}

/* 针对侧边栏的一些额外苹果风格微调 */
.sidebar {
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border);
}

/* 苹果风顶部极简控制台样式 */
.top-header {
  position: fixed;
  top: 0;
  right: 0;
  left: 260px; /* 侧边栏宽度 */
  height: 64px;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  /* 使用方案主色调背景，微带透明以融合底部径向渐变 */
  background: rgba(10, 14, 26, 0.8);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 40px;
  z-index: 90; /* 略低于 sidebar */
  transition: all 0.3s ease;
}

.top-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.top-header-indicator {
  color: var(--accent-cyan);
  font-size: 8px;
  animation: pulse 2s ease-in-out infinite;
}

.top-header-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}

.top-header-menu {
  display: flex;
  align-items: center;
  gap: 12px;
}

.menu-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 6px;
  text-decoration: none;
  transition: all 0.2s ease;
  cursor: pointer;
  border: 1px solid var(--border);
  /* 背景风格与方案的卡片底色一致 */
  background: var(--bg-card);
  color: var(--text-primary);
}

.menu-btn:hover {
  background: var(--bg-card-hover);
  border-color: var(--border-light);
}

.menu-btn.btn-primary {
  /* 强调色与架构方案中的蓝色强调色一致 */
  background: var(--accent-blue);
  border: none;
  color: #ffffff;
  font-weight: 600;
}

.menu-btn.btn-primary:hover {
  background: #3b7ae0;
}

/* 汉堡菜单按钮（默认隐藏，≤1100px 显示） */
.hamburger-btn {
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  width: 32px;
  height: 32px;
  padding: 6px;
  background: none;
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  margin-right: 12px;
  flex-shrink: 0;
}
.hamburger-line {
  display: block;
  width: 100%;
  height: 2px;
  background: var(--text-secondary);
  border-radius: 1px;
}

/* 侧边栏抽屉背景遮罩（默认隐藏） */
.sidebar-backdrop {
  display: none;
}

/* 适配顶部导航栏，给 hero header 加一个 margin-top */
.hero {
  margin-top: 64px;
}

/* 响应式调整：对接侧边栏隐藏临界点 1100px */
@media (max-width: 1100px) {
  .top-header {
    left: 0;
    padding: 0 20px;
  }
}
@media (max-width: 640px) {
  .top-header-left {
    display: none;
  }
  .top-header-menu {
    width: 100%;
    justify-content: space-between;
    gap: 6px;
  }
  .menu-btn {
    padding: 6px 8px;
    font-size: 11px;
  }
}
</style>
