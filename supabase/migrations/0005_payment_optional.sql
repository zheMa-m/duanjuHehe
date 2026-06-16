-- ====================================================================
-- ⚠️  0005 支付模块 — 商品 + 订单（可选功能）
--
-- 本模块为可选功能，项目核心业务（营销活动 + 任务 + 用户认证）
-- 不依赖此模块。仅在启用 Stripe 支付时才需要部署。
--
-- 前置依赖：
--   0001_core.sql — profiles（RLS admin 判断）、set_updated_at() 函数
--
-- 表清单：
--   1. products            — 商品（tenant_id 行级隔离）
--   2. orders              — 订单（products FK, auth.users FK）
-- ====================================================================


-- ╔════════════════════════════════════════════════════════════════╗
-- ║  1. products — 商品表                                        ║
-- ║  tenant_id 实现行级数据隔离                                    ║
-- ╚════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS "products" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"        TEXT NOT NULL,
  "price"       NUMERIC(10, 2) NOT NULL,
  "tenant_id"   UUID NOT NULL,
  "created_at"  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "products" FORCE ROW LEVEL SECURITY;

-- 行级隔离：用户仅操作自己项目数据
CREATE POLICY "products_tenant_isolation" ON "products"
  FOR ALL TO authenticated
  USING ("tenant_id" = auth.uid())
  WITH CHECK ("tenant_id" = auth.uid());

-- 管理员全权限
CREATE POLICY "products_admin_all" ON "products"
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM "profiles" WHERE id = auth.uid() AND "role" = 'admin')
  );

-- 索引
CREATE INDEX IF NOT EXISTS "idx_products_tenant_id"  ON "products"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_products_created_at" ON "products"("created_at" DESC);


-- ╔════════════════════════════════════════════════════════════════╗
-- ║  2. orders — 订单表                                          ║
-- ║  Stripe 支付核心表，用户可查/创建自己订单，管理员全权限         ║
-- ╚════════════════════════════════════════════════════════════════╝

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
ALTER TABLE "orders" FORCE ROW LEVEL SECURITY;

-- 用户查看自己的订单
CREATE POLICY "orders_user_select_own" ON "orders"
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 用户创建自己的订单
CREATE POLICY "orders_user_insert_own" ON "orders"
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 管理员全权限
CREATE POLICY "orders_admin_all" ON "orders"
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 索引
CREATE INDEX IF NOT EXISTS "idx_orders_user_id"            ON "orders"("user_id");
CREATE INDEX IF NOT EXISTS "idx_orders_status"             ON "orders"("status");
CREATE INDEX IF NOT EXISTS "idx_orders_created_at"         ON "orders"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_orders_payment_intent_id"  ON "orders"("payment_intent_id") WHERE "payment_intent_id" IS NOT NULL;

-- updated_at 自动更新触发器（依赖 0001_core.sql 的 set_updated_at() 函数）
CREATE TRIGGER "orders_set_updated_at"
  BEFORE UPDATE ON "orders"
  FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();
