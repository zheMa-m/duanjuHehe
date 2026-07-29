<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
definePageMeta({ layout: false }) // full screen, no bottom nav

const { t } = useI18n()
const route = useRoute()
const seriesSlug = computed(() => route.params.seriesSlug as string)
const episodeNum = computed(() => parseInt(route.params.episode as string) || 1)

const series = ref<any>(null)
const episode = ref<any>(null)
const allEpisodes = ref<any[]>([])
const loading = ref(true)
const isUnlocked = ref(true)
const coinBalance = ref(0)
const unlocking = ref(false)

useAppSEO({ title: () => episode.value?.title || 'Watch — ReelShort', description: () => '' })

async function fetchData() {
  loading.value = true
  try {
    const sRes = await $fetch<any>(`/api/v1/series/${seriesSlug.value}`)
    series.value = sRes.data
    allEpisodes.value = sRes.data?.episodes || []
    const ep = allEpisodes.value.find((e: any) => e.episode_number === episodeNum.value)
    if (ep) {
      const epRes = await $fetch<any>(`/api/v1/episodes/${ep.id}`)
      episode.value = epRes.data
      isUnlocked.value = epRes.data?.is_unlocked || epRes.data?.is_free
    }
    try {
      const coinRes = await $fetch<any>('/api/v1/coins/balance')
      coinBalance.value = coinRes.data?.balance || 0
    } catch (_) {}
  } catch (_) {} finally { loading.value = false }
}

const prevEpisode = computed(() => allEpisodes.value.find((e: any) => e.episode_number === episodeNum.value - 1))
const nextEpisode = computed(() => allEpisodes.value.find((e: any) => e.episode_number === episodeNum.value + 1))

async function unlockEpisode() {
  if (!episode.value || unlocking.value) return
  unlocking.value = true
  try {
    const res = await $fetch<any>(`/api/v1/episodes/${episode.value.id}/unlock`, { method: 'POST' })
    if (res.data?.unlocked) { isUnlocked.value = true; coinBalance.value = res.data.balance ?? coinBalance.value }
  } catch (_) {} finally { unlocking.value = false }
}

function handleVideoEnded() {
  if (nextEpisode.value) {
    navigateTo(`/app/watch/${seriesSlug.value}/${nextEpisode.value.episode_number}`)
  }
}

onMounted(fetchData)
</script>

<template>
  <div class="app-watch">
    <!-- Player -->
    <div class="player-container">
      <video v-if="isUnlocked && episode?.video_url" :src="episode.video_url" class="video-player" controls autoplay playsinline @ended="handleVideoEnded" />
      <div v-else-if="isUnlocked" class="player-placeholder">▶ Video Player</div>
      <div v-else class="locked-overlay">
        <img :src="series?.cover_image" class="locked-bg" />
        <div class="locked-content">
          <span class="lock-icon">🔒</span>
          <h2>{{ $t('reelshort.unlockTitle') }}</h2>
          <p>{{ $t('reelshort.unlockDesc', { cost: episode?.coin_cost || 0 }) }}</p>
          <p class="balance-text">{{ $t('reelshort.yourBalance', { balance: coinBalance }) }}</p>
          <button class="unlock-btn" :disabled="unlocking || coinBalance < (episode?.coin_cost || 0)" @click="unlockEpisode">
            {{ $t('reelshort.unlockBtn', { cost: episode?.coin_cost || 0 }) }}
          </button>
          <p v-if="coinBalance < (episode?.coin_cost || 0)" class="insufficient">{{ $t('reelshort.insufficient') }}</p>
        </div>
      </div>
    </div>

    <!-- Info -->
    <div class="watch-info">
      <NuxtLink to="/app" class="watch-back">← Back</NuxtLink>
      <h1 class="watch-title">{{ episode?.title || `Episode ${episodeNum}` }}</h1>
      <p class="watch-series-name">{{ series?.title }}</p>
      <div class="watch-nav">
        <NuxtLink v-if="prevEpisode" :to="`/app/watch/${seriesSlug}/${prevEpisode.episode_number}`" class="watch-nav-btn">{{ $t('reelshort.prevEpisode', { num: prevEpisode.episode_number }) }}</NuxtLink>
        <NuxtLink v-if="nextEpisode" :to="`/app/watch/${seriesSlug}/${nextEpisode.episode_number}`" class="watch-nav-btn">{{ $t('reelshort.nextEpisode', { num: nextEpisode.episode_number }) }}</NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-watch { min-height: 100dvh; background: #0f172a; color: #f1f5f9; max-width: 480px; margin: 0 auto; }
.player-container { width: 100%; aspect-ratio: 9/16; background: #000; }
.video-player { width: 100%; height: 100%; object-fit: contain; }
.player-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 2rem; }

.locked-overlay { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.locked-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: blur(20px) brightness(0.3); }
.locked-content { position: relative; text-align: center; padding: 32px; }
.lock-icon { font-size: 3rem; display: block; margin-bottom: 12px; }
.locked-content h2 { font-size: 1.125rem; font-weight: 700; margin-bottom: 6px; }
.locked-content p { color: #94a3b8; font-size: 0.8125rem; margin-bottom: 6px; }
.balance-text { color: #fbbf24 !important; }
.unlock-btn { padding: 12px 32px; border-radius: 10px; font-size: 0.9375rem; font-weight: 700; color: #fff; background: linear-gradient(135deg, #f59e0b, #d97706); border: none; cursor: pointer; margin-top: 12px; }
.unlock-btn:disabled { opacity: 0.5; }
.insufficient { color: #f87171 !important; font-size: 0.6875rem !important; margin-top: 6px; }

.watch-info { padding: 20px; }
.watch-back { color: #6366f1; text-decoration: none; font-size: 0.8125rem; }
.watch-title { font-size: 1.125rem; font-weight: 700; margin: 8px 0 4px; }
.watch-series-name { font-size: 0.8125rem; color: #94a3b8; margin-bottom: 16px; }
.watch-nav { display: flex; gap: 10px; }
.watch-nav-btn { flex: 1; padding: 12px; border-radius: 10px; text-align: center; font-size: 0.8125rem; font-weight: 500; background: #1e293b; color: #e2e8f0; text-decoration: none; }
</style>
