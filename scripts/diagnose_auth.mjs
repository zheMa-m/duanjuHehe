import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY

async function run() {
  console.log('--- Auth Diagnosis Script ---')
  console.log('SUPABASE_URL:', supabaseUrl)

  // 1. 使用客户端 Anon Key 创建客户端，并尝试登录
  const supabaseClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  console.log('1. Signing in with email and password...')
  const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
    email: '1308765559@qq.com',
    password: '12345678'
  })

  if (signInError) {
    console.error('❌ Sign in failed:', signInError.message)
    return
  }

  const token = signInData.session.access_token
  console.log('✔ Sign in successful!')
  console.log('  Access Token:', token.substring(0, 20) + '...')
  console.log('  User ID:', signInData.user.id)

  // 2. 用刚刚获取的 session 访问 profiles 表 (模拟 RLS 条件下用户自查)
  console.log('\n2. Fetching profile using USER session (with token)...')
  const userSupabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  })

  const { data: userProfile, error: userProfileError } = await userSupabase
    .from('profiles')
    .select('*')
    .single() // 查自己

  if (userProfileError) {
    console.error('❌ User session fetch profile failed:', userProfileError.message, userProfileError.code)
  } else {
    console.log('✔ User session fetch profile successful!')
    console.log('  Profile Role:', userProfile?.role)
    console.log('  Profile Details:', userProfile)
  }

  // 3. 模拟中间件 02.auth.ts 里的逻辑 (使用 Service Role 验证 token 并查 profile)
  console.log('\n3. Simulating 02.auth.ts middleware logic...')
  const serviceSupabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  // 3a. 校验 JWT Token 并获取 user
  console.log('  3a. Fetching user via auth.getUser(token)...')
  const { data: { user: verifiedUser }, error: authError } = await serviceSupabase.auth.getUser(token)

  if (authError || !verifiedUser) {
    console.error('  ❌ auth.getUser failed:', authError?.message || 'No user returned')
    return
  }
  console.log('  ✔ auth.getUser success! Verified User ID:', verifiedUser.id)

  // 3b. 查询 profiles 表
  console.log('  3b. Fetching profile via Service Role...')
  const { data: serviceProfile, error: serviceProfileError } = await serviceSupabase
    .from('profiles')
    .select('email, role, username, display_name, avatar_url, auth_provider, is_anonymous')
    .eq('id', verifiedUser.id)
    .single()

  if (serviceProfileError) {
    console.error('  ❌ Service Role fetch profile failed:', serviceProfileError.message)
  } else {
    console.log('  ✔ Service Role fetch profile success!')
    console.log('    Role:', serviceProfile?.role)
  }
}

run()
