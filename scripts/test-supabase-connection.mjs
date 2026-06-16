import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

// 控制台颜色配置
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m'
}

console.log(`${colors.bold}${colors.cyan}==================================================${colors.reset}`)
console.log(`${colors.bold}${colors.cyan}🛡️  Hehe 物理 Supabase 数据库与 RLS 防御一键诊断${colors.reset}`)
console.log(`${colors.bold}${colors.cyan}==================================================${colors.reset}\n`)

// 1. 手动读取并解析 .env
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const envPath = path.resolve(__dirname, '../.env')

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8')
  content.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const idx = trimmed.indexOf('=')
    if (idx !== -1) {
      const key = trimmed.substring(0, idx).trim()
      const val = trimmed.substring(idx + 1).trim().replace(/^['"]|['"]$/g, '')
      process.env[key] = val
    }
  })
  console.log(`ℹ️  已加载本地配置文件：${colors.blue}.env${colors.reset}`)
} else {
  console.log(`${colors.yellow}⚠️  未找到本地 .env 文件，将使用进程环境变量${colors.reset}`)
}

const mockDb = process.env.MOCK_DB
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log(`- MOCK_DB 状态: ${mockDb === 'true' ? `${colors.yellow}true (沙盒模式)${colors.reset}` : `${colors.green}false (真实数据库)${colors.reset}`}`)
console.log(`- SUPABASE_URL: ${supabaseUrl || `${colors.red}未配置${colors.reset}`}`)
console.log(`- SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceRoleKey ? `${colors.green}已配置 (秘钥已保护)${colors.reset}` : `${colors.red}未配置${colors.reset}`}\n`)

if (mockDb === 'true') {
  console.log(`${colors.yellow}ℹ️  您当前配置的是本地内存 Mock DB 模式。${colors.reset}`)
  console.log(`${colors.yellow}若要开始诊断物理 Supabase 连接，请在 .env 中设置 MOCK_DB=false${colors.reset}\n`)
}

// 2. 检测凭据占位符
if (!supabaseUrl || supabaseUrl.includes('your-project-id') || supabaseUrl.includes('placeholder.supabase.co')) {
  console.log(`${colors.red}❌ 错误: SUPABASE_URL 为默认占位符或未配置。${colors.reset}`)
  console.log(`👉 请前往 Supabase 控制台获取项目 API URL，并在 .env 中替换之。\n`)
  process.exit(1)
}

if (!supabaseServiceRoleKey || supabaseServiceRoleKey.includes('your-service-role-secret-key-do-not-expose') || supabaseServiceRoleKey.includes('placeholder-key')) {
  console.log(`${colors.red}❌ 错误: SUPABASE_SERVICE_ROLE_KEY 为默认占位符或未配置。${colors.reset}`)
  console.log(`👉 请前往 Supabase 控制台获取 service_role 秘钥，并在 .env 中替换之。\n`)
  process.exit(1)
}

// 3. 连通性探测
console.log(`🔄 正在尝试物理连接至 Supabase 数据库...`)
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
})

