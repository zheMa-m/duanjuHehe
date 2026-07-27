-- Seed coffee shops and menu data
-- Run this in Supabase SQL Editor

BEGIN;

-- Shops
INSERT INTO coffee_shops (id, name, address, city, phone, opening_hours, latitude, longitude)
VALUES
  ('11111111-1111-4111-8111-111111111111', 'HEHE Coffee Downtown', '123 Main Street, Downtown', 'Shanghai', '021-5555-0101', '{"Mon-Fri":"7:00-22:00","Sat-Sun":"8:00-23:00"}', 31.2304, 121.4737),
  ('22222222-2222-4222-8222-222222222222', 'HEHE Coffee West Hub', '456 West Avenue, Tech Park', 'Beijing', '010-6666-0202', '{"Mon-Sun":"8:00-21:00"}', 39.9042, 116.4074)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, city = EXCLUDED.city;

-- Menu: SHOP 1 — Downtown
INSERT INTO coffee_menu_items (id, shop_id, name, description, price, category, sort_order) VALUES
  ('a1010001-0001-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'Americano', 'Classic black coffee made with double espresso shots and hot water', 22.00, 'classic', 1),
  ('a1010001-0001-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'Latte', 'Espresso with steamed milk and a light layer of foam', 28.00, 'classic', 2),
  ('a1010001-0001-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'Cappuccino', 'Equal parts espresso, steamed milk, and milk foam', 28.00, 'classic', 3),
  ('a1010001-0001-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', 'Mocha', 'Espresso with chocolate syrup and steamed milk, topped with whipped cream', 32.00, 'classic', 4),
  ('a1010001-0001-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', 'Dirty Coffee', 'Cold milk topped with a double shot of hot espresso', 26.00, 'specialty', 5),
  ('a1010001-0001-4000-8000-000000000006', '11111111-1111-4111-8111-111111111111', 'Cold Brew', 'Cold-brewed for 18 hours, smooth and bold', 25.00, 'specialty', 6),
  ('a1010001-0001-4000-8000-000000000007', '11111111-1111-4111-8111-111111111111', 'Matcha Latte', 'Ceremonial grade matcha whisked with steamed milk', 30.00, 'tea', 7),
  ('a1010001-0001-4000-8000-000000000008', '11111111-1111-4111-8111-111111111111', 'Earl Grey Tea', 'Premium loose-leaf Earl Grey with bergamot', 20.00, 'tea', 8),
  ('a1010001-0001-4000-8000-000000000009', '11111111-1111-4111-8111-111111111111', 'Croissant', 'Buttery, flaky French croissant baked fresh daily', 15.00, 'pastry', 9),
  ('a1010001-0001-4000-8000-000000000010', '11111111-1111-4111-8111-111111111111', 'Blueberry Muffin', 'Moist muffin loaded with fresh blueberries', 12.00, 'pastry', 10),
  ('a1010001-0001-4000-8000-000000000011', '11111111-1111-4111-8111-111111111111', 'Seasonal: Sakura Latte', 'Limited spring edition with cherry blossom syrup', 35.00, 'seasonal', 11)
ON CONFLICT (id) DO NOTHING;

-- Menu: SHOP 2 — West Hub
INSERT INTO coffee_menu_items (id, shop_id, name, description, price, category, sort_order) VALUES
  ('a2020002-0002-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', 'Americano', 'Classic black coffee made with double espresso shots', 20.00, 'classic', 1),
  ('a2020002-0002-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222', 'Latte', 'Espresso with steamed milk and foam', 26.00, 'classic', 2),
  ('a2020002-0002-4000-8000-000000000003', '22222222-2222-4222-8222-222222222222', 'Flat White', 'Double espresso with velvety microfoam milk', 30.00, 'specialty', 3),
  ('a2020002-0002-4000-8000-000000000004', '22222222-2222-4222-8222-222222222222', 'Lemon Tea', 'Freshly brewed black tea with lemon', 18.00, 'tea', 4),
  ('a2020002-0002-4000-8000-000000000005', '22222222-2222-4222-8222-222222222222', 'Bagel with Cream Cheese', 'Toasted bagel served with cream cheese', 14.00, 'pastry', 5)
ON CONFLICT (id) DO NOTHING;

COMMIT;
