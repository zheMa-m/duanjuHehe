import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function run() {
  const targetEmail = '1308765559@qq.com'
  console.log(`Checking user: ${targetEmail} in Supabase instance ${supabaseUrl}...`)

  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()
  
  if (usersError) {
    console.error('Error listing users from auth:', usersError.message)
    process.exit(1)
  }

  const user = users.find(u => u.email === targetEmail)

  if (!user) {
    console.log(`❌ User "${targetEmail}" DOES NOT exist in auth.users!`)
    process.exit(0)
  }

  console.log(`✔ Found user in auth.users!`)
  console.log(`  ID: ${user.id}`)

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error(`❌ Error fetching profile for id ${user.id}:`, profileError.message)
  } else if (!profile) {
    console.log(`❌ Profile record for user id ${user.id} DOES NOT exist in public.profiles table!`)
  } else {
    console.log(`✔ Found profile record in public.profiles!`)
    console.log(`  Profile ID: ${profile.id}`)
    console.log(`  All Columns present in DB:`, Object.keys(profile))
    console.log(`  Full record:`, JSON.stringify(profile, null, 2))
    
    if (profile.role !== 'admin') {
      console.log(`⚠️ WARNING: The user's role is "${profile.role}", NOT "admin"!`)
    }
  }
}

run()
