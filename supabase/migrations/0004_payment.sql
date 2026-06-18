-- ====================================================================
-- 0004 支付模块 — 商品 + 订单 + 支付配置 + 订阅（可选功能）
--
-- 本模块为可选功能，项目核心业务不依赖此模块。
-- 仅在启用 Stripe 等支付渠道时才需要部署。
--
-- 前置依赖：
--   0001_core.sql — profiles、is_admin()、set_updated_at()
--
-- 表清单：
--   1. products         — 商品（tenant_id 行级隔离）
--   2. orders           — 订单（products FK, auth.users FK）
--   3. payment_configs  — 支付通道动态配置表
--   4. subscriptions    — 计费订阅周期表
-- ====================================================================


-- ╔════════════════════════════════════════════════════════════════╗
-- ║  1. products — 商品表                                        ║
-- ║  tenant_id 实现行级数据隔离                                    ║
-- ╚════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS "products" (
  "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"          TEXT NOT NULL,
  "price"         NUMERIC(10, 2) NOT NULL,
  "payment_meta"  JSONB NOT NULL DEFAULT '{}'::jsonb,  -- 第三方渠道价格映射（如 Stripe Price）
  "is_active"     BOOLEAN NOT NULL DEFAULT TRUE,
  "tenant_id"     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "created_at"    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at"    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "products" FORCE ROW LEVEL SECURITY;

-- 行级隔离：用户仅操作自己项目数据
CREATE POLICY "products_tenant_isolation" ON "products"
  FOR ALL TO authenticated
  USING ("tenant_id" = (SELECT auth.uid()))
  WITH CHECK ("tenant_id" = (SELECT auth.uid()));

-- 管理员全权限
CREATE POLICY "products_admin_all" ON "products"
  FOR ALL TO authenticated USING ("is_admin"((SELECT auth.uid())));

-- 索引
CREATE INDEX IF NOT EXISTS "idx_products_tenant_id"  ON "products"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_products_created_at" ON "products"("created_at" DESC);

-- updated_at 自动更新触发器
CREATE TRIGGER "products_set_updated_at"
  BEFORE UPDATE ON "products"
  FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();


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

-- 用户操作自己的订单（SELECT/INSERT 合一）
CREATE POLICY "orders_user_own" ON "orders"
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- 管理员全权限
CREATE POLICY "orders_admin_all" ON "orders"
  FOR ALL TO authenticated
  USING ("is_admin"((SELECT auth.uid())));

-- service_role 可更新任意订单（支付回调等场景）
CREATE POLICY "orders_service_update" ON "orders"
  FOR UPDATE TO service_role
  USING (true);

-- 索引
CREATE INDEX IF NOT EXISTS "idx_orders_user_id"            ON "orders"("user_id");
CREATE INDEX IF NOT EXISTS "idx_orders_status"             ON "orders"("status");
CREATE INDEX IF NOT EXISTS "idx_orders_created_at"         ON "orders"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_orders_payment_intent_id"  ON "orders"("payment_intent_id") WHERE "payment_intent_id" IS NOT NULL;

-- updated_at 自动更新触发器
CREATE TRIGGER "orders_set_updated_at"
  BEFORE UPDATE ON "orders"
  FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();


-- ╔════════════════════════════════════════════════════════════════╗
-- ║  3. payment_configs — 支付通道动态配置表                       ║
-- ╚════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS "payment_configs" (
  "provider"      TEXT PRIMARY KEY CHECK ("provider" IN ('stripe', 'paypal', 'alipay', 'wechat', 'manual')),
  "is_enabled"    BOOLEAN NOT NULL DEFAULT FALSE,
  "public_keys"   JSONB NOT NULL DEFAULT '{}', -- 存储前端需要的公钥/Client ID
  "extra_meta"    JSONB NOT NULL DEFAULT '{}', -- 存储辅助配置
  "updated_at"    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE "payment_configs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment_configs" FORCE ROW LEVEL SECURITY;

-- RLS: 任何人可读取配置，用于前台动态渲染支付按钮与 SDK 动态初始化
CREATE POLICY "payment_configs_anonymous_read" ON "payment_configs"
  FOR SELECT TO public USING (true);

-- RLS: 仅管理员可增删改
CREATE POLICY "payment_configs_admin_all" ON "payment_configs"
  FOR ALL TO authenticated
  USING ("is_admin"((SELECT auth.uid())))
  WITH CHECK ("is_admin"((SELECT auth.uid())));

-- updated_at 自动更新触发器
CREATE TRIGGER "payment_configs_set_updated_at"
  BEFORE UPDATE ON "payment_configs"
  FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();


-- ╔════════════════════════════════════════════════════════════════╗
-- ║  4. subscriptions — 计费订阅周期表                            ║
-- ╚════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id"                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"                  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "stripe_subscription_id"   TEXT UNIQUE NOT NULL,
  "status"                   TEXT NOT NULL, -- active, trialing, past_due, canceled, unpaid
  "price_id"                 TEXT NOT NULL,
  "quantity"                 INTEGER NOT NULL DEFAULT 1,
  "cancel_at_period_end"     BOOLEAN NOT NULL DEFAULT FALSE,
  "current_period_start"     TIMESTAMP WITH TIME ZONE NOT NULL,
  "current_period_end"       TIMESTAMP WITH TIME ZONE NOT NULL,
  "created_at"               TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at"               TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscriptions" FORCE ROW LEVEL SECURITY;

-- RLS: 登录用户只读自己的订阅记录
CREATE POLICY "subscriptions_read_own" ON "subscriptions"
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- RLS: 仅管理员拥有全权限
CREATE POLICY "subscriptions_admin_all" ON "subscriptions"
  FOR ALL TO authenticated
  USING ("is_admin"((SELECT auth.uid())));

-- RLS: 服务端 service_role 拥有一切权限，执行 Webhook 回调修改
CREATE POLICY "subscriptions_service_all" ON "subscriptions"
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 索引
CREATE INDEX IF NOT EXISTS "idx_subscriptions_user_id" ON "subscriptions"("user_id");
CREATE INDEX IF NOT EXISTS "idx_subscriptions_stripe_id" ON "subscriptions"("stripe_subscription_id");

-- updated_at 自动更新触发器
CREATE TRIGGER "subscriptions_set_updated_at"
  BEFORE UPDATE ON "subscriptions"
  FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();


-- ╔════════════════════════════════════════════════════════════════╗
-- ║  5. 种子数据：初始支付通道配置                                   ║
-- ╚════════════════════════════════════════════════════════════════╝

INSERT INTO "payment_configs" ("provider", "is_enabled", "public_keys", "extra_meta")
VALUES
  ('stripe', TRUE, '{"publicKey": "pk_test_mock_hehe"}'::jsonb, '{}'::jsonb),
  ('paypal', FALSE, '{"clientId": "mock_paypal_client"}'::jsonb, '{}'::jsonb)
ON CONFLICT ("provider") DO NOTHING;
