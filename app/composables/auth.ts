/**
 * useAuth — 完整客户端认证状态管理
 *
 * 支持：Email/Password、Google/Facebook/Apple OAuth、匿名用户
 * 双模式：Mock DB 环境走服务端 API，真实环境走 Supabase JS Client
 */

interface AuthUser {
  id: string
  email?: string
  username?: string
  displayName?: string
  avatarUrl?: string
  role: string
  authProvider: string
  isAnonymous: boolean
}

interface AuthSession {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

type OAuthProvider = 'google' | 'facebook' | 'apple'

// Cookie 名称常量
export const AUTH_COOKIE_NAME = 'sb-access-token'
export const REFRESH_COOKIE_NAME = 'sb-refresh-token'
export const DEVICE_COOKIE_NAME = 'device-id'

// ── 工具函数 ──────────────────────────────────────────────────
function setCookie(name: string, value: string, days = 7) {
  if (typeof document === 'undefined') return
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  const isSecure = window.location.protocol === 'https:'
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=/;SameSite=Strict${isSecure ? ';Secure' : ''}`
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1] || '') : null
}

function removeCookie(name: string) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Strict`
}

function generateDeviceId(): string {
  const stored = getCookie(DEVICE_COOKIE_NAME)
  if (stored) return stored
  const id = `dev-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`
  setCookie(DEVICE_COOKIE_NAME, id, 365)
  return id
}

// ── 主 Composable ─────────────────────────────────────────────
export function useAuth() {
  const user = useState<AuthUser | null>('auth_user', () => null)
  const session = useState<AuthSession | null>('auth_session', () => null)
  const isLoggedIn = computed(() => !!user.value && !user.value.isAnonymous)
  const isAnonymous = computed(() => !!user.value && user.value.isAnonymous)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const deviceId = useState<string>('device_id', () => '')

  // ── 同步 token 到 cookie ─────────────────────────────────
  function syncTokenToCookie(accessToken: string, refreshToken?: string) {
    setCookie(AUTH_COOKIE_NAME, accessToken, 1) // 1 day
    if (refreshToken) setCookie(REFRESH_COOKIE_NAME, refreshToken, 30)
  }

  function clearCookies() {
    removeCookie(AUTH_COOKIE_NAME)
    removeCookie(REFRESH_COOKIE_NAME)
    removeCookie(DEVICE_COOKIE_NAME) // 清除设备标识，避免登出后仍被识别为匿名用户
  }

  // ── Mock 模式：通过服务端 API ────────────────────────────
  async function mockFetchUser() {
    try {
      const data = await $fetch<{ data: any }>('/api/v1/auth/me')
      if (data?.data) {
        user.value = mapProfileToUser(data.data)
      }
    } catch {
      user.value = null
    }
  }

  function mapProfileToUser(profile: any): AuthUser {
    return {
      id: profile.id,
      email: profile.email || null,
      username: profile.username,
      displayName: profile.display_name || profile.username,
      avatarUrl: profile.avatar_url,
      role: profile.role || 'user',
      authProvider: profile.auth_provider || 'email',
      isAnonymous: profile.is_anonymous || false,
    }
  }

  // ── 邮箱注册 ────────────────────────────────────────────
  async function signUpWithEmail(email: string, password: string, username?: string) {
    // 通过服务端 API 注册（服务端调用 Supabase signUp + 创建 profile）
    const res = await $fetch<{ data: any }>('/api/v1/auth/register', {
      method: 'POST',
      body: { email, password, username }
    })

    if (res?.data?.session) {
      session.value = {
        accessToken: res.data.session.access_token,
        refreshToken: res.data.session.refresh_token,
        expiresAt: res.data.session.expires_at,
      }
      syncTokenToCookie(res.data.session.access_token, res.data.session.refresh_token)
    }

    await refreshUser()
    return res
  }

  // ── 邮箱登录 ────────────────────────────────────────────
  async function signInWithEmail(email: string, password: string) {
    const res = await $fetch<{ data: any }>('/api/v1/auth/login', {
      method: 'POST',
      body: { email, password }
    })

    if (res?.data?.session) {
      session.value = {
        accessToken: res.data.session.access_token,
        refreshToken: res.data.session.refresh_token,
        expiresAt: res.data.session.expires_at,
      }
      syncTokenToCookie(res.data.session.access_token, res.data.session.refresh_token)
    }

    await refreshUser()
    return res
  }

  // ── 社交 OAuth 登录 ─────────────────────────────────────
  async function signInWithOAuth(provider: OAuthProvider) {
    const redirectTo = `${window.location.origin}/api/v1/auth/callback`
    const res = await $fetch<{ data: any }>('/api/v1/auth/login', {
      method: 'POST',
      body: { provider, redirect_to: redirectTo }
    })

    if (res?.data?.url) {
      // 跳转到 OAuth 授权页
      window.location.href = res.data.url
    }
  }

  // ── 匿名用户登录 ────────────────────────────────────────
  async function signInAnonymously() {
    if (!deviceId.value) deviceId.value = generateDeviceId()

    const res = await $fetch<{ data: any }>('/api/v1/auth/login', {
      method: 'POST',
      body: { anonymous: true, device_id: deviceId.value }
    })

    if (res?.data?.session) {
      session.value = {
        accessToken: res.data.session.access_token,
        refreshToken: res.data.session.refresh_token,
        expiresAt: res.data.session.expires_at,
      }
      syncTokenToCookie(res.data.session.access_token, res.data.session.refresh_token)
    }

    await refreshUser()
    return res
  }

  // ── 匿名用户绑定邮箱 ────────────────────────────────────
  async function linkAnonymousToEmail(email: string, password: string) {
    const headers: Record<string, string> = {}
    const token = session.value?.accessToken || getCookie(AUTH_COOKIE_NAME)
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const res = await $fetch<{ data: any }>('/api/v1/auth/link', {
      method: 'POST',
      headers,
      body: { email, password }
    })

    await refreshUser()
    return res
  }

  // ── 匿名用户绑定社交账号 ────────────────────────────────
  async function linkAnonymousToOAuth(provider: OAuthProvider) {
    const redirectTo = `${window.location.origin}/api/v1/auth/callback?link=true`
    const res = await $fetch<{ data: any }>('/api/v1/auth/login', {
      method: 'POST',
      body: { provider, redirect_to: redirectTo, link: true }
    })

    if (res?.data?.url) {
      window.location.href = res.data.url
    }
  }

  // ── 登出 ────────────────────────────────────────────────
  async function signOut() {
    try {
      const headers: Record<string, string> = {}
      const token = session.value?.accessToken || getCookie(AUTH_COOKIE_NAME)
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      await $fetch('/api/v1/auth/logout', { method: 'POST', headers })
    } catch { /* ignore */ }
    clearCookies()
    user.value = null
    session.value = null
  }

  // ── 刷新用户信息 ────────────────────────────────────────
  async function refreshUser() {
    try {
      const headers: Record<string, string> = {}
      const token = session.value?.accessToken || getCookie(AUTH_COOKIE_NAME)
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      const res = await $fetch<{ data: any }>('/api/v1/auth/me', { headers })
      if (res?.data) {
        user.value = mapProfileToUser(res.data)
      } else {
        user.value = null
      }
    } catch {
      user.value = null
    }
  }

  // ── 更新 profile ────────────────────────────────────────
  async function updateProfile(data: { display_name?: string; avatar_url?: string; phone?: string }) {
    const headers: Record<string, string> = {}
    const token = session.value?.accessToken || getCookie(AUTH_COOKIE_NAME)
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    const res = await $fetch<{ data: any }>('/api/v1/auth/profile', {
      method: 'PATCH',
      headers,
      body: data
    })
    await refreshUser()
    return res
  }

  // ── 管理后台内置管理员登录 ──────────────────────────────
  async function signInAsAdmin(username: string, password: string) {
    let email = username
    if (!email.includes('@')) {
      // 方便本地开发与常规管理员输入简写 "admin"，自动补全为系统管理员邮箱
      email = `${username}@hehe.dev`
    }

    // 清空当前用户状态，防脏数据污染
    user.value = null
    session.value = null

    // 调用常规邮箱登录
    const res = await signInWithEmail(email, password)

    // 校验登录后的用户是否具有管理员角色
    const currentUser = user.value as AuthUser | null
    if (currentUser && currentUser.role !== 'admin') {
      await signOut()
      throw new Error('您的账号不具有管理后台访问权限')
    }

    return res
  }

  // ── 初始化：从 cookie 恢复会话 ──────────────────────────
  const authReady = useState<boolean>('auth_ready', () => false)

  async function initAuth() {
    deviceId.value = generateDeviceId()
    const token = getCookie(AUTH_COOKIE_NAME)
    if (token) {
      await refreshUser()
    }
    authReady.value = true
  }

  return {
    user: readonly(user),
    session: readonly(session),
    authReady: readonly(authReady),
    isLoggedIn,
    isAnonymous,
    isAdmin,
    deviceId: readonly(deviceId),

    signUpWithEmail,
    signInWithEmail,
    signInWithOAuth,
    signInAnonymously,
    signInAsAdmin,
    linkAnonymousToEmail,
    linkAnonymousToOAuth,
    signOut,
    refreshUser,
    updateProfile,
    initAuth,
  }
}

