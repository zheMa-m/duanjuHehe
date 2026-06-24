/**
 * 部署版本检测 — 发现新 buildId 时自动刷新，避免浏览器本地 HTML 缓存导致旧代码
 */
const STORAGE_KEY = 'hehe-build-id'

function readPageBuildId(): string | null {
  return document.querySelector('meta[name="hehe-build-id"]')?.getAttribute('content') || null
}

async function fetchLatestBuildId(): Promise<string | null> {
  try {
    const res = await $fetch<{ data: { buildId: string } }>('/api/v1/meta/build', {
      cache: 'no-store',
    })
    return res.data?.buildId ?? null
  } catch {
    return null
  }
}

function reloadForNewBuild(latest: string) {
  sessionStorage.setItem(STORAGE_KEY, latest)
  window.location.reload()
}

async function checkDeployVersion() {
  const latest = await fetchLatestBuildId()
  if (!latest) return

  const config = useRuntimeConfig()
  const pageBuildId = readPageBuildId() || config.public.buildId || null
  const stored = sessionStorage.getItem(STORAGE_KEY)

  if (pageBuildId && pageBuildId !== latest) {
    reloadForNewBuild(latest)
    return
  }

  if (stored && stored !== latest) {
    reloadForNewBuild(latest)
    return
  }

  sessionStorage.setItem(STORAGE_KEY, latest)
}

export default defineNuxtPlugin(() => {
  if (import.meta.dev) return

  void checkDeployVersion()

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void checkDeployVersion()
  })

  window.addEventListener('pageshow', (event) => {
    if (event.persisted) void checkDeployVersion()
  })
})
