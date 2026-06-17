-- ====================================================================
-- ⚠️  0002 营销活动模块 — 活动配置（可选功能）
--
-- 本模块为可选功能，项目核心业务（用户认证 + 任务管理）
-- 不依赖此模块。仅在启用 H5 营销页时才需要部署。
--
-- 前置依赖：
--   0001_core.sql — profiles（RLS admin 判断）、set_updated_at() 函数
--
-- 表清单：
--   1. campaigns — 营销活动配置（H5 营销页核心数据）
--
-- 下游依赖：
--   0003_ad_optional.sql — ad_slots.campaign_id FK 引用本表
-- ====================================================================


-- ╔════════════════════════════════════════════════════════════════╗
-- ║  1. campaigns — 营销活动配置表                                ║
-- ║  H5 营销页核心数据，仅活跃活动对公众可见                       ║
-- ╚════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS "campaigns" (
  "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "subdomain"     TEXT UNIQUE NOT NULL,
  "title"         TEXT NOT NULL,
  "subtitle"      TEXT NOT NULL,
  "badge"         TEXT NOT NULL,
  "color_from"    TEXT NOT NULL DEFAULT 'from-purple-600',
  "color_to"      TEXT NOT NULL DEFAULT 'to-indigo-600',
  "is_active"     BOOLEAN NOT NULL DEFAULT TRUE,
  "cta_text"      TEXT NOT NULL DEFAULT '立即预约',
  "cta_url"       TEXT,
  "cover_image"   TEXT,
  "description"   TEXT,
  "features"      JSONB NOT NULL DEFAULT '[]' CHECK (jsonb_typeof("features") = 'array'),
  "sort_order"    INTEGER NOT NULL DEFAULT 0,
  "created_at"    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at"    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE "campaigns" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "campaigns" FORCE ROW LEVEL SECURITY;

-- 公开读取仅限活跃活动（is_active = true）
CREATE POLICY "campaigns_read_public" ON "campaigns"
  FOR SELECT TO public USING ("is_active" = true);

-- 管理员全权限（含下线/上线切换）
CREATE POLICY "campaigns_admin_all" ON "campaigns"
  FOR ALL TO authenticated USING ("is_admin"((SELECT auth.uid())));

-- 索引
CREATE INDEX IF NOT EXISTS "idx_campaigns_active_sort" ON "campaigns"("is_active", "sort_order") WHERE "is_active" = true;

-- updated_at 自动更新触发器（依赖 0001_core.sql 的 set_updated_at() 函数）
CREATE TRIGGER "campaigns_set_updated_at"
  BEFORE UPDATE ON "campaigns"
  FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();
