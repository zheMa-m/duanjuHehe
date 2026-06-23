-- ============================================================================
-- 0002 IAP 模块：商品 + 订单 + 支付配置 + 交易日志 + 订阅（可选）
--
-- 前置依赖：0001_core.sql（profiles、is_admin()、set_updated_at()）
--
-- 表清单：
--   1. products             — 商品表（tenant_id 行级隔离）
--   2. orders               — 订单表（多支付渠道，纯净支付 Schema）
--   3. payment_configs      — 支付通道动态配置表
--   4. payment_transactions — 支付网关交易日志（审计用）
--   5. subscriptions        — 计费订阅周期表
--
-- 设计原则：orders 表专注于支付，活动关联通过 0003_campaign.sql 中的
--          campaign_orders 关联表处理，避免活动字段污染通用订单表。
-- ============================================================================

BEGIN;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  1. products — 商品表                                                     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  price         NUMERIC(10, 2) NOT NULL,
  payment_meta  JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  tenant_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE products FORCE ROW LEVEL SECURITY;

CREATE POLICY products_tenant_isolation ON products
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT auth.uid()))
  WITH CHECK (tenant_id = (SELECT auth.uid()));

CREATE POLICY products_admin_all ON products
  FOR ALL TO authenticated USING (is_admin((SELECT auth.uid())));

CREATE INDEX IF NOT EXISTS idx_products_tenant_id  ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  2. orders — 订单表（统一多支付渠道，纯净支付 Schema）                      ║
-- ║                                                                          ║
-- ║  payment_provider: stripe | paypal | google_pay | apple_iap | manual     ║
-- ║  各渠道专属字段在对应 provider 时才填充，其余为 NULL                        ║
-- ║  活动关联字段（campaign_id / session_id / report_id）统一由               ║
-- ║  0003_campaign.sql 中的 campaign_orders 关联表管理                        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no            TEXT UNIQUE,
  product_id          UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name        TEXT,
  amount              NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  currency            TEXT NOT NULL DEFAULT 'USD',
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  user_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  payment_provider    TEXT NOT NULL DEFAULT 'stripe'
                      CHECK (payment_provider IN ('stripe', 'paypal', 'google_pay', 'apple_iap', 'manual')),
  payment_intent_id   TEXT,
  paid_at             TIMESTAMPTZ,
  -- 渠道专属字段（按 provider 按需填充）
  paypal_order_id       TEXT,
  paypal_payer_id       TEXT,
  google_pay_token      TEXT,
  apple_receipt_data    TEXT,
  apple_transaction_id  TEXT,
  refund_reason         TEXT,
  refunded_at           TIMESTAMPTZ,
  gateway_response      JSONB,
  extra_meta            JSONB,
  -- 时间戳
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders FORCE ROW LEVEL SECURITY;

-- RLS: 用户操作自己的订单
CREATE POLICY orders_user_own ON orders
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- RLS: 管理员全权限
CREATE POLICY orders_admin_all ON orders
  FOR ALL TO authenticated
  USING (is_admin((SELECT auth.uid())));

-- RLS: service_role 可更新任意订单（支付回调）
CREATE POLICY orders_service_update ON orders
  FOR UPDATE TO service_role
  USING (true);

