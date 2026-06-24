<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed } from 'vue'
import { useH5DemoLinks } from '~/composables/useH5DemoLinks'

const { t } = useI18n()
const { localeLabel, toggleLocale } = useLocaleDetect()

useAppSEO({
  title: () => t('home.title'),
  description: () => t('home.description'),
})

const showH5Dropdown = ref(false)
const showHeroH5Dropdown = ref(false)
const { demos: h5Demos } = useH5DemoLinks()

const { user, isLoggedIn, isAnonymous, signOut, initAuth } = useAuth()
const showLoginModal = ref(false)
const loginModalMode = ref<'login' | 'register' | 'bind'>('login')

const triggerLogin = (mode: 'login' | 'register' | 'bind' = 'login') => {
  loginModalMode.value = mode
  showLoginModal.value = true
}

const handleSignOut = async () => {
  await signOut()
}

// 交互式终端状态管理
type CmdKey = 'dev' | 'api-safety' | 'gen-rls' | 'scaffold'
const activeTab = ref<CmdKey>('dev')
const terminalLines = ref<string[]>([])
const isTyping = ref(false)
let typingInterval: any = null

const commands = {
  dev: {
    cmd: 'npm run dev',
    output: [
      '$ npm run dev',
      ' ',
      '  ▲  hehe-app v1.0.0 (development mode)',
      ' ',
      '  [hehe-apm] Initializing core APM agent...',
      '  [hehe-db] Mock DB adapter activated (MOCK_DB=true)',
      '  [hehe-server] Nitro started: http://localhost:3000',
      '  [hehe-server] Loaded middleware chain:',
      '    00.apm -> 01.subdomain -> 02.auth -> 03.admin -> 04.auth-guard -> 05.access-guard',
      '  [hehe-i18n] Loaded locales: zh, en (default: zh)',
      ' ',
      '  ✓ Nuxt dev server ready in 482ms'
    ]
  },
  'api-safety': {
    cmd: 'npm run test:api-safety',
    output: [
      '$ npm run test:api-safety',
      ' ',
      '  [safety-scan] Scanning server API endpoints...',
      '  [PASS] GET  /api/v1/campaigns           (@api-auth: public)',
      '  [PASS] POST /api/v1/feedbacks           (@api-auth: user)',
      '  [PASS] GET  /api/admin/audit-logs       (@api-auth: admin)',
      '  [PASS] POST /api/admin/tasks/cron       (@api-auth: admin)',
      '  [safety-scan] Verified 28 endpoints. All security boundaries match @api-auth rules.',
      ' ',
      '  ✓ API Safety verification passed successfully.'
    ]
  },
  'gen-rls': {
    cmd: 'npm run gen:rls activity_logs --admin',
    output: [
      '$ npm run gen:rls activity_logs --admin',
      ' ',
      '  [rls-gen] Generating RLS SQL policy for table: activity_logs (with admin check)...',
      '  [rls-gen] Policy: "admins_all_access"',
      '    -> USING (is_admin(auth.uid()))',
      '    -> WITH CHECK (is_admin(auth.uid()))',
      ' ',
      '  ✓ Generated supabase/migrations/0013_rls_activity_logs.sql',
      '  ✓ Executed local dry-run validation: OK'
    ]
  },
  scaffold: {
    cmd: 'npm run scaffold user-profile',
    output: [
      '$ npm run scaffold user-profile',
      ' ',
      '  [scaffolder] Initializing scaffold generator...',
      '    [NEW] app/pages/(admin)/admin/user-profile.vue',
      '    [NEW] server/api/admin/user-profile/index.get.ts',
      '    [NEW] server/api/admin/user-profile/index.post.ts',
      '    [NEW] server/api/admin/user-profile/index.delete.ts',
      '  [scaffolder] Injecting database routes metadata...',
      ' ',
      '  ✓ Scaffolded API + Page for user-profile successfully.'
    ]
  }
}

const runCommand = (tab: CmdKey) => {
  if (typingInterval) clearInterval(typingInterval)
  activeTab.value = tab
  terminalLines.value = []
  isTyping.value = true
  
  const output = commands[tab]?.output || []
  const cmdLine = output[0] || ''
  let charIndex = 0
  terminalLines.value.push('')
  
  typingInterval = setInterval(() => {
    if (charIndex < cmdLine.length) {
      terminalLines.value[0] = cmdLine.substring(0, charIndex + 1)
      charIndex++
    } else {
      clearInterval(typingInterval)
      let lineIndex = 1
      typingInterval = setInterval(() => {
        if (lineIndex < output.length) {
          const line = output[lineIndex]
          if (line !== undefined) {
            terminalLines.value.push(line)
          }
          lineIndex++
        } else {
          clearInterval(typingInterval)
          isTyping.value = false
        }
      }, 120)
    }
  }, 35)
}

// 中间件交互状态管理
const middlewares = computed(() => [
  { id: 'apm', name: '00.apm', desc: t('home.navArch') + ' / APM: ' + '收集全链路状态码与接口耗时指标。' },
  { id: 'subdomain', name: '01.subdomain', desc: '域名分流中间件：将 h5.domain.com 分流代理到特定的营销活动页面。' },
  { id: 'auth', name: '02.auth', desc: 'JWT 解析中心：自动解析 Bearer Token 与 Cookie 认证数据凭证。' },
  { id: 'admin', name: '03.admin', desc: '管理员前置守卫：拦截非系统内置管理员的后台页面与写入访问。' },
  { id: 'auth-guard', name: '04.auth-guard', desc: '权限卫士：对关键支付、订单与系统 API 强制拦截匿名流量。' },
  { id: 'access-guard', name: '05.access-guard', desc: '演示环境访问密码：检查站点访问通行令牌，阻止未授权爬虫与访客。' }
])
const activeMiddleware = ref('apm')
const currentMiddlewareDesc = computed(() => {
  return middlewares.value.find(m => m.id === activeMiddleware.value)?.desc || ''
})

const tools = computed(() => [
  {
    iconId: 'api',
    title: t('home.toolApi'),
    desc: t('home.toolApiDesc'),
    link: '/_scalar',
  },
  {
    iconId: 'swagger',
    title: t('home.toolSwagger'),
    desc: t('home.toolSwaggerDesc'),
    link: '/_swagger',
  },
  {
    iconId: 'openapi',
    title: t('home.toolOpenapi'),
    desc: t('home.toolOpenapiDesc'),
    link: '/_openapi.json',
  },
])

