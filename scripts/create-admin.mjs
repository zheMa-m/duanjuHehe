import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envPath = './.env'
const envContent = fs.readFileSync(envPath, 'utf8')
const env = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
  if (match) {
    let value = match[2] ? match[2].trim() : ''
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1)
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1)
    }
    env[match[1]] = value
  }
})

const supabaseUrl = env.SUPABASE_URL
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

const BUILTIN_ADMIN_UUID = '9e638ba2-41aa-4434-a68b-6bd9f7ed0963'
const targetEmail = 'admin@hehe.dev'
const targetPassword = 'admin123'
const targetUsername = 'admin'

async function run() {
  console.log(`Checking if builtin admin user (ID: ${BUILTIN_ADMIN_UUID}) exists...`)

  let userExists = false
  try {
    const { data, error } = await supabase.auth.admin.getUserById(BUILTIN_ADMIN_UUID)
    if (data?.user) {
      userExists = true
    }
  } catch (e) {
    userExists = false
  }

  if (userExists) {
    console.log(`Builtin admin user exists. Updating its email to ${targetEmail} and password to ${targetPassword}...`)
    const { error: updateError } = await supabase.auth.admin.updateUserById(BUILTIN_ADMIN_UUID, {
      email: targetEmail,
      password: targetPassword,
      email_confirm: true,
      user_metadata: {
        username: targetUsername,
        display_name: 'Administrator',
        provider: 'email'
      }
    })
    if (updateError) {
      console.error('Error updating builtin user:', updateError)
      process.exit(1)
    }
    console.log('Builtin admin user updated successfully.')
  } else {
    console.log('Builtin admin user does not exist. Checking for conflicting users...')
    
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers()
    if (listError) {
      console.error('Error listing users:', listError)
      process.exit(1)
    }
    
    const conflictingUsers = (usersData?.users || []).filter(u => u.email === targetEmail)
    for (const u of conflictingUsers) {
      console.log(`Deleting conflicting user with email ${targetEmail} (ID: ${u.id})...`)
      await supabase.auth.admin.deleteUser(u.id)
    }

    // 同样也从 profiles 中删除冲突的 username 为 'admin' 的行
    console.log(`Cleaning profiles table for username: ${targetUsername}...`)
    await supabase.from('profiles').delete().eq('username', targetUsername)

    console.log(`Creating builtin admin user with ID: ${BUILTIN_ADMIN_UUID}, Email: ${targetEmail}, Password: ${targetPassword}...`)
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      id: BUILTIN_ADMIN_UUID,
      email: targetEmail,
      password: targetPassword,
      email_confirm: true,
      user_metadata: {
        username: targetUsername,
        display_name: 'Administrator',
        provider: 'email'
      }
    })
    if (createError || !created?.user) {
      console.error('Error creating user:', createError)
      process.exit(1)
    }
    console.log(`Builtin admin user created successfully.`)
  }

  console.log(`Ensuring profile role is 'admin' for user ID: ${BUILTIN_ADMIN_UUID}...`)
  // 去除 email 字段以兼容有些没有 email 列的 profiles 表结构
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: BUILTIN_ADMIN_UUID,
    username: targetUsername,
    display_name: 'Administrator',
    role: 'admin',
    plan_status: 'pro',
    auth_provider: 'email',
    is_anonymous: false,
    email_verified: true
  })

  if (profileError) {
    console.error('Error updating profile:', profileError)
    process.exit(1)
  }

  console.log('Profile configured successfully as admin.')
  console.log(`\n🎉 Success! Admin user has been set up in Supabase:\nEmail: ${targetEmail}\nPassword: ${targetPassword}`)
}

run()
