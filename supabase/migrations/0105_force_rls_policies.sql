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
