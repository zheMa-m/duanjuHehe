-- ====================================================================
-- 🛡️ Hehe Harness 自动生成的 PostgreSQL Row-Level Security (RLS) 隔离策略
-- 表名: products
-- 生成时间: 6/15/2026, 6:35:33 PM
-- ====================================================================

-- 1. 开启表的物理行级安全机制
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;

-- 2. 强行对表所有者 (Owner) 开启 RLS 约束（建议，防止管理员越权漏查）
ALTER TABLE "products" FORCE ROW LEVEL SECURITY;

-- 3. 创建数据行级单向隔离 Policy (允许用户且仅能操作属于当前 JWT tenant_id 的数据)
-- 适用于 SELECT / INSERT / UPDATE / DELETE 动作
DROP POLICY IF EXISTS "products_tenant_isolation" ON "products";

CREATE POLICY "products_tenant_isolation" ON "products"
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
