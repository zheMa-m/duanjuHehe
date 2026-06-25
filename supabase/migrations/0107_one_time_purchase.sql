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
