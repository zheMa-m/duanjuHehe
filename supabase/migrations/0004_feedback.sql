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