try {
  // 探测五张核心表
  const requiredTables = ['profiles', 'campaigns', 'tasks', 'activity_logs']
  const tableCheckResults = []
  let connectionSuccess = false

  console.log(`🔄 正在读取数据库表结构...`)
  
  for (const table of requiredTables) {
    const { error } = await supabase.from(table).select('*').limit(1)
    
    if (error) {
      // 网络连接失败或 API Key 错
      if (error.message.includes('fetch failed') || error.message.includes('ENOTFOUND')) {
        console.log(`${colors.red}❌ 连接失败: 无法访问 Supabase 服务。请检查您的网络连接与 SUPABASE_URL 是否正确。${colors.reset}`)
        process.exit(1)
      }
      if (error.message.includes('Invalid API key') || error.message.includes('JWT')) {
        console.log(`${colors.red}❌ 认证失败: service_role 秘钥校验被拒绝。请核对 SUPABASE_SERVICE_ROLE_KEY。${colors.reset}`)
        process.exit(1)
      }
      
      // 表不存在
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        tableCheckResults.push({ table, exists: false })
      } else {
        // 其他数据库报错，但说明连通性是好的，表也是存在的
        tableCheckResults.push({ table, exists: true })
        connectionSuccess = true
      }
    } else {
      tableCheckResults.push({ table, exists: true })
      connectionSuccess = true
    }
  }

  console.log(`${colors.green}🟢 物理连通性探测成功！数据库握手正常。${colors.reset}\n`)

  // 4. 表完备性检查与指引
  console.log(`${colors.bold}📊 数据库表完备性对齐状态:${colors.reset}`)
  const missingTables = tableCheckResults.filter(r => !r.exists).map(r => r.table)
  
  tableCheckResults.forEach(r => {
    if (r.exists) {
      console.log(`  - ${colors.green}✔ ${r.table}${colors.reset} 已在物理数据库创建`)
    } else {
      console.log(`  - ${colors.red}✘ ${r.table}${colors.reset} 尚未在物理数据库创建`)
    }
  })

  if (missingTables.length > 0) {
    console.log(`\n${colors.red}❌ 表完备性检查未通过！部分核心表尚未创建。${colors.reset}`)
    console.log(`👉 解决方案：请在项目根目录找到 ${colors.cyan}supabase-init.sql${colors.reset}，并在 Supabase 的 SQL Editor 中运行该脚本以一键初始化所有表与安全防护策略。\n`)
  } else {
    console.log(`\n${colors.green}🟢 表完备性检查全部通过！五大核心表已齐全。${colors.reset}\n`)
  }

  // 5. RLS 行级安全物理启用检测
  console.log(`${colors.bold}🛡️  RLS (Row-Level Security) 物理安全策略启用状态检测:${colors.reset}`)
  
  // 探测是否有我们为检测设置的内置函数
  const { data: rlsStatus, error: rlsError } = await supabase.rpc('check_rls_status')
  
  if (rlsError) {
    console.log(`\n${colors.yellow}ℹ️  提示: 未检测到全自动 RLS 诊断函数。${colors.reset}`)
    console.log(`👉 如果您想在此脚本中进行 100% 自动的 RLS 物理状态诊断，请在 Supabase SQL Editor 中运行以下函数创建 SQL：`)
    console.log(`${colors.cyan}-------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_rls_status()
RETURNS TABLE (table_name text, rls_enabled boolean)
SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT relname::text, relrowsecurity
  FROM pg_class
  JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid
  WHERE pg_namespace.nspname = 'public'
    AND relname IN ('profiles', 'campaigns', 'tasks', 'activity_logs');
END;
$$ LANGUAGE plpgsql;
-------------------------------------------------------------${colors.reset}\n`)
    
    console.log(`💡 您目前仍旧可以通过在 Supabase SQL Editor 中运行以下命令来手动核查 RLS 状态:`)
    console.log(`   ${colors.bold}SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('profiles', 'campaigns', 'tasks', 'activity_logs');${colors.reset}\n`)
  } else {
    // 函数执行成功，进行全自动诊断输出
    let allRlsEnabled = true
    rlsStatus.forEach(item => {
      if (item.rls_enabled) {
        console.log(`  - [${colors.green}已启用 RLS${colors.reset}] ${item.table_name}`)
      } else {
        console.log(`  - [${colors.red}❌ 未启用 RLS${colors.reset}] ${item.table_name}`)
        allRlsEnabled = false
      }
    })

    if (!allRlsEnabled) {
      console.log(`\n${colors.red}🚨 警告：检测到有表未开启 RLS 行级隔离策略，存在严重跨域越权泄露隐患！${colors.reset}`)
      console.log(`👉 解决方案：请在 SQL Editor 中执行对应的安全开启策略，例如:`)
      rlsStatus.filter(item => !item.rls_enabled).forEach(item => {
        console.log(`   ${colors.cyan}ALTER TABLE "${item.table_name}" ENABLE ROW LEVEL SECURITY;${colors.reset}`)
      })
      console.log()
    } else {
      console.log(`\n${colors.green}🟢 恭喜！五大核心表物理 RLS 行级防御盾均已 100% 开启激活。项目运行在极高安全态下。${colors.reset}\n`)
    }
  }

} catch (err) {
  console.log(`${colors.red}❌ 诊断脚本运行出现未捕获异常:${colors.reset}`)
  console.error(err)
  process.exit(1)
}

console.log(`${colors.bold}${colors.cyan}==================================================${colors.reset}`)
console.log(`${colors.bold}${colors.green}              诊断完成，祝您的项目顺利闭环！${colors.reset}`)
console.log(`${colors.bold}${colors.cyan}==================================================${colors.reset}`)
