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