let revealObserver: IntersectionObserver | null = null

onMounted(async () => {
  // 从 cookie 中恢复用户登录会话
  await initAuth()

  // 首次加载自动运行 dev
  runCommand('dev')
  
  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible')
        revealObserver!.unobserve(entry.target)
      }
    })
  }, { threshold: 0.12 })
  document.querySelectorAll('.reveal').forEach(el => revealObserver!.observe(el))
})

onBeforeUnmount(() => {
  if (typingInterval) clearInterval(typingInterval)
  revealObserver?.disconnect()
  revealObserver = null
})
</script>

<template>
  <div class="home-root">
    <!-- TOP NAV -->
    <header class="home-header">
      <div class="home-header-left">
        <span class="logo-dot"></span>
        <span class="logo-label">HEHE <span class="logo-sub-label">HARNESS</span></span>
      </div>
      <nav class="home-header-nav">
        <NuxtLink to="/architecture" class="nav-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="nav-svg-icon"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          <span>{{ t('home.navArch') }}</span>
        </NuxtLink>
        <NuxtLink to="/help" class="nav-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="nav-svg-icon"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span>{{ t('home.navHelp') }}</span>
        </NuxtLink>
        <div class="dropdown-container" @mouseenter="showH5Dropdown = true" @mouseleave="showH5Dropdown = false">
          <button class="nav-link dropdown-trigger">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="nav-svg-icon"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
            <span>{{ t('home.navH5') }}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="chevron-icon"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <Transition name="dropdown-fade">
            <div v-show="showH5Dropdown" class="dropdown-menu-list">
              <a
                v-for="demo in h5Demos"
                :key="demo.id"
                :href="demo.href"
                target="_blank"
                rel="noopener"
                class="dropdown-item"
                @click="showH5Dropdown = false"
              >
                {{ t(demo.labelKey) }}
              </a>
            </div>
          </Transition>
        </div>
        <NuxtLink to="/admin" class="nav-link nav-link-primary" target="_blank">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="nav-svg-icon"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
          <span>{{ t('home.navAdmin') }}</span>
        </NuxtLink>
        <a href="https://github.com/astrayon/hehe-app" class="nav-link github-btn" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="nav-svg-icon"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
          <span>{{ t('home.navGitHub') }}</span>
        </a>

        <!-- 已登录用户 -->
        <div v-if="isLoggedIn && user" class="nav-user-capsule">
          <div class="nav-avatar">
            <NuxtImg v-if="user.avatarUrl" :src="user.avatarUrl" :alt="user.displayName" loading="lazy" width="32" height="32" />
            <span v-else class="nav-avatar-placeholder">
              {{ (user.displayName || user.username || 'U').charAt(0).toUpperCase() }}
            </span>
          </div>
          <span class="nav-username">{{ user.displayName || user.username }}</span>
          <button @click="handleSignOut" class="nav-logout-btn" :title="t('userBar.signOut')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="logout-icon-svg"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>

        <!-- 匿名游客 -->
        <div v-else-if="isAnonymous" class="nav-user-capsule guest">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="guest-icon-svg"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span class="nav-username">{{ t('userBar.guest') }}</span>
          <button @click="triggerLogin('bind')" class="nav-bind-btn">
            <span>{{ t('login.linkAccount') }}</span>
          </button>
        </div>

        <!-- 未登录 -->
        <button v-else @click="triggerLogin('login')" class="nav-link nav-login-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="login-icon-svg"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
          <span>{{ t('userBar.signIn') }}</span>
        </button>

        <button @click="toggleLocale" class="nav-link locale-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="nav-svg-icon"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          <span class="locale-label-text">{{ localeLabel === '中文' ? 'EN' : '中' }}</span>
        </button>
      </nav>
    </header>

    <!-- HERO SECTION -->
    <section class="home-hero">
      <div class="hero-glow"></div>
      <div class="hero-grid-bg"></div>
      <div class="hero-container">
        <!-- Left Column: Copywriting -->
        <div class="hero-left-col">
          <div class="hero-badge">
            <span class="badge-dot"></span>
            {{ t('home.badge') }}
          </div>
          <h1 class="hero-title">{{ t('home.heroTitle') }}</h1>
          <p class="hero-desc">{{ t('home.heroDesc') }}</p>
          <div class="hero-actions">
            <NuxtLink to="/architecture" class="btn btn-primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="btn-svg-icon"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              {{ t('home.ctaArch') }}
            </NuxtLink>
            <div class="hero-dropdown-container" @mouseenter="showHeroH5Dropdown = true" @mouseleave="showHeroH5Dropdown = false">
              <button class="btn btn-secondary dropdown-trigger">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="btn-svg-icon"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                {{ t('home.ctaH5') }}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="chevron-icon"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <Transition name="dropdown-fade">
                <div v-show="showHeroH5Dropdown" class="hero-dropdown-menu">
                  <a
                    v-for="demo in h5Demos"
                    :key="demo.id"
                    :href="demo.href"
                    target="_blank"
                    rel="noopener"
                    class="hero-dropdown-item"
                    @click="showHeroH5Dropdown = false"
                  >
                    {{ t(demo.labelKey) }} ↗
                  </a>
                </div>
              </Transition>
            </div>
          </div>
        </div>

        <!-- Right Column: Interactive CLI Sandbox -->
        <div class="hero-right-col">
          <div class="terminal-sandbox">
            <div class="terminal-header">
              <div class="terminal-dots">
                <span class="dot red"></span>
                <span class="dot yellow"></span>
                <span class="dot green"></span>
              </div>
              <span class="terminal-title">{{ t('home.sandboxTerminalTitle') }}</span>
              <div class="terminal-actions-placeholder"></div>
            </div>
            
            <!-- Tab switchers -->
            <div class="terminal-tabs">
              <button 
                v-for="tab in (['dev', 'api-safety', 'gen-rls', 'scaffold'] as CmdKey[])" 
                :key="tab"
                class="terminal-tab"
                :class="{ active: activeTab === tab }"
                @click="runCommand(tab)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tab-svg-icon"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
                <span>{{ tab }}</span>
              </button>
            </div>

            <div class="terminal-body">
              <div class="terminal-content">
                <div 
                  v-for="(line, idx) in terminalLines" 
                  :key="idx"
                  class="terminal-line"
                  :class="{ 
                    'cmd-prompt': idx === 0, 
                    'success-line': line.includes('✓') || line.includes('[PASS]'),
                    'info-line': line.includes('[hehe-') || line.includes('[scaffolder') || line.includes('[rls-gen') || line.includes('[safety-')
                  }"
                >
                  <template v-if="idx === 0">
                    <span class="prompt-arrow">></span> {{ line.substring(2) }}<span v-if="isTyping && idx === terminalLines.length - 1" class="terminal-cursor"></span>
                  </template>
                  <template v-else>
                    {{ line }}
                  </template>
                </div>
                <div v-if="isTyping && terminalLines.length > 1" class="terminal-loading">
                  <span class="loading-bar"></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- TECH STACK -->
    <section class="home-stack">
      <div class="stack-inner reveal">
        <h2 class="section-title">{{ t('home.stackTitle') }}</h2>
        <div class="stack-pills">
          <div 
            v-for="tech in [
              { name: 'Nuxt 4', color: '#00dc82', glow: 'rgba(0, 220, 130, 0.25)' },
              { name: 'Vue 3', color: '#42b883', glow: 'rgba(66, 184, 131, 0.25)' },
              { name: 'Supabase', color: '#3ecf8e', glow: 'rgba(62, 207, 142, 0.25)' },
              { name: 'Vercel', color: '#ffffff', glow: 'rgba(255, 255, 255, 0.15)' },
              { name: 'TypeScript', color: '#3178c6', glow: 'rgba(49, 120, 198, 0.25)' },
              { name: 'UnoCSS', color: '#444444', glow: 'rgba(100, 116, 139, 0.25)' },
              { name: 'Stripe', color: '#635bff', glow: 'rgba(99, 91, 255, 0.25)' },
              { name: 'i18n', color: '#f43f5e', glow: 'rgba(244, 63, 94, 0.25)' }
            ]" 
            :key="tech.name"
            class="pill"
            :style="{ '--tech-hover-color': tech.color, '--tech-glow': tech.glow }"
          >
            {{ tech.name }}
          </div>
        </div>
      </div>
    </section>

    <!-- BENTO GRID FEATURES -->
    <section class="home-features">
      <div class="features-inner">
        <h2 class="section-title reveal">{{ t('home.featuresTitle') }}</h2>
        <p class="section-desc reveal">{{ t('home.featuresDesc') }}</p>
        
        <div class="bento-grid">
          <!-- Card 1 (Large - 2 columns span): Architecture & Middleware -->
          <div class="bento-card bento-card-large reveal">
            <div class="bento-card-header">
              <div class="bento-icon-container bg-cyan">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="bento-svg-icon"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
              </div>
              <div class="bento-title-group">
                <h3>{{ t('home.featureArch') }}</h3>
                <span class="feature-tag tag-cyan">SSR</span>
              </div>
            </div>
            
            <p class="bento-desc">{{ t('home.featureArchDesc') }}</p>
            
            <!-- Interactive Middleware visualizer inside Card 1 -->
            <div class="middleware-visualizer">
              <div class="mw-nodes">
                <div 
                  v-for="mw in middlewares" 
                  :key="mw.id"
                  class="mw-node"
                  :class="{ active: activeMiddleware === mw.id }"
                  @mouseenter="activeMiddleware = mw.id"
                >
                  <span class="mw-node-dot"></span>
                  <span class="mw-node-name">{{ mw.name }}</span>
                </div>
              </div>
              <div class="mw-details">
                <div class="mw-details-header">
                  <span class="i-lucide-shield mw-details-icon"></span>
                  <span class="mw-details-title">中间件校验流程 / Middleware Specs</span>
                </div>
                <p class="mw-details-desc">{{ currentMiddlewareDesc }}</p>
              </div>
            </div>
            
            <NuxtLink to="/architecture" class="bento-action-link">
              <span>{{ t('home.ctaArch') }}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="arrow-svg"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </NuxtLink>
          </div>

          <!-- Card 2 (Small): Admin Cockpit -->
          <div class="bento-card reveal">
            <div class="bento-card-header">
              <div class="bento-icon-container bg-green">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="bento-svg-icon"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="9" y1="9" x2="21" y2="9"/></svg>
              </div>
              <div class="bento-title-group">
                <h3>{{ t('home.featureAdmin') }}</h3>
                <span class="feature-tag tag-green">SPA</span>
              </div>
            </div>
            <p class="bento-desc">{{ t('home.featureAdminDesc') }}</p>
            
            <!-- Cockpit UI mockup inside Card 2 -->
            <div class="admin-mockup">
              <div class="mockup-sidebar">
                <span class="mockup-item active"></span>
                <span class="mockup-item"></span>
                <span class="mockup-item"></span>
              </div>
              <div class="mockup-main">
                <div class="mockup-header">
                  <span class="mockup-dot"></span>
                  <span class="mockup-bar"></span>
                </div>
                <div class="mockup-chart">
                  <svg viewBox="0 0 100 40" class="mockup-chart-svg">
                    <path d="M0,35 Q15,10 30,28 T60,5 T90,20 L100,20" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round"></path>
                    <path d="M0,35 Q15,10 30,28 T60,5 T90,20 L100,20 L100,40 L0,40 Z" fill="url(#chart-grad)" opacity="0.15"></path>
                    <defs>
                      <linearGradient id="chart-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stop-color="#8b5cf6"></stop>
                        <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0"></stop>
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>
            </div>

            <NuxtLink to="/admin" target="_blank" class="bento-action-link">
              <span>{{ t('header.adminPortal') }}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="arrow-svg"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </NuxtLink>
          </div>

          <!-- Card 3 (Small): Marketing H5 -->
          <div class="bento-card bento-card-h5-promo reveal">
            <div class="bento-card-header">
              <div class="bento-icon-container bg-orange">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="bento-svg-icon"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
              </div>
              <div class="bento-title-group">
                <h3>{{ t('home.featureH5') }}</h3>
                <span class="feature-tag tag-orange">SWR</span>
              </div>
            </div>
            <p class="bento-desc">{{ t('home.featureH5Desc') }}</p>
            
            <!-- Smartphone frame mockup inside Card 3 -->
            <div class="phone-mockup-container">
              <div class="phone-frame">
                <div class="phone-notch"></div>
                <div class="phone-screen">
                  <div class="phone-header">
                    <span class="phone-title">Promo SWR</span>
                    <span class="phone-badge">600s</span>
                  </div>
                  <div class="phone-content">
                    <div class="phone-hero-image"></div>
                    <div class="phone-input"></div>
                    <div class="phone-btn"></div>
                  </div>
                </div>
              </div>
            </div>

            <div class="card-links">
              <a
                v-for="demo in h5Demos"
                :key="demo.id"
                :href="demo.href"
                target="_blank"
                rel="noopener"
                class="card-btn-link"
                :class="demo.cardClass"
              >
                {{ t(demo.labelKey) }} ↗
              </a>
            </div>
          </div>

          <!-- Card 4 (Large - 2 columns span): Help & Documentation -->
          <div class="bento-card bento-card-large reveal">
            <div class="bento-card-header">
              <div class="bento-icon-container bg-purple">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="bento-svg-icon"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
              </div>
              <div class="bento-title-group">
                <h3>{{ t('home.featureHelp') }}</h3>
                <span class="feature-tag tag-purple">ISR</span>
              </div>
            </div>
            <p class="bento-desc">{{ t('home.featureHelpDesc') }}</p>

            <!-- Book / Document index mockup inside Card 4 -->
            <div class="doc-mockup">
              <div class="doc-mockup-nav">
                <div class="doc-nav-item active">快速开始 / Quick Start</div>
                <div class="doc-nav-item">本地沙盒 / Local Sandbox</div>
                <div class="doc-nav-item">安全指引 / Security Rules</div>
              </div>
              <div class="doc-mockup-content">
                <div class="doc-content-line title"></div>
                <div class="doc-content-line"></div>
                <div class="doc-content-line short"></div>
                <div class="doc-content-code">
                  <span class="code-comment"># Start the developer harness</span><br>
                  <span class="code-cmd">npm run dev:all</span>
                </div>
              </div>
            </div>

            <NuxtLink to="/help" class="bento-action-link">
              <span>{{ t('home.featureHelp') }}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="arrow-svg"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- DEVELOPER TOOLS -->
    <section class="home-tools">
      <div class="tools-inner">
        <h2 class="section-title reveal">{{ t('home.toolsTitle') }}</h2>
        <p class="section-desc reveal">{{ t('home.toolsDesc') }}</p>
        <div class="tools-grid">
          <a
            v-for="tool in tools"
            :key="tool.link"
            :href="tool.link"
            target="_blank"
            class="tool-card reveal"
          >
            <!-- SVG custom icon selector -->
            <div class="tool-icon-wrapper">
              <svg v-if="tool.iconId === 'api'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tool-svg-icon"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              <svg v-else-if="tool.iconId === 'swagger'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tool-svg-icon"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 11 11 13 15 9"/></svg>
              <svg v-else-if="tool.iconId === 'openapi'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tool-svg-icon"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/></svg>
            </div>
            <h3>{{ tool.title }}</h3>
            <p>{{ tool.desc }}</p>
            <div class="tool-glow-border"></div>
          </a>
        </div>
      </div>
    </section>

    <!-- FOOTER -->
    <footer class="home-footer">
      <div class="footer-inner">
        <div class="footer-left">
          <span class="logo-dot"></span>
          <span class="logo-label">HEHE HARNESS</span>
          <span class="footer-copy">© 2026 · Solo Full-Stack Monorepo Template</span>
        </div>
        <div class="footer-links">
          <a href="https://github.com/astrayon/hehe-app" target="_blank" class="footer-link">GitHub</a>
          <NuxtLink to="/architecture" class="footer-link">{{ t('home.navArch') }}</NuxtLink>
          <NuxtLink to="/help" class="footer-link">{{ t('home.navHelp') }}</NuxtLink>
        </div>
      </div>
    </footer>

    <!-- LOGIN MODAL -->
    <H5LoginModal :visible="showLoginModal" :mode="loginModalMode" @close="showLoginModal = false" />
  </div>
