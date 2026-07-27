-- ============================================================
-- HeHe App — All Migrations Combined
-- Copy this entire file and paste into Supabase SQL Editor
-- Run once to create all tables, functions, and seed data
-- ============================================================

-- ============================================================
-- Migration: 0001_core.sql
-- ============================================================

-- ============================================================================
-- 0001 核心基础：用户档案 + 任务 + 审计日志 + Storage + 回收站
--
-- 本文件是项目必需的"地基"迁移，所有后续模块均依赖此文件。
--
-- 表清单：
--   1. profiles          — 用户档案（auth.users FK，触发器自动创建）
--   2. tasks             — 业务任务（tenant_id 租户隔离 CRUD 示例）
--   3. activity_logs     — 统一审计日志（append-only）
--   4. storage.buckets   — 对象存储桶（avatars / campaign-assets / uploads）
--   5. storage_trash     — 回收站记录（30 天自动过期）
--
-- 通用函数：
--   set_updated_at()    — updated_at 自动刷新触发器
--   is_admin()          — SECURITY DEFINER 管理员身份检查
--   handle_new_user()   — auth.users 注册自动创建 profile
-- ============================================================================

BEGIN;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Helper Functions                                                        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- 通用 updated_at 自动刷新
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  1. profiles — 用户档案表                                                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS profiles (
  id                 UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email              TEXT,
  username           TEXT CHECK (char_length(username) <= 50),
  role               TEXT NOT NULL DEFAULT 'user'
                     CHECK (role IN ('user', 'admin')),
  plan_status        TEXT NOT NULL DEFAULT 'free'
                     CHECK (plan_status IN ('free', 'pro', 'enterprise')),
  avatar_url         TEXT,
  display_name       TEXT,
  auth_provider      TEXT NOT NULL DEFAULT 'email'
                     CHECK (auth_provider IN ('email', 'google', 'facebook', 'apple', 'anonymous')),
  provider_id        TEXT,
  device_id          TEXT,
  is_anonymous       BOOLEAN NOT NULL DEFAULT FALSE,
  email_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  stripe_customer_id TEXT UNIQUE,
  phone              TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles FORCE ROW LEVEL SECURITY;

-- 管理员身份检查（SECURITY DEFINER 绕过 RLS 递归）
CREATE OR REPLACE FUNCTION is_admin(uid uuid)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = uid AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- username 非空唯一（部分索引允许多 NULL）
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique
  ON profiles(username) WHERE username IS NOT NULL;

-- RLS: 用户读写自己
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = id);

CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = id);

-- RLS: 管理员全权限
CREATE POLICY profiles_admin_all ON profiles
  FOR ALL TO authenticated USING (is_admin((SELECT auth.uid())));

-- 索引
CREATE INDEX IF NOT EXISTS idx_profiles_device_id ON profiles(device_id) WHERE device_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_provider  ON profiles(auth_provider);

-- updated_at 触发器
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  2. tasks — 业务任务表（CRUD 示例）                                       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  completed   BOOLEAN NOT NULL DEFAULT false,
  tenant_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks FORCE ROW LEVEL SECURITY;

-- RLS: 租户隔离
CREATE POLICY tasks_tenant_isolation ON tasks
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT auth.uid()))
  WITH CHECK (tenant_id = (SELECT auth.uid()));

-- RLS: 管理员全权限
CREATE POLICY tasks_admin_all ON tasks
  FOR ALL TO authenticated USING (is_admin((SELECT auth.uid())));

CREATE INDEX IF NOT EXISTS idx_tasks_tenant_id ON tasks(tenant_id);

CREATE TRIGGER tasks_set_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  3. activity_logs — 统一审计日志（append-only）                           ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS activity_logs (
  id          BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  category    TEXT NOT NULL CHECK (category IN ('auth', 'admin', 'system')),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  ip          TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs FORCE ROW LEVEL SECURITY;

-- RLS: 用户查看自己的认证日志
CREATE POLICY activity_logs_user_select_own ON activity_logs
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id AND category = 'auth');

-- RLS: 管理员查看/写入所有日志
CREATE POLICY activity_logs_admin_select ON activity_logs
  FOR SELECT TO authenticated
  USING (is_admin((SELECT auth.uid())));

CREATE POLICY activity_logs_admin_system ON activity_logs
  FOR SELECT TO authenticated
  USING (is_admin((SELECT auth.uid())) AND category = 'system');

-- RLS: 写入
CREATE POLICY activity_logs_auth_insert ON activity_logs
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id AND category = 'auth');

CREATE POLICY activity_logs_server_insert ON activity_logs
  FOR INSERT TO service_role
  WITH CHECK (true);

-- 索引
CREATE INDEX IF NOT EXISTS idx_activity_logs_category   ON activity_logs(category);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id    ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_metadata   ON activity_logs USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_activity_logs_security   ON activity_logs(created_at DESC)
  WHERE category = 'system' AND action LIKE 'api_security_%';


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Auth Trigger: 新用户注册自动创建 profile                                 ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  provider_val TEXT;
  is_oauth     BOOLEAN;
BEGIN
  provider_val := COALESCE(NEW.raw_user_meta_data->>'provider', 'email');
  is_oauth     := provider_val IN ('google', 'facebook', 'apple');

  INSERT INTO public.profiles (
    id, email, username, display_name, auth_provider, is_anonymous, email_verified
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    provider_val,
    COALESCE((NEW.raw_user_meta_data->>'is_anonymous')::boolean, FALSE),
    CASE WHEN is_oauth THEN TRUE ELSE FALSE END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  4. Supabase Storage Buckets + RLS                                       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- 4a. avatars — 用户头像（公开读）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 'avatars', true,
  2097152,
  ARRAY['image/png','image/jpeg','image/gif','image/webp']
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY avatars_user_own ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

CREATE POLICY avatars_admin_all ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'avatars' AND is_admin((SELECT auth.uid())));

CREATE POLICY avatars_public_select ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'avatars');

-- 4b. campaign-assets — 营销素材（公开读，管理员写）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'campaign-assets', 'campaign-assets', true,
  10485760,
  ARRAY['image/png','image/jpeg','image/gif','image/webp','video/mp4']
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY campaign_assets_admin_all ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'campaign-assets'
    AND is_admin((SELECT auth.uid()))
  );

CREATE POLICY campaign_assets_public_select ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'campaign-assets');

-- 4c. uploads — 私有文件（用户路径隔离）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'uploads', 'uploads', false,
  52428800,
  NULL
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY uploads_user_own ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'uploads'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'uploads'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

CREATE POLICY uploads_admin_all ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'uploads' AND is_admin((SELECT auth.uid())));

-- 4d. audit-archives — 审计日志冷归档（私有桶，仅管理员）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audit-archives', 'audit-archives', false,
  52428800,
  ARRAY['application/json']
) ON CONFLICT (id) DO NOTHING;

-- 4e. RESTRICTIVE 加固策略（AND 逻辑，与 permissive 策略取交集）
CREATE POLICY storage_scope_restrict ON storage.objects
  AS RESTRICTIVE
  FOR ALL
  TO public
  USING (bucket_id IN ('avatars', 'campaign-assets', 'uploads', 'audit-archives'))
  WITH CHECK (bucket_id IN ('avatars', 'campaign-assets', 'uploads', 'audit-archives'));

CREATE POLICY campaign_assets_restrict_delete ON storage.objects
  AS RESTRICTIVE
  FOR DELETE
  TO public
  USING (
    bucket_id != 'campaign-assets'
    OR is_admin((SELECT auth.uid()))
  );

