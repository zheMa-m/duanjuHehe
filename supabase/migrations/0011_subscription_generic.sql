-- ============================================================================
-- 0011: subscriptions 表多平台通用化 — 解耦 Stripe 硬编码
--
-- 前置依赖：0002_iap.sql / 0100_performance_indexes.sql
--
-- 变更清单：
--   1. stripe_subscription_id  →  gateway_subscription_id（列重命名）
--   2. 新增 subscription_provider 字段 + CHECK 约束
--   3. 索引重命名：idx_subscriptions_stripe_id → idx_subscriptions_gateway_id
--   4. 已有 Stripe 数据回填 subscription_provider = 'stripe'
--   5. 新增 idx_subscriptions_provider 索引
-- ============================================================================

BEGIN;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  1. 重命名列：stripe_subscription_id → gateway_subscription_id            ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

ALTER TABLE subscriptions RENAME COLUMN stripe_subscription_id TO gateway_subscription_id;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  2. 新增 subscription_provider 字段                                       ║
-- ║                                                                          ║
-- ║  ALTER TABLE 不支持 DROP INDEX IF EXISTS → 使用 DO 块安全删除旧索引       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS subscription_provider TEXT NOT NULL DEFAULT 'stripe';

ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_provider_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_provider_check
  CHECK (subscription_provider IN ('stripe', 'paypal', 'apple_iap', 'google_pay', 'alipay', 'wechat', 'manual'));

COMMENT ON COLUMN subscriptions.subscription_provider IS 'Subscription gateway provider: stripe | paypal | apple_iap | google_pay | alipay | wechat | manual';

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  3. 索引维护：重命名旧索引 + 新增 provider 索引                           ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- 删除旧索引（stripe_subscription_id → gateway_subscription_id 重命名后需重建）
DROP INDEX IF EXISTS idx_subscriptions_stripe_id;

-- 新建通用索引
CREATE INDEX IF NOT EXISTS idx_subscriptions_gateway_id ON subscriptions(gateway_subscription_id);

-- 新增 provider 筛选索引（Admin 按平台过滤订阅列表高频查询）
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider ON subscriptions(subscription_provider);

-- 新增 (user_id, subscription_provider) 复合索引（用户订阅 + 平台组合筛选）
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_provider ON subscriptions(user_id, subscription_provider);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  4. 已有数据回填：所有现有订阅默认为 Stripe                                 ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- subscription_provider 已有 DEFAULT 'stripe'，新插入自动填充
-- 此处显式回填确保已有数据一致
UPDATE subscriptions SET subscription_provider = 'stripe' WHERE subscription_provider IS NULL;

COMMIT;
