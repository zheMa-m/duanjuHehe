import fs from 'fs'
import path from 'path'

// 获取表名
const tableName = process.argv[2]

if (!tableName) {
  console.error('\x1b[31m🚨 错误: 请指定需要生成 RLS 策略的数据表名称！\x1b[0m')
  console.error('\x1b[33m💡 示例: node scripts/generate-rls-sql.mjs tasks\x1b[0m\n')
  process.exit(1)
}

const cleanedTableName = tableName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')

const sqlContent = `-- ====================================================================
-- 🛡️ Hehe Harness 自动生成的 PostgreSQL Row-Level Security (RLS) 隔离策略
-- 表名: ${cleanedTableName}
-- 生成时间: ${new Date().toLocaleString()}
-- ====================================================================

-- 1. 开启表的物理行级安全机制
ALTER TABLE "${cleanedTableName}" ENABLE ROW LEVEL SECURITY;

-- 2. 强行对表所有者 (Owner) 开启 RLS 约束（建议，防止管理员越权漏查）
ALTER TABLE "${cleanedTableName}" FORCE ROW LEVEL SECURITY;

-- 3. 创建数据行级单向隔离 Policy (允许用户且仅能操作属于当前 JWT tenant_id 的数据)
-- 适用于 SELECT / INSERT / UPDATE / DELETE 动作
DROP POLICY IF EXISTS "${cleanedTableName}_tenant_isolation" ON "${cleanedTableName}";

CREATE POLICY "${cleanedTableName}_tenant_isolation" ON "${cleanedTableName}"
  FOR ALL
  TO authenticated
  USING (
    -- 校验原表数据的 tenant_id 是否等于当前 JWT 载荷中注入的用户 tenant_id
    "tenant_id" = (auth.jwt() ->> 'tenant_id')
  )
  WITH CHECK (
    -- 校验写入、更新的新数据，其 tenant_id 必须与当前 JWT 保持一致
    "tenant_id" = (auth.jwt() ->> 'tenant_id')
  );

-- ====================================================================
-- 💡 部署提示: 
-- 请将上述 SQL 复制到 Supabase SQL Editor 中运行，或加入您的 DB Migrations 脚本。
-- ====================================================================
`

// 输出结果
console.log('\x1b[32m✔ SQL 策略生成成功!\x1b[0m\n')
console.log('\x1b[36m--------------------------------------------------\x1b[0m')
console.log(sqlContent)
console.log('\x1b[36m--------------------------------------------------\x1b[0m\n')

// 自动写入本地目录
const outputDir = path.resolve('scripts/rls-output')
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}
const outputPath = path.join(outputDir, `${cleanedTableName}-rls.sql`)
fs.writeFileSync(outputPath, sqlContent, 'utf-8')

console.log(`\x1b[32m✔ 已自动保存至本地文件: [${outputPath}]\x1b[0m\n`)
process.exit(0)
