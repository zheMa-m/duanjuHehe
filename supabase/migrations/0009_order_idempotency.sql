-- 0009: orders 防重提交幂等键 + 订单过期
-- 防止用户快速重复点击创建多个 pending 订单

-- 1. 幂等键
ALTER TABLE IF EXISTS orders ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- 部分唯一索引：同一幂等键在 5 分钟窗口内只允许一个 pending 订单
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_pending
  ON orders(idempotency_key, status)
  WHERE status = 'pending' AND idempotency_key IS NOT NULL;

-- 2. 订单过期
ALTER TABLE IF EXISTS orders ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- 更新 status CHECK 约束：增加 expired 状态
ALTER TABLE IF EXISTS orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE IF EXISTS orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'expired'));

COMMENT ON COLUMN orders.idempotency_key IS 'client-generated idempotency key to prevent duplicate payment creation';
COMMENT ON COLUMN orders.expires_at IS 'pending order expiry timestamp, defaults to created_at + 30 minutes';
