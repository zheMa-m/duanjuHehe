-- ====================================================================
-- 0006 Storage 可选模块 — Supabase Storage Bucket + RLS 策略
--
-- 依赖: 0001_core.sql（is_admin 函数、profiles 表）
--
-- Bucket 清单：
--   1. avatars         — 用户头像（公开读，认证用户写自己目录）
--   2. campaign-assets — 营销素材（公开读，仅管理员写入）
--   3. uploads         — 通用私有文件（私有，认证用户读写自己目录）
--
-- 路径规范：{bucket}/{user_id}/{filename}
-- ⚠️  可选模块：不启用则不影响核心功能运行
-- ====================================================================


-- ╔════════════════════════════════════════════════════════════════╗
-- ║  1. avatars — 用户头像 Bucket                                   ║
-- ║  公开读 + 认证用户仅可上传到自己目录                            ║
-- ╚════════════════════════════════════════════════════════════════╝

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 'avatars', true,
  2097152,   -- 2 MB
  ARRAY['image/png','image/jpeg','image/gif','image/webp']
) ON CONFLICT (id) DO NOTHING;

-- 认证用户上传到自己目录（路径第一段 = uid）
CREATE POLICY "avatars_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 认证用户更新自己目录下的文件
CREATE POLICY "avatars_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 认证用户删除自己目录下的文件
CREATE POLICY "avatars_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 管理员全权限
CREATE POLICY "avatars_admin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'avatars' AND "is_admin"(auth.uid()));

-- 公开读取（public bucket 自动允许，但显式声明更清晰）
CREATE POLICY "avatars_public_select" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'avatars');


-- ╔════════════════════════════════════════════════════════════════╗
-- ║  2. campaign-assets — 营销活动素材 Bucket                        ║
-- ║  公开读 + 仅管理员可写入/更新/删除                              ║
-- ╚════════════════════════════════════════════════════════════════╝

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'campaign-assets', 'campaign-assets', true,
  10485760,  -- 10 MB
  ARRAY['image/png','image/jpeg','image/gif','image/webp','video/mp4']
) ON CONFLICT (id) DO NOTHING;

-- 仅管理员可上传
CREATE POLICY "campaign_assets_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'campaign-assets'
    AND "is_admin"(auth.uid())
  );

-- 仅管理员可更新
CREATE POLICY "campaign_assets_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'campaign-assets'
    AND "is_admin"(auth.uid())
  );

-- 仅管理员可删除
CREATE POLICY "campaign_assets_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'campaign-assets'
    AND "is_admin"(auth.uid())
  );

-- 公开读取
CREATE POLICY "campaign_assets_public_select" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'campaign-assets');


-- ╔════════════════════════════════════════════════════════════════╗
-- ║  3. uploads — 通用私有文件 Bucket                               ║
-- ║  私有访问 + 认证用户读写自己目录 + 管理员全权限                 ║
-- ╚════════════════════════════════════════════════════════════════╝

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'uploads', 'uploads', false,
  52428800,  -- 50 MB
  NULL       -- 不限制 MIME 类型
) ON CONFLICT (id) DO NOTHING;

-- 认证用户读取自己目录下的文件
CREATE POLICY "uploads_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 认证用户上传到自己目录
CREATE POLICY "uploads_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 认证用户更新自己目录下的文件
CREATE POLICY "uploads_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 认证用户删除自己目录下的文件
CREATE POLICY "uploads_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 管理员全权限
CREATE POLICY "uploads_admin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'uploads' AND "is_admin"(auth.uid()));