</template>

<style scoped>
/* ── ROOT STYLE ── */
.home-root {
  min-height: 100vh;
  background: #050814;
  color: #f8fafc;
  font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Noto Sans SC', sans-serif;
  overflow-x: hidden;
  padding-bottom: 24px;
}

/* ── HEADER (FLOATING GLASSBAR) ── */
.home-header {
  position: fixed;
  top: 16px;
  left: 24px;
  right: 24px;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 58px;
  background: rgba(10, 16, 32, 0.65);
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  max-width: 1200px;
  margin: 0 auto;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
}

.home-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #3b82f6;
  box-shadow: 0 0 12px #3b82f6;
}

.logo-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: #f8fafc;
}

.home-header-nav {
  display: flex;
  align-items: center;
  gap: 6px;
}

.nav-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  color: #94a3b8;
  text-decoration: none;
  border-radius: 10px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border: none;
  background: none;
  cursor: pointer;
}

.nav-svg-icon {
  width: 14px;
  height: 14px;
  opacity: 0.7;
  transition: transform 0.25s;
}

.nav-link:hover {
  color: #f8fafc;
  background: rgba(255, 255, 255, 0.06);
}

.nav-link:hover .nav-svg-icon {
  transform: translateY(-1px);
}

.nav-link-primary {
  background: #3b82f6;
  color: #ffffff;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
}

