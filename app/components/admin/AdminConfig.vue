<script setup lang="ts">
// 系统配置展示组件，无状态，仅做只读展示
</script>

<template>
  <div class="space-y-8 animate-fade-in">
    <div>
      <h1 class="text-2xl font-semibold text-white tracking-tight">系统配置监控</h1>
      <p class="text-white/40 text-xs mt-1">查看单仓混合部署的底层服务与依赖配置项</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      
      <div class="space-y-2">
        <h2 class="text-[10px] font-medium uppercase tracking-wider text-white/40 pl-2">Mock DB Config</h2>
        <div class="bg-[#1c1c1e] border border-white/5 rounded-2xl divide-y divide-white/5 overflow-hidden">
          <div class="flex justify-between items-center px-4 py-3 text-xs">
            <span class="text-white/90">MOCK_DB</span>
            <span class="text-[#30d158] font-medium">true</span>
          </div>
          <div class="flex justify-between items-center px-4 py-3 text-xs">
            <span class="text-white/90">SUPABASE_URL</span>
            <span class="text-white/40 font-mono text-[10px]">https://placeholder.supabase.co</span>
          </div>
          <div class="flex justify-between items-center px-4 py-3 text-xs">
            <span class="text-white/90">SUPABASE_SERVICE_ROLE</span>
            <span class="text-white/30 font-mono text-[10px]">placeholder-service-key-******</span>
          </div>
        </div>
      </div>

      <div class="space-y-2">
        <h2 class="text-[10px] font-medium uppercase tracking-wider text-white/40 pl-2">Nuxt 4 Routing Map</h2>
        <div class="bg-[#1c1c1e] border border-white/5 rounded-2xl divide-y divide-white/5 overflow-hidden">
          <div class="flex justify-between items-center px-4 py-3 text-xs">
            <span class="text-white/90">官网入口 (yourdomain.localhost)</span>
            <span class="text-white/50">/(client)/*</span>
          </div>
          <div class="flex justify-between items-center px-4 py-3 text-xs">
            <span class="text-white/90">API 接口 (api.yourdomain.localhost)</span>
            <span class="text-white/50">/api/v1/*</span>
          </div>
          <div class="flex justify-between items-center px-4 py-3 text-xs">
            <span class="text-white/90">管理后台 (admin.yourdomain.localhost)</span>
            <span class="text-white/50">/(admin)/admin/*</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
