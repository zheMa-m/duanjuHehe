-- ============================================================================
-- 0103 修复: orders 表结构补齐 + orders/campaign_registrations 公开 INSERT RLS
--
-- 问题:
--   1. orders 表缺少 paid_at 等列（schema cache 报错）
--   2. campaign_registrations INSERT 被 RLS 拦截（匿名用户无法提交邮箱）
--   3. orders 表缺少公开 INSERT 策略（匿名用户无法创建订单）
--
-- 根因: 生产 DB 表结构与迁移文件不一致（可能通过 Dashboard 手动建表），
--       且 RLS 策略未完整同步。
-- ============================================================================

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  1. orders 表 — 补齐缺失列                                                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_no            TEXT UNIQUE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_id          UUID REFERENCES products(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_name        TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS amount              NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency            TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status              TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_provider    TEXT NOT NULL DEFAULT 'stripe';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_intent_id   TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key     TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS expires_at          TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at             TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paypal_order_id     TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paypal_payer_id     TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS google_pay_token    TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS apple_receipt_data  TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS apple_transaction_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_reason       TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refunded_at         TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS gateway_response    JSONB;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS extra_meta          JSONB;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_at          TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at          TIMESTAMPTZ DEFAULT NOW();

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  2. orders — 添加公开 INSERT 策略                                         ║
-- ║  匿名用户（starpath H5 问卷）需要创建订单                                 ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'orders' AND policyname = 'orders_public_insert'
  ) THEN
    CREATE POLICY orders_public_insert ON orders
      FOR INSERT TO public WITH CHECK (true);
  END IF;
END $$;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  3. campaign_registrations — 确保公开 INSERT 策略存在                     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'campaign_registrations' AND policyname = 'campaign_registrations_insert_public'
  ) THEN
    CREATE POLICY campaign_registrations_insert_public ON campaign_registrations
      FOR INSERT TO public WITH CHECK (true);
  END IF;
END $$;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  4. campaign_orders — 补齐列 + 公开 INSERT                                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

ALTER TABLE campaign_orders ADD COLUMN IF NOT EXISTS campaign_id  UUID REFERENCES campaigns(id) ON DELETE CASCADE;
ALTER TABLE campaign_orders ADD COLUMN IF NOT EXISTS order_id     UUID REFERENCES orders(id) ON DELETE CASCADE;
ALTER TABLE campaign_orders ADD COLUMN IF NOT EXISTS session_id   UUID REFERENCES questionnaire_sessions(id) ON DELETE SET NULL;
ALTER TABLE campaign_orders ADD COLUMN IF NOT EXISTS report_id    UUID REFERENCES ai_reports(id) ON DELETE SET NULL;
ALTER TABLE campaign_orders ADD COLUMN IF NOT EXISTS platform     TEXT;
ALTER TABLE campaign_orders ADD COLUMN IF NOT EXISTS plan         TEXT;
ALTER TABLE campaign_orders ADD COLUMN IF NOT EXISTS created_at   TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'campaign_orders' AND policyname = 'campaign_orders_public_insert'
  ) THEN
    CREATE POLICY campaign_orders_public_insert ON campaign_orders
      FOR INSERT TO public WITH CHECK (true);
  END IF;
END $$;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  5. payment_transactions — 确保表存在 + 公开 INSERT                       ║
-- ║    服务端用 service_role 绕过 RLS，但添加 public INSERT 作为后备           ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS payment_transactions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                UUID,
  payment_provider        TEXT,
  transaction_type        TEXT,
  gateway_transaction_id  TEXT,
  amount                  NUMERIC(10, 2),
  currency                TEXT DEFAULT 'USD',
  status                  TEXT,
  gateway_response        JSONB,
  error_message           TEXT,
  context                 JSONB,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'payment_transactions' AND policyname = 'payment_transactions_public_insert'
  ) THEN
    CREATE POLICY payment_transactions_public_insert ON payment_transactions
      FOR INSERT TO public WITH CHECK (true);
  END IF;
END $$;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  6. questionnaire_sessions — 确保 UPDATE 策略允许匿名用户                 ║
-- ║     completeSession 需要更新 status 字段                                  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'questionnaire_sessions' AND policyname = 'qs_public_update'
  ) THEN
    CREATE POLICY qs_public_update ON questionnaire_sessions
      FOR UPDATE TO public
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  7. 刷新 PostgREST schema cache                                           ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

NOTIFY pgrst, 'reload schema';
