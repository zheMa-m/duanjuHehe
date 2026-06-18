-- ====================================================================
-- 0001 核心基础表 + 认证体系 + Storage
--
-- 核心表与功能（项目必须依赖）：
--   1. profiles            — 用户档案（auth.users FK）
--   2. tasks               — 业务任务（CRUD 示例 + tenant_id 隔离）
--   3. activity_logs       — 统一审计日志（append-only）
--   4. storage.buckets     — Supabase Storage Bucket（avatars, campaign-assets, uploads）
--     + storage.objects RLS 策略（路径隔离 + RESTRICTIVE 加固）
--   5. storage_trash       — 回收站记录表（软删除，30 天自动清理）
--
-- 通用函数：
--   set_updated_at()       — updated_at 自动刷新
--   is_admin()             — SECURITY DEFINER 管理员身份检查（避免 RLS 递归）
--   handle_new_user()      — Auth 触发器（OAuth email_verified 区分）
--
-- ⚠️  可选模块（按需启用，依赖本文件）：
--   0002_campaign.sql    — 营销活动配置
--   0003_feedback.sql    — 用户评价
--   0004_payment.sql     — 商品 + 订单 + 支付配置 + 订阅
--   0005_api_security.sql — API 安全策略
--   0006_system.sql      — 系统通用配置 + 埋点
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
  "email"              TEXT,                                        -- 冗余 auth.users.email，方便业务查询
  "username"           TEXT CHECK (char_length("username") <= 50),  -- 匿名用户可为 NULL，非 NULL 时唯一
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
  "stripe_customer_id" TEXT UNIQUE,
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
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = id);

-- 用户 UPDATE 自己的 profile
CREATE POLICY "profiles_update_own" ON "profiles"
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = id);

-- 管理员全权限
CREATE POLICY "profiles_admin_all" ON "profiles"
  FOR ALL TO authenticated USING ("is_admin"((SELECT auth.uid())));

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
  "tenant_id"   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "updated_at"  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "created_at"  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tasks" FORCE ROW LEVEL SECURITY;

-- 行级隔离：用户仅操作自己项目数据
CREATE POLICY "tasks_tenant_isolation" ON "tasks"
  FOR ALL TO authenticated
  USING ("tenant_id" = (SELECT auth.uid()))
  WITH CHECK ("tenant_id" = (SELECT auth.uid()));

-- 管理员全权限
CREATE POLICY "tasks_admin_all" ON "tasks"
  FOR ALL TO authenticated USING ("is_admin"((SELECT auth.uid())));

-- 索引
CREATE INDEX IF NOT EXISTS "idx_tasks_tenant_id" ON "tasks"("tenant_id");

-- updated_at 自动更新触发器
CREATE TRIGGER "tasks_set_updated_at"
  BEFORE UPDATE ON "tasks"
  FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();


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
  USING ((SELECT auth.uid()) = user_id AND category = 'auth');

-- 管理员查看所有日志
CREATE POLICY "activity_logs_admin_select" ON "activity_logs"
  FOR SELECT TO authenticated
  USING ("is_admin"((SELECT auth.uid())));

-- 认证用户写入自己的认证日志
CREATE POLICY "activity_logs_auth_insert" ON "activity_logs"
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id AND category = 'auth');

-- service_role 直写任意日志
CREATE POLICY "activity_logs_server_insert" ON "activity_logs"
  FOR INSERT TO service_role
  WITH CHECK (true);

-- 索引
CREATE INDEX IF NOT EXISTS "idx_activity_logs_category"   ON "activity_logs"(category);
CREATE INDEX IF NOT EXISTS "idx_activity_logs_user_id"    ON "activity_logs"(user_id);
CREATE INDEX IF NOT EXISTS "idx_activity_logs_created_at" ON "activity_logs"(created_at DESC);
CREATE INDEX IF NOT EXISTS "idx_activity_logs_metadata"   ON "activity_logs" USING GIN (metadata);


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
    id, email, username, display_name, auth_provider, is_anonymous, email_verified
  )
  VALUES (
    NEW.id,
    NEW.email,
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


-- ╔════════════════════════════════════════════════════════════════╗
-- ║  4. Supabase Storage Bucket + RLS 策略                        ║
-- ║  Bucket: avatars (公开), campaign-assets (公开), uploads (私有) ║
-- ║                                                               ║
-- ║  RLS 策略设计原则：                                             ║
-- ║  - 每 bucket 1 条用户操作策略 + 1 条管理员策略（permissive）     ║
-- ║  - SELECT 策略按需独立（public/authenticated 不同）             ║
-- ║  - RESTRICTIVE 策略防 anon 写入/删除 + 限制 bucket 范围          ║
-- ║  - 使用 (SELECT auth.uid()) 子查询优化每行重复评估              ║
-- ╚════════════════════════════════════════════════════════════════╝

-- ════════════════════════════════════════════════════════════════
--  4a. avatars — 用户头像 Bucket（公开读）
--  认证用户操作自己目录（路径第一段 = uid）
-- ════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 'avatars', true,
  2097152,   -- 2 MB
  ARRAY['image/png','image/jpeg','image/gif','image/webp']
) ON CONFLICT (id) DO NOTHING;

-- 认证用户操作自己目录（SELECT/INSERT/UPDATE/DELETE 合一）
CREATE POLICY "avatars_user_own" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

-- 管理员全权限
CREATE POLICY "avatars_admin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'avatars' AND "is_admin"((SELECT auth.uid())));

