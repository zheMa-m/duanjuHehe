<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
const { t } = useI18n()
const route = useRoute()
const slug = computed(() => route.params.slug as string)
const s = ref<any>(null)
const loading = ref(true)
onMounted(async () => {
  try { const r = await $fetch<any>(`/api/v1/series/${slug.value}`); s.value = r.data } catch (_) {} finally { loading.value = false }
})
</script>

<template>
  <div class="phone">
    <header class="topbar">
      <NuxtLink to="/app" class="back">← 返回</NuxtLink>
      <span class="logo">{{ s?.title || '加载中...' }}</span>
    </header>
    <main class="main">
      <div v-if="loading" class="msg">加载中...</div>
      <div v-else-if="!s" class="msg">未找到</div>
      <template v-else>
        <div class="hero">
          <div class="hero-bg"><img v-if="s.cover_image" :src="s.cover_image" class="bg-img" /><div class="bg-overlay" /></div>
          <div class="hero-body">
            <img v-if="s.cover_image" :src="s.cover_image" class="cover" />
            <div v-else class="cover-ph">🎬</div>
            <h1 class="title">{{ s.title }}</h1>
            <div class="meta"><span>⭐ {{ s.rating || '4.8' }}</span><span>·</span><span>{{ s.total_episodes }} 集</span></div>
            <div class="tags" v-if="s.tags?.length"><span v-for="t in s.tags" :key="t" class="tag">{{ t }}</span></div>
            <NuxtLink v-if="s.episodes?.length" :to="`/app/watch/${s.slug}/${s.episodes[0].episode_number}`" class="cta">▶ 开始观看</NuxtLink>
          </div>
        </div>
        <div v-if="s.episodes?.length" class="eps">
          <h2 class="eps-title">📋 剧集列表</h2>
          <NuxtLink v-for="ep in s.episodes.slice(0,15)" :key="ep.id" :to="`/app/watch/${s.slug}/${ep.episode_number}`" class="ep-row">
            <span class="ep-num">EP{{ ep.episode_number }}</span>
            <span class="ep-name">{{ ep.title }}</span>
            <span :class="['ep-tag', ep.is_free ? 'free' : 'paid']">{{ ep.is_free ? '免费' : '🪙'+ep.coin_cost }}</span>
          </NuxtLink>
        </div>
      </template>
    </main>
  </div>
</template>

<style scoped>
.phone{max-width:480px;margin:0 auto;min-height:100dvh;background:#0f0f1a;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;flex-direction:column}
.topbar{display:flex;align-items:center;height:44px;padding:0 12px;background:rgba(15,15,26,.95);border-bottom:1px solid rgba(255,255,255,.05);position:sticky;top:0;z-index:100;flex-shrink:0;overflow:hidden}
.back{color:#818cf8;text-decoration:none;font-size:13px;font-weight:500;flex-shrink:0}
.logo{margin-left:8px;font-size:14px;font-weight:700;color:#f1f5f9;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.main{flex:1;overflow-y:auto}
.msg{text-align:center;padding:80px 20px;color:#64748b}
.hero{position:relative;min-height:320px;display:flex;align-items:flex-end}
.hero-bg{position:absolute;inset:0;overflow:hidden}
.bg-img{width:100%;height:100%;object-fit:cover;filter:blur(30px) brightness(.25);transform:scale(1.1)}
.bg-overlay{position:absolute;inset:0;background:linear-gradient(to top,#0f0f1a,transparent 50%)}
.hero-body{position:relative;z-index:1;padding:40px 20px 24px;text-align:center;width:100%}
.cover{width:140px;height:196px;object-fit:cover;border-radius:14px;box-shadow:0 16px 48px rgba(0,0,0,.5);margin:0 auto 16px;display:block}
.cover-ph{width:140px;height:196px;border-radius:14px;background:linear-gradient(135deg,#1e1b4b,#312e81);display:flex;align-items:center;justify-content:center;font-size:48px;margin:0 auto 16px}
.title{font-size:1.3rem;font-weight:900;color:#fff;margin-bottom:4px}
.meta{font-size:12px;color:#94a3b8;margin-bottom:8px;display:flex;gap:6px;justify-content:center}
.tags{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:20px}
.tag{padding:3px 8px;border-radius:4px;font-size:10px;background:rgba(255,255,255,.06);color:#94a3b8}
.cta{display:inline-flex;align-items:center;gap:6px;padding:13px 44px;border-radius:12px;font-size:15px;font-weight:800;color:#fff;background:linear-gradient(135deg,#6366f1,#8b5cf6);text-decoration:none;box-shadow:0 8px 32px rgba(99,102,241,.4)}
.eps{padding:20px 16px}
.eps-title{font-size:1rem;font-weight:800;color:#f1f5f9;margin-bottom:12px}
.ep-row{display:flex;align-items:center;gap:10px;padding:14px 12px;border-radius:10px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.04);margin-bottom:6px;text-decoration:none;color:inherit}
.ep-num{font-size:11px;font-weight:700;color:#818cf8;width:40px;flex-shrink:0}
.ep-name{flex:1;font-size:13px;color:#e2e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ep-tag{padding:3px 8px;border-radius:4px;font-size:10px;font-weight:700;flex-shrink:0}
.ep-tag.free{background:rgba(34,197,94,.12);color:#22c55e}
.ep-tag.paid{background:rgba(245,158,11,.12);color:#f59e0b}
</style>
