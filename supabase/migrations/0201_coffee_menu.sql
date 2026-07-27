-- ============================================================================
-- 0201: Coffee Menu â€?menu items table + seed data
--
-- Depends: 0200_coffee_shops.sql
-- ============================================================================

BEGIN;

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

COMMENT ON TABLE coffee_menu_items IS 'Coffee shop menu items';
COMMENT ON COLUMN coffee_menu_items.category IS 'classic | specialty | tea | pastry | seasonal';

ALTER TABLE coffee_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE coffee_menu_items FORCE ROW LEVEL SECURITY;

CREATE POLICY menu_items_public_read ON coffee_menu_items
  FOR SELECT TO public
  USING (is_available = TRUE);

CREATE POLICY menu_items_admin_all ON coffee_menu_items
  FOR ALL TO authenticated
  USING (is_admin((SELECT auth.uid())))
  WITH CHECK (is_admin((SELECT auth.uid())));

CREATE INDEX IF NOT EXISTS idx_menu_items_shop
  ON coffee_menu_items (shop_id, category, sort_order);

CREATE INDEX IF NOT EXISTS idx_menu_items_available
  ON coffee_menu_items (is_available);

CREATE TRIGGER menu_items_set_updated_at
  BEFORE UPDATE ON coffee_menu_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- seed: menu items for shop 1 (Downtown)
DO $$
DECLARE
  shop1_id UUID;
  shop2_id UUID;
BEGIN
  SELECT id INTO shop1_id FROM coffee_shops WHERE name = 'HEHE Coffee Downtown' LIMIT 1;
  SELECT id INTO shop2_id FROM coffee_shops WHERE name = 'HEHE Coffee West Hub' LIMIT 1;

  IF shop1_id IS NOT NULL THEN
    INSERT INTO coffee_menu_items (shop_id, name, description, price, category, sort_order) VALUES
      (shop1_id, 'Americano', 'Classic black coffee made with double espresso shots and hot water', 22.00, 'classic', 1),
      (shop1_id, 'Latte', 'Espresso with steamed milk and a light layer of foam', 28.00, 'classic', 2),
      (shop1_id, 'Cappuccino', 'Equal parts espresso, steamed milk, and milk foam', 28.00, 'classic', 3),
      (shop1_id, 'Mocha', 'Espresso with chocolate syrup and steamed milk, topped with whipped cream', 32.00, 'classic', 4),
      (shop1_id, 'Dirty Coffee', 'Cold milk topped with a double shot of hot espresso', 26.00, 'specialty', 5),
      (shop1_id, 'Cold Brew', 'Cold-brewed for 18 hours, smooth and bold', 25.00, 'specialty', 6),
      (shop1_id, 'Matcha Latte', 'Ceremonial grade matcha whisked with steamed milk', 30.00, 'tea', 7),
      (shop1_id, 'Earl Grey Tea', 'Premium loose-leaf Earl Grey with bergamot', 20.00, 'tea', 8),
      (shop1_id, 'Croissant', 'Buttery, flaky French croissant baked fresh daily', 15.00, 'pastry', 9),
      (shop1_id, 'Blueberry Muffin', 'Moist muffin loaded with fresh blueberries', 12.00, 'pastry', 10),
      (shop1_id, 'Seasonal: Sakura Latte', 'Limited spring edition with cherry blossom syrup', 35.00, 'seasonal', 11);
  END IF;

  IF shop2_id IS NOT NULL THEN
    INSERT INTO coffee_menu_items (shop_id, name, description, price, category, sort_order) VALUES
      (shop2_id, 'Americano', 'Classic black coffee made with double espresso shots', 20.00, 'classic', 1),
      (shop2_id, 'Latte', 'Espresso with steamed milk and foam', 26.00, 'classic', 2),
      (shop2_id, 'Flat White', 'Double espresso with velvety microfoam milk', 30.00, 'specialty', 3),
      (shop2_id, 'Lemon Tea', 'Freshly brewed black tea with lemon', 18.00, 'tea', 4),
      (shop2_id, 'Bagel with Cream Cheese', 'Toasted bagel served with cream cheese', 14.00, 'pastry', 5);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;
