-- ====================================================================
-- 0003 支付模块 — 商品与订单
-- 依赖：0001_core.sql（profiles 表，RLS 管理员判断）
-- 表名：products, orders
-- ====================================================================

-- -------------------------------------------------------------
-- 1. 商品表 (products)
--    支付可购买的商品，tenant_id 实现行级数据隔离
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "products" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"        TEXT NOT NULL,
  "price"       NUMERIC(10, 2) NOT NULL,
  "tenant_id"   UUID NOT NULL, -- 项目数据隔离 ID (关联用户 ID)
  "created_at"  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;

-- 行级隔离策略：用户只允许操作自己项目的数据
CREATE POLICY "products_tenant_isolation" ON "products"
  FOR ALL TO authenticated
  USING ("tenant_id" = auth.uid())
  WITH CHECK ("tenant_id" = auth.uid());

-- 允许管理员查看与管理所有商品
CREATE POLICY "products_admin_all" ON "products"
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM "profiles" WHERE id = auth.uid() AND "role" = 'admin'
    )
  );

-- -------------------------------------------------------------
-- 2. 订单表 (orders)
--    Stripe 支付核心表，用户可查自己的订单，管理员可查全部
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "orders" (
  "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_no"          TEXT UNIQUE NOT NULL,
  "product_id"        UUID REFERENCES products(id) ON DELETE SET NULL,
  "product_name"      TEXT NOT NULL,
  "amount"            NUMERIC(10, 2) NOT NULL CHECK ("amount" >= 0),
  "currency"          TEXT NOT NULL DEFAULT 'USD',
  "status"            TEXT NOT NULL DEFAULT 'pending'
                      CHECK ("status" IN ('pending', 'paid', 'failed', 'refunded')),
  "user_id"           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  "payment_provider"  TEXT NOT NULL DEFAULT 'stripe'
                      CHECK ("payment_provider" IN ('stripe', 'paypal', 'manual')),
  "payment_intent_id" TEXT,
  "created_at"        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at"        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;

-- 用户可查看自己的订单
CREATE POLICY "orders_user_select_own"
  ON "orders" FOR SELECT
  USING (auth.uid() = user_id);

-- 管理员全权限
CREATE POLICY "orders_admin_all"
  ON "orders" FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- -------------------------------------------------------------
-- 索引优化
-- -------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "idx_orders_user_id" ON "orders"(user_id);
CREATE INDEX IF NOT EXISTS "idx_orders_status" ON "orders"(status);
CREATE INDEX IF NOT EXISTS "idx_orders_created_at" ON "orders"(created_at DESC);