CREATE POLICY uploads_restrict_anon ON storage.objects
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (bucket_id != 'uploads')
  WITH CHECK (bucket_id != 'uploads');


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  5. storage_trash — 回收站记录（30 天自动过期）                           ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS storage_trash (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_bucket TEXT NOT NULL,
  original_path   TEXT NOT NULL,
  trash_path      TEXT NOT NULL,
  file_name       TEXT NOT NULL,
  mime_type       TEXT,
  file_size       BIGINT NOT NULL DEFAULT 0,
  deleted_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE storage_trash ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_trash FORCE ROW LEVEL SECURITY;

CREATE POLICY storage_trash_admin_all ON storage_trash
  FOR ALL TO authenticated
  USING (is_admin((SELECT auth.uid())))
  WITH CHECK (is_admin((SELECT auth.uid())));

CREATE INDEX IF NOT EXISTS idx_storage_trash_expires ON storage_trash(expires_at)
  WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_storage_trash_created ON storage_trash(created_at DESC);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Seed: 内置管理员 profiles 记录                                           ║
-- ║  固定 UUID: 9e638ba2-41aa-4434-a68b-6bd9f7ed0963                        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- First create the auth user so the FK constraint on profiles is satisfied
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, confirmation_sent_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role)
SELECT
  '9e638ba2-41aa-4434-a68b-6bd9f7ed0963',
  '00000000-0000-0000-0000-000000000000',
  'admin@hehe.app',
  crypt('HeHeAdmin2024', gen_salt('bf')),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now(),
  'authenticated',
  'authenticated'
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE id = '9e638ba2-41aa-4434-a68b-6bd9f7ed0963');
INSERT INTO public.profiles (id, username, display_name, role, plan_status, auth_provider, is_anonymous, email_verified)
VALUES (
  '9e638ba2-41aa-4434-a68b-6bd9f7ed0963'::uuid,
  'admin',
  'Administrator',
  'admin',
  'pro',
  'email',
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  plan_status = 'pro',
  updated_at = NOW();

COMMIT;

-- ============================================================
-- Migration: 0002_iap.sql
-- ============================================================

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

-- ============================================================
-- Migration: 0003_campaign.sql
-- ============================================================

-- ============================================================================
-- 0003 营销活动模块：活动配置 + 留资 + 智能问卷 + 订单关联
--
-- 前置依赖：0001_core.sql（profiles、is_admin()、set_updated_at()）
--           0002_iap.sql（orders 表，用于 campaign_orders 外键引用）
--
-- 设计原则：
--   campaigns 是通用活动容器，不通过 campaign_type 枚举限制活动类型。
--   不同活动类型通过 config JSONB + 独立关联表扩展。
--   智能问卷是首个内置模块：questionnaire_sessions / questionnaire_answers / ai_reports。
--   活动与订单通过 campaign_orders 关联表连接，不污染通用 orders 表。
--
-- 表清单：
--   1. campaigns              — 营销活动配置（通用容器）
--   2. campaign_registrations — 留资/预约注册
--   3. questionnaire_sessions — 问卷会话主表
--   4. questionnaire_answers  — 答案事件流（append-only）
--   5. ai_reports             — 通用 AI 报告表
--   6. campaign_orders        — 活动-订单关联表（session_id / report_id / platform / plan）
--
-- 种子数据：h5-v2 新野兽派活动 + StarPath AI 占星活动（含完整智能问卷模板）
-- ============================================================================

BEGIN;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  1. campaigns — 营销活动配置表（通用容器）                                ║
-- ║  不再使用 campaign_type 枚举；活动类型由 config + 关联表决定               ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subdomain       TEXT UNIQUE NOT NULL,
  title           TEXT NOT NULL,
  subtitle        TEXT NOT NULL,
  badge           TEXT NOT NULL,
  color_from      TEXT NOT NULL DEFAULT 'from-purple-600',
  color_to        TEXT NOT NULL DEFAULT 'to-indigo-600',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  cta_text        TEXT NOT NULL DEFAULT '立即预约',
  cta_url         TEXT,
  cover_image     TEXT,
  description     TEXT,
  features        JSONB NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(features) = 'array'),
  config          JSONB NOT NULL DEFAULT '{}'::jsonb,
  ga_measurement_id  TEXT,
  meta_pixel_id      TEXT,
  tiktok_pixel_id    TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns FORCE ROW LEVEL SECURITY;

-- RLS: 公开读取仅限活跃活动
CREATE POLICY campaigns_read_public ON campaigns
  FOR SELECT TO public USING (is_active = true);

-- RLS: 管理员全权限
CREATE POLICY campaigns_admin_all ON campaigns
  FOR ALL TO authenticated USING (is_admin((SELECT auth.uid())));

CREATE INDEX IF NOT EXISTS idx_campaigns_active_sort ON campaigns(is_active, sort_order)
  WHERE is_active = true;

CREATE TRIGGER campaigns_set_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  2. campaign_registrations — 留资/邮箱收集表                              ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS campaign_registrations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  subdomain     TEXT NOT NULL,
  phone         TEXT NOT NULL,
  email         TEXT NOT NULL,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  agreed_terms  BOOLEAN NOT NULL DEFAULT FALSE,
  source        TEXT NOT NULL DEFAULT 'h5-form',
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
  unsubscribed  BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE campaign_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_registrations FORCE ROW LEVEL SECURITY;

-- RLS: 允许所有人匿名提交
CREATE POLICY campaign_registrations_insert_public ON campaign_registrations
  FOR INSERT TO public WITH CHECK (true);

-- RLS: 管理员全权限
CREATE POLICY campaign_registrations_admin_all ON campaign_registrations
  FOR ALL TO authenticated USING (is_admin((SELECT auth.uid())));

CREATE INDEX IF NOT EXISTS idx_campaign_registrations_subdomain ON campaign_registrations(subdomain);
CREATE INDEX IF NOT EXISTS idx_campaign_registrations_created ON campaign_registrations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cr_source ON campaign_registrations(source);
CREATE INDEX IF NOT EXISTS idx_cr_sent_at ON campaign_registrations(sent_at) WHERE sent_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cr_campaign_source ON campaign_registrations(campaign_id, source);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  3. questionnaire_sessions — 问卷会话主表                                  ║
-- ║  一个用户的一次问卷填写 = 一个 Session                                    ║
-- ║  session_key: 前端生成的匿名标识，用于 session 恢复                        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS questionnaire_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_key   TEXT NOT NULL,
  gender        TEXT,                                 -- male | female
  birth_date    TEXT,
  birth_time    TEXT,
  birth_city    TEXT,
  full_name     TEXT,
  current_step  INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'started'
                CHECK (status IN ('started', 'in_progress', 'completed', 'abandoned')),
  started_at    TIMESTAMPTZ DEFAULT NOW(),
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE questionnaire_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaire_sessions FORCE ROW LEVEL SECURITY;

-- RLS: 用户查看自己的 session
CREATE POLICY qs_user_select ON questionnaire_sessions
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- RLS: 任何人可 INSERT（匿名用户）
CREATE POLICY qs_public_insert ON questionnaire_sessions
  FOR INSERT WITH CHECK (true);

-- RLS: 用户更新自己的 session
CREATE POLICY qs_user_update ON questionnaire_sessions
  FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- RLS: 管理员全权限
CREATE POLICY qs_admin_all ON questionnaire_sessions
  FOR ALL USING (is_admin(auth.uid()));

-- 索引
CREATE INDEX IF NOT EXISTS idx_qs_campaign_id     ON questionnaire_sessions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_qs_session_key     ON questionnaire_sessions(session_key);
CREATE INDEX IF NOT EXISTS idx_qs_user_id         ON questionnaire_sessions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qs_status          ON questionnaire_sessions(campaign_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_qs_campaign_session
  ON questionnaire_sessions(campaign_id, session_key);

CREATE TRIGGER qs_set_updated_at
  BEFORE UPDATE ON questionnaire_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  4. questionnaire_answers — 答案事件流（append-only）                      ║
-- ║  每条记录 = 一次提交事件，不可变。同一 session+step+question_key 可多次      ║
-- ║  写入，以 answered_at 最新一条为准。                                       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS questionnaire_answers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES questionnaire_sessions(id) ON DELETE CASCADE,
  step          INTEGER NOT NULL,
  question_key  TEXT NOT NULL,
  answer_value  JSONB NOT NULL DEFAULT 'null'::jsonb,
  answered_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE questionnaire_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaire_answers FORCE ROW LEVEL SECURITY;

-- RLS: 任何人可 INSERT
CREATE POLICY qa_public_insert ON questionnaire_answers
  FOR INSERT WITH CHECK (true);

-- RLS: 通过关联 session 鉴权 SELECT
CREATE POLICY qa_user_select ON questionnaire_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM questionnaire_sessions s
      WHERE s.id = questionnaire_answers.session_id
        AND (s.user_id = auth.uid() OR s.user_id IS NULL)
    )
  );