-- 公开读取
CREATE POLICY "avatars_public_select" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'avatars');


-- ════════════════════════════════════════════════════════════════
--  4b. campaign-assets — 营销活动素材 Bucket（公开读，管理员写）
-- ════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'campaign-assets', 'campaign-assets', true,
  10485760,  -- 10 MB
  ARRAY['image/png','image/jpeg','image/gif','image/webp','video/mp4']
) ON CONFLICT (id) DO NOTHING;

-- 管理员全权限（SELECT/INSERT/UPDATE/DELETE 合一）
CREATE POLICY "campaign_assets_admin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'campaign-assets'
    AND "is_admin"((SELECT auth.uid()))
  );

-- 公开读取
CREATE POLICY "campaign_assets_public_select" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'campaign-assets');


-- ════════════════════════════════════════════════════════════════
--  4c. uploads — 私有文件 Bucket（用户路径隔离 + 管理员全权限）
-- ════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'uploads', 'uploads', false,
  52428800,  -- 50 MB
  NULL       -- 不限制 MIME 类型
) ON CONFLICT (id) DO NOTHING;

-- 认证用户操作自己目录（SELECT/INSERT/UPDATE/DELETE 合一）
CREATE POLICY "uploads_user_own" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'uploads'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'uploads'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

-- 管理员全权限
CREATE POLICY "uploads_admin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'uploads' AND "is_admin"((SELECT auth.uid())));


-- ════════════════════════════════════════════════════════════════
--  4d. Storage RLS 加固 — RESTRICTIVE 策略
--  permissive 策略为 OR 逻辑，RESTRICTIVE 策略为 AND 逻辑
--  最终权限 = (通过所有 RESTRICTIVE) AND (通过至少一条 permissive)
-- ════════════════════════════════════════════════════════════════

-- ① 限制所有操作只能在管理的 3 个 bucket 范围内
--    FOR ALL 必须同时声明 USING + WITH CHECK（INSERT 只看 WITH CHECK）
CREATE POLICY "storage_scope_restrict" ON storage.objects
  AS RESTRICTIVE
  FOR ALL
  TO public
  USING (bucket_id IN ('avatars', 'campaign-assets', 'uploads'))
  WITH CHECK (bucket_id IN ('avatars', 'campaign-assets', 'uploads'));

-- ② campaign-assets：DELETE 仅限管理员（加固 permissive 策略）
CREATE POLICY "campaign_assets_restrict_delete" ON storage.objects
  AS RESTRICTIVE
  FOR DELETE
  TO public
  USING (
    bucket_id != 'campaign-assets'
    OR "is_admin"((SELECT auth.uid()))
  );

-- ③ uploads：anon 角色完全禁止（private bucket 加固）
CREATE POLICY "uploads_restrict_anon" ON storage.objects
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (bucket_id != 'uploads')
  WITH CHECK (bucket_id != 'uploads');


-- ╔════════════════════════════════════════════════════════════════╗
-- ║  5. storage_trash — 回收站记录表                               ║
-- ║  删除文件时移动到 __trash__ 前缀，30 天后自动清理              ║
-- ╚════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS "storage_trash" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "original_bucket" TEXT NOT NULL,
  "original_path"   TEXT NOT NULL,
  "trash_path"      TEXT NOT NULL,
  "file_name"       TEXT NOT NULL,
  "mime_type"       TEXT,
  "file_size"       BIGINT NOT NULL DEFAULT 0,
  "deleted_by"      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  "expires_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days',
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE "storage_trash" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "storage_trash" FORCE ROW LEVEL SECURITY;

-- 仅管理员可读写回收站
CREATE POLICY "storage_trash_admin_all" ON "storage_trash"
  FOR ALL TO authenticated
  USING ("is_admin"((SELECT auth.uid())))
  WITH CHECK ("is_admin"((SELECT auth.uid())));

-- 索引：按过期时间（定时清理任务用）
CREATE INDEX IF NOT EXISTS "idx_storage_trash_expires"
  ON "storage_trash"("expires_at")
  WHERE "expires_at" IS NOT NULL;

-- 索引：按创建时间（列表排序用）
CREATE INDEX IF NOT EXISTS "idx_storage_trash_created"
  ON "storage_trash"("created_at" DESC);


-- ╔════════════════════════════════════════════════════════════════╗
-- ║  6. Seed: 内置管理员 profiles 记录                            ║
-- ║  Auth 用户由服务端 ensureAdminAuthUser() 在首次请求时创建     ║
-- ║  固定 UUID: 9e638ba2-41aa-4434-a68b-6bd9f7ed0963             ║
-- ║  此处预置 profiles 记录，确保 role='admin'（handle_new_user  ║
-- ║  触发器默认 role='user'，需手动覆盖）                        ║
-- ╚════════════════════════════════════════════════════════════════╝

-- 注意：auth.users 记录由服务端通过 Supabase Admin API 创建，
-- 不在此 migration 中直接 INSERT INTO auth.users（auth schema 权限受限）。
-- 此 INSERT 仅在 auth.users 中已存在该 UUID 时才成功（FK 约束）。
INSERT INTO public.profiles (id, username, display_name, role, plan_status, auth_provider, is_anonymous, email_verified)
VALUES (
  '9e638ba2-41aa-4434-a68b-6bd9f7ed0963'::uuid,
  'admin',
  'Administrator',
  'admin',
  'pro',
  'email',
  false,
  true
) ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  plan_status = 'pro',
  updated_at = NOW();
