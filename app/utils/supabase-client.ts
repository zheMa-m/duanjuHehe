import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * 客户端 Supabase Auth 实例
 *
 * 使用 NUXT_PUBLIC_ 前缀的安全公开凭证，仅限 RLS 策略范围内数据访问。
 * 单例模式避免重复初始化。
 */

let _client: SupabaseClient | null = null

export function useSupabaseClient(): SupabaseClient {
  if (_client) return _client

  const config = useRuntimeConfig()
  const url = config.public.supabaseUrl as string
  const anonKey = config.public.supabaseAnonKey as string

  if (!url || !anonKey || url.includes('your-project-id')) {
    // Fallback: 未配置真实凭证时使用占位客户端
    // Mock DB 环境下不会实际调用 Supabase API
    console.warn('[Supabase Client] NUXT_PUBLIC_SUPABASE_URL/ANON_KEY not configured. Using placeholder.')
    _client = createClient(
      'https://placeholder.supabase.co',
      'placeholder-anon-key'
    )
    return _client
  }

  _client = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true, // OAuth 回调时自动从 URL 提取 token
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  })

  return _client
}
