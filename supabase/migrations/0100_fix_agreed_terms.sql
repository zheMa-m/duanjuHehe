-- ============================================================================
-- 0100 修复: campaign_registrations.agreed_terms 列缺失
--
-- 问题: 生产环境 schema cache 中找不到 agreed_terms 列，
--       导致 POST /api/starpath/email/submit 返回 500。
-- 根因: 0003_campaign.sql 中已定义该列，但生产 DB 可能未完整执行迁移，
--       或 Supabase PostgREST schema cache 过期。
--
-- 修复策略:
--   1. ALTER TABLE ADD COLUMN IF NOT EXISTS 确保列存在
--   2. NOTIFY pgrst 刷新 PostgREST schema cache
-- ============================================================================

-- 1. 确保 agreed_terms 列存在（幂等操作）
ALTER TABLE campaign_registrations
  ADD COLUMN IF NOT EXISTS agreed_terms BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. 刷新 PostgREST schema cache（消除 "column not found in schema cache" 错误）
NOTIFY pgrst, 'reload schema';