-- RLS: 管理员全权限
CREATE POLICY qa_admin_all ON questionnaire_answers
  FOR ALL USING (is_admin(auth.uid()));

-- 索引
CREATE INDEX IF NOT EXISTS idx_qa_session_id   ON questionnaire_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_qa_session_step ON questionnaire_answers(session_id, step);
CREATE INDEX IF NOT EXISTS idx_qa_question_key ON questionnaire_answers(session_id, question_key);
CREATE INDEX IF NOT EXISTS idx_qa_answered_at  ON questionnaire_answers(answered_at DESC);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  5. ai_reports — 通用 AI 报告表                                           ║
-- ║  设计为平台通用 AI 内容产出表，report_type 区分用途                         ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS ai_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID REFERENCES questionnaire_sessions(id) ON DELETE SET NULL,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  campaign_id   UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  report_type   TEXT NOT NULL DEFAULT 'astrology'
                CHECK (report_type IN ('astrology', 'summary', 'custom')),
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  content       JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  generated_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_reports FORCE ROW LEVEL SECURITY;

CREATE POLICY ar_user_select ON ai_reports
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY ar_admin_all ON ai_reports
  FOR ALL USING (is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_ar_user_id     ON ai_reports(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ar_campaign_id ON ai_reports(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ar_session_id  ON ai_reports(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ar_status      ON ai_reports(status);

CREATE TRIGGER ar_set_updated_at
  BEFORE UPDATE ON ai_reports
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  6. campaign_orders — 活动-订单关联表                                      ║
-- ║  将活动特有字段从 orders 表剥离，保持 orders 纯净                           ║
-- ║  session_id / report_id 通过 questionnaire_sessions / ai_reports 外键追踪   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS campaign_orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  session_id    UUID REFERENCES questionnaire_sessions(id) ON DELETE SET NULL,
  report_id     UUID REFERENCES ai_reports(id) ON DELETE SET NULL,
  platform      TEXT,                              -- ios | android | web
  plan          TEXT,                              -- trial-7d | monthly | yearly
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, order_id)
);

ALTER TABLE campaign_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_orders FORCE ROW LEVEL SECURITY;

-- RLS: 管理员全权限
CREATE POLICY co_admin_all ON campaign_orders
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_co_campaign_id ON campaign_orders(campaign_id);
CREATE INDEX IF NOT EXISTS idx_co_order_id    ON campaign_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_co_session_id  ON campaign_orders(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_co_report_id   ON campaign_orders(report_id) WHERE report_id IS NOT NULL;


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Seed Data                                                                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- 种子 1: h5-v2 新野兽派活动
INSERT INTO campaigns (
  subdomain, title, subtitle, badge,
  color_from, color_to, is_active, cta_text, sort_order
) VALUES (
  'h5-v2',
  '?? HEHE 营销 H5 v2 新野兽派',
  '采用大胆的新野兽派视觉版式，引入 3D 浮动卡片、扫光粒子与极客跑马灯。',
  '全新 V2 体验',
  'from-green-400', 'to-emerald-600', TRUE,
  '立即体验',
  10
) ON CONFLICT (subdomain) DO NOTHING;

-- 种子 2: StarPath AI 占星活动（内置智能问卷模块）
-- questionnaire.flow 定义完整问卷流程，共 31 步
INSERT INTO campaigns (
  subdomain, title, subtitle, badge,
  color_from, color_to, is_active, cta_text,
  config, sort_order
) VALUES (
  'starpath',
  'StarPath — AI 占星报告',
  '个性化 AI 占星分析：认识你的星辰蓝图',
  'AI 星盘解读',
  'from-purple-600', 'to-indigo-600', TRUE,
  '开始测算',
  '{
    "pricing": {
      "trial_7d": 7.99,
      "monthly": 29.99,
      "currency": "USD"
    },
    "features": [
      "AI 出生星盘分析",
      "性格特征解码",
      "感情兼容性洞察",
      "关键机遇窗口"
    ],
    "questionnaire": {
      "version": "1.0.0",
      "flow": [
        {"step": 0,  "route": "/starpath/question-page-zero",   "type": "gender",        "key": "gender"},
        {"step": 1,  "route": "/starpath/question-page-one",    "type": "familiarity",   "key": "familiarity"},
        {"step": 2,  "route": "/starpath/question-page-two",    "type": "display",                              "desc": "intro-features"},
        {"step": 3,  "route": "/starpath/question-page-three",  "type": "multiselect",  "key": "focus"},
        {"step": 4,  "route": "/starpath/question-page-four",   "type": "display",                              "desc": "goal-confirm"},
        {"step": 5,  "route": "/starpath/question-page-five",   "type": "single",       "key": "relationship"},
        {"step": 6,  "route": "/starpath/question-page-six",    "type": "datepicker",   "key": "birthDate"},
        {"step": 7,  "route": "/starpath/question-page-seven",  "type": "timepicker",   "key": "birthTime"},
        {"step": 8,  "route": "/starpath/question-page-eight",  "type": "text",         "key": "birthCity"},
        {"step": 9,  "route": "/starpath/question-page-nine",   "type": "text",         "key": "fullName"},
        {"step": 10, "route": "/starpath/question-page-ten",    "type": "display",                              "desc": "alignment-complete"},
        {"step": 11, "route": "/starpath/问卷页面-问题1",         "type": "question",    "key": "q1"},
        {"step": 12, "route": "/starpath/问卷页面-问题2",         "type": "question",    "key": "q2"},
        {"step": 13, "route": "/starpath/问卷页面-问题3",         "type": "question",    "key": "q3"},
        {"step": 14, "route": "/starpath/问卷页面-问题4",         "type": "question",    "key": "q4"},
        {"step": 15, "route": "/starpath/问卷页面-问题5",         "type": "question",    "key": "q5"},
        {"step": 16, "route": "/starpath/问卷页面-问题6",         "type": "question",    "key": "q6"},
        {"step": 17, "route": "/starpath/问卷页面-问题7",         "type": "question",    "key": "q7"},
        {"step": 18, "route": "/starpath/问卷页面-问题8",         "type": "question",    "key": "q8"},
        {"step": 19, "route": "/starpath/问卷页面-问题9",         "type": "question",    "key": "q9"},
        {"step": 20, "route": "/starpath/问卷页面-问题10",        "type": "question",    "key": "q10"},
        {"step": 21, "route": "/starpath/问卷页面-问题11",        "type": "question",    "key": "q11"},
        {"step": 22, "route": "/starpath/问卷页面-问题12",        "type": "question",    "key": "q12"},
        {"step": 23, "route": "/starpath/问卷页面-问题13",        "type": "question",    "key": "q13"},
        {"step": 24, "route": "/starpath/问卷页面-问题14",        "type": "question",    "key": "q14"},
        {"step": 25, "route": "/starpath/问卷页面-问题15",        "type": "question",    "key": "q15"},
        {"step": 26, "route": "/starpath/问卷页面-问题16",        "type": "question",    "key": "q16"},
        {"step": 27, "route": "/starpath/问卷页面-问题17",        "type": "question",    "key": "q17"},
        {"step": 28, "route": "/starpath/问卷页面-问题18",        "type": "question",    "key": "q18"},
        {"step": 29, "route": "/starpath/question-page-twelve", "type": "display",                              "desc": "calculating"},
        {"step": 30, "route": "/starpath/问卷页面-填写邮箱",       "type": "email"},
        {"step": 31, "route": "/starpath/订阅-ios",               "type": "subscribe",    "platform": "ios"},
        {"step": 32, "route": "/starpath/订阅成功-ios",            "type": "display",                              "desc": "success"}
      ],
      "questions": [
        {"key": "gender",       "text": "I''am",                                     "textZh": "我是",    "options": [{"label": "Male",   "labelZh": "男性", "value": "male"},   {"label": "Female", "labelZh": "女性", "value": "female"}],            "ui": "image-card"},
        {"key": "familiarity",  "text": "How familiar are you with astrology?",      "textZh": "你对占星有多了解？", "options": [{"value": "Absolute Beginner (I only know my Sun sign)"}, {"value": "Intermediate (I know my Big 3 and basic concepts)"}, {"value": "Advanced (I understand aspects, houses, and transits)"}], "ui": "option-card"},
        {"key": "focus",        "text": "What is your main focus for today''s reading?", "textZh": "你今天最关注哪个方面？", "options": [{"value": "Decode my romantic destiny"},          {"value": "Unlock my wealth & success potential"}, {"value": "Manifest my dreams into reality"}, {"value": "Find inner peace & spiritual healing"}, {"value": "Navigate challenges & obstacles ahead"}, {"value": "All of the above"}], "multiSelect": true, "ui": "icon-card"},
        {"key": "relationship", "text": "What is your current relationship status?",  "textZh": "你目前的感情状况？", "options": [{"label": "Single",               "value": "single"}, {"label": "In a relationship",   "value": "in-relationship"}, {"label": "Married",               "value": "married"}, {"label": "In a complicated situation", "value": "complicated"}], "ui": "image-card-2x2"},
        {"key": "birthDate",    "text": "What is your exact date of birth?",          "textZh": "你的出生日期是？",    "subtitle": "Calculate the positions of the Sun, Moon, and other planets", "ui": "wheel-date"},
        {"key": "birthTime",    "text": "Do you know your exact birth time?",         "textZh": "你知道具体出生时间吗？", "subtitle": "Determine your rising sign and house placement.", "ui": "wheel-time"},
        {"key": "birthCity",    "text": "What is your city of birth?",                "textZh": "你的出生城市是？",    "subtitle": "Determine latitude and longitude, calculate precise star chart", "ui": "search-input"},
        {"key": "fullName",     "text": "What is your full name?",                    "textZh": "你的全名是？",        "subtitle": "Used to establish personal connections", "ui": "text-input"}
      ],
      "deepQuestions": [
        {"key": "q1",  "index": 1,  "text": "How satisfied are you with the direction your life is taking?",   "options": ["Thriving", "Just getting by", "Completely lost"]},
        {"key": "q2",  "index": 2,  "text": "Do you feel like you are living your true purpose, or just fulfilling expectations?", "options": ["Living my purpose", "Following expectations", "I don''t know what my purpose is"]},
        {"key": "q3",  "index": 3,  "text": "Do you believe in spirituality or a higher cosmic order?",        "options": ["Yes", "No", "I''m a \"spiritual but not religious\" person"]},
        {"key": "q4",  "index": 4,  "text": "How often do your worries affect your major life decisions?",     "options": ["All the time", "Often", "Sometimes", "Rarely"]},
        {"key": "q5",  "index": 5,  "text": "Do you make decisions with your head (logic) or your heart (intuition)?", "options": ["Head", "Heart", "A mix of both"]},
        {"key": "q6",  "index": 6,  "text": "Are you satisfied with your current love life?",                  "options": ["Yes", "No", "It''s complicated"]},
        {"key": "q7",  "index": 7,  "text": "Do you find yourself repeating the same patterns in relationships?", "options": ["Always", "Sometimes", "I''ve broken the cycle"]},
        {"key": "q8",  "index": 8,  "text": "Which \"Love Shadow\" resonates with you most?",                   "options": ["Fear of abandonment", "Fear of losing independence", "Fear of not being \"enough\""]},
        {"key": "q9",  "index": 9,  "text": "Is there someone from your past you still can''t fully let go of?", "options": ["Yes, I need closure", "I''ve moved on", "I''m not sure"]},
        {"key": "q10", "index": 10, "text": "In a partner, are you looking for a \"Soulmate\" or a \"Twin Flame\"?", "options": ["Soulmate (Stable & Healing)", "Twin Flame (Intense & Transformative)"]},
        {"key": "q11", "index": 11, "text": "How would you describe your current financial flow?",              "options": ["Abundant", "Stagnant", "Constant struggle"]},
        {"key": "q12", "index": 12, "text": "Do you feel your current job utilizes your innate cosmic talents?", "options": ["Fully", "Barely", "I have hidden talents I haven''t used yet"]},
        {"key": "q13", "index": 13, "text": "When making major life decisions, how confident do you feel?",     "options": ["Very confident", "Somewhat confident", "Not confident at all"]},
        {"key": "q14", "index": 14, "text": "What is your biggest obstacle to success right now?",              "options": ["Lack of clarity", "Fear of failure", "External circumstances"]},
        {"key": "q15", "index": 15, "text": "Do you believe you are \"destined\" for greatness, but something is blocking it?", "options": ["Yes, I feel it deeply", "I used to, but I''ve lost hope", "I''m skeptical"]},
        {"key": "q16", "index": 16, "text": "How do you handle uncertainty about the future?",                  "options": ["I embrace it", "I feel anxious", "I seek guidance"]},
        {"key": "q17", "index": 17, "text": "Are you aware of how the current Mercury Retrograde or Saturn Return is affecting you?", "options": ["Yes", "No", "I''ve heard of it but need details"]},
        {"key": "q18", "index": 18, "text": "If you could know the exact date of your next big opportunity, would you want to?", "options": ["Yes, I need to be prepared", "No, I''ll take it as it comes"]}
      ],
      "displayPages": {
        "intro-features": {
          "title": "That''s great! Our App is the perfect place to explore your cosmic potential",
          "subtitle": "An astrology reading dives into your unique natal placements to provide guidance on various life aspects",
          "features": ["Love & relationships", "Future forecasting", "Career and wealth", "Soul mission and growth"]
        },
        "goal-confirm": {
          "title": "Great! You just set your main goal:",
          "message": "We will do our best to help you!"
        },
        "alignment-complete": {
          "title": "Cosmic Alignment Complete!",
          "subtitle": "Your foundational profile is locked in",
          "message": "Interesting choice, [{name}]... Your Sun Sign craves success, yet your chart hints your current path strays from your soul''s blueprint.",
          "message2": "We''ll ask a few quick questions to find your hidden blocks and unlock your true potential."
        },
        "calculating": {
          "title": "[{name}], your stars are aligning",
          "subtitle": "We are calculating your exclusive cosmic blueprint..",
          "steps": [
            {"title": "Calculating Natal Placements",     "desc": "Analyzing your Sun, Moon, and Rising signs"},
            {"title": "Decoding Behavioral Patterns",     "desc": "Syncing your personality traits and decision style"},
            {"title": "Analyzing Relationship & Career Houses", "desc": "Scanning your 7th House of Love and 10th House of Success"},
            {"title": "Finalizing Your Monthly Forecast", "desc": "Pinpointing your critical windows of opportunity this month"}
          ]
        }
      }
    }
  }'::jsonb,
  50
) ON CONFLICT (subdomain) DO UPDATE SET
  config = EXCLUDED.config;

COMMIT;

-- ============================================================
-- Migration: 0004_feedback.sql
-- ============================================================

-- ============================================================================
-- 0004 用户反馈与评价系统（可选）
--
-- 前置依赖：0001_core.sql（profiles、is_admin()、set_updated_at()）
--
-- 表清单：
--   1. feedbacks — 用户反馈/评价表（星级评分 + 管理员审批/回复）
-- ============================================================================

CREATE TABLE IF NOT EXISTS feedbacks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  campaign_subdomain  TEXT,
  type                TEXT NOT NULL DEFAULT 'review'
                      CHECK (type IN ('review', 'bug', 'feature', 'general')),
  rating              INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment             TEXT,
  display_name        TEXT,
  is_approved         BOOLEAN NOT NULL DEFAULT FALSE,
  admin_reply         TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedbacks FORCE ROW LEVEL SECURITY;

-- RLS: 公开读取已审批评价
CREATE POLICY feedbacks_public_select ON feedbacks
  FOR SELECT TO public USING (is_approved = true);

-- RLS: 认证用户提交评价（只能写自己的 user_id）
CREATE POLICY feedbacks_auth_insert ON feedbacks
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- RLS: 管理员全权限（审批、回复、删除）
CREATE POLICY feedbacks_admin_all ON feedbacks
  FOR ALL TO authenticated
  USING (is_admin((SELECT auth.uid())));

-- 索引
CREATE INDEX IF NOT EXISTS idx_feedbacks_campaign   ON feedbacks(campaign_subdomain);
CREATE INDEX IF NOT EXISTS idx_feedbacks_type       ON feedbacks(type);
CREATE INDEX IF NOT EXISTS idx_feedbacks_rating     ON feedbacks(rating);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON feedbacks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedbacks_user_id    ON feedbacks(user_id);

CREATE TRIGGER feedbacks_set_updated_at
  BEFORE UPDATE ON feedbacks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- Migration: 0005_system.sql
-- ============================================================

-- ============================================================================
-- 0005 系统收敛：通用配置 + API 安全策略 + 管理员 2FA
--
-- 前置依赖：0001_core.sql（profiles、is_admin()、set_updated_at()、activity_logs）
--
-- 表清单：
--   1. system_configs        — 系统 KV 配置表
--   2. api_security_settings — 全局安全策略（单行表）
--   3. api_keys             — API Key 管理（SHA-256 + HMAC）
--   4. admin_2fa            — 管理员双因素认证（TOTP）
-- ============================================================================

BEGIN;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  1. system_configs — 系统 KV 配置表                                       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS system_configs (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE system_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_configs FORCE ROW LEVEL SECURITY;

CREATE POLICY system_configs_admin_all ON system_configs
  FOR ALL TO authenticated
  USING (is_admin((SELECT auth.uid())))
  WITH CHECK (is_admin((SELECT auth.uid())));

CREATE TRIGGER system_configs_set_updated_at
  BEFORE UPDATE ON system_configs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  2. api_security_settings — 全局安全策略（单行表）                         ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS api_security_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),

  -- 速率限制
  rate_limit JSONB NOT NULL DEFAULT '{
    "enabled": false,
    "window_seconds": 60,
    "max_requests": 100,
    "by_api_key": true,
    "by_ip": true
  }',

  -- IP 访问控制：disabled | whitelist | blacklist
  ip_policy JSONB NOT NULL DEFAULT '{
    "mode": "disabled",
    "whitelist": [],
    "blacklist": []
  }',

  -- 国家限制
  country_policy JSONB NOT NULL DEFAULT '{
    "enabled": false,
    "mode": "blacklist",
    "countries": []
  }',

  signature_required  BOOLEAN NOT NULL DEFAULT FALSE,
  endpoint_overrides  JSONB NOT NULL DEFAULT '{}',
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_by          UUID REFERENCES auth.users(id)
);

