-- ============================================================================
-- Coffee Shop Tables — Combined migration for Supabase SQL Editor
-- All idempotent: safe to re-run if tables/policies already exist
-- ============================================================================

BEGIN;

-- ── 0200: Coffee Shops ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS coffee_shops (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  address         TEXT NOT NULL,
  city            TEXT NOT NULL DEFAULT '',
  phone           TEXT NOT NULL DEFAULT '',
  opening_hours   JSONB NOT NULL DEFAULT '{}'::jsonb,
  latitude        DOUBLE PRECISION,
  longitude       DOUBLE PRECISION,
  image_url       TEXT NOT NULL DEFAULT '',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE coffee_shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE coffee_shops FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY coffee_shops_public_read ON coffee_shops FOR SELECT TO public USING (is_active = TRUE);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY coffee_shops_admin_all ON coffee_shops FOR ALL TO authenticated
    USING (is_admin((SELECT auth.uid())))
    WITH CHECK (is_admin((SELECT auth.uid())));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 0203: Seed Coffee Shops ─────────────────────────────────────────────────

INSERT INTO coffee_shops (id, name, address, city, phone, opening_hours, latitude, longitude)
VALUES
  ('11111111-1111-4111-8111-111111111111', 'HEHE Coffee Downtown', '123 Main Street, Downtown', 'Shanghai', '021-5555-0101', '{"Mon-Fri":"7:00-22:00","Sat-Sun":"8:00-23:00"}', 31.2304, 121.4737),
  ('22222222-2222-4222-8222-222222222222', 'HEHE Coffee West Hub', '456 West Avenue, Tech Park', 'Beijing', '010-6666-0202', '{"Mon-Sun":"8:00-21:00"}', 39.9042, 116.4074)
ON CONFLICT (id) DO NOTHING;

-- ── 0201: Coffee Menu Items ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS coffee_menu_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       UUID NOT NULL REFERENCES coffee_shops(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  price         NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  image_url     TEXT NOT NULL DEFAULT '',
  category      TEXT NOT NULL DEFAULT 'classic'
                CHECK (category IN ('classic', 'specialty', 'tea', 'pastry', 'seasonal')),
  is_available  BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE coffee_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE coffee_menu_items FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY menu_items_public_read ON coffee_menu_items FOR SELECT TO public USING (is_available = TRUE);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY menu_items_admin_all ON coffee_menu_items FOR ALL TO authenticated
    USING (is_admin((SELECT auth.uid())))
    WITH CHECK (is_admin((SELECT auth.uid())));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_menu_items_shop ON coffee_menu_items (shop_id, category, sort_order);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON coffee_menu_items (is_available);

-- Seed menu items for SHOP 1 — Downtown
INSERT INTO coffee_menu_items (shop_id, name, description, price, category, sort_order)
SELECT id, 'Americano', 'Classic black coffee made with double espresso shots and hot water', 22.00, 'classic', 1
FROM coffee_shops WHERE name = 'HEHE Coffee Downtown'
AND NOT EXISTS (SELECT 1 FROM coffee_menu_items WHERE shop_id = coffee_shops.id AND name = 'Americano');

INSERT INTO coffee_menu_items (shop_id, name, description, price, category, sort_order)
SELECT id, 'Latte', 'Espresso with steamed milk and a light layer of foam', 28.00, 'classic', 2
FROM coffee_shops WHERE name = 'HEHE Coffee Downtown'
AND NOT EXISTS (SELECT 1 FROM coffee_menu_items WHERE shop_id = coffee_shops.id AND name = 'Latte');

INSERT INTO coffee_menu_items (shop_id, name, description, price, category, sort_order)
SELECT id, 'Cappuccino', 'Equal parts espresso, steamed milk, and milk foam', 28.00, 'classic', 3
FROM coffee_shops WHERE name = 'HEHE Coffee Downtown'
AND NOT EXISTS (SELECT 1 FROM coffee_menu_items WHERE shop_id = coffee_shops.id AND name = 'Cappuccino');

INSERT INTO coffee_menu_items (shop_id, name, description, price, category, sort_order)
SELECT id, 'Mocha', 'Espresso with chocolate syrup and steamed milk, topped with whipped cream', 32.00, 'classic', 4
FROM coffee_shops WHERE name = 'HEHE Coffee Downtown'
AND NOT EXISTS (SELECT 1 FROM coffee_menu_items WHERE shop_id = coffee_shops.id AND name = 'Mocha');

INSERT INTO coffee_menu_items (shop_id, name, description, price, category, sort_order)
SELECT id, 'Dirty Coffee', 'Cold milk topped with a double shot of hot espresso', 26.00, 'specialty', 5
FROM coffee_shops WHERE name = 'HEHE Coffee Downtown'
AND NOT EXISTS (SELECT 1 FROM coffee_menu_items WHERE shop_id = coffee_shops.id AND name = 'Dirty Coffee');

INSERT INTO coffee_menu_items (shop_id, name, description, price, category, sort_order)
SELECT id, 'Cold Brew', 'Cold-brewed for 18 hours, smooth and bold', 25.00, 'specialty', 6
FROM coffee_shops WHERE name = 'HEHE Coffee Downtown'
AND NOT EXISTS (SELECT 1 FROM coffee_menu_items WHERE shop_id = coffee_shops.id AND name = 'Cold Brew');

INSERT INTO coffee_menu_items (shop_id, name, description, price, category, sort_order)
SELECT id, 'Matcha Latte', 'Ceremonial grade matcha whisked with steamed milk', 30.00, 'tea', 7
FROM coffee_shops WHERE name = 'HEHE Coffee Downtown'
AND NOT EXISTS (SELECT 1 FROM coffee_menu_items WHERE shop_id = coffee_shops.id AND name = 'Matcha Latte');

INSERT INTO coffee_menu_items (shop_id, name, description, price, category, sort_order)
SELECT id, 'Earl Grey Tea', 'Premium loose-leaf Earl Grey with bergamot', 20.00, 'tea', 8
FROM coffee_shops WHERE name = 'HEHE Coffee Downtown'
AND NOT EXISTS (SELECT 1 FROM coffee_menu_items WHERE shop_id = coffee_shops.id AND name = 'Earl Grey Tea');

INSERT INTO coffee_menu_items (shop_id, name, description, price, category, sort_order)
SELECT id, 'Croissant', 'Buttery, flaky French croissant baked fresh daily', 15.00, 'pastry', 9
FROM coffee_shops WHERE name = 'HEHE Coffee Downtown'
AND NOT EXISTS (SELECT 1 FROM coffee_menu_items WHERE shop_id = coffee_shops.id AND name = 'Croissant');

INSERT INTO coffee_menu_items (shop_id, name, description, price, category, sort_order)
SELECT id, 'Blueberry Muffin', 'Moist muffin loaded with fresh blueberries', 12.00, 'pastry', 10
FROM coffee_shops WHERE name = 'HEHE Coffee Downtown'
AND NOT EXISTS (SELECT 1 FROM coffee_menu_items WHERE shop_id = coffee_shops.id AND name = 'Blueberry Muffin');

INSERT INTO coffee_menu_items (shop_id, name, description, price, category, sort_order)
SELECT id, 'Seasonal: Sakura Latte', 'Limited spring edition with cherry blossom syrup', 35.00, 'seasonal', 11
FROM coffee_shops WHERE name = 'HEHE Coffee Downtown'
AND NOT EXISTS (SELECT 1 FROM coffee_menu_items WHERE shop_id = coffee_shops.id AND name = 'Seasonal: Sakura Latte');

-- Seed menu items for SHOP 2 — West Hub
INSERT INTO coffee_menu_items (shop_id, name, description, price, category, sort_order)
SELECT id, 'Americano', 'Classic black coffee made with double espresso shots', 20.00, 'classic', 1
FROM coffee_shops WHERE name = 'HEHE Coffee West Hub'
AND NOT EXISTS (SELECT 1 FROM coffee_menu_items WHERE shop_id = coffee_shops.id AND name = 'Americano');

INSERT INTO coffee_menu_items (shop_id, name, description, price, category, sort_order)
SELECT id, 'Latte', 'Espresso with steamed milk and foam', 26.00, 'classic', 2
FROM coffee_shops WHERE name = 'HEHE Coffee West Hub'
AND NOT EXISTS (SELECT 1 FROM coffee_menu_items WHERE shop_id = coffee_shops.id AND name = 'Latte');

INSERT INTO coffee_menu_items (shop_id, name, description, price, category, sort_order)
SELECT id, 'Flat White', 'Double espresso with velvety microfoam milk', 30.00, 'specialty', 3
FROM coffee_shops WHERE name = 'HEHE Coffee West Hub'
AND NOT EXISTS (SELECT 1 FROM coffee_menu_items WHERE shop_id = coffee_shops.id AND name = 'Flat White');

INSERT INTO coffee_menu_items (shop_id, name, description, price, category, sort_order)
SELECT id, 'Lemon Tea', 'Freshly brewed black tea with lemon', 18.00, 'tea', 4
FROM coffee_shops WHERE name = 'HEHE Coffee West Hub'
AND NOT EXISTS (SELECT 1 FROM coffee_menu_items WHERE shop_id = coffee_shops.id AND name = 'Lemon Tea');

INSERT INTO coffee_menu_items (shop_id, name, description, price, category, sort_order)
SELECT id, 'Bagel with Cream Cheese', 'Toasted bagel served with cream cheese', 14.00, 'pastry', 5
FROM coffee_shops WHERE name = 'HEHE Coffee West Hub'
AND NOT EXISTS (SELECT 1 FROM coffee_menu_items WHERE shop_id = coffee_shops.id AND name = 'Bagel with Cream Cheese');

-- ── 0202: Coffee Orders (extend existing orders table) ──────────────────────

ALTER TABLE orders ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES coffee_shops(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type TEXT NOT NULL DEFAULT 'takeout' CHECK (order_type IN ('dine_in', 'takeout'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customizations JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_orders_shop_id ON orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_orders_pickup_code ON orders(pickup_code) WHERE pickup_code IS NOT NULL;

COMMIT;
