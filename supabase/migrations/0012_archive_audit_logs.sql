-- ====================================================================
-- 0012 审计日志冷热归档定时任务
--
-- 核心职责：
--   1. 在 storage.buckets 中创建私有桶 audit-archives
--   2. 启用 pg_cron 与 pg_net 扩展
--   3. 注册定时任务：每日凌晨 2:00 调用后端归档接口
-- ====================================================================

-- ╔════════════════════════════════════════════════════════════════╗
-- ║  1. 创建冷存储私有桶 audit-archives                            ║
-- ╚════════════════════════════════════════════════════════════════╗
INSERT INTO "storage"."buckets" ("id", "name", "public", "file_size_limit", "allowed_mime_types")
VALUES (
  'audit-archives',
  'audit-archives',
  false,
  52428800,  -- 50MB
  '{"application/json"}'
)
ON CONFLICT ("id") DO NOTHING;


-- ╔════════════════════════════════════════════════════════════════╗
-- ║  2. 启用扩展与注册定时任务 (pg_cron & pg_net)                  ║
-- ║  注意：嵌套使用 Dollar Quote 时，内部使用 $job$ 避免解析冲突   ║
-- ╚════════════════════════════════════════════════════════════════╝
DO $$
BEGIN
    -- 尝试安装 pg_cron
    BEGIN
        CREATE EXTENSION IF NOT EXISTS pg_cron;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipping pg_cron installation (insufficient privilege or unsupported)';
    END;
    
    -- 尝试安装 pg_net
    BEGIN
        CREATE EXTENSION IF NOT EXISTS pg_net;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipping pg_net installation (insufficient privilege or unsupported)';
    END;
END $$;

-- 注册每日归档任务 (如果扩展安装成功)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
        -- 防止重复注册，先强行注销旧任务
        BEGIN
            PERFORM cron.unschedule('cron_archive_audit_logs');
        EXCEPTION WHEN OTHERS THEN
            -- 忽略任务不存在时的报错
        END;

        -- 调度新任务，每天凌晨 2 点执行
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
        RAISE NOTICE 'Successfully scheduled cron_archive_audit_logs';
    ELSE
        RAISE NOTICE 'Cron or Net extension is missing, skip scheduling in database';
    END IF;
END $$;
