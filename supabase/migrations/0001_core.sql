-- ====================================================================
-- 0001 核心基础表 + 认证体系
--
-- 核心表（项目必须依赖）：
--   1. profiles            — 用户档案（auth.users FK）
--   2. tasks               — 业务任务（CRUD 示例 + tenant_id 隔离）
--   3. activity_logs       — 统一审计日志（append-only）
--
-- 通用函数：
--   set_updated_at()       — updated_at 自动刷新
--   is_admin()             — SECURITY DEFINER 管理员身份检查（避免 RLS 递归）
--   handle_new_user()      — Auth 触发器（OAuth email_verified 区分）
--
-- ⚠️  可选模块（按需启用，依赖本文件）：
--   0002_campaign_optional.sql    — 营销活动配置
--   0003_ad_optional.sql          — 广告位 + 广告事件（依赖 campaigns）
--   0004_feedback_optional.sql  — 用户评价
--   0005_payment_optional.sql     — 商品 + 订单（支付模块）
-- ====================================================================


-- ╔════════════════════════════════════════════════════════════════╗
-- ║  Helper Functions                                             ║
-- ╚════════════════════════════════════════════════════════════════╝

-- 通用 updated_at 自动更新函数
CREATE OR REPLACE FUNCTION "set_updated_at"()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ╔════════════════════════════════════════════════════════════════╗
-- ║  1. profiles — 用户档案表                                     ║
-- ║  Supabase Auth 注册后触发器自动创建                            ║
-- ╚════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS "profiles" (
  "id"                 UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  "username"           TEXT,                                       -- 匿名用户可为 NULL，非 NULL 时唯一
  "role"               TEXT NOT NULL DEFAULT 'user'
                       CHECK ("role" IN ('user', 'admin')),
  "plan_status"        TEXT NOT NULL DEFAULT 'free'
                       CHECK ("plan_status" IN ('free', 'pro', 'enterprise')),
  "avatar_url"         TEXT,
  "display_name"       TEXT,
  "auth_provider"      TEXT NOT NULL DEFAULT 'email'
                       CHECK ("auth_provider" IN ('email', 'google', 'facebook', 'apple', 'anonymous')),
  "provider_id"        TEXT,
  "device_id"          TEXT,
  "is_anonymous"       BOOLEAN NOT NULL DEFAULT FALSE,
  "email_verified"     BOOLEAN NOT NULL DEFAULT FALSE,
  "phone"              TEXT,
  "created_at"         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at"         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "profiles" FORCE ROW LEVEL SECURITY;

-- 管理员身份检查函数（SECURITY DEFINER 绕过 RLS，避免策略无限递归）
CREATE OR REPLACE FUNCTION "is_admin"(uid uuid)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = uid AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- username 非空时唯一（部分索引，允许多行 NULL）
CREATE UNIQUE INDEX IF NOT EXISTS "profiles_username_unique"
  ON "profiles"("username") WHERE "username" IS NOT NULL;

-- 用户 SELECT 自己的 profile
CREATE POLICY "profiles_select_own" ON "profiles"
  FOR SELECT TO authenticated USING (auth.uid() = id);

-- 用户 UPDATE 自己的 profile
CREATE POLICY "profiles_update_own" ON "profiles"
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 管理员全权限
CREATE POLICY "profiles_admin_all" ON "profiles"
  FOR ALL TO authenticated USING ("is_admin"(auth.uid()));

-- 索引
CREATE INDEX IF NOT EXISTS "idx_profiles_device_id" ON "profiles"("device_id") WHERE "device_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_profiles_provider"  ON "profiles"("auth_provider");

-- updated_at 自动更新触发器
CREATE TRIGGER "profiles_set_updated_at"
  BEFORE UPDATE ON "profiles"
  FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();


-- ╔════════════════════════════════════════════════════════════════╗
-- ║  2. tasks — 业务任务表（CRUD 示例）                          ║
-- ║  tenant_id 实现行级数据隔离                                    ║
-- ╚════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS "tasks" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "title"       TEXT NOT NULL,
  "completed"   BOOLEAN NOT NULL DEFAULT false,
  "tenant_id"   UUID NOT NULL,
  "created_at"  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tasks" FORCE ROW LEVEL SECURITY;

-- 行级隔离：用户仅操作自己项目数据
CREATE POLICY "tasks_tenant_isolation" ON "tasks"
  FOR ALL TO authenticated
  USING ("tenant_id" = auth.uid())
  WITH CHECK ("tenant_id" = auth.uid());

-- 管理员全权限
CREATE POLICY "tasks_admin_all" ON "tasks"
  FOR ALL TO authenticated USING ("is_admin"(auth.uid()));

-- 索引
CREATE INDEX IF NOT EXISTS "idx_tasks_tenant_id" ON "tasks"("tenant_id");


-- ╔════════════════════════════════════════════════════════════════╗
-- ║  3. activity_logs — 统一审计日志表                            ║
-- ║  append-only，用 category 区分 auth/admin/system              ║
-- ║  metadata JSONB 灵活存储扩展字段                              ║
-- ╚════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS "activity_logs" (
  "id"          BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  "category"    TEXT NOT NULL
                CHECK ("category" IN ('auth', 'admin', 'system')),
  "user_id"     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  "action"      TEXT NOT NULL,
  "ip"          TEXT,
  "metadata"    JSONB NOT NULL DEFAULT '{}',
  "created_at"  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE "activity_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "activity_logs" FORCE ROW LEVEL SECURITY;

-- 用户查看自己的认证日志
CREATE POLICY "activity_logs_user_select_own" ON "activity_logs"
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id AND category = 'auth');

-- 管理员查看所有日志
CREATE POLICY "activity_logs_admin_select" ON "activity_logs"
  FOR SELECT TO authenticated
  USING ("is_admin"(auth.uid()));

-- 认证用户写入自己的认证日志
CREATE POLICY "activity_logs_auth_insert" ON "activity_logs"
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND category = 'auth');

-- service_role 直写任意日志
CREATE POLICY "activity_logs_server_insert" ON "activity_logs"
  FOR INSERT TO service_role
  WITH CHECK (true);

-- 索引
CREATE INDEX IF NOT EXISTS "idx_activity_logs_category"   ON "activity_logs"(category);
CREATE INDEX IF NOT EXISTS "idx_activity_logs_user_id"    ON "activity_logs"(user_id);
CREATE INDEX IF NOT EXISTS "idx_activity_logs_created_at" ON "activity_logs"(created_at DESC);


-- ╔════════════════════════════════════════════════════════════════╗
-- ║  Auth Trigger — 新用户注册自动创建 profile                    ║
-- ║  OAuth 用户 email_verified = TRUE，邮箱注册 = FALSE           ║
-- ╚════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION "handle_new_user"()
RETURNS TRIGGER AS $$
DECLARE
  provider_val TEXT;
  is_oauth     BOOLEAN;
BEGIN
  provider_val := COALESCE(NEW.raw_user_meta_data->>'provider', 'email');
  is_oauth     := provider_val IN ('google', 'facebook', 'apple');

  INSERT INTO public.profiles (
    id, username, display_name, auth_provider, is_anonymous, email_verified
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    provider_val,
    COALESCE((NEW.raw_user_meta_data->>'is_anonymous')::boolean, FALSE),
    CASE WHEN is_oauth THEN TRUE ELSE FALSE END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS "on_auth_user_created" ON "auth"."users";
CREATE TRIGGER "on_auth_user_created"
  AFTER INSERT ON "auth"."users"
  FOR EACH ROW EXECUTE FUNCTION "handle_new_user"();
