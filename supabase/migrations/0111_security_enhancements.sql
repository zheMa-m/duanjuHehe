-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  0111_security_enhancements.sql — 安全配置中心增强                          ║
-- ║                                                                          ║
-- ║  1. api_security_settings 添加 cors_config JSONB（CORS 动态配置）           ║
-- ║  2. api_keys 添加 last_rotated_at（Key 轮换追踪）                           ║
-- ║  3. activity_logs 添加 country 列 + 索引（加速地理聚合）                     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ║  1. api_security_settings — CORS 配置字段                                 ║
ALTER TABLE api_security_settings
  ADD COLUMN IF NOT EXISTS cors_config JSONB NOT NULL DEFAULT '{}';

COMMENT ON COLUMN api_security_settings.cors_config IS
  'CORS 动态配置: { allowed_origins: [], allowed_methods: [], allowed_headers: [], allow_credentials: bool, max_age: int }';

-- ║  2. api_keys — Key 轮换追踪                                               ║
ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS last_rotated_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN api_keys.last_rotated_at IS 'Key 最后一次轮换时间';

-- ║  3. activity_logs — 国家列 + 索引                                         ║
ALTER TABLE activity_logs
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_activity_logs_country
  ON activity_logs(country)
  WHERE country IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_category
  ON activity_logs(created_at DESC, category)
  WHERE category = 'system';
