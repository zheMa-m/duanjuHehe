-- ============================================================================
-- 0099 定时任务：审计日志归档 + 回收站自动清理
--
-- 前置依赖：0001_core.sql（storage_trash）
--
-- 核心职责：
--   1. 启用 pg_cron + pg_net 扩展（如果可用）
--   2. 注册每日凌晨 2:00 审计日志归档任务
--   3. 注册每日凌晨 3:00 回收站过期文件清理任务
-- ============================================================================

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  1. 启用扩展                                                              ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

DO $$
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipping pg_cron (insufficient privilege or unsupported)';
  END;

  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_net;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipping pg_net (insufficient privilege or unsupported)';
  END;
END $$;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  2. 审计日志归档定时任务（每日 2:00 UTC）                                   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN

    BEGIN
      PERFORM cron.unschedule('cron_archive_audit_logs');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    PERFORM cron.schedule(
      'cron_archive_audit_logs',
      '0 2 * * *',
      $job$
      SELECT net.http_post(
        url:='http://localhost:3000/api/admin/audit-logs/archive',
        headers:=jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', 'hehe_archive_cron_secret_placeholder'
        ),
        body:='{}'::jsonb
      );
      $job$
    );

    RAISE NOTICE 'Scheduled cron_archive_audit_logs at 2:00 UTC daily';
  ELSE
    RAISE NOTICE 'pg_cron or pg_net not available, skipping audit archive cron';
  END IF;
END $$;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  3. 回收站自动清理定时任务（每日 3:00 UTC）                                 ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN

    BEGIN
      PERFORM cron.unschedule('cron_trash_cleanup');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    PERFORM cron.schedule(
      'cron_trash_cleanup',
      '0 3 * * *',
      $job$
      SELECT net.http_post(
        url:='http://localhost:3000/api/admin/storage/trash/cleanup',
        headers:=jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', 'hehe_archive_cron_secret_placeholder'
        ),
        body:='{}'::jsonb
      );
      $job$
    );

    RAISE NOTICE 'Scheduled cron_trash_cleanup at 3:00 UTC daily';
  ELSE
    RAISE NOTICE 'pg_cron or pg_net not available, skipping trash cleanup cron';
  END IF;
END $$;
