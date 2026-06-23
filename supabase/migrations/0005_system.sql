-- ============================================================================
-- 0005 系统收敛：通用配置 + API 安全策略 + 管理员 2FA
--
-- 前置依赖：0001_core.sql（profiles、is_admin()、set_updated_at()、activity_logs）
--
-- 表清单：
--   1. system_configs        — 系统 KV 配置表
--   2. api_security_settings — 全局安全策略（单行表）
--   3. api_keys             — API Key 管理（SHA-256 + HMAC）
--   4. admin_2fa            — 管理员双因素认证（TOTP）
-- ============================================================================

BEGIN;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  1. system_configs — 系统 KV 配置表                                       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS system_configs (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE system_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_configs FORCE ROW LEVEL SECURITY;

CREATE POLICY system_configs_admin_all ON system_configs
  FOR ALL TO authenticated
  USING (is_admin((SELECT auth.uid())))
  WITH CHECK (is_admin((SELECT auth.uid())));

CREATE TRIGGER system_configs_set_updated_at
  BEFORE UPDATE ON system_configs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  2. api_security_settings — 全局安全策略（单行表）                         ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS api_security_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),

  -- 速率限制
  rate_limit JSONB NOT NULL DEFAULT '{
    "enabled": false,
    "window_seconds": 60,
    "max_requests": 100,
    "by_api_key": true,
    "by_ip": true
  }',

  -- IP 访问控制：disabled | whitelist | blacklist
  ip_policy JSONB NOT NULL DEFAULT '{
    "mode": "disabled",
    "whitelist": [],
    "blacklist": []
  }',

  -- 国家限制
  country_policy JSONB NOT NULL DEFAULT '{
    "enabled": false,
    "mode": "blacklist",
    "countries": []
  }',

  signature_required  BOOLEAN NOT NULL DEFAULT FALSE,
  endpoint_overrides  JSONB NOT NULL DEFAULT '{}',
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_by          UUID REFERENCES auth.users(id)
);

ALTER TABLE api_security_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_security_settings FORCE ROW LEVEL SECURITY;

CREATE POLICY api_security_settings_admin_all ON api_security_settings
  FOR ALL TO authenticated USING (is_admin((SELECT auth.uid())));

-- 预置默认行
INSERT INTO api_security_settings (id) VALUES (TRUE) ON CONFLICT (id) DO NOTHING;


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  3. api_keys — API Key 管理表                                             ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS api_keys (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL CHECK (char_length(name) <= 100),
  key_prefix          TEXT NOT NULL,
  key_hash            TEXT NOT NULL UNIQUE,
  signing_secret      TEXT NOT NULL,
  require_signature   BOOLEAN NOT NULL DEFAULT FALSE,
  permissions         JSONB NOT NULL DEFAULT '["read"]',
  allowed_endpoints   TEXT[] DEFAULT NULL,
  rate_limit_override INTEGER DEFAULT NULL,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  last_used_at        TIMESTAMPTZ DEFAULT NULL,
  expires_at          TIMESTAMPTZ DEFAULT NULL,
  created_by          UUID REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys FORCE ROW LEVEL SECURITY;

CREATE POLICY api_keys_admin_all ON api_keys
  FOR ALL TO authenticated USING (is_admin((SELECT auth.uid())));

CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active)
  WHERE is_active = TRUE;

CREATE TRIGGER api_keys_set_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  4. admin_2fa — 管理员双因素认证（TOTP）                                  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS admin_2fa (
  user_id       UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  secret        TEXT NOT NULL,
  is_enabled    BOOLEAN NOT NULL DEFAULT false,
  verified_at   TIMESTAMPTZ,
  backup_codes  TEXT[] DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN admin_2fa.secret IS 'TOTP 密钥（仅服务端访问，不返回前端）';
COMMENT ON COLUMN admin_2fa.backup_codes IS '备用恢复码（仅生成时展示一次，hash 存储）';

ALTER TABLE admin_2fa ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_2fa FORCE ROW LEVEL SECURITY;

CREATE POLICY admin_2fa_select_own ON admin_2fa
  FOR SELECT USING (user_id = auth.uid() AND is_admin(auth.uid()));

CREATE POLICY admin_2fa_insert_own ON admin_2fa
  FOR INSERT WITH CHECK (user_id = auth.uid() AND is_admin(auth.uid()));

CREATE POLICY admin_2fa_update_own ON admin_2fa
  FOR UPDATE USING (user_id = auth.uid() AND is_admin(auth.uid()));


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Seed                                                                     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- 多平台埋点默认配置
INSERT INTO system_configs (key, value)
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
) ON CONFLICT (key) DO NOTHING;

COMMIT;