ALTER TABLE api_security_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_security_settings FORCE ROW LEVEL SECURITY;

CREATE POLICY api_security_settings_admin_all ON api_security_settings
  FOR ALL TO authenticated USING (is_admin((SELECT auth.uid())));

-- 预置默认行
INSERT INTO api_security_settings (id) VALUES (TRUE) ON CONFLICT (id) DO NOTHING;


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  3. api_keys — API Key 管理表                                             ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS api_keys (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL CHECK (char_length(name) <= 100),
  key_prefix          TEXT NOT NULL,
  key_hash            TEXT NOT NULL UNIQUE,
  signing_secret      TEXT NOT NULL,
  require_signature   BOOLEAN NOT NULL DEFAULT FALSE,
  permissions         JSONB NOT NULL DEFAULT '["read"]',
  allowed_endpoints   TEXT[] DEFAULT NULL,
  rate_limit_override INTEGER DEFAULT NULL,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  last_used_at        TIMESTAMPTZ DEFAULT NULL,
  expires_at          TIMESTAMPTZ DEFAULT NULL,
  created_by          UUID REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys FORCE ROW LEVEL SECURITY;

CREATE POLICY api_keys_admin_all ON api_keys
  FOR ALL TO authenticated USING (is_admin((SELECT auth.uid())));

CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active)
  WHERE is_active = TRUE;

