-- ====================================================================
-- ⚠️  0002 营销活动模块 — 活动配置 + 预约注册（可选功能）
--
-- 本模块为可选功能，项目核心业务（用户认证 + 任务管理）
-- 不依赖此模块。仅在启用 H5 营销页时才需要部署。
--
-- 前置依赖：
--   0001_core.sql — profiles（RLS admin 判断）、set_updated_at() 函数
--
-- 表清单：
--   1. campaigns              — 营销活动配置（H5 营销页核心数据）
--   2. campaign_registrations — 活动预约注册（结构化替代 activity_logs JSONB）
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
  "features"      JSONB NOT NULL DEFAULT '[]',
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
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM "profiles" WHERE id = auth.uid() AND "role" = 'admin')
  );

-- 索引
CREATE INDEX IF NOT EXISTS "idx_campaigns_active_sort" ON "campaigns"("is_active", "sort_order") WHERE "is_active" = true;

-- updated_at 自动更新触发器（依赖 0001_core.sql 的 set_updated_at() 函数）
CREATE TRIGGER "campaigns_set_updated_at"
  BEFORE UPDATE ON "campaigns"
  FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();


-- ╔════════════════════════════════════════════════════════════════╗
-- ║  2. campaign_registrations — 活动预约注册表                    ║
-- ║  H5 营销页面用户提交手机/邮箱预约，按 subdomain 归属活动       ║
-- ║  同一活动+同一邮箱不可重复注册                                 ║
-- ╚════════════════════════════════════════════════════════════════╝
--
-- 背景：原 campaigns/register.post.ts 将预约信息写入 activity_logs
--       的 JSONB metadata 字段，无法高效查询与统计分析。
--       本表创建专用结构化存储，支持按活动/手机/邮箱去重与聚合。

CREATE TABLE IF NOT EXISTS "campaign_registrations" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "subdomain"   TEXT NOT NULL,
  "phone"       TEXT NOT NULL,
  "email"       TEXT NOT NULL,
  "user_id"     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  "source"      TEXT NOT NULL DEFAULT 'h5'
                CHECK ("source" IN ('h5', 'admin', 'api', 'import')),
  "ip"          TEXT,
  "user_agent"  TEXT,
  "metadata"    JSONB NOT NULL DEFAULT '{}',
  "created_at"  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE "campaign_registrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "campaign_registrations" FORCE ROW LEVEL SECURITY;

-- 同一活动+同一邮箱唯一（允许同一用户参加不同活动）
CREATE UNIQUE INDEX IF NOT EXISTS "idx_campaign_regs_subdomain_email"
  ON "campaign_registrations"("subdomain", "email");

-- 管理员全权限（查看注册列表、导出）
CREATE POLICY "campaign_registrations_admin_all" ON "campaign_registrations"
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 认证用户可注册（后端 API 代理写入）
CREATE POLICY "campaign_registrations_authenticated_insert" ON "campaign_registrations"
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- service_role 可直写（服务端代理匿名注册场景）
CREATE POLICY "campaign_registrations_server_insert" ON "campaign_registrations"
  FOR INSERT TO service_role
  WITH CHECK (true);

-- 用户查看自己的注册记录
CREATE POLICY "campaign_registrations_user_select_own" ON "campaign_registrations"
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 索引
CREATE INDEX IF NOT EXISTS "idx_campaign_regs_subdomain"  ON "campaign_registrations"("subdomain");
CREATE INDEX IF NOT EXISTS "idx_campaign_regs_phone"      ON "campaign_registrations"("phone");
CREATE INDEX IF NOT EXISTS "idx_campaign_regs_user_id"    ON "campaign_registrations"("user_id") WHERE "user_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_campaign_regs_created_at" ON "campaign_registrations"("created_at" DESC);
