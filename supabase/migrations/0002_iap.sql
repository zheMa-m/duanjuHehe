-- ============================================================================
-- 0002 IAP 模块：商品 + 订单 + 支付配置 + 交易日志 + 订阅
--
-- 前置依赖：0001_core.sql（profiles、is_admin()、set_updated_at()）
--
-- 表清单：
--   1. products             — 商品表（tenant_id 行级隔离，支持软删除+分类）
--   2. orders               — 订单表（多支付渠道，防重提交，过期机制）
--   3. payment_configs      — 支付通道动态配置表
--   4. payment_transactions — 支付网关交易日志（审计用）
--   5. subscriptions        — 计费订阅周期表（多平台通用 gateway_subscription_id）
--
-- 设计原则：orders 表专注于支付，活动关联通过 0003_campaign.sql 中的
--          campaign_orders 关联表处理，避免活动字段污染通用订单表。
-- ============================================================================

BEGIN;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  1. products — 商品表（软删除 + 业务分类）                                  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  price         NUMERIC(10, 2) NOT NULL,
  category      TEXT NOT NULL DEFAULT 'subscription'
                CHECK (category IN ('subscription', 'one_time', 'addon')),
  payment_meta  JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  archived_at   TIMESTAMPTZ,
  tenant_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN products.category IS 'product category: subscription | one_time | addon';
COMMENT ON COLUMN products.archived_at IS 'soft-delete timestamp; if set, product is considered archived';

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
CREATE INDEX IF NOT EXISTS idx_products_category_active ON products(category, is_active);

CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  2. orders — 订单表（统一多支付渠道，防重提交 + 过期机制）                    ║
-- ║                                                                          ║
-- ║  payment_provider: stripe | paypal | google_pay | apple_iap | alipay     ║
-- ║                   | wechat | manual                                      ║
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
                      CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'expired')),
  user_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  payment_provider    TEXT NOT NULL DEFAULT 'stripe'
                      CHECK (payment_provider IN ('stripe', 'paypal', 'google_pay', 'apple_iap', 'alipay', 'wechat', 'manual')),
  payment_intent_id   TEXT,
  idempotency_key     TEXT,
  expires_at          TIMESTAMPTZ,
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

COMMENT ON COLUMN orders.idempotency_key IS 'client-generated idempotency key to prevent duplicate payment creation';
COMMENT ON COLUMN orders.expires_at IS 'pending order expiry timestamp, defaults to created_at + 30 minutes';

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
CREATE INDEX IF NOT EXISTS idx_orders_paid_at            ON orders(paid_at) WHERE paid_at IS NOT NULL;

-- 幂等键部分唯一索引：同一幂等键在窗口内只允许一个 pending 订单
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_pending
  ON orders(idempotency_key, status)
  WHERE status = 'pending' AND idempotency_key IS NOT NULL;

-- 复合索引：revenue / 订单列表查询
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);

-- 复合索引：用户订单列表分页
CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at DESC);

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
  'JSON: stripe={publishableKey}; paypal={clientId}; google_pay={merchantId,gatewayMerchantId,merchantName}; apple_iap={bundleId}; alipay={appId,alipayPublicKey}; wechat={appId,mchId,apiV3Key}';

COMMENT ON COLUMN payment_configs.extra_meta IS
  'JSON: Provider-specific metadata. e.g. paypal={environment,merchantName}; google_pay={environment,countryCode}; alipay={gateway,notifyUrl}; wechat={notifyUrl}';

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
-- ║  5. subscriptions — 计费订阅周期表（多平台通用）                            ║
-- ║                                                                          ║
-- ║  gateway_subscription_id: 各支付平台的订阅ID（替代 stripe_subscription_id） ║
-- ║  subscription_provider:  区分支付平台（stripe/paypal/apple_iap/...）       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS subscriptions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gateway_subscription_id  TEXT UNIQUE NOT NULL,
  subscription_provider    TEXT NOT NULL DEFAULT 'stripe'
                           CHECK (subscription_provider IN ('stripe', 'paypal', 'apple_iap', 'google_pay', 'alipay', 'wechat', 'manual')),
  status                   TEXT NOT NULL,
  price_id                 TEXT NOT NULL,
  quantity                 INTEGER NOT NULL DEFAULT 1,
  cancel_at_period_end     BOOLEAN NOT NULL DEFAULT FALSE,
  current_period_start     TIMESTAMPTZ NOT NULL,
  current_period_end       TIMESTAMPTZ NOT NULL,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN subscriptions.subscription_provider IS 'Subscription gateway provider: stripe | paypal | apple_iap | google_pay | alipay | wechat | manual';

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

-- 索引
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id       ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_gateway_id    ON subscriptions(gateway_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider      ON subscriptions(subscription_provider);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_provider ON subscriptions(user_id, subscription_provider);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status        ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status   ON subscriptions(user_id, status);

CREATE TRIGGER subscriptions_set_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Seed: 初始支付通道配置（7 种渠道）                                         ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

INSERT INTO payment_configs (provider, is_enabled, public_keys, extra_meta)
VALUES
  ('stripe',     TRUE,  '{"publicKey": "pk_test_mock_hehe"}'::jsonb,         '{"environment": "test"}'::jsonb),
  ('paypal',     FALSE, '{"clientId": "mock_paypal_client"}'::jsonb,          '{"environment": "sandbox"}'::jsonb),
  ('google_pay', FALSE, '{"merchantId": "mock_google_pay_merchant"}'::jsonb, '{"environment": "TEST"}'::jsonb),
  ('apple_iap',  FALSE, '{"bundleId": "com.hehe.app"}'::jsonb,                '{"environment": "sandbox"}'::jsonb),
  ('alipay',     FALSE, '{"appId": "mock_alipay_app_id"}'::jsonb,             '{"gateway": "https://openapi.alipaydev.com/gateway.do", "notifyUrl": "https://YOUR_DOMAIN/api/v1/payments/webhook"}'::jsonb),
  ('wechat',     FALSE, '{"appId": "mock_wechat_app_id", "mchId": "mock_wechat_mch_id"}'::jsonb, '{"notifyUrl": "https://YOUR_DOMAIN/api/v1/payments/webhook"}'::jsonb),
  ('manual',     TRUE,  '{}'::jsonb,                                          '{}'::jsonb)
ON CONFLICT (provider) DO NOTHING;

COMMIT;