CREATE TRIGGER api_keys_set_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  4. admin_2fa — 管理员双因素认证（TOTP）                                  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS admin_2fa (
  user_id       UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  secret        TEXT NOT NULL,
  is_enabled    BOOLEAN NOT NULL DEFAULT false,
  verified_at   TIMESTAMPTZ,
  backup_codes  TEXT[] DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN admin_2fa.secret IS 'TOTP 密钥（仅服务端访问，不返回前端）';
COMMENT ON COLUMN admin_2fa.backup_codes IS '备用恢复码（仅生成时展示一次，hash 存储）';

ALTER TABLE admin_2fa ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_2fa FORCE ROW LEVEL SECURITY;

CREATE POLICY admin_2fa_select_own ON admin_2fa
  FOR SELECT USING (user_id = auth.uid() AND is_admin(auth.uid()));

CREATE POLICY admin_2fa_insert_own ON admin_2fa
  FOR INSERT WITH CHECK (user_id = auth.uid() AND is_admin(auth.uid()));

CREATE POLICY admin_2fa_update_own ON admin_2fa
  FOR UPDATE USING (user_id = auth.uid() AND is_admin(auth.uid()));


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Seed                                                                     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- 多平台埋点默认配置
INSERT INTO system_configs (key, value)
VALUES (
  'analytics_settings',
  '{
    "is_enabled": false,
    "enable_client": true,
    "enable_h5": true,
    "enable_admin": false,
    "ga_measurement_id": "",
    "meta_pixel_id": "",
    "tiktok_pixel_id": ""
  }'::jsonb
) ON CONFLICT (key) DO NOTHING;

COMMIT;

-- ============================================================
-- Migration: 0099_cron_jobs.sql
-- ============================================================

-- ============================================================================
-- 0099 定时任务：审计日志归档 + 回收站自动清理
--
-- 前置依赖：0001_core.sql（storage_trash）
--
-- 核心职责：
--   1. 启用 pg_cron + pg_net 扩展（如果可用）
--   2. 注册每日凌晨 2:00 审计日志归档任务
--   3. 注册每日凌晨 3:00 回收站过期文件清理任务
-- ============================================================================

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  1. 启用扩展                                                              ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

DO $$
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipping pg_cron (insufficient privilege or unsupported)';
  END;

  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_net;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipping pg_net (insufficient privilege or unsupported)';
  END;
END $$;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  2. 审计日志归档定时任务（每日 2:00 UTC）                                   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN

    BEGIN
      PERFORM cron.unschedule('cron_archive_audit_logs');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    PERFORM cron.schedule(
      'cron_archive_audit_logs',
      '0 2 * * *',
      $job$
      SELECT net.http_post(
        url:='http://localhost:3000/api/admin/audit-logs/archive',
        headers:=jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', 'hehe_archive_cron_secret_placeholder'
        ),
        body:='{}'::jsonb
      );
      $job$
    );

    RAISE NOTICE 'Scheduled cron_archive_audit_logs at 2:00 UTC daily';
  ELSE
    RAISE NOTICE 'pg_cron or pg_net not available, skipping audit archive cron';
  END IF;
END $$;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  3. 回收站自动清理定时任务（每日 3:00 UTC）                                 ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN

    BEGIN
      PERFORM cron.unschedule('cron_trash_cleanup');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    PERFORM cron.schedule(
      'cron_trash_cleanup',
      '0 3 * * *',
      $job$
      SELECT net.http_post(
        url:='http://localhost:3000/api/admin/storage/trash/cleanup',
        headers:=jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', 'hehe_archive_cron_secret_placeholder'
        ),
        body:='{}'::jsonb
      );
      $job$
    );

    RAISE NOTICE 'Scheduled cron_trash_cleanup at 3:00 UTC daily';
  ELSE
    RAISE NOTICE 'pg_cron or pg_net not available, skipping trash cleanup cron';
  END IF;
END $$;

-- ============================================================
-- Migration: 0100_fix_agreed_terms.sql
-- ============================================================

