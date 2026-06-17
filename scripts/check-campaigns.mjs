import { createClient } from '@supabase/supabase-js'
import { loadEnv } from './_shared.mjs'

loadEnv(import.meta.url)

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, serviceRoleKey)
const { data, error } = await supabase.from('campaigns').select('*')
console.log('Campaigns in DB:', JSON.stringify(data, null, 2))
if (error) console.error(error)
