#!/usr/bin/env node
/**
 * RLS 策略 SQL 生成器 — 生成标准租户隔离 + 管理员策略
 *
 * 生成内容：
 *   - ENABLE + FORCE ROW LEVEL SECURITY
 *   - tenant_id 行级隔离 (authenticated)
 *   - is_admin() 管理员全量访问策略
 *   - anon 拒绝写入策略 (RESTRICTIVE)
 *
 * 用法: node scripts/generate-rls-sql.mjs tasks [--admin]
 */

import fs from 'fs'
import path from 'path'
import { c, ok, section, info, warn } from './_shared.mjs'

const tableName = process.argv[2]

if (!tableName) {
  console.error(`\n${c.red}  错误: 请指定表名${c.reset}`)
  console.error(`${c.yellow}  示例: node scripts/generate-rls-sql.mjs tasks${c.reset}`)
  console.error(`${c.yellow}       node scripts/generate-rls-sql.mjs tasks --admin${c.reset}\n`)
  process.exit(1)
}

const cleanedTableName = tableName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
const includeAdmin = process.argv.includes('--admin')

section(`RLS 策略生成: ${cleanedTableName}`)

const sqlContent = `-- ====================================================================
-- Hehe Harness RLS 策略 — ${cleanedTableName}
-- 生成时间: ${new Date().toISOString().slice(0, 10)}
-- ====================================================================

-- 1. 开启行级安全 + 强制对 Owner 生效
ALTER TABLE "${cleanedTableName}" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "${cleanedTableName}" FORCE ROW LEVEL SECURITY;

-- 2. 租户行级隔离 (authenticated 用户只能操作自己的数据)
DROP POLICY IF EXISTS "${cleanedTableName}_tenant_isolation" ON "${cleanedTableName}";
CREATE POLICY "${cleanedTableName}_tenant_isolation" ON "${cleanedTableName}"
  FOR ALL
  TO authenticated
  USING ("tenant_id" = (auth.jwt() ->> 'tenant_id'))
  WITH CHECK ("tenant_id" = (auth.jwt() ->> 'tenant_id'));
${includeAdmin ? `
-- 3. 管理员全量访问 (跳过租户隔离)
DROP POLICY IF EXISTS "${cleanedTableName}_admin_access" ON "${cleanedTableName}";
CREATE POLICY "${cleanedTableName}_admin_access" ON "${cleanedTableName}"
  FOR ALL
  TO authenticated
  USING ("is_admin"(auth.uid()))
  WITH CHECK ("is_admin"(auth.uid()));

-- 4. 匿名用户禁止写入 (RESTRICTIVE — 与 PERMISSIVE 策略 AND 逻辑)
DROP POLICY IF EXISTS "${cleanedTableName}_restrict_anon" ON "${cleanedTableName}";
CREATE POLICY "${cleanedTableName}_restrict_anon" ON "${cleanedTableName}"
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);
` : ''}
-- ====================================================================
-- 部署: 复制到 supabase/migrations/ 或在 Supabase SQL Editor 中运行
-- ====================================================================
`

// ─── 输出 ──────────────────────────────────────────────
console.log(sqlContent)

const outputDir = path.resolve('scripts/rls-output')
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}
const outputPath = path.join(outputDir, `${cleanedTableName}-rls.sql`)
fs.writeFileSync(outputPath, sqlContent, 'utf-8')

ok(`SQL 已保存: ${path.relative(process.cwd(), outputPath)}`)
if (!includeAdmin) {
  info(`如需管理员策略，重新运行加 --admin 参数`)
}
console.log()
process.exit(0)