-- ============================================================================
-- 0100 修复: campaign_registrations 表结构缺失列
--
-- 问题: 生产环境 schema cache 中找不到 agreed_terms / metadata 等列，
--       导致 POST /api/starpath/email/submit 返回 500。
-- 根因: 0003_campaign.sql 中已定义完整表结构，但生产 DB 可能通过其他方式
--       建表（如 Supabase Dashboard 手动创建），缺失多个列。
--
-- 修复策略:
--   1. ALTER TABLE ADD COLUMN IF NOT EXISTS 逐列补齐
--   2. NOTIFY pgrst 刷新 PostgREST schema cache
-- ============================================================================

-- 1. 补齐所有缺失列（幂等操作，已存在的列会被跳过）
ALTER TABLE campaign_registrations ADD COLUMN IF NOT EXISTS agreed_terms  BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE campaign_registrations ADD COLUMN IF NOT EXISTS metadata      JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE campaign_registrations ADD COLUMN IF NOT EXISTS source        TEXT NOT NULL DEFAULT 'h5-form';
ALTER TABLE campaign_registrations ADD COLUMN IF NOT EXISTS unsubscribed  BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE campaign_registrations ADD COLUMN IF NOT EXISTS sent_at       TIMESTAMPTZ;
ALTER TABLE campaign_registrations ADD COLUMN IF NOT EXISTS user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE campaign_registrations ADD COLUMN IF NOT EXISTS campaign_id   UUID REFERENCES campaigns(id) ON DELETE CASCADE;
ALTER TABLE campaign_registrations ADD COLUMN IF NOT EXISTS subdomain     TEXT NOT NULL DEFAULT '';
ALTER TABLE campaign_registrations ADD COLUMN IF NOT EXISTS phone         TEXT NOT NULL DEFAULT '';
ALTER TABLE campaign_registrations ADD COLUMN IF NOT EXISTS email         TEXT NOT NULL DEFAULT '';
ALTER TABLE campaign_registrations ADD COLUMN IF NOT EXISTS created_at    TIMESTAMPTZ DEFAULT NOW();

-- 2. 确保 RLS 已启用
ALTER TABLE campaign_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_registrations FORCE ROW LEVEL SECURITY;

-- 3. 刷新 PostgREST schema cache（消除 "column not found in schema cache" 错误）
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- Migration: 0101_fix_campaign_registrations_full.sql
-- ============================================================

-- ============================================================================
-- 0100 修复: campaign_registrations 表结构缺失列
--
-- 问题: 生产环境 schema cache 中找不到 agreed_terms / metadata 等列，
--       导致 POST /api/starpath/email/submit 返回 500。
-- 根因: 0003_campaign.sql 中已定义完整表结构，但生产 DB 可能通过其他方式
--       建表（如 Supabase Dashboard 手动创建），缺失多个列。
--
-- 修复策略:
--   1. ALTER TABLE ADD COLUMN IF NOT EXISTS 逐列补齐
--   2. NOTIFY pgrst 刷新 PostgREST schema cache
-- ============================================================================

-- 1. 补齐所有缺失列（幂等操作，已存在的列会被跳过）
ALTER TABLE campaign_registrations ADD COLUMN IF NOT EXISTS agreed_terms  BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE campaign_registrations ADD COLUMN IF NOT EXISTS metadata      JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE campaign_registrations ADD COLUMN IF NOT EXISTS source        TEXT NOT NULL DEFAULT 'h5-form';
ALTER TABLE campaign_registrations ADD COLUMN IF NOT EXISTS unsubscribed  BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE campaign_registrations ADD COLUMN IF NOT EXISTS sent_at       TIMESTAMPTZ;
ALTER TABLE campaign_registrations ADD COLUMN IF NOT EXISTS user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE campaign_registrations ADD COLUMN IF NOT EXISTS campaign_id   UUID REFERENCES campaigns(id) ON DELETE CASCADE;
ALTER TABLE campaign_registrations ADD COLUMN IF NOT EXISTS subdomain     TEXT NOT NULL DEFAULT '';
ALTER TABLE campaign_registrations ADD COLUMN IF NOT EXISTS phone         TEXT NOT NULL DEFAULT '';
ALTER TABLE campaign_registrations ADD COLUMN IF NOT EXISTS email         TEXT NOT NULL DEFAULT '';
ALTER TABLE campaign_registrations ADD COLUMN IF NOT EXISTS created_at    TIMESTAMPTZ DEFAULT NOW();

-- 2. 确保 RLS 已启用
ALTER TABLE campaign_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_registrations FORCE ROW LEVEL SECURITY;

-- 3. 刷新 PostgREST schema cache（消除 "column not found in schema cache" 错误）
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- Migration: 0102_fix_ai_reports_rls.sql
-- ============================================================

-- ============================================================================
-- 0102 修复: ai_reports 表缺少公开 INSERT RLS 策略
--
-- 问题: POST /api/starpath/questionnaire/complete 向 ai_reports 插入记录时
--       被RLS拦截: "new row violates row-level security policy"
-- 根因: 0003_campaign.sql 中 ai_reports 仅有 SELECT 和 admin 策略，
--       缺少公开 INSERT 策略（原设计仅 admin 触发生成）。
--       新增公开 complete 端点后，匿名用户需要 INSERT 权限。
--
-- 修复: 添加 ar_public_insert 策略，允许任何人创建 pending 状态的报告
-- ============================================================================

-- 1. 允许公开 INSERT（报告生成请求，status 默认 pending）
--    PostgreSQL 不支持 CREATE POLICY IF NOT EXISTS，用 DO 块幂等处理
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ai_reports' AND policyname = 'ar_public_insert'
  ) THEN
    CREATE POLICY ar_public_insert ON ai_reports
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- 2. 刷新 PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- Migration: 0103_h5_v1_campaign_seed.sql
-- ============================================================

-- ============================================================================
-- 0103 毛玻璃拟态 V1 演示活动种子（子域名 h5-v1）
-- ============================================================================

BEGIN;

INSERT INTO campaigns (
  subdomain, title, subtitle, badge,
  color_from, color_to, is_active, cta_text, sort_order
) VALUES (
  'h5-v1',
  '? HEHE 营销 H5 v1 毛玻璃拟态',
  '柔和毛玻璃质感与渐变光晕，适合品牌种草与轻转化场景。',
  'V1 示例',
  'from-rose-600', 'to-orange-600', TRUE,
  '立即体验',
  5
) ON CONFLICT (subdomain) DO NOTHING;

COMMIT;

-- ============================================================
-- Migration: 0104_fix_orders_and_rls.sql
-- ============================================================

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

-- ============================================================
-- Migration: 0105_force_rls_policies.sql
-- ============================================================

-- ============================================================================
-- 0105 强制重建关键表的公开 INSERT RLS 策略
--
-- 问题: 0104 迁移中 DO 块可能未正确执行，RLS 策略仍缺失
-- 修复: 直接 DROP + CREATE 确保策略存在
-- ============================================================================

-- ╔ campaign_registrations — 公开 INSERT ║
DROP POLICY IF EXISTS campaign_registrations_insert_public ON campaign_registrations;
CREATE POLICY campaign_registrations_insert_public ON campaign_registrations
  FOR INSERT TO public WITH CHECK (true);

-- ╔ orders — 公开 INSERT ║
DROP POLICY IF EXISTS orders_public_insert ON orders;
CREATE POLICY orders_public_insert ON orders
  FOR INSERT TO public WITH CHECK (true);

-- ╔ orders — 公开 UPDATE（支付确认需要更新订单状态）║
DROP POLICY IF EXISTS orders_public_update ON orders;
CREATE POLICY orders_public_update ON orders
  FOR UPDATE TO public USING (true) WITH CHECK (true);

-- ╔ campaign_orders — 公开 INSERT ║
DROP POLICY IF EXISTS campaign_orders_public_insert ON campaign_orders;
CREATE POLICY campaign_orders_public_insert ON campaign_orders
  FOR INSERT TO public WITH CHECK (true);

-- ╔ payment_transactions — 公开 INSERT ║
DROP POLICY IF EXISTS payment_transactions_public_insert ON payment_transactions;
CREATE POLICY payment_transactions_public_insert ON payment_transactions
  FOR INSERT TO public WITH CHECK (true);

