-- ============================================================================
-- 0008 补齐 campaign_registrations 在 0003 之后追加的字段
--
-- 背景：远端 campaign_registrations 目前只有 0003 初始推送时的列，
--       缺少 agreed_terms / source / metadata / unsubscribed / sent_at。
-- ============================================================================

BEGIN;

ALTER TABLE campaign_registrations
  ADD COLUMN IF NOT EXISTS agreed_terms  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS source        TEXT NOT NULL DEFAULT 'h5-form',
  ADD COLUMN IF NOT EXISTS metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS unsubscribed  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sent_at       TIMESTAMPTZ;

COMMIT;
