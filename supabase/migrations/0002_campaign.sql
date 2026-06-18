-- ====================================================================
-- 0002 营销活动模块 — 活动配置与留资（可选功能）
--
-- 本模块为可选功能，项目核心业务（用户认证 + 任务管理）
-- 不依赖此模块。仅在启用 H5 营销页时才需要部署。
--
-- 前置依赖：
--   0001_core.sql — profiles（RLS admin 判断）、set_updated_at() 函数
--
-- 表清单：
--   1. campaigns — 营销活动配置（H5 营销页核心数据）
--   2. campaign_registrations — 营销留资/预约注册表（C端留资）
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
  "ga_measurement_id" TEXT DEFAULT NULL,  -- GA4 衡量 ID 覆盖（NULL = 继承全局配置）
  "meta_pixel_id"     TEXT DEFAULT NULL,  -- Meta Pixel ID 覆盖（NULL = 继承全局配置）
  "tiktok_pixel_id"   TEXT DEFAULT NULL,  -- TikTok Pixel ID 覆盖（NULL = 继承全局配置）
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


-- ╔════════════════════════════════════════════════════════════════╗
-- ║  2. campaign_registrations — 营销留资/预约注册表               ║
-- ║  允许所有人匿名提交预约（C端留资表单），仅管理员可查询和删除   ║
-- ╚════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS "campaign_registrations" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "campaign_id" UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  "subdomain"   TEXT NOT NULL,
  "phone"       TEXT NOT NULL,
  "email"       TEXT NOT NULL,
  "user_id"     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  "created_at"  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE "campaign_registrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "campaign_registrations" FORCE ROW LEVEL SECURITY;

-- 允许所有人匿名提交预约（因为是 C 端留资表单）
CREATE POLICY "campaign_registrations_insert_public" ON "campaign_registrations"
  FOR INSERT TO public WITH CHECK (true);

-- 仅允许管理员查看或删除留资记录
CREATE POLICY "campaign_registrations_admin_all" ON "campaign_registrations"
  FOR ALL TO authenticated USING ("is_admin"((SELECT auth.uid())));

-- 索引，提高按活动域名过滤和按最新时间排序的响应速度
CREATE INDEX IF NOT EXISTS "idx_campaign_registrations_subdomain" ON "campaign_registrations"("subdomain");
CREATE INDEX IF NOT EXISTS "idx_campaign_registrations_created" ON "campaign_registrations"("created_at" DESC);


-- ╔════════════════════════════════════════════════════════════════╗
-- ║  3. 种子数据：H5 v2 新野兽派营销活动                           ║
-- ║  幂等插入，已存在则跳过                                          ║
-- ╚════════════════════════════════════════════════════════════════╝

INSERT INTO "campaigns" (
  "subdomain",
  "title",
  "subtitle",
  "badge",
  "color_from",
  "color_to",
  "is_active",
  "cta_text",
  "sort_order"
) VALUES (
  'h5-v2',
  '🎨 HEHE 营销 H5 v2 新野兽派',
  '采用大胆的新野兽派视觉版式，引入 3D 浮动卡片、扫光粒子与极客跑马灯。',
  '全新 V2 体验',
  'from-green-400',
  'to-emerald-600',
  TRUE,
  '立即体验',
  10
) ON CONFLICT ("subdomain") DO NOTHING;
