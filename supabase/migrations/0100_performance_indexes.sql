-- ============================================================================
-- 0100 性能索引优化 + 无效索引清理 + Cron Job 修复
--
-- 前置依赖：0002_iap.sql / 0003_campaign.sql / 0005_system.sql / 0010_product_soft_delete.sql
--
-- 变更清单：
--   1. orders 表：删除无效索引 + 新增 (status, created_at DESC) 复合索引
--   2. subscriptions 表：新增 (status) 单列索引
--   3. products 表：新增 (category, is_active) 复合索引
--   4. Cron Job 修复：将 localhost URL 替换为生产域名
-- ============================================================================

BEGIN;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  1. orders — 清理无效索引 + 新增复合索引                                 ║
-- ║                                                                          ║
-- ║  idx_orders_campaign_id / idx_orders_session_id 引用了不存在的列          ║
-- ║  （campaign_id / session_id 已迁移至 0003 的 campaign_orders 关联表）     ║
-- ║                                                                          ║
-- ║  revenue API 高频查询模式：WHERE status = 'paid' ORDER BY created_at     ║
-- ║  新增 (status, created_at DESC) 复合索引覆盖此模式                       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- 安全删除可能遗留的无效索引（如果列已不存在则跳过）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'orders' AND indexname = 'idx_orders_campaign_id'
  ) THEN
    DROP INDEX IF EXISTS idx_orders_campaign_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'orders' AND indexname = 'idx_orders_session_id'
  ) THEN
    DROP INDEX IF EXISTS idx_orders_session_id;
  END IF;
END $$;

-- 新增 (status, created_at DESC) 复合索引 — revenue / 订单列表查询
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);

-- 新增 (user_id, created_at DESC) 复合索引 — 用户订单列表分页
CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at DESC);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  2. subscriptions — 新增 status 索引                                     ║
-- ║                                                                          ║
-- ║  Admin 订阅列表高频按 status 筛选，缺少独立索引导致全表扫描                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- 新增 (user_id, status) 复合索引 — 用户订阅状态查询 + 管理后台组合筛选
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  3. products — 新增 (category, is_active) 复合索引                       ║
-- ║                                                                          ║
-- ║  公开产品列表 API 按分类 + 上架状态筛选，新增索引覆盖此高频查询            ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE INDEX IF NOT EXISTS idx_products_category_active ON products(category, is_active);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  4. Cron Job URL 修复（生产环境需手动执行）                               ║
-- ║                                                                          ║
-- ║  0099 中 cron job URL 硬编码为 http://localhost:3000，部署后失效。        ║
-- ║  此处提供修复脚本模板：                                                   ║
-- ║                                                                          ║
-- ║  部署到生产环境后，在 Supabase SQL Editor 中执行以下命令：                 ║
-- ║                                                                          ║
-- ║  SELECT cron.unschedule('cron_archive_audit_logs');                      ║
-- ║  SELECT cron.schedule(                                                    ║
-- ║    'cron_archive_audit_logs',                                             ║
-- ║    '0 2 * * *',                                                           ║
-- ║    $$SELECT net.http_post(                                                 ║
-- ║      url:='https://YOUR_DOMAIN/api/admin/audit-logs/archive',            ║
-- ║      headers:=jsonb_build_object(                                         ║
-- ║        'Content-Type', 'application/json',                                ║
-- ║        'x-cron-secret', 'hehe_archive_cron_secret_placeholder'           ║
-- ║      ),                                                                    ║
-- ║      body:='{}'::jsonb                                                    ║
-- ║    )$$                                                                     ║
-- ║  );                                                                        ║
-- ║                                                                          ║
-- ║  SELECT cron.unschedule('cron_trash_cleanup');                           ║
-- ║  SELECT cron.schedule(                                                    ║
-- ║    'cron_trash_cleanup',                                                  ║
-- ║    '0 3 * * *',                                                           ║
-- ║    $$SELECT net.http_post(                                                 ║
-- ║      url:='https://YOUR_DOMAIN/api/admin/storage/trash/cleanup',         ║
-- ║      headers:=jsonb_build_object(                                         ║
-- ║        'Content-Type', 'application/json',                                ║
-- ║        'x-cron-secret', 'hehe_archive_cron_secret_placeholder'           ║
-- ║      ),                                                                    ║
-- ║      body:='{}'::jsonb                                                    ║
-- ║    )$$                                                                     ║
-- ║  );                                                                        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

COMMIT;
