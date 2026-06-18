-- ====================================================================
-- 0013 回收站过期文件自动清理定时任务
--
-- 核心职责：
--   1. 注册 pg_cron 定时任务：每日凌晨 3:00 清理过期回收站文件
--   2. 利用已有的 cleanupExpiredTrash 逻辑（30 天过期）
-- ====================================================================

-- ╔════════════════════════════════════════════════════════════════╗
-- ║  注册回收站自动清理定时任务                                     ║
-- ║  每天凌晨 3:00 UTC 自动清理所有 expires_at 已过期的回收站文件    ║
-- ║  通过 x-cron-secret 头绕过管理员 JWT 鉴权                       ║
-- ╚════════════════════════════════════════════════════════════════╝
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
        -- 防止重复注册，先注销旧任务
        BEGIN
            PERFORM cron.unschedule('cron_trash_cleanup');
        EXCEPTION WHEN OTHERS THEN
            -- 忽略任务不存在时的报错
        END;

        -- 调度任务：每天凌晨 3:00 UTC 执行
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
        RAISE NOTICE 'Successfully scheduled cron_trash_cleanup';
    ELSE
        RAISE NOTICE 'Cron or Net extension is missing, skip scheduling trash cleanup cron';
    END IF;
END $$;