.nav-link-primary:hover {
  background: #2563eb;
  color: #ffffff;
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.35);
}

.locale-btn {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 6px 12px;
}

/* ── HERO SECTION ── */
.home-hero {
  position: relative;
  min-height: 95vh;
  padding: 140px 24px 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.hero-glow {
  position: absolute;
  top: -30%;
  left: 50%;
  transform: translateX(-50%);
  width: 1000px;
  height: 800px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, rgba(139, 92, 246, 0.06) 50%, transparent 70%);
  pointer-events: none;
}

.hero-grid-bg {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 80px 80px;
  mask-image: radial-gradient(ellipse 60% 50% at 50% 50%, black 40%, transparent 80%);
  pointer-events: none;
}

.hero-container {
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 48px;
  align-items: center;
}

.hero-left-col {
  text-align: left;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  font-size: 12px;
  font-weight: 600;
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.25);
  border-radius: 9999px;
  margin-bottom: 28px;
  font-family: 'JetBrains Mono', monospace;
}

.badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #3b82f6;
  box-shadow: 0 0 8px #3b82f6;
}

.hero-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 3.25rem;
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.04em;
  margin: 0 0 24px;
  background: linear-gradient(135deg, #ffffff 30%, #a5b4fc 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-desc {
  font-size: 1.125rem;
  line-height: 1.75;
  color: #94a3b8;
  margin: 0 0 44px;
  max-width: 600px;
}

