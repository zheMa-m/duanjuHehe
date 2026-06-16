-- ====================================================================
-- 0005 用户反馈与评价系统
-- 依赖：0001_core.sql（profiles 表，RLS 管理员判断）
-- 表名：feedbacks
-- ====================================================================

-- -------------------------------------------------------------
-- 1. 用户反馈/评价表 (feedbacks)
--    H5 页面公开渲染已审批评价，认证用户可提交
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "feedbacks" (
  "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  "campaign_subdomain"  TEXT,
  "type"                TEXT NOT NULL DEFAULT 'review'
                        CHECK ("type" IN ('review', 'bug', 'feature', 'general')),
  "rating"              INTEGER CHECK ("rating" BETWEEN 1 AND 5),
  "comment"             TEXT,
  "display_name"        TEXT,
  "is_approved"         BOOLEAN NOT NULL DEFAULT TRUE,
  "admin_reply"         TEXT,
  "created_at"          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE "feedbacks" ENABLE ROW LEVEL SECURITY;

-- 所有人可读取已审批的评价（H5 公开渲染）
CREATE POLICY "feedbacks_public_select"
  ON "feedbacks" FOR SELECT
  USING ("is_approved" = true);

-- 认证用户可写入评价（RLS 保护 user_id 只能写自己）
CREATE POLICY "feedbacks_auth_insert"
  ON "feedbacks" FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 管理员可写入回复
CREATE POLICY "feedbacks_admin_update"
  ON "feedbacks" FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 管理员全权限（含删除）
CREATE POLICY "feedbacks_admin_all"
  ON "feedbacks" FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- -------------------------------------------------------------
-- 索引优化
-- -------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "idx_feedbacks_campaign" ON "feedbacks"(campaign_subdomain);
CREATE INDEX IF NOT EXISTS "idx_feedbacks_type" ON "feedbacks"(type);
CREATE INDEX IF NOT EXISTS "idx_feedbacks_rating" ON "feedbacks"(rating);
CREATE INDEX IF NOT EXISTS "idx_feedbacks_created_at" ON "feedbacks"(created_at DESC);
CREATE INDEX IF NOT EXISTS "idx_feedbacks_user_id" ON "feedbacks"(user_id);
