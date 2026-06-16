-- ====================================================================
-- 0004 广告流量变现（可选）— 广告位配置 + 事件追踪
-- 依赖：0001_core.sql（campaigns 表）
-- 表名：ad_slots, ad_events
-- ⚠️ 本模块为可选功能，项目核心业务不依赖广告模块
-- ====================================================================

-- -------------------------------------------------------------
-- 1. 广告位配置表 (ad_slots)
--    管理员配置广告位，H5 公开渲染
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ad_slots" (
  "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"          TEXT NOT NULL,
  "position"      TEXT NOT NULL
                  CHECK ("position" IN ('header_banner', 'footer_banner', 'native_inline', 'interstitial')),
  "is_active"     BOOLEAN NOT NULL DEFAULT TRUE,
  "campaign_id"   UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  "ad_provider"   TEXT NOT NULL DEFAULT 'custom'
                  CHECK ("ad_provider" IN ('adsense', 'meta', 'custom')),
  "ad_config"     JSONB NOT NULL DEFAULT '{}',
  "sort_order"    INTEGER NOT NULL DEFAULT 0,
  "created_at"    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE "ad_slots" ENABLE ROW LEVEL SECURITY;

-- 所有人可查看活跃广告位（H5 公开渲染）
CREATE POLICY "ad_slots_public_select"
  ON "ad_slots" FOR SELECT
  USING (true);

-- 管理员全权限
CREATE POLICY "ad_slots_admin_all"
  ON "ad_slots" FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- -------------------------------------------------------------
-- 2. 广告事件追踪表 (ad_events)
--    H5 页面上报曝光/点击，管理员可查
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ad_events" (
  "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "ad_slot_id"          UUID REFERENCES ad_slots(id) ON DELETE CASCADE,
  "event_type"          TEXT NOT NULL CHECK ("event_type" IN ('impression', 'click')),
  "campaign_subdomain"  TEXT,
  "ip"                  TEXT,
  "user_agent"          TEXT,
  "referrer"            TEXT,
  "created_at"          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE "ad_events" ENABLE ROW LEVEL SECURITY;

-- 任何人可写入广告事件（H5 页面上报）
CREATE POLICY "ad_events_public_insert"
  ON "ad_events" FOR INSERT
  WITH CHECK (true);

-- 管理员可查看
CREATE POLICY "ad_events_admin_select"
  ON "ad_events" FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- -------------------------------------------------------------
-- 索引优化
-- -------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "idx_ad_events_slot_id" ON "ad_events"(ad_slot_id);
CREATE INDEX IF NOT EXISTS "idx_ad_events_created_at" ON "ad_events"(created_at DESC);
CREATE INDEX IF NOT EXISTS "idx_ad_slots_position_active" ON "ad_slots"(position, is_active);