.hero-actions {
  display: flex;
  gap: 16px;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 14px 28px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 12px;
  text-decoration: none;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border: none;
  cursor: pointer;
  font-family: inherit;
}

.btn-primary {
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  color: #ffffff;
  box-shadow: 0 4px 20px rgba(59, 130, 246, 0.3);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(59, 130, 246, 0.45);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.05);
  color: #f8fafc;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.btn-svg-icon {
  width: 16px;
  height: 16px;
}

/* ── INTERACTIVE TERMINAL CLI SANDBOX ── */
.terminal-sandbox {
  background: #02040a;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 380px;
}

.terminal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #0b0f19;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.terminal-dots {
  display: flex;
  gap: 6px;
}

.terminal-dots .dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.terminal-dots .red { background: #ff5f56; }
.terminal-dots .yellow { background: #ffbd2e; }
.terminal-dots .green { background: #27c93f; }

.terminal-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: #64748b;
}

.terminal-actions-placeholder {
  width: 42px;
}

.terminal-tabs {
  display: flex;
  background: #070b15;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.terminal-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 4px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: #64748b;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
  border-right: 1px solid rgba(255, 255, 255, 0.03);
}

.terminal-tab.active {
  color: #3b82f6;
  background: #02040a;
  box-shadow: inset 0 2px 0 #3b82f6;
}

.tab-svg-icon {
  width: 11px;
  height: 11px;
}

.terminal-body {
  padding: 18px;
  flex: 1;
  overflow-y: auto;
  text-align: left;
}

.terminal-content {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  line-height: 1.6;
  color: #cbd5e1;
}

.terminal-line {
  white-space: pre-wrap;
  word-break: break-all;
}

.cmd-prompt {
  color: #60a5fa;
  font-weight: 600;
}

.prompt-arrow {
  color: #3b82f6;
}

.success-line {
  color: #34d399;
}

.info-line {
  color: #94a3b8;
}

.terminal-cursor {
  display: inline-block;
  width: 6px;
  height: 14px;
  background: #3b82f6;
  margin-left: 3px;
  vertical-align: middle;
  animation: blink 0.8s infinite;
}

.terminal-loading {
  display: flex;
  margin-top: 8px;
}

.loading-bar {
  height: 2px;
  width: 20px;
  background: #3b82f6;
  animation: pulse 1s infinite alternate;
}

@keyframes blink {
  50% { opacity: 0; }
}

@keyframes pulse {
  0% { transform: scaleX(0.5); opacity: 0.3; }
  100% { transform: scaleX(1.5); opacity: 1; }
}

/* ── TECH STACK PILLS ── */
.home-stack {
  padding: 60px 24px;
}

.stack-inner {
  max-width: 1200px;
  margin: 0 auto;
  text-align: center;
}

.section-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0 0 16px;
  color: #f8fafc;
}

.section-desc {
  font-size: 0.9375rem;
  color: #94a3b8;
  margin: 0 0 44px;
  line-height: 1.6;
}

.stack-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
}

.pill {
  padding: 10px 24px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 9999px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: default;
}

.pill:hover {
  color: var(--tech-hover-color);
  border-color: var(--tech-hover-color);
  background: rgba(255, 255, 255, 0.05);
  box-shadow: 0 0 15px var(--tech-glow);
  transform: translateY(-2px);
}

/* ── BENTO GRID FEATURES ── */
.home-features {
  content-visibility: auto;
  contain-intrinsic-size: auto 1200px;
  padding: 80px 24px;
}

.features-inner {
  max-width: 1200px;
  margin: 0 auto;
}

.bento-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.bento-card-large {
  grid-column: span 2;
}

