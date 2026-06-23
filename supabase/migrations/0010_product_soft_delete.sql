-- 0010: 产品软删除与业务分类

-- 1. 软删除字段
ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

COMMENT ON COLUMN products.archived_at IS 'soft-delete timestamp; if set, product is considered archived';

-- 2. 业务分类
ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'subscription';

ALTER TABLE IF EXISTS products DROP CONSTRAINT IF EXISTS products_category_check;
ALTER TABLE IF EXISTS products ADD CONSTRAINT products_category_check
  CHECK (category IN ('subscription', 'one_time', 'addon'));

COMMENT ON COLUMN products.category IS 'product category: subscription | one_time | addon';

-- 3. 为已有记录设置默认分类
UPDATE products SET category = 'subscription' WHERE category IS NULL;
