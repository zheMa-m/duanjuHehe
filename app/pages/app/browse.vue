<script setup lang="ts">
import { onMounted, ref } from 'vue'
const { t } = useI18n()
const route = useRoute()
const series = ref<any[]>([])
const genres = ref<any[]>([])
const loading = ref(true)
const gid = ref('')
async function load() {
  loading.value = true
  try {
    const p = new URLSearchParams(); p.set('pageSize', '50')
    if (gid.value) p.set('genre', gid.value)
    const [s, g] = await Promise.all([$fetch<any>(`/api/v1/series?${p}`), $fetch<any>('/api/v1/genres')])
    series.value = s.data?.items || []; genres.value = g.data?.items || []
  } catch (_) {} finally { loading.value = false }
}
function pick(id: string) { gid.value = id; load() }
onMounted(load)
const tabs = [{ to: '/app', icon: '🏠', label: '首页' }, { to: '/app/browse', icon: '🔍', label: '浏览' }]
</script>

<template>
  <div class="phone">
    <header class="topbar">
      <NuxtLink to="/" class="back">← 桌面版</NuxtLink>
      <span class="logo">🎬 {{ t('reelshort.siteName') }}</span>
    </header>
    <main class="main">
      <div class="bar">
        <button :class="['chip', !gid && 'on']" @click="pick('')">全部</button>
        <button v-for="g in genres" :key="g.id" :class="['chip', gid === g.id && 'on']" @click="pick(g.id)">{{ g.name }}</button>
      </div>
      <div v-if="loading" class="msg">加载中...</div>
      <div v-else class="grid">
        <NuxtLink v-for="s in series" :key="s.id" :to="`/app/series/${s.slug}`" class="card">
          <div class="card-box">
            <img v-if="s.cover_image" :src="s.cover_image" class="card-img" />
            <div v-else class="card-ph">🎬</div>
            <span class="card-rate">⭐ {{ s.rating || '4.5' }}</span>
          </div>
          <span class="card-title">{{ s.title }}</span>
        </NuxtLink>
      </div>
      <div v-if="!loading && !series.length" class="msg">暂无内容</div>
    </main>
    <nav class="bnav">
      <NuxtLink v-for="t in tabs" :key="t.to" :to="t.to" class="bnav-item" :class="{ on: route.path === t.to }">
        <span class="bnav-icon">{{ t.icon }}</span><span>{{ t.label }}</span>
      </NuxtLink>
    </nav>
  </div>
</template>

<style scoped>
.phone{max-width:480px;margin:0 auto;min-height:100dvh;background:#0f0f1a;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;flex-direction:column}
.topbar{display:flex;align-items:center;height:44px;padding:0 12px;background:rgba(15,15,26,.95);border-bottom:1px solid rgba(255,255,255,.05);position:sticky;top:0;z-index:100;flex-shrink:0}
.back{color:#818cf8;text-decoration:none;font-size:13px;font-weight:500}
.logo{margin-left:12px;font-size:15px;font-weight:800;color:#f1f5f9}
.main{flex:1;overflow-y:auto;padding-bottom:72px}
.bnav{display:flex;justify-content:space-around;align-items:center;height:56px;background:rgba(15,15,26,.98);border-top:1px solid rgba(255,255,255,.05);position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:480px;z-index:200;padding-bottom:env(safe-area-inset-bottom)}
.bnav-item{display:flex;flex-direction:column;align-items:center;gap:2px;text-decoration:none;color:#64748b;font-size:10px;padding:4px 24px;border-radius:8px}
.bnav-item.on{color:#818cf8}
.bnav-icon{font-size:22px;line-height:1}
.bar{display:flex;gap:8px;padding:12px 16px;overflow-x:auto}
.chip{padding:6px 14px;border-radius:999px;font-size:12px;font-weight:600;color:#94a3b8;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);cursor:pointer;white-space:nowrap;flex-shrink:0}
.chip.on{color:#a5b4fc;background:rgba(99,102,241,.15);border-color:rgba(99,102,241,.3)}
.msg{text-align:center;padding:60px 20px;color:#64748b;font-size:14px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:12px 16px}
.card{text-decoration:none;color:inherit}
.card-box{position:relative;aspect-ratio:2/3;border-radius:10px;overflow:hidden;background:#1a1a2e;margin-bottom:6px}
.card-img{width:100%;height:100%;object-fit:cover}
.card-ph{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:28px;background:linear-gradient(135deg,#1e1b4b,#312e81)}
.card-rate{position:absolute;top:4px;right:4px;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:700;background:rgba(0,0,0,.7);color:#fbbf24}
.card-title{font-size:11px;font-weight:600;color:#cbd5e1;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
</style>
