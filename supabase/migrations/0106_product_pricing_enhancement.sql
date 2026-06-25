-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  0106: 商品定价策略增强                                                   ║
-- ║  - 新增 pricing JSONB 结构化定价（支持多币种/阶梯/试用期/划线价）            ║
-- ║  - 新增 description / image_url 字段                                      ║
-- ║  - 新增商品名称唯一约束（同租户 + 未归档）                                   ║
-- ║  - payment_meta 基础 CHECK 约束                                           ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ─── 1. 结构化定价字段 ────────────────────────────────────────────────────
ALTER TABLE products ADD COLUMN IF NOT EXISTS pricing JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN products.pricing IS
  'Structured pricing: { base_price, currency, billing_interval, trial_days, setup_fee, compare_at_price, tiers: [...] }';

-- 将现有 price 字段值回填到 pricing.base_price（兼容过渡）
UPDATE products
SET pricing = jsonb_set(
  pricing,
  '{base_price}',
  to_jsonb(price)
)
WHERE pricing = '{}'::jsonb AND price IS NOT NULL;

-- ─── 2. 商品描述与图片 ────────────────────────────────────────────────────
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';

COMMENT ON COLUMN products.description IS 'Product description (supports plain text or Markdown)';
COMMENT ON COLUMN products.image_url IS 'Product image URL (Supabase Storage path or external URL)';

-- ─── 2.5 补充 archived_at 列（如不存在） ──────────────────────────────────
ALTER TABLE products ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- ─── 3. 商品名称唯一约束（同租户 + 未归档） ────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_tenant_name_active
  ON products (tenant_id, LOWER(name))
  WHERE archived_at IS NULL;

-- ─── 4. payment_meta 基础结构约束 ─────────────────────────────────────────
ALTER TABLE products ADD CONSTRAINT chk_payment_meta_is_object
  CHECK (jsonb_typeof(payment_meta) = 'object');

-- ─── 5. pricing 基础结构约束 ─────────────────────────────────────────────
ALTER TABLE products ADD CONSTRAINT chk_pricing_is_object
  CHECK (jsonb_typeof(pricing) = 'object');

-- ─── 6. 补充索引：支持按价格排序查询 ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_products_price ON products (price);
CREATE INDEX IF NOT EXISTS idx_products_active_tenant ON products (tenant_id, is_active) WHERE archived_at IS NULL;
