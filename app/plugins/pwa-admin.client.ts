/**
 * Admin 专属 PWA — 仅在 /admin 路径或 admin 子域名注册 Service Worker。
 * www 主站卸载误注册的根 scope SW，避免 workbox navigateFallback 报错。
 */
function isAdminContext(hostname: string, pathname: string): boolean {
  return hostname.startsWith('admin.') || pathname.startsWith('/admin')
}

export default defineNuxtPlugin(async () => {
  if (!import.meta.client || !('serviceWorker' in navigator)) return

  const { hostname, pathname } = window.location

  if (!isAdminContext(hostname, pathname)) {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map((reg) => reg.unregister()))
    return
  }

  if (!import.meta.dev) {
    useHead({
      link: [{ rel: 'manifest', href: '/manifest.webmanifest' }],
    })
  }

  const { registerSW } = await import('virtual:pwa-register')
  registerSW({ immediate: true })
})
