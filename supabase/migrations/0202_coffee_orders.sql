-- ============================================================================
-- 0202: Coffee Orders — extend orders table for coffee-specific fields
--
-- Depends: 0002_iap.sql (orders table), 0200_coffee_shops.sql
-- ============================================================================

BEGIN;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES coffee_shops(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type TEXT NOT NULL DEFAULT 'takeout'
  CHECK (order_type IN ('dine_in', 'takeout'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customizations JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN orders.shop_id IS 'Coffee shop where the order is placed';
COMMENT ON COLUMN orders.pickup_code IS 'Pickup code generated per shop per day (e.g. A001, B042)';
COMMENT ON COLUMN orders.order_type IS 'dine_in (for here) or takeout (to go)';
COMMENT ON COLUMN orders.customizations IS 'JSON: [{ item_name, sugar: full|half|none, ice: normal|less|none, size: small|medium|large, quantity }]';

CREATE INDEX IF NOT EXISTS idx_orders_shop_id ON orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_orders_pickup_code ON orders(pickup_code) WHERE pickup_code IS NOT NULL;

NOTIFY pgrst, 'reload schema';

COMMIT;