.bento-card {
  background: rgba(13, 20, 38, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 20px;
  padding: 32px;
  position: relative;
  display: flex;
  flex-direction: column;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.bento-card:hover {
  background: rgba(17, 27, 51, 0.55);
  border-color: rgba(59, 130, 246, 0.25);
  transform: translateY(-3px);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.35);
}

.bento-card-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.bento-icon-container {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bento-icon-container.bg-cyan { background: rgba(6, 182, 212, 0.12); color: #06b6d4; }
.bento-icon-container.bg-green { background: rgba(16, 185, 129, 0.12); color: #10b981; }
.bento-icon-container.bg-orange { background: rgba(249, 115, 22, 0.12); color: #f97316; }
.bento-icon-container.bg-purple { background: rgba(139, 92, 246, 0.12); color: #8b5cf6; }

.bento-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.bento-title-group h3 {
  font-size: 17px;
  font-weight: 700;
  color: #f8fafc;
  margin: 0;
}

.feature-tag {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 9999px;
  letter-spacing: 0.05em;
}

.tag-cyan { background: rgba(6, 182, 212, 0.15); color: #22d3ee; }
.tag-green { background: rgba(16, 185, 129, 0.15); color: #34d399; }
.tag-orange { background: rgba(249, 115, 22, 0.15); color: #ffedd5; color: #fb923c; }
.tag-purple { background: rgba(139, 92, 246, 0.15); color: #c084fc; }

.bento-desc {
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.6;
  margin: 0 0 24px;
}

/* --- Card 1 Component: Middleware Pipeline --- */
.middleware-visualizer {
  background: rgba(2, 4, 10, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
  flex: 1;
}

.mw-nodes {
  display: flex;
  justify-content: space-between;
  position: relative;
  margin-bottom: 16px;
  overflow-x: auto;
  gap: 8px;
}

.mw-nodes::after {
  content: '';
  position: absolute;
  top: 13px;
  left: 10px;
  right: 10px;
  height: 2px;
  background: rgba(255, 255, 255, 0.06);
  z-index: 1;
}

.mw-node {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  min-width: 60px;
}

.mw-node-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #475569;
  border: 2px solid #0b0f19;
  transition: all 0.25s;
}

.mw-node-name {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: #64748b;
  margin-top: 6px;
  transition: color 0.25s;
}

.mw-node.active .mw-node-dot {
  background: #06b6d4;
  box-shadow: 0 0 10px #06b6d4;
  transform: scale(1.25);
}

.mw-node.active .mw-node-name {
  color: #22d3ee;
}

.mw-details {
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding-top: 12px;
  text-align: left;
}

.mw-details-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.mw-details-icon {
  font-size: 12px;
  color: #06b6d4;
}

.mw-details-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 600;
  color: #cbd5e1;
}

.mw-details-desc {
  font-size: 11px;
  color: #64748b;
  margin: 0;
  line-height: 1.5;
}

/* --- Card 2 Component: Admin Cockpit Mockup --- */
.admin-mockup {
  background: #02040a;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  display: grid;
  grid-template-columns: 48px 1fr;
  height: 130px;
  margin-bottom: 24px;
  overflow: hidden;
  flex: 1;
}

.mockup-sidebar {
  background: #0b0f19;
  border-right: 1px solid rgba(255, 255, 255, 0.05);
  padding: 12px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.mockup-item {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
}

.mockup-item.active {
  background: rgba(139, 92, 246, 0.15);
  border: 1px solid #8b5cf6;
}

.mockup-main {
  padding: 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.mockup-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mockup-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #34d399;
}

.mockup-bar {
  height: 6px;
  width: 40px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.08);
}

.mockup-chart {
  height: 50px;
  display: flex;
  align-items: flex-end;
}

.mockup-chart-svg {
  width: 100%;
  height: 100%;
}

/* --- Card 3 Component: Smartphone Frame --- */
.phone-mockup-container {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
  flex: 1;
}

.phone-frame {
  width: 110px;
  height: 140px;
  border: 4px solid #1e293b;
  border-radius: 16px;
  background: #02040a;
  position: relative;
  overflow: hidden;
}

.phone-notch {
  width: 40px;
  height: 6px;
  background: #1e293b;
  border-radius: 0 0 4px 4px;
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  z-index: 5;
}

.phone-screen {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 8px;
}

.phone-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 8px;
  color: #64748b;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding-bottom: 4px;
  margin-top: 2px;
}

.phone-badge {
  background: rgba(249, 115, 22, 0.15);
  color: #f97316;
  padding: 1px 3px;
  border-radius: 2px;
  font-size: 6px;
}

.phone-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 10px;
  flex: 1;
}

.phone-hero-image {
  height: 36px;
  background: linear-gradient(135deg, #ea580c, #f97316);
  border-radius: 4px;
}

.phone-input {
  height: 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.02);
}

.phone-btn {
  height: 14px;
  background: #f97316;
  border-radius: 4px;
}

/* --- Card 4 Component: Document Mockup --- */
.doc-mockup {
  background: #02040a;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  display: grid;
  grid-template-columns: 0.9fr 1.1fr;
  height: 130px;
  margin-bottom: 24px;
  overflow: hidden;
  flex: 1;
}

.doc-mockup-nav {
  background: #0b0f19;
  border-right: 1px solid rgba(255, 255, 255, 0.05);
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.doc-nav-item {
  font-size: 8px;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.doc-nav-item.active {
  color: #8b5cf6;
}

.doc-mockup-content {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.doc-content-line {
  height: 6px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.06);
}

.doc-content-line.title {
  height: 8px;
  width: 50px;
  background: rgba(255, 255, 255, 0.12);
}

.doc-content-line.short {
  width: 40px;
}

.doc-content-code {
  background: #070b15;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  padding: 6px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px;
  text-align: left;
}

.code-comment { color: #64748b; }
.code-cmd { color: #3b82f6; }

/* Bento Links & CTAs */
.bento-action-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #3b82f6;
  text-decoration: none;
  align-self: flex-start;
  transition: gap 0.2s;
  cursor: pointer;
  margin-top: auto;
}

.bento-action-link:hover {
  gap: 10px;
  color: #60a5fa;
}

.arrow-svg {
  width: 14px;
  height: 14px;
}

.card-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: auto;
}

.card-btn-link {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 6px;
  text-decoration: none;
  transition: all 0.2s ease;
}

.card-btn-link.v1 {
  background: rgba(249, 115, 22, 0.08);
  border: 1px solid rgba(249, 115, 22, 0.25);
  color: #fb923c;
}
.card-btn-link.v1:hover {
  background: rgba(249, 115, 22, 0.15);
  border-color: rgba(249, 115, 22, 0.35);
}

.card-btn-link.v2 {
  background: rgba(6, 182, 212, 0.08);
  border: 1px solid rgba(6, 182, 212, 0.25);
  color: #22d3ee;
}
.card-btn-link.v2:hover {
  background: rgba(6, 182, 212, 0.15);
  border-color: rgba(6, 182, 212, 0.35);
}

.card-btn-link.starpath {
  background: rgba(114, 98, 160, 0.12);
  border: 1px solid rgba(114, 98, 160, 0.35);
  color: #c4b5fd;
}
.card-btn-link.starpath:hover {
  background: rgba(114, 98, 160, 0.22);
  border-color: rgba(114, 98, 160, 0.45);
}

/* ── DEVELOPER TOOLS CARD GLOW ── */
.home-tools {
  content-visibility: auto;
  contain-intrinsic-size: auto 600px;
  padding: 80px 24px;
}

.tools-inner {
  max-width: 1200px;
  margin: 0 auto;
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.tool-card {
  display: block;
  padding: 32px;
  background: rgba(13, 20, 38, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 20px;
  text-decoration: none;
  color: inherit;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.tool-glow-border {
  position: absolute;
  inset: 0;
  border-radius: 20px;
  border: 1.5px solid transparent;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6) border-box;
  -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: destination-out;
  mask-composite: exclude;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
  z-index: 2;
}

.tool-icon-wrapper {
  width: 44px;
  height: 44px;
  background: rgba(59, 130, 246, 0.06);
  border: 1px solid rgba(59, 130, 246, 0.15);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3b82f6;
  margin-bottom: 20px;
  transition: all 0.3s;
}

.tool-svg-icon {
  width: 18px;
  height: 18px;
}

.tool-card h3 {
  font-size: 15px;
  font-weight: 700;
  margin: 0 0 8px;
  color: #f8fafc;
}

.tool-card p {
  font-size: 12px;
  color: #64748b;
  margin: 0;
  line-height: 1.6;
}

.tool-card:hover {
  will-change: transform;
  background: rgba(17, 27, 51, 0.55);
  border-color: transparent;
  transform: translateY(-3px);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.35);
}

.tool-card:hover .tool-glow-border {
  opacity: 1;
}

.tool-card:hover .tool-icon-wrapper {
  background: rgba(59, 130, 246, 0.15);
  border-color: rgba(59, 130, 246, 0.4);
  color: #60a5fa;
  transform: scale(1.05);
}

/* ── FOOTER ── */
.home-footer {
  content-visibility: auto;
  contain-intrinsic-size: auto 150px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding: 32px 24px;
  background: #02040a;
}

.footer-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.footer-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.footer-copy {
  font-size: 12px;
  color: #64748b;
  margin-left: 16px;
}

.footer-links {
  display: flex;
  gap: 24px;
}

.footer-link {
  font-size: 13px;
  color: #64748b;
  text-decoration: none;
  transition: color 0.2s;
}

.footer-link:hover {
  color: #94a3b8;
}

/* ===== SCROLL REVEAL ANIMATION ===== */
.reveal {
  opacity: 0;
  transform: translateY(28px);
  transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}

.reveal.visible {
  opacity: 1;
  transform: translateY(0);
}

/* Stagger delay for list / grid children */
.stack-pills .pill:nth-child(2) { transition-delay: 0.05s; }
.stack-pills .pill:nth-child(3) { transition-delay: 0.1s; }
.stack-pills .pill:nth-child(4) { transition-delay: 0.15s; }
.stack-pills .pill:nth-child(5) { transition-delay: 0.2s; }
.stack-pills .pill:nth-child(6) { transition-delay: 0.25s; }
.stack-pills .pill:nth-child(7) { transition-delay: 0.3s; }
.stack-pills .pill:nth-child(8) { transition-delay: 0.35s; }

.bento-grid .reveal:nth-child(2) { transition-delay: 0.12s; }
.bento-grid .reveal:nth-child(3) { transition-delay: 0.24s; }
.bento-grid .reveal:nth-child(4) { transition-delay: 0.36s; }

.tools-grid .reveal:nth-child(2) { transition-delay: 0.1s; }
.tools-grid .reveal:nth-child(3) { transition-delay: 0.2s; }

/* ── DROPDOWNS ── */
.dropdown-container {
  position: relative;
  display: inline-block;
}

.dropdown-menu-list {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: rgba(10, 16, 32, 0.95);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 6px;
  min-width: 170px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dropdown-item {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  font-size: 13px;
  color: #cbd5e1;
  text-decoration: none;
  border-radius: 8px;
  transition: all 0.2s;
  white-space: nowrap;
}

.dropdown-item:hover {
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.08);
}

.dropdown-trigger {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.chevron-icon {
  width: 10px;
  height: 10px;
  margin-left: 2px;
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0.6;
}

.dropdown-container:hover .chevron-icon,
.hero-dropdown-container:hover .chevron-icon {
  transform: rotate(180deg);
}

.hero-dropdown-container {
  position: relative;
}

.hero-dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: rgba(10, 16, 32, 0.95);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 6px;
  min-width: 180px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.hero-dropdown-item {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  font-size: 13px;
  color: #cbd5e1;
  text-decoration: none;
  border-radius: 8px;
  transition: all 0.2s;
  white-space: nowrap;
}

.hero-dropdown-item:hover {
  color: #6366f1;
  background: rgba(99, 102, 241, 0.08);
}

.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -8px);
}

/* ── LIGHT MODE OVERRIDES ── */
@media (prefers-color-scheme: light) {
  .home-root {
    background: #f8fafc;
    color: #0f172a;
  }
  .home-header {
    background: rgba(255, 255, 255, 0.75);
    border-color: rgba(15, 23, 42, 0.08);
    box-shadow: 0 8px 30px rgba(15, 23, 42, 0.06);
  }
  .logo-label {
    color: #0f172a;
  }
  .nav-link {
    color: #475569;
  }
  .nav-link:hover {
    color: #0f172a;
    background: rgba(15, 23, 42, 0.04);
  }
  .locale-btn {
    border-color: rgba(15, 23, 42, 0.08);
  }
  .hero-glow {
    background: radial-gradient(circle, rgba(59, 130, 246, 0.06) 0%, rgba(139, 92, 246, 0.03) 50%, transparent 70%);
  }
  .hero-grid-bg {
    background-image:
      linear-gradient(rgba(15, 23, 42, 0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(15, 23, 42, 0.02) 1px, transparent 1px);
  }
  .hero-title {
    background: linear-gradient(135deg, #0f172a 30%, #312e81 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .hero-desc {
    color: #475569;
  }
  .btn-secondary {
    background: #ffffff;
    color: #0f172a;
    border-color: rgba(15, 23, 42, 0.08);
    box-shadow: 0 2px 6px rgba(15, 23, 42, 0.03);
  }
  .btn-secondary:hover {
    background: #f1f5f9;
    border-color: rgba(15, 23, 42, 0.15);
  }
  .section-title {
    color: #0f172a;
  }
  .section-desc {
    color: #475569;
  }
  .pill {
    background: #ffffff;
    border-color: rgba(15, 23, 42, 0.08);
    color: #475569;
    box-shadow: 0 2px 6px rgba(15, 23, 42, 0.02);
  }
  .pill:hover {
    background: #ffffff;
    color: var(--tech-hover-color);
    box-shadow: 0 4px 15px var(--tech-glow);
  }
  .bento-card {
    background: #ffffff;
    border-color: rgba(15, 23, 42, 0.08);
    box-shadow: 0 8px 30px rgba(15, 23, 42, 0.04);
  }
  .bento-card:hover {
    background: #ffffff;
    border-color: rgba(59, 130, 246, 0.25);
    box-shadow: 0 12px 40px rgba(15, 23, 42, 0.08);
  }
  .bento-title-group h3 {
    color: #0f172a;
  }
  .bento-desc {
    color: #475569;
  }
  .middleware-visualizer {
    background: #f8fafc;
    border-color: rgba(15, 23, 42, 0.05);
  }
  .mw-nodes::after {
    background: rgba(15, 23, 42, 0.05);
  }
  .mw-node-dot {
    border-color: #f8fafc;
  }
  .mw-details {
    border-top-color: rgba(15, 23, 42, 0.05);
  }
  .mw-details-title {
    color: #334155;
  }
  .admin-mockup {
    background: #ffffff;
    border-color: rgba(15, 23, 42, 0.08);
  }
  .mockup-sidebar {
    background: #f8fafc;
    border-right-color: rgba(15, 23, 42, 0.05);
  }
  .mockup-item {
    background: rgba(15, 23, 42, 0.05);
  }
  .mockup-bar {
    background: rgba(15, 23, 42, 0.06);
  }
  .phone-mockup-container {
    background: transparent;
  }
  .phone-frame {
    border-color: #e2e8f0;
    background: #ffffff;
  }
  .phone-notch {
    background: #e2e8f0;
  }
  .phone-header {
    border-bottom-color: rgba(15, 23, 42, 0.05);
  }
  .phone-input {
    border-color: rgba(15, 23, 42, 0.06);
    background: rgba(15, 23, 42, 0.01);
  }
  .doc-mockup {
    background: #ffffff;
    border-color: rgba(15, 23, 42, 0.08);
  }
  .doc-mockup-nav {
    background: #f8fafc;
    border-right-color: rgba(15, 23, 42, 0.05);
  }
  .doc-content-line {
    background: rgba(15, 23, 42, 0.04);
  }
  .doc-content-line.title {
    background: rgba(15, 23, 42, 0.08);
  }
  .doc-content-code {
    background: #f8fafc;
    border-color: rgba(15, 23, 42, 0.05);
  }
  .tool-card {
    background: #ffffff;
    border-color: rgba(15, 23, 42, 0.06);
    box-shadow: 0 4px 15px rgba(15, 23, 42, 0.02);
  }
  .tool-card:hover {
    background: #ffffff;
    border-color: rgba(59, 130, 246, 0.2);
  }
  .tool-card h3 {
    color: #0f172a;
  }
  .tool-icon-wrapper {
    background: rgba(59, 130, 246, 0.03);
    border-color: rgba(59, 130, 246, 0.1);
  }
  .tool-card:hover .tool-icon-wrapper {
    background: rgba(59, 130, 246, 0.08);
  }
  .dropdown-menu-list,
  .hero-dropdown-menu {
    background: rgba(255, 255, 255, 0.95);
    border-color: rgba(15, 23, 42, 0.08);
    box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
  }
  .dropdown-item,
  .hero-dropdown-item {
    color: #475569;
  }
  .dropdown-item:hover,
  .hero-dropdown-item:hover {
    background: rgba(59, 130, 246, 0.05);
  }
}

/* ── RESPONSIVE ADAPTABILITY ── */
@media (max-width: 1024px) {
  .hero-container {
    grid-template-columns: 1fr;
    gap: 40px;
    text-align: center;
  }
  .hero-left-col {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .hero-title {
    font-size: 2.75rem;
  }
  .bento-grid {
    grid-template-columns: 1fr;
  }
  .bento-card-large {
    grid-column: span 1;
  }
  .tools-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .home-header {
    left: 12px;
    right: 12px;
    height: 52px;
    padding: 0 16px;
  }
  .home-header-nav {
    gap: 2px;
  }
  .nav-link {
    padding: 6px 8px;
    font-size: 11px;
  }
  .nav-link span, .locale-label-text {
    display: none !important; /* 手机端隐藏导航文字只保留图标与地球 */
  }
  .chevron-icon {
    display: none !important;
  }
  .nav-user-capsule span, .nav-user-capsule .nav-username {
    display: none !important;
  }
  .nav-user-capsule {
    padding: 4px;
    gap: 0;
  }
  .logo-sub-label {
    display: none;
  }
  .locale-btn {
    padding: 6px;
  }
  .nav-link-primary {
    padding: 6px 10px;
  }
  .hero-title {
    font-size: 2.25rem;
  }
  .hero-actions {
    flex-direction: column;
    width: 100%;
    gap: 12px;
  }
  .btn {
    width: 100%;
    justify-content: center;
  }
  .terminal-sandbox {
    height: 340px;
  }
  .footer-inner {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }
  .footer-copy {
    margin-left: 0;
    margin-top: 4px;
  }
}

/* ── USER AUTH STYLES ── */
.nav-user-capsule {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 4px 12px;
  border-radius: 999px;
  height: 32px;
}

.nav-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.nav-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.nav-avatar-placeholder {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  color: #3b82f6;
}

.nav-username {
  font-size: 12px;
  font-weight: 500;
  color: #cbd5e1;
}

.nav-logout-btn {
  background: none;
  border: none;
  padding: 2px;
  color: #64748b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}

.nav-logout-btn:hover {
  color: #ef4444;
}

.logout-icon-svg {
  width: 13px;
  height: 13px;
}

.nav-user-capsule.guest {
  background: rgba(59, 130, 246, 0.04);
  border-color: rgba(59, 130, 246, 0.15);
}

.guest-icon-svg {
  width: 13px;
  height: 13px;
  color: #3b82f6;
}

.nav-bind-btn {
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  border: none;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
  transition: opacity 0.2s;
}

.nav-bind-btn:hover {
  opacity: 0.9;
}

.nav-login-btn {
  font-weight: 600;
}

.login-icon-svg {
  width: 14px;
  height: 14px;
}

/* Light Mode Overrides */
@media (prefers-color-scheme: light) {
  .nav-user-capsule {
    background: rgba(15, 23, 42, 0.04);
    border-color: rgba(15, 23, 42, 0.08);
  }
  .nav-username {
    color: #475569;
  }
  .nav-avatar {
    background: rgba(15, 23, 42, 0.04);
    border-color: rgba(15, 23, 42, 0.08);
  }
  .nav-avatar-placeholder {
    color: #4f46e5;
  }
  .nav-logout-btn {
    color: #94a3b8;
  }
  .nav-logout-btn:hover {
    color: #dc2626;
  }
  .nav-user-capsule.guest {
    background: rgba(79, 70, 229, 0.03);
    border-color: rgba(79, 70, 229, 0.12);
  }
  .guest-icon-svg {
    color: #4f46e5;
  }
}
</style>
