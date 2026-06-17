<script setup lang="ts">
// 系统配置展示组件，动态读取运行时配置
const runtimeConfig = useRuntimeConfig()
const isMockDB = typeof process !== 'undefined' && process.env?.MOCK_DB === 'true'
</script>

<template>
  <div class="space-y-8 animate-fade-in">
    <div>
      <h1 class="text-2xl font-semibold text-white tracking-tight">系统配置监控</h1>
      <p class="text-white/40 text-xs mt-1">查看单仓混合部署的底层服务与依赖配置项</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      
      <div class="space-y-2">
        <h2 class="text-[10px] font-medium uppercase tracking-wider text-white/40 pl-2">数据库配置</h2>
        <div class="bg-[#1c1c1e] border border-white/5 rounded-2xl divide-y divide-white/5 overflow-hidden">
          <div class="flex justify-between items-center px-4 py-3 text-xs">
            <span class="text-white/90">MOCK_DB</span>
            <span :class="isMockDB ? 'text-[#ff9f0a]' : 'text-[#30d158]'" class="font-medium">{{ isMockDB ? 'true' : 'false' }}</span>
          </div>
          <div class="flex justify-between items-center px-4 py-3 text-xs">
            <span class="text-white/90">SUPABASE_URL</span>
            <span class="text-white/40 font-mono text-[10px] truncate max-w-[220px]">{{ runtimeConfig.public.supabaseUrl || '未配置' }}</span>
          </div>
          <div class="flex justify-between items-center px-4 py-3 text-xs">
            <span class="text-white/90">SUPABASE_ANON_KEY</span>
            <span class="text-white/30 font-mono text-[10px]">{{ runtimeConfig.public.supabaseAnonKey ? runtimeConfig.public.supabaseAnonKey.slice(0, 12) + '...' : '未配置' }}</span>
          </div>
          <div class="flex justify-between items-center px-4 py-3 text-xs">
            <span class="text-white/90">SITE_ACCESS_PASSWORD</span>
            <span class="text-white/30 font-mono text-[10px]">{{ isMockDB ? 'Mock 模式未启用' : '已配置（服务端加密）' }}</span>
          </div>
        </div>
      </div>

      <div class="space-y-2">
        <h2 class="text-[10px] font-medium uppercase tracking-wider text-white/40 pl-2">Nuxt 4 路由映射</h2>
        <div class="bg-[#1c1c1e] border border-white/5 rounded-2xl divide-y divide-white/5 overflow-hidden">
          <div class="flex justify-between items-center px-4 py-3 text-xs">
            <span class="text-white/90">官网入口</span>
            <span class="text-white/50">/(client)/*</span>
          </div>
          <div class="flex justify-between items-center px-4 py-3 text-xs">
            <span class="text-white/90">API 接口</span>
            <span class="text-white/50">/api/v1/*</span>
          </div>
          <div class="flex justify-between items-center px-4 py-3 text-xs">
            <span class="text-white/90">管理后台</span>
            <span class="text-white/50">/(admin)/admin/*</span>
          </div>
          <div class="flex justify-between items-center px-4 py-3 text-xs">
            <span class="text-white/90">H5 营销页面</span>
            <span class="text-white/50">/(h5)/*</span>
          </div>
        </div>
      </div>

      <div class="space-y-2">
        <h2 class="text-[10px] font-medium uppercase tracking-wider text-white/40 pl-2">站点信息</h2>
        <div class="bg-[#1c1c1e] border border-white/5 rounded-2xl divide-y divide-white/5 overflow-hidden">
          <div class="flex justify-between items-center px-4 py-3 text-xs">
            <span class="text-white/90">Base URL</span>
            <span class="text-white/40 font-mono text-[10px] truncate max-w-[220px]">{{ runtimeConfig.public.baseUrl || 'http://localhost:3000' }}</span>
          </div>
          <div class="flex justify-between items-center px-4 py-3 text-xs">
            <span class="text-white/90">渲染模式</span>
            <span class="text-white/40">ISR (3600s) + SWR (600s) + SPA</span>
          </div>
          <div class="flex justify-between items-center px-4 py-3 text-xs">
            <span class="text-white/90">中间件链</span>
            <span class="text-white/40 font-mono text-[10px]">00→01→02→03→04→05</span>
          </div>
        </div>
      </div>

      <div class="space-y-2">
        <h2 class="text-[10px] font-medium uppercase tracking-wider text-white/40 pl-2">部署平台</h2>
        <div class="bg-[#1c1c1e] border border-white/5 rounded-2xl divide-y divide-white/5 overflow-hidden">
          <div class="flex justify-between items-center px-4 py-3 text-xs">
            <span class="text-white/90">Hosting</span>
            <span class="text-white/40">Vercel Serverless</span>
          </div>
          <div class="flex justify-between items-center px-4 py-3 text-xs">
            <span class="text-white/90">Database</span>
            <span class="text-white/40">Supabase PostgreSQL</span>
          </div>
          <div class="flex justify-between items-center px-4 py-3 text-xs">
            <span class="text-white/90">Storage</span>
            <span class="text-white/40">Supabase Storage</span>
          </div>
          <div class="flex justify-between items-center px-4 py-3 text-xs">
            <span class="text-white/90">Framework</span>
            <span class="text-white/40">Nuxt 4 (Nitro + Vite)</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
