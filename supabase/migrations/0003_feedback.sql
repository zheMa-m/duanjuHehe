-- ====================================================================
-- 0003 用户反馈与评价系统（可选）
-- 依赖：0001_core.sql（profiles 表）
-- ⚠️ 本模块为可选功能，项目核心业务不依赖反馈模块
-- ====================================================================

-- ╔════════════════════════════════════════════════════════════════╗
-- ║  feedbacks — 用户反馈/评价表                                   ║
-- ║  公开读取已审批评价，认证用户可提交                             ║
-- ╚════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS "feedbacks" (
  "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  "campaign_subdomain"  TEXT,
  "type"                TEXT NOT NULL DEFAULT 'review'
                        CHECK ("type" IN ('review', 'bug', 'feature', 'general')),
  "rating"              INTEGER CHECK ("rating" BETWEEN 1 AND 5),
  "comment"             TEXT,
  "display_name"        TEXT,
  "is_approved"         BOOLEAN NOT NULL DEFAULT FALSE,
  "admin_reply"         TEXT,
  "created_at"          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at"          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE "feedbacks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "feedbacks" FORCE ROW LEVEL SECURITY;

-- 公开读取已审批评价（H5 渲染）
CREATE POLICY "feedbacks_public_select" ON "feedbacks"
  FOR SELECT TO public USING ("is_approved" = true);

-- 认证用户可提交评价（user_id 只能写自己）
CREATE POLICY "feedbacks_auth_insert" ON "feedbacks"
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- 管理员全权限（含审批、回复、删除）
CREATE POLICY "feedbacks_admin_all" ON "feedbacks"
  FOR ALL TO authenticated
  USING ("is_admin"((SELECT auth.uid())));

-- 索引
CREATE INDEX IF NOT EXISTS "idx_feedbacks_campaign"   ON "feedbacks"("campaign_subdomain");
CREATE INDEX IF NOT EXISTS "idx_feedbacks_type"       ON "feedbacks"("type");
CREATE INDEX IF NOT EXISTS "idx_feedbacks_rating"     ON "feedbacks"("rating");
CREATE INDEX IF NOT EXISTS "idx_feedbacks_created_at" ON "feedbacks"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_feedbacks_user_id"    ON "feedbacks"("user_id");

-- updated_at 自动更新触发器
CREATE TRIGGER "feedbacks_set_updated_at"
  BEFORE UPDATE ON "feedbacks"
  FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();
