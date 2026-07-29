<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
const route = useRoute()
const sSlug = computed(() => route.params.seriesSlug as string)
const epNum = computed(() => parseInt(route.params.episode as string) || 1)
const ep = ref<any>(null)
const allEps = ref<any[]>([])
const loading = ref(true)
async function load() {
  loading.value = true
  try {
    const r = await $fetch<any>(`/api/v1/series/${sSlug.value}`)
    allEps.value = r.data?.episodes || []
    const e = allEps.value.find((x: any) => x.episode_number === epNum.value)
    if (e) { const er = await $fetch<any>(`/api/v1/episodes/${e.id}`); ep.value = er.data || e }
  } catch (_) {} finally { loading.value = false }
}
onMounted(load)
watch(epNum, load)
const prev = computed(() => allEps.value.find((e: any) => e.episode_number === epNum.value - 1))
const next = computed(() => allEps.value.find((e: any) => e.episode_number === epNum.value + 1))
</script>

<template>
  <div class="watch-root">
    <div v-if="loading" class="msg">加载中...</div>
    <div v-else-if="!ep" class="msg">未找到</div>
    <template v-else>
      <div class="player">
        <video :src="ep.video_url" :poster="ep.thumbnail_url" class="video" controls autoplay playsinline
          @ended="next ? $router.push(`/app/watch/${sSlug}/${next.episode_number}`) : null" />
      </div>
      <div class="info">
        <h1 class="t">EP{{ ep.episode_number }} {{ ep.title }}</h1>
        <div class="nav">
          <NuxtLink v-if="prev" :to="`/app/watch/${sSlug}/${prev.episode_number}`" class="btn">← 上一集</NuxtLink>
          <span v-else class="btn off">已是最前</span>
          <NuxtLink v-if="next" :to="`/app/watch/${sSlug}/${next.episode_number}`" class="btn">下一集 →</NuxtLink>
          <span v-else class="btn off">已追完</span>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.watch-root{background:#000;min-height:100dvh;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.msg{text-align:center;padding:100px 20px;color:#64748b}
.player{width:100%;aspect-ratio:9/16;max-height:85vh}
.video{width:100%;height:100%;object-fit:contain;background:#000}
.info{padding:16px;background:#0f0f1a;color:#e2e8f0}
.t{font-size:1rem;font-weight:700;color:#f1f5f9;margin-bottom:16px}
.nav{display:flex;gap:10px}
.btn{flex:1;padding:10px;border-radius:10px;text-align:center;font-size:13px;font-weight:600;background:rgba(255,255,255,.06);color:#94a3b8;text-decoration:none;border:1px solid rgba(255,255,255,.06)}
.btn.off{opacity:.3;pointer-events:none}
</style>
