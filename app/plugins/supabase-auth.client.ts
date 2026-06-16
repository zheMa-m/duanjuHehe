/**
 * Supabase Auth Cookie 同步插件（仅客户端）
 *
 * 监听 Supabase onAuthStateChange 事件，将 token 同步到 cookie，
 * 供 server middleware 读取。页面加载时从 cookie 恢复 session。
 */
import { useSupabaseClient } from '~/utils/supabase-client'
import { AUTH_COOKIE_NAME, REFRESH_COOKIE_NAME } from '~/composables/auth'

function setCookie(name: string, value: string, days = 7) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=/;SameSite=Lax`
}

function removeCookie(name: string) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
}

export default defineNuxtPlugin({
  name: 'supabase-auth-sync',
  enforce: 'pre',
  async setup() {
    // 仅在客户端执行
    if (typeof window === 'undefined') return

    const supabase = useSupabaseClient()

    // 监听认证状态变化
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.access_token) {
          setCookie(AUTH_COOKIE_NAME, session.access_token, 1)
        }
        if (session?.refresh_token) {
          setCookie(REFRESH_COOKIE_NAME, session.refresh_token, 30)
        }
      }

      if (event === 'SIGNED_OUT') {
        removeCookie(AUTH_COOKIE_NAME)
        removeCookie(REFRESH_COOKIE_NAME)
      }
    })

    // 页面加载时初始化 auth 状态
    const { initAuth } = useAuth()
    await initAuth()
  }
})
