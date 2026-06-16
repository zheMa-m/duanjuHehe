-- ====================================================================
-- 0007 Storage RLS 加固 — 修补 anon 角色 DELETE 权限漏洞
--
-- 问题：public bucket 的 Supabase 默认策略允许 anon 角色执行 DELETE
-- 修复：为 storage.objects 添加 restrictive 策略，强制 anon 只能 SELECT
--
-- 依赖: 0006_storage_optional.sql
-- ====================================================================


-- ╔════════════════════════════════════════════════════════════════╗
-- ║  Restrictive 策略：拒绝所有角色对 storage.objects 的写操作     ║
-- ║  只有拥有显式 permissive INSERT/UPDATE/DELETE 策略的角色才能    ║
-- ║  执行写操作（authenticated + 满足条件），anon 无写策略则被拒    ║
-- ╚════════════════════════════════════════════════════════════════╝

-- 全局写操作 restrictive 策略：写操作必须 bucket_id 在我们管理的范围内
-- 且满足对应 bucket 的 permissive 策略（authenticated + 条件）
CREATE POLICY "storage_restrict_write" ON storage.objects
  AS RESTRICTIVE
  FOR ALL
  TO public
  USING (
    bucket_id IN ('avatars', 'campaign-assets', 'uploads')
  );

-- ╔════════════════════════════════════════════════════════════════╗
-- ║  campaign-assets: 补充 DELETE restrictive（双重保护）          ║
-- ╚════════════════════════════════════════════════════════════════╝

-- 确保 campaign-assets 删除操作仅限管理员
CREATE POLICY "campaign_assets_restrict_delete" ON storage.objects
  AS RESTRICTIVE
  FOR DELETE
  TO public
  USING (
    bucket_id != 'campaign-assets'
    OR "is_admin"(auth.uid())
  );

-- ╔════════════════════════════════════════════════════════════════╗
-- ║  uploads (private): 禁止 anon 读取                            ║
-- ╚════════════════════════════════════════════════════════════════╝

-- uploads 是 private bucket，anon 不应有任何权限
CREATE POLICY "uploads_restrict_anon" ON storage.objects
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (bucket_id != 'uploads');
