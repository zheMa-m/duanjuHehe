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
CREATE POLICY IF NOT EXISTS ar_public_insert ON ai_reports
  FOR INSERT WITH CHECK (true);

-- 2. 刷新 PostgREST schema cache
NOTIFY pgrst, 'reload schema';
