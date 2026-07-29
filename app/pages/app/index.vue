<script setup lang="ts">
import { onMounted, ref, onUnmounted } from 'vue'
const { t } = useI18n()
const featured = ref<any[]>([])
const trending = ref<any[]>([])
const slide = ref(0)
let timer: any = null
onMounted(async () => {
  try {
    const [f, tr] = await Promise.all([
      $fetch<any>('/api/v1/discover?type=featured&limit=6'),
      $fetch<any>('/api/v1/discover?type=trending&limit=20'),
    ])
    featured.value = f.data?.items || []
    trending.value = tr.data?.items || []
  } catch (_) {}
  timer = setInterval(() => { slide.value = (slide.value + 1) % Math.max(featured.value.length, 1) }, 4000)
})
onUnmounted(() => clearInterval(timer))
const tabs = [{ to: '/app', icon: '🏠', label: '首页' }, { to: '/app/browse', icon: '🔍', label: '浏览' }]
const route = useRoute()
</script>

<template>
  <div class="phone">
    <header class="topbar">
      <NuxtLink to="/" class="back">← 桌面版</NuxtLink>
      <span class="logo">🎬 {{ t('reelshort.siteName') }}</span>
    </header>
    <main class="main">
      <div v-if="featured.length" class="carousel">
        <div class="carousel-track" :style="{ transform: `translateX(-${slide * 100}%)` }">
          <NuxtLink v-for="s in featured" :key="s.id" :to="`/app/series/${s.slug}`" class="slide">
            <img :src="s.cover_image || s.poster_image" class="slide-img" />
            <div class="slide-shade" />
            <div class="slide-info">
              <span class="badge">🔥 热门</span>
              <h2 class="slide-title">{{ s.title }}</h2>
              <span class="slide-sub">⭐ {{ s.rating || '4.8' }} · {{ s.total_episodes }} 集</span>
            </div>
          </NuxtLink>
        </div>
      </div>
      <section class="sec">
        <h2 class="sec-title">🔥 热门精选</h2>
        <div class="grid">
          <NuxtLink v-for="s in trending.slice(0, 9)" :key="s.id" :to="`/app/series/${s.slug}`" class="card">
            <div class="card-box">
              <img v-if="s.cover_image" :src="s.cover_image" class="card-img" />
              <div v-else class="card-ph">🎬</div>
              <span class="card-rate">⭐ {{ s.rating || '4.5' }}</span>
            </div>
            <span class="card-title">{{ s.title }}</span>
          </NuxtLink>
        </div>
      </section>
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
.carousel{position:relative;height:46vh;overflow:hidden}
.carousel-track{display:flex;height:100%;transition:transform .5s}
.slide{min-width:100%;height:100%;position:relative;text-decoration:none;display:block}
.slide-img{width:100%;height:100%;object-fit:cover}
.slide-shade{position:absolute;inset:0;background:linear-gradient(to top,#0f0f1a,transparent 55%)}
.slide-info{position:absolute;bottom:20px;left:16px;right:16px}
.badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:10px;font-weight:700;background:rgba(245,158,11,.2);color:#fbbf24;margin-bottom:6px}
.slide-title{font-size:1.25rem;font-weight:900;color:#fff;line-height:1.3;margin-bottom:2px}
.slide-sub{font-size:11px;color:#94a3b8}
.sec{padding:20px 16px 0}
.sec-title{font-size:1rem;font-weight:800;color:#f1f5f9;margin-bottom:12px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.card{text-decoration:none;color:inherit}
.card-box{position:relative;aspect-ratio:2/3;border-radius:10px;overflow:hidden;background:#1a1a2e;margin-bottom:6px}
.card-img{width:100%;height:100%;object-fit:cover}
.card-ph{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:32px;background:linear-gradient(135deg,#1e1b4b,#312e81)}
.card-rate{position:absolute;top:4px;right:4px;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:700;background:rgba(0,0,0,.7);color:#fbbf24}
.card-title{font-size:11px;font-weight:600;color:#cbd5e1;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
</style>
