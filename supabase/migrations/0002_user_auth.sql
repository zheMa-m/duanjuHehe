-- ====================================================================
-- 0002 用户认证体系 — Profiles 扩展 + 自动创建触发器
-- 依赖：0001_core.sql（profiles, activity_logs 表）
-- ====================================================================

-- -------------------------------------------------------------
-- 1. 扩展 profiles 表：新增认证相关字段
-- -------------------------------------------------------------
ALTER TABLE "profiles"
  ADD COLUMN IF NOT EXISTS "avatar_url"      TEXT,
  ADD COLUMN IF NOT EXISTS "display_name"    TEXT,
  ADD COLUMN IF NOT EXISTS "auth_provider"   TEXT NOT NULL DEFAULT 'email'
                       CHECK ("auth_provider" IN ('email', 'google', 'facebook', 'apple', 'anonymous')),
  ADD COLUMN IF NOT EXISTS "provider_id"     TEXT,
  ADD COLUMN IF NOT EXISTS "device_id"       TEXT,
  ADD COLUMN IF NOT EXISTS "is_anonymous"    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "email_verified"  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "phone"           TEXT,
  ADD COLUMN IF NOT EXISTS "updated_at"      TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 为 username 列放宽约束：匿名用户可以没有 username
-- 先删除旧的 UNIQUE 约束（约束名与索引同名），再创建允许 NULL 的部分唯一索引
ALTER TABLE "profiles" ALTER COLUMN "username" DROP NOT NULL;
ALTER TABLE "profiles" DROP CONSTRAINT IF EXISTS "profiles_username_key";
CREATE UNIQUE INDEX IF NOT EXISTS "profiles_username_unique" ON "profiles" ("username") WHERE "username" IS NOT NULL;

-- 索引：按 device_id 查找匿名用户
CREATE INDEX IF NOT EXISTS "idx_profiles_device_id" ON "profiles" ("device_id") WHERE "device_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_profiles_provider" ON "profiles" ("auth_provider");

-- -------------------------------------------------------------
-- 2. 自动 Profile 创建触发器
--    新用户通过 Supabase Auth 注册时自动创建 profile 记录
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION "handle_new_user"()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, auth_provider, is_anonymous, email_verified)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'provider', 'email'),
    COALESCE((NEW.raw_user_meta_data->>'is_anonymous')::boolean, FALSE),
    FALSE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 先删除旧触发器（如果存在），再重建
DROP TRIGGER IF EXISTS "on_auth_user_created" ON "auth"."users";
CREATE TRIGGER "on_auth_user_created"
  AFTER INSERT ON "auth"."users"
  FOR EACH ROW EXECUTE FUNCTION "handle_new_user"();
