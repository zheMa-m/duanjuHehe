import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { config } from 'dotenv'

config()

const { Pool } = pg
const projectRef = process.env.SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1]

if (!projectRef) {
  console.error('ERROR: Could not extract project ref from SUPABASE_URL')
  process.exit(1)
}

const dbPassword = process.env.SUPABASE_DB_PASSWORD || process.env.DATABASE_PASSWORD || ''

// Try Supavisor pooler (Transaction mode)
const poolerUrl = dbPassword
  ? `postgresql://postgres.${projectRef}:${encodeURIComponent(dbPassword)}@aws-0-ap-southeast-1.pooler.supabase.co:6543/postgres`
  : null

if (!poolerUrl) {
  console.error('ERROR: SUPABASE_DB_PASSWORD not set in .env')
  console.error('Please add: SUPABASE_DB_PASSWORD=<your-database-password>')
  console.error('Find it in Supabase Dashboard → Settings → Database → Database password')
  process.exit(1)
}

const migrationFile = path.resolve(process.argv[2] || 'supabase/migrations/0010_sync_campaign_config.sql')
const sql = fs.readFileSync(migrationFile, 'utf-8')

console.log(`Running: ${migrationFile}`)
console.log(`SQL length: ${sql.length} chars\n`)

const pool = new Pool({
  connectionString: poolerUrl,
  max: 1,
  idleTimeoutMillis: 30000,
  ssl: { rejectUnauthorized: false }
})

try {
  const client = await pool.connect()
  try {
    const result = await client.query(sql)
    console.log('✓ Migration executed successfully')
    if (result.length > 0) {
      console.log('Result:', JSON.stringify(result.map(r => r.command), null, 2))
    }
  } finally {
    client.release()
  }
} catch (err) {
  console.error('✗ Migration failed:', err.message)
  process.exit(1)
} finally {
  await pool.end()
}
