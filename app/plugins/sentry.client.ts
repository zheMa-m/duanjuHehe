/**
 * Sentry 客户端插件 — 注入用户上下文到错误报告
 *
 * 在 Nuxt 插件系统初始化后，将当前用户信息（如果已登录）
 * 附加到 Sentry 的 Scope 中，便于问题定位。
 *
 * 注意：Sentry 通过 @sentry/nuxt/module 注入为全局变量，
 * 仅在客户端可用（SSR 时不存在）。
 */
export default defineNuxtPlugin({
  name: 'sentry-user-context',
  dependsOn: ['supabase-auth-sync'],
  setup() {
    if (typeof window === 'undefined') return

    const { user } = useAuth()

    watchEffect(() => {
      const currentUser = user.value
      // Sentry 仅在配置了有效 DSN 后才初始化
      const s = (window as any).Sentry || (globalThis as any).Sentry
      if (!s) return

      if (!currentUser) {
        s.setUser(null)
        return
      }
      s.setUser({
        id: currentUser.id,
        email: currentUser.email,
        username: currentUser.username,
      })
    })
  },
})
