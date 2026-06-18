-- ====================================================================
-- 0006 系统通用配置表 + 埋点种子数据（可选功能）
--
-- 用于存放通知机器人 Webhook、埋点配置等全局敏感配置，限管理员可见。
--
-- 前置依赖：
--   0001_core.sql — is_admin()、set_updated_at()
--
-- 表清单：
--   1. system_configs — 系统通用 KV 配置表
--
-- 种子数据：
--   analytics_settings — 多平台埋点像素默认配置骨架
-- ====================================================================


-- ╔════════════════════════════════════════════════════════════════╗
-- ║  1. system_configs — 系统通用 KV 配置表                        ║
-- ║  仅管理员可读写，用于存储全局敏感配置                           ║
-- ╚════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS "system_configs" (
  "key"         TEXT PRIMARY KEY,
  "value"       JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at"  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at"  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE "system_configs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "system_configs" FORCE ROW LEVEL SECURITY;

-- 仅管理员可读写
CREATE POLICY "system_configs_admin_all" ON "system_configs"
  FOR ALL TO authenticated
  USING ("is_admin"((SELECT auth.uid())))
  WITH CHECK ("is_admin"((SELECT auth.uid())));

-- updated_at 自动更新触发器
CREATE TRIGGER "system_configs_set_updated_at"
  BEFORE UPDATE ON "system_configs"
  FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();


-- ╔════════════════════════════════════════════════════════════════╗
-- ║  2. 种子数据：多平台埋点像素默认配置                            ║
-- ║  key = 'analytics_settings'                                    ║
-- ║  value: { is_enabled, enable_client, enable_h5, enable_admin,  ║
-- ║           ga_measurement_id, meta_pixel_id, tiktok_pixel_id }  ║
-- ╚════════════════════════════════════════════════════════════════╝

INSERT INTO "system_configs" ("key", "value")
VALUES (
  'analytics_settings',
  '{
    "is_enabled": false,
    "enable_client": true,
    "enable_h5": true,
    "enable_admin": false,
    "ga_measurement_id": "",
    "meta_pixel_id": "",
    "tiktok_pixel_id": ""
  }'::jsonb
)
ON CONFLICT ("key") DO NOTHING;