-- ╔ questionnaire_sessions — 公开 UPDATE（completeSession 需要）║
DROP POLICY IF EXISTS qs_public_update ON questionnaire_sessions;
CREATE POLICY qs_public_update ON questionnaire_sessions
  FOR UPDATE TO public USING (true) WITH CHECK (true);

-- ╔ ai_reports — 公开 INSERT（已在 0102 添加，确保存在）║
DROP POLICY IF EXISTS ar_public_insert ON ai_reports;
CREATE POLICY ar_public_insert ON ai_reports
  FOR INSERT TO public WITH CHECK (true);

-- ╔ ai_reports — 公开 UPDATE（报告生成需要更新 status/content）║
DROP POLICY IF EXISTS ar_public_update ON ai_reports;
CREATE POLICY ar_public_update ON ai_reports
  FOR UPDATE TO public USING (true) WITH CHECK (true);

-- 刷新 schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- Migration: 0106_product_pricing_enhancement.sql
-- ============================================================

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  0106: 商品定价策略增强                                                   ║
-- ║  - 新增 pricing JSONB 结构化定价（支持多币种/阶梯/试用期/划线价）            ║
-- ║  - 新增 description / image_url 字段                                      ║
-- ║  - 新增商品名称唯一约束（同租户 + 未归档）                                   ║
-- ║  - payment_meta 基础 CHECK 约束                                           ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ─── 1. 结构化定价字段 ────────────────────────────────────────────────────
ALTER TABLE products ADD COLUMN IF NOT EXISTS pricing JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN products.pricing IS
  'Structured pricing: { base_price, currency, billing_interval, trial_days, setup_fee, compare_at_price, tiers: [...] }';

-- 将现有 price 字段值回填到 pricing.base_price（兼容过渡）
UPDATE products
SET pricing = jsonb_set(
  pricing,
  '{base_price}',
  to_jsonb(price)
)
WHERE pricing = '{}'::jsonb AND price IS NOT NULL;

-- ─── 2. 商品描述与图片 ────────────────────────────────────────────────────
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';

COMMENT ON COLUMN products.description IS 'Product description (supports plain text or Markdown)';
COMMENT ON COLUMN products.image_url IS 'Product image URL (Supabase Storage path or external URL)';

-- ─── 2.5 补充 archived_at 列（如不存在） ──────────────────────────────────
ALTER TABLE products ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- ─── 3. 商品名称唯一约束（同租户 + 未归档） ────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_tenant_name_active
  ON products (tenant_id, LOWER(name))
  WHERE archived_at IS NULL;

-- ─── 4. payment_meta 基础结构约束 ─────────────────────────────────────────
ALTER TABLE products ADD CONSTRAINT chk_payment_meta_is_object
  CHECK (jsonb_typeof(payment_meta) = 'object');

-- ─── 5. pricing 基础结构约束 ─────────────────────────────────────────────
ALTER TABLE products ADD CONSTRAINT chk_pricing_is_object
  CHECK (jsonb_typeof(pricing) = 'object');

-- ─── 6. 补充索引：支持按价格排序查询 ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_products_price ON products (price);
CREATE INDEX IF NOT EXISTS idx_products_active_tenant ON products (tenant_id, is_active) WHERE archived_at IS NULL;

-- ============================================================
-- Migration: 0107_one_time_purchase.sql
-- ============================================================

-- ============================================================================
-- 0107 一次性购买支持：报告购买字段 + 邮件追踪
--
-- 新增字段：
--   orders.purchase_type     — 区分订阅 (subscription) 与一次性购买 (one_time)
--   orders.original_amount   — 原价（划线价）
--   orders.discount_amount   — 折扣金额
--   ai_reports.email_sent    — 报告邮件是否已发送
--   ai_reports.email_sent_at — 邮件发送时间
-- ============================================================================

