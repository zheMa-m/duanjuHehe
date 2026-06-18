-- ====================================================================
-- 0005 API 安全策略模块 — 速率限制 / IP 管控 / 国家限制 / API Key（可选功能）
--
-- 本模块为可选功能，项目核心业务不依赖此模块。
-- 仅在管理后台启用 API 安全策略管理时才需要部署。
--
-- 前置依赖：
--   0001_core.sql — profiles、is_admin()、set_updated_at()、activity_logs
--
-- 表清单：
--   1. api_security_settings — 全局安全策略配置（单行表）
--   2. api_keys              — API Key 管理（哈希存储 + 签名密钥）
--
-- 索引：
--   activity_logs 安全事件复合索引（category='system' + action LIKE）
-- ====================================================================


-- ╔════════════════════════════════════════════════════════════════╗
-- ║  1. api_security_settings — 全局安全策略配置（单行表）        ║
-- ║  CHECK(id) 保证永远只有一行记录                               ║
-- ╚════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS "api_security_settings" (
  "id" BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),

  -- 速率限制配置
  "rate_limit" JSONB NOT NULL DEFAULT '{
    "enabled": false,
    "window_seconds": 60,
    "max_requests": 100,
    "by_api_key": true,
    "by_ip": true
  }',

  -- IP 访问控制：disabled | whitelist | blacklist
  "ip_policy" JSONB NOT NULL DEFAULT '{
    "mode": "disabled",
    "whitelist": [],
    "blacklist": []
  }',

  -- 国家限制：whitelist 仅允许 | blacklist 禁止
  "country_policy" JSONB NOT NULL DEFAULT '{
    "enabled": false,
    "mode": "blacklist",
    "countries": []
  }',

  -- 全局签名要求主开关（per-key 可独立覆盖）
  "signature_required" BOOLEAN NOT NULL DEFAULT FALSE,

  -- 端点覆盖：{ "POST:/api/v1/products": { "enabled": false }, "GET:/api/v1/tasks": { "rateLimit": 10 } }
  "endpoint_overrides" JSONB NOT NULL DEFAULT '{}',

  "updated_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_by" UUID REFERENCES auth.users(id)
);

ALTER TABLE "api_security_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "api_security_settings" FORCE ROW LEVEL SECURITY;

-- 管理员全权限
CREATE POLICY "api_security_settings_admin_all" ON "api_security_settings"
  FOR ALL TO authenticated USING ("is_admin"((SELECT auth.uid())));

-- 预置默认行（所有策略关闭）
INSERT INTO "api_security_settings" (id) VALUES (TRUE) ON CONFLICT (id) DO NOTHING;


-- ╔════════════════════════════════════════════════════════════════╗
-- ║  2. api_keys — API Key 管理表                                 ║
-- ║  Key 本身只存 SHA-256 哈希，签名密钥服务端明文存储             ║
-- ╚════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS "api_keys" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL CHECK (char_length("name") <= 100),

  -- 完整 Key 的前 12 字符（如 ak_live_8f3a），用于管理后台脱敏展示
  "key_prefix" TEXT NOT NULL,

  -- 完整 API Key 的 SHA-256 哈希，认证时比对（不存原文）
  "key_hash" TEXT NOT NULL UNIQUE,

  -- HMAC 签名密钥明文（服务端存储，验签需要原文计算）
  "signing_secret" TEXT NOT NULL,

  -- per-key 签名要求（与全局 signature_required 取 OR 逻辑）
  "require_signature" BOOLEAN NOT NULL DEFAULT FALSE,

  -- 权限列表：read | write | admin
  "permissions" JSONB NOT NULL DEFAULT '["read"]',

  -- 允许的端点白名单：NULL = 全部允许；非 NULL = 仅限指定 METHOD:PATH
  "allowed_endpoints" TEXT[] DEFAULT NULL,

  -- 独立速率限制覆盖：NULL = 使用全局配置
  "rate_limit_override" INTEGER DEFAULT NULL,

  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "last_used_at" TIMESTAMPTZ DEFAULT NULL,
  "expires_at" TIMESTAMPTZ DEFAULT NULL,
  "created_by" UUID REFERENCES auth.users(id),
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE "api_keys" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "api_keys" FORCE ROW LEVEL SECURITY;

-- 管理员全权限
CREATE POLICY "api_keys_admin_all" ON "api_keys"
  FOR ALL TO authenticated USING ("is_admin"((SELECT auth.uid())));

-- 索引：按 is_active 过滤活跃 Key（中间件查询优化）
CREATE INDEX IF NOT EXISTS "idx_api_keys_active" ON "api_keys"("is_active") WHERE "is_active" = TRUE;

-- updated_at 自动更新触发器
CREATE TRIGGER "api_keys_set_updated_at"
  BEFORE UPDATE ON "api_keys"
  FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();


-- ╔════════════════════════════════════════════════════════════════╗
-- ║  3. activity_logs 安全事件查询专用复合索引                    ║
-- ║  避免全表扫描，仅索引 category='system' + api_security_ 前缀  ║
-- ╚════════════════════════════════════════════════════════════════╝

CREATE INDEX IF NOT EXISTS "idx_activity_logs_security"
  ON "activity_logs" (created_at DESC)
  WHERE category = 'system' AND action LIKE 'api_security_%';

-- activity_logs 管理员查询系统日志策略
CREATE POLICY "activity_logs_admin_system" ON "activity_logs"
  FOR SELECT TO authenticated
  USING ("is_admin"((SELECT auth.uid())) AND category = 'system');