-- 索引
CREATE INDEX IF NOT EXISTS idx_orders_user_id            ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status             ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at         ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_payment_intent_id  ON orders(payment_intent_id) WHERE payment_intent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_campaign_id        ON orders(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_session_id         ON orders(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_paid_at            ON orders(paid_at) WHERE paid_at IS NOT NULL;

CREATE TRIGGER orders_set_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  3. payment_configs — 支付通道动态配置表                                   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS payment_configs (
  provider      TEXT PRIMARY KEY CHECK (provider IN ('stripe', 'paypal', 'google_pay', 'apple_iap', 'alipay', 'wechat', 'manual')),
  is_enabled    BOOLEAN NOT NULL DEFAULT FALSE,
  public_keys   JSONB NOT NULL DEFAULT '{}',
  extra_meta    JSONB NOT NULL DEFAULT '{}',
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN payment_configs.public_keys IS
  'JSON: stripe={publishableKey}; paypal={clientId}; google_pay={merchantId,gatewayMerchantId,merchantName}; apple_iap={bundleId}';

COMMENT ON COLUMN payment_configs.extra_meta IS
  'JSON: Provider-specific metadata. e.g. paypal={environment,merchantName}; google_pay={environment,countryCode}';

ALTER TABLE payment_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_configs FORCE ROW LEVEL SECURITY;

CREATE POLICY payment_configs_anonymous_read ON payment_configs
  FOR SELECT TO public USING (true);

CREATE POLICY payment_configs_admin_all ON payment_configs
  FOR ALL TO authenticated
  USING (is_admin((SELECT auth.uid())))
  WITH CHECK (is_admin((SELECT auth.uid())));

CREATE TRIGGER payment_configs_set_updated_at
  BEFORE UPDATE ON payment_configs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  4. payment_transactions — 支付网关交易日志表                             ║
-- ║  记录每一次与支付网关的交互，用于审计和对账                                 ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS payment_transactions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                UUID REFERENCES orders(id) ON DELETE SET NULL,
  payment_provider        TEXT NOT NULL,
  transaction_type        TEXT NOT NULL CHECK (transaction_type IN (
                            'payment', 'refund', 'cancellation', 'verification'
                          )),
  gateway_transaction_id  TEXT,
  amount                  NUMERIC(10, 2),
  currency                TEXT DEFAULT 'USD',
  status                  TEXT NOT NULL CHECK (status IN (
                            'succeeded', 'failed', 'pending', 'refunded'
                          )),
  gateway_response        JSONB,
  error_message           TEXT,
  context                 JSONB,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE payment_transactions IS 'Payment gateway transaction log for audit trail';
COMMENT ON COLUMN payment_transactions.gateway_transaction_id IS 'Transaction ID from the payment gateway';
COMMENT ON COLUMN payment_transactions.gateway_response IS 'Raw gateway response for debugging';
COMMENT ON COLUMN payment_transactions.context IS 'Additional context (user agent, IP, etc.)';

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions FORCE ROW LEVEL SECURITY;

CREATE POLICY admin_all_payment_transactions ON payment_transactions
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY service_role_all_payment_transactions ON payment_transactions
  FOR ALL TO service_role USING (true);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id   ON payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider  ON payment_transactions(payment_provider);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  5. subscriptions — 计费订阅周期表                                        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS subscriptions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id   TEXT UNIQUE NOT NULL,
  status                   TEXT NOT NULL,
  price_id                 TEXT NOT NULL,
  quantity                 INTEGER NOT NULL DEFAULT 1,
  cancel_at_period_end     BOOLEAN NOT NULL DEFAULT FALSE,
  current_period_start     TIMESTAMPTZ NOT NULL,
  current_period_end       TIMESTAMPTZ NOT NULL,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions FORCE ROW LEVEL SECURITY;

CREATE POLICY subscriptions_read_own ON subscriptions
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY subscriptions_admin_all ON subscriptions
  FOR ALL TO authenticated
  USING (is_admin((SELECT auth.uid())));

CREATE POLICY subscriptions_service_all ON subscriptions
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id   ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);

CREATE TRIGGER subscriptions_set_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Seed: 初始支付通道配置（5 种渠道）                                         ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO payment_configs (provider, is_enabled, public_keys, extra_meta)
VALUES
  ('stripe',     TRUE,  '{"publicKey": "pk_test_mock_hehe"}'::jsonb,         '{"environment": "test"}'::jsonb),
  ('paypal',     FALSE, '{"clientId": "mock_paypal_client"}'::jsonb,          '{"environment": "sandbox"}'::jsonb),
  ('google_pay', FALSE, '{"merchantId": "mock_google_pay_merchant"}'::jsonb, '{"environment": "TEST"}'::jsonb),
  ('apple_iap',  FALSE, '{"bundleId": "com.hehe.app"}'::jsonb,                '{"environment": "sandbox"}'::jsonb),
  ('manual',     TRUE,  '{}'::jsonb,                                          '{}'::jsonb)
ON CONFLICT (provider) DO NOTHING;

COMMIT;
