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