-- orders 表增加购买类型与折扣字段
ALTER TABLE orders ADD COLUMN IF NOT EXISTS purchase_type TEXT DEFAULT 'subscription'
  CHECK (purchase_type IN ('subscription', 'one_time'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS original_amount NUMERIC(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0;

-- ai_reports 增加邮件追踪
ALTER TABLE ai_reports ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE ai_reports ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ;

-- ============================================================
-- Migration: 0108_fix_anonymous_device_id.sql
-- ============================================================

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  0108: 修复 handle_new_user() 触发器 — 补充 device_id 字段保存            ║
-- ║                                                                          ║
-- ║  问题：匿名登录时 device_id 通过 raw_user_meta_data 传入，但触发器        ║
-- ║        INSERT profiles 时遗漏了该字段，导致匿名用户设备 ID 未持久化。       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

BEGIN;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  provider_val TEXT;
  is_oauth     BOOLEAN;
BEGIN
  provider_val := COALESCE(NEW.raw_user_meta_data->>'provider', 'email');
  is_oauth     := provider_val IN ('google', 'facebook', 'apple');

  INSERT INTO public.profiles (
    id, email, username, display_name, auth_provider, is_anonymous, email_verified, device_id
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    provider_val,
    COALESCE((NEW.raw_user_meta_data->>'is_anonymous')::boolean, FALSE),
    CASE WHEN is_oauth THEN TRUE ELSE FALSE END,
    NEW.raw_user_meta_data->>'device_id'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- ============================================================
-- Migration: 0109_starpath_product_link.sql
-- ============================================================

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  0109: 智能问卷商品关联修复                                               ║
-- ║  - products 表插入 starpath 商品（订阅 + 一次性购买）                       ║
-- ║  - 存量订单回填 product_id（修复 NULL 关联）                               ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ─── 1. 插入智能问卷商品 ────────────────────────────────────────────────────
-- 使用与现有商品相同的 tenant_id（从已有商品中获取）
INSERT INTO products (name, price, is_active, payment_meta, tenant_id, created_at, updated_at)
SELECT n.name, n.price, true, '{}'::jsonb, p.tenant_id, NOW(), NOW()
FROM (VALUES
  ('智能问卷 7天试用订阅', 7.99),
  ('智能问卷 AI 报告（一次性购买）', 9.99)
) AS n(name, price)
CROSS JOIN (SELECT tenant_id FROM products LIMIT 1) p
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = n.name);

-- ─── 2. 存量订单回填 product_id ────────────────────────────────────────────
-- 将 "智能问卷 Plan: trial-7d" 关联到 7天试用订阅
UPDATE orders
SET product_id = (
  SELECT id FROM products WHERE name = '智能问卷 7天试用订阅' LIMIT 1
)
WHERE product_name LIKE '智能问卷 Plan: trial%'
  AND product_id IS NULL;

-- 将 "智能问卷 AI Report (One-Time)" 关联到 一次性购买商品
UPDATE orders
SET product_id = (
  SELECT id FROM products WHERE name = '智能问卷 AI 报告（一次性购买）' LIMIT 1
)
WHERE product_name = '智能问卷 AI Report (One-Time)'
  AND product_id IS NULL;

-- ============================================================
-- Migration: 0110_expand_payment_provider_check.sql
-- ============================================================

-- 0110: 扩展 orders.payment_provider CHECK 约束 + 问卷答案 UPSERT 支持
--
-- 1. 增加 apple_iap, google_pay, alipay, wechat 支持
--    解决一次性购买 Apple Pay / Google Pay 创建订单失败的问题
--
-- 2. 为 questionnaire_answers 添加 UNIQUE 约束
--    支持 (session_id, question_key) 级别的 UPSERT，防止并发提交导致重复行

-- ── Part 1: 扩展 payment_provider 约束 ──
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_provider_check;

ALTER TABLE orders ADD CONSTRAINT orders_payment_provider_check
  CHECK (payment_provider IN (
    'stripe', 'paypal', 'google_pay', 'apple_iap', 'alipay', 'wechat', 'manual'
  ));

-- ── Part 2: 问卷答案唯一约束（支持 UPSERT） ──
-- 先清理已有重复数据（保留 answered_at 最新的一条）
DELETE FROM questionnaire_answers a
USING questionnaire_answers b
WHERE a.id < b.id
  AND a.session_id = b.session_id
  AND a.question_key = b.question_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_qa_session_question_uniq
  ON questionnaire_answers(session_id, question_key);

-- ============================================================
-- Migration: 0111_security_enhancements.sql
-- ============================================================

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  0111_security_enhancements.sql — 安全配置中心增强                          ║
-- ║                                                                          ║
-- ║  1. api_security_settings 添加 cors_config JSONB（CORS 动态配置）           ║
-- ║  2. api_keys 添加 last_rotated_at（Key 轮换追踪）                           ║
-- ║  3. activity_logs 添加 country 列 + 索引（加速地理聚合）                     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ║  1. api_security_settings — CORS 配置字段                                 ║
ALTER TABLE api_security_settings
  ADD COLUMN IF NOT EXISTS cors_config JSONB NOT NULL DEFAULT '{}';

COMMENT ON COLUMN api_security_settings.cors_config IS
  'CORS 动态配置: { allowed_origins: [], allowed_methods: [], allowed_headers: [], allow_credentials: bool, max_age: int }';

-- ║  2. api_keys — Key 轮换追踪                                               ║
ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS last_rotated_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN api_keys.last_rotated_at IS 'Key 最后一次轮换时间';

-- ║  3. activity_logs — 国家列 + 索引                                         ║
ALTER TABLE activity_logs
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_activity_logs_country
  ON activity_logs(country)
  WHERE country IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_category
  ON activity_logs(created_at DESC, category)
  WHERE category = 'system';

-- ============================================================
-- Migration: 0200_coffee_shops.sql
-- ============================================================

-- ============================================================================
-- 0200: Coffee Shops — coffee shop locations table
--
-- Depends: 0001_core.sql (set_updated_at(), is_admin())
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS coffee_shops (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  address         TEXT NOT NULL,
  city            TEXT NOT NULL DEFAULT '',
  phone           TEXT NOT NULL DEFAULT '',
  opening_hours   JSONB NOT NULL DEFAULT '{}'::jsonb,
  latitude        DOUBLE PRECISION,
  longitude       DOUBLE PRECISION,
  image_url       TEXT NOT NULL DEFAULT '',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE coffee_shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE coffee_shops FORCE ROW LEVEL SECURITY;

-- RLS: public read active shops
CREATE POLICY coffee_shops_public_read ON coffee_shops
  FOR SELECT TO public
  USING (is_active = TRUE);

-- RLS: admin full access
CREATE POLICY coffee_shops_admin_all ON coffee_shops
  FOR ALL TO authenticated
  USING (is_admin((SELECT auth.uid())))
  WITH CHECK (is_admin((SELECT auth.uid())));

COMMIT;

-- ============================================================
-- Migration: 0201_coffee_menu.sql
-- ============================================================

-- ============================================================================
-- 0201: Coffee Menu — menu items table + seed data
--
-- Depends: 0200_coffee_shops.sql
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS coffee_menu_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       UUID NOT NULL REFERENCES coffee_shops(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  price         NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  image_url     TEXT NOT NULL DEFAULT '',
  category      TEXT NOT NULL DEFAULT 'classic'
                CHECK (category IN ('classic', 'specialty', 'tea', 'pastry', 'seasonal')),
  is_available  BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE coffee_menu_items IS 'Coffee shop menu items';
COMMENT ON COLUMN coffee_menu_items.category IS 'classic | specialty | tea | pastry | seasonal';

ALTER TABLE coffee_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE coffee_menu_items FORCE ROW LEVEL SECURITY;

CREATE POLICY menu_items_public_read ON coffee_menu_items
  FOR SELECT TO public
  USING (is_available = TRUE);

CREATE POLICY menu_items_admin_all ON coffee_menu_items
  FOR ALL TO authenticated
  USING (is_admin((SELECT auth.uid())))
  WITH CHECK (is_admin((SELECT auth.uid())));

CREATE INDEX IF NOT EXISTS idx_menu_items_shop
  ON coffee_menu_items (shop_id, category, sort_order);

CREATE INDEX IF NOT EXISTS idx_menu_items_available
  ON coffee_menu_items (is_available);

CREATE TRIGGER menu_items_set_updated_at
  BEFORE UPDATE ON coffee_menu_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- seed: menu items for shop 1 (Downtown)
DO $$
DECLARE
  shop1_id UUID;
  shop2_id UUID;
BEGIN
  SELECT id INTO shop1_id FROM coffee_shops WHERE name = 'HEHE Coffee Downtown' LIMIT 1;
  SELECT id INTO shop2_id FROM coffee_shops WHERE name = 'HEHE Coffee West Hub' LIMIT 1;

  IF shop1_id IS NOT NULL THEN
    INSERT INTO coffee_menu_items (shop_id, name, description, price, category, sort_order) VALUES
      (shop1_id, 'Americano', 'Classic black coffee made with double espresso shots and hot water', 22.00, 'classic', 1),
      (shop1_id, 'Latte', 'Espresso with steamed milk and a light layer of foam', 28.00, 'classic', 2),
      (shop1_id, 'Cappuccino', 'Equal parts espresso, steamed milk, and milk foam', 28.00, 'classic', 3),
      (shop1_id, 'Mocha', 'Espresso with chocolate syrup and steamed milk, topped with whipped cream', 32.00, 'classic', 4),
      (shop1_id, 'Dirty Coffee', 'Cold milk topped with a double shot of hot espresso', 26.00, 'specialty', 5),
      (shop1_id, 'Cold Brew', 'Cold-brewed for 18 hours, smooth and bold', 25.00, 'specialty', 6),
      (shop1_id, 'Matcha Latte', 'Ceremonial grade matcha whisked with steamed milk', 30.00, 'tea', 7),
      (shop1_id, 'Earl Grey Tea', 'Premium loose-leaf Earl Grey with bergamot', 20.00, 'tea', 8),
      (shop1_id, 'Croissant', 'Buttery, flaky French croissant baked fresh daily', 15.00, 'pastry', 9),
      (shop1_id, 'Blueberry Muffin', 'Moist muffin loaded with fresh blueberries', 12.00, 'pastry', 10),
      (shop1_id, 'Seasonal: Sakura Latte', 'Limited spring edition with cherry blossom syrup', 35.00, 'seasonal', 11);
  END IF;

  IF shop2_id IS NOT NULL THEN
    INSERT INTO coffee_menu_items (shop_id, name, description, price, category, sort_order) VALUES
      (shop2_id, 'Americano', 'Classic black coffee made with double espresso shots', 20.00, 'classic', 1),
      (shop2_id, 'Latte', 'Espresso with steamed milk and foam', 26.00, 'classic', 2),
      (shop2_id, 'Flat White', 'Double espresso with velvety microfoam milk', 30.00, 'specialty', 3),
      (shop2_id, 'Lemon Tea', 'Freshly brewed black tea with lemon', 18.00, 'tea', 4),
      (shop2_id, 'Bagel with Cream Cheese', 'Toasted bagel served with cream cheese', 14.00, 'pastry', 5);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ============================================================
-- Migration: 0202_coffee_orders.sql
-- ============================================================

-- ============================================================================
-- 0202: Coffee Orders — extend orders table for coffee-specific fields
--
-- Depends: 0002_iap.sql (orders table), 0200_coffee_shops.sql
-- ============================================================================

BEGIN;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES coffee_shops(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type TEXT NOT NULL DEFAULT 'takeout'
  CHECK (order_type IN ('dine_in', 'takeout'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customizations JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN orders.shop_id IS 'Coffee shop where the order is placed';
COMMENT ON COLUMN orders.pickup_code IS 'Pickup code generated per shop per day (e.g. A001, B042)';
COMMENT ON COLUMN orders.order_type IS 'dine_in (for here) or takeout (to go)';
COMMENT ON COLUMN orders.customizations IS 'JSON: [{ item_name, sugar: full|half|none, ice: normal|less|none, size: small|medium|large, quantity }]';

CREATE INDEX IF NOT EXISTS idx_orders_shop_id ON orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_orders_pickup_code ON orders(pickup_code) WHERE pickup_code IS NOT NULL;

NOTIFY pgrst, 'reload schema';

COMMIT;

