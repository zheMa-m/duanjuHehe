<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'

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

useAppSEO({
  title: () => episode.value?.title || 'Watch — ReelShort',
  description: () => episode.value?.description || '',
})

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
    isUnlocked.value = true
    coinBalance.value = res.data?.balance_after || coinBalance.value
  } catch (e: any) { alert(e.statusMessage || 'Failed to unlock') }
  finally { unlocking.value = false }
}

watch(episodeNum, fetchData)
onMounted(fetchData)
</script>

<template>
  <div class="watch-root">
    <header class="watch-header">
      <NuxtLink :to="`/series/${seriesSlug}`" class="back-link">← {{ series?.title || 'Series' }}</NuxtLink>
      <div class="coin-display">🪙 {{ coinBalance.toLocaleString() }}</div>
    </header>

    <div v-if="loading" class="loading">{{ $t('reelshort.loading') }}</div>
    <div v-else-if="!episode" class="loading">{{ $t('reelshort.notFound') }}</div>

    <template v-else>
      <div class="player-container">
        <div v-if="!isUnlocked" class="locked-overlay">
          <div class="locked-content">
            <span class="lock-icon">🔒</span>
            <h2>{{ $t('reelshort.unlockTitle') }}</h2>
            <p>{{ $t('reelshort.unlockDesc', { cost: episode.coin_cost }) }}</p>
            <p class="balance-text">{{ $t('reelshort.yourBalance', { balance: coinBalance.toLocaleString() }) }}</p>
            <button @click="unlockEpisode" :disabled="unlocking || coinBalance < (episode.coin_cost || 0)" class="unlock-btn">
              {{ unlocking ? '...' : $t('reelshort.unlockBtn', { cost: episode.coin_cost }) }}
            </button>
            <p v-if="coinBalance < (episode.coin_cost || 0)" class="insufficient">{{ $t('reelshort.insufficient') }}</p>
          </div>
          <img :src="episode.thumbnail_url" class="locked-bg" alt="" />
        </div>

        <video
          v-else
          :src="episode.video_url"
          :poster="episode.thumbnail_url"
          class="video-player"
          controls
          autoplay
          playsinline
          @ended="nextEpisode ? $router.push(`/watch/${seriesSlug}/${nextEpisode.episode_number}`) : null"
        />
      </div>

      <div class="episode-info">
        <h1 class="ep-title">Ep {{ episode.episode_number }}: {{ episode.title }}</h1>
        <p class="ep-desc">{{ episode.description }}</p>

        <div class="ep-nav">
          <NuxtLink v-if="prevEpisode" :to="`/watch/${seriesSlug}/${prevEpisode.episode_number}`" class="nav-btn">{{ $t('reelshort.prevEpisode', { num: prevEpisode.episode_number }) }}</NuxtLink>
          <span v-else class="nav-btn disabled">{{ $t('reelshort.firstEpisode') }}</span>
          <NuxtLink v-if="nextEpisode" :to="`/watch/${seriesSlug}/${nextEpisode.episode_number}`" class="nav-btn">{{ $t('reelshort.nextEpisode', { num: nextEpisode.episode_number }) }}</NuxtLink>
          <span v-else class="nav-btn disabled">{{ $t('reelshort.lastEpisode') }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.watch-root { min-height: 100vh; background: #000; color: #f1f5f9; }
.watch-header { position: sticky; top: 0; z-index: 50; display: flex; align-items: center; justify-content: space-between; padding: 12px 24px; background: rgba(0,0,0,0.8); backdrop-filter: blur(12px); }
.back-link { color: #818cf8; text-decoration: none; font-size: 14px; }
.coin-display { font-size: 14px; font-weight: 600; color: #fbbf24; }
.loading { text-align: center; padding: 100px; color: #64748b; }

.player-container { position: relative; width: 100%; max-width: 500px; margin: 0 auto; background: #000; aspect-ratio: 9/16; }
.video-player { width: 100%; height: 100%; object-fit: contain; }
.locked-overlay { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.locked-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: blur(20px) brightness(0.3); }
.locked-content { position: relative; z-index: 1; text-align: center; padding: 32px; }
.lock-icon { font-size: 3rem; display: block; margin-bottom: 16px; }
.locked-content h2 { font-size: 1.25rem; font-weight: 700; margin-bottom: 8px; }
.locked-content p { color: #94a3b8; margin-bottom: 8px; font-size: 14px; }
.balance-text { color: #fbbf24 !important; }
.unlock-btn { padding: 12px 32px; border-radius: 10px; font-size: 15px; font-weight: 700; color: #fff; background: linear-gradient(135deg, #f59e0b, #d97706); border: none; cursor: pointer; margin-top: 16px; box-shadow: 0 4px 20px rgba(245,158,11,0.3); }
.unlock-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.insufficient { color: #f87171 !important; font-size: 12px !important; margin-top: 8px; }

.episode-info { max-width: 500px; margin: 0 auto; padding: 20px 24px; }
.ep-title { font-size: 1rem; font-weight: 700; margin-bottom: 4px; }
.ep-desc { font-size: 13px; color: #94a3b8; line-height: 1.5; margin-bottom: 16px; }
.ep-nav { display: flex; gap: 12px; }
.nav-btn { flex: 1; padding: 10px; border-radius: 8px; text-align: center; font-size: 13px; font-weight: 500; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); color: #94a3b8; text-decoration: none; transition: all 0.15s; }
.nav-btn:hover { background: rgba(255,255,255,0.08); color: #e2e8f0; }
.nav-btn.disabled { opacity: 0.3; pointer-events: none; }
@media (min-width: 768px) { .watch-root { max-width: 500px; margin: 0 auto; border-left: 1px solid rgba(255,255,255,0.05); border-right: 1px solid rgba(255,255,255,0.05); } }
</style>
