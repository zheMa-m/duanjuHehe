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
  const isSecure = window.location.protocol === 'https:'
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=/;SameSite=Strict${isSecure ? ';Secure' : ''}`
}

function removeCookie(name: string) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Strict`
}

export default defineNuxtPlugin({
  name: 'supabase-auth-sync',
  enforce: 'pre',
  async setup() {
    // 仅在客户端执行
    if (typeof window === 'undefined') return

    // ── 处理 OAuth 回调：从 URL query 提取 token 写入 cookie ──
    // 服务端 callback.get.ts 重定向到 /?auth_token=xxx&refresh_token=xxx
    // 此处提取并设置 cookie，然后清理 URL 参数
    const params = new URLSearchParams(window.location.search)
    const authToken = params.get('auth_token')
    const refreshToken = params.get('refresh_token')
    if (authToken) {
      setCookie(AUTH_COOKIE_NAME, authToken, 1)
      if (refreshToken) setCookie(REFRESH_COOKIE_NAME, refreshToken, 30)
      // 清理 URL 中的 token 参数，避免刷新页面时重复处理
      const url = new URL(window.location.href)
      url.searchParams.delete('auth_token')
      url.searchParams.delete('refresh_token')
      window.history.replaceState({}, '', url.pathname + url.search + url.hash)
    }

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
