-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  0109: 智能问卷商品关联修复                                               ║
-- ║  - products 表插入 starpath 商品（订阅 + 一次性购买）                       ║
-- ║  - 存量订单回填 product_id（修复 NULL 关联）                               ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ─── 1. 插入智能问卷商品 ────────────────────────────────────────────────────
-- 使用与现有商品相同的 tenant_id（从已有商品中获取）
INSERT INTO products (name, price, is_active, payment_meta, tenant_id, created_at, updated_at)
SELECT n.name, n.price, true, '{}'::jsonb, p.tenant_id, NOW(), NOW()
FROM (VALUES
  ('智能问卷 7天试用订阅', 7.99),
  ('智能问卷 AI 报告（一次性购买）', 9.99)
) AS n(name, price)
CROSS JOIN (SELECT tenant_id FROM products LIMIT 1) p
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = n.name);

-- ─── 2. 存量订单回填 product_id ────────────────────────────────────────────
-- 将 "智能问卷 Plan: trial-7d" 关联到 7天试用订阅
UPDATE orders
SET product_id = (
  SELECT id FROM products WHERE name = '智能问卷 7天试用订阅' LIMIT 1
)
WHERE product_name LIKE '智能问卷 Plan: trial%'
  AND product_id IS NULL;

-- 将 "智能问卷 AI Report (One-Time)" 关联到 一次性购买商品
UPDATE orders
SET product_id = (
  SELECT id FROM products WHERE name = '智能问卷 AI 报告（一次性购买）' LIMIT 1
)
WHERE product_name = '智能问卷 AI Report (One-Time)'
  AND product_id IS NULL;
