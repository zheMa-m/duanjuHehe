-- ============================================================================
-- 0203: Seed Coffee Shops
-- Ensures at least 2 shops exist so 0201 menu seed data is valid.
-- Safe to re-run: uses WHERE NOT EXISTS guard.
-- ============================================================================

BEGIN;

INSERT INTO coffee_shops (name, address, city, phone, opening_hours, latitude, longitude, image_url, is_active)
SELECT * FROM (VALUES
  (
    'HEHE Coffee Downtown',
    '88 Nanjing Road, Huangpu District',
    'Shanghai',
    '+86 21 6888 8888',
    '{"mon-fri": "07:30-21:00", "sat-sun": "08:00-22:00"}'::jsonb,
    31.2304,
    121.4737,
    '',
    TRUE
  ),
  (
    'HEHE Coffee West Hub',
    '1088 West Yan''an Road, Changning District',
    'Shanghai',
    '+86 21 6210 9999',
    '{"mon-fri": "08:00-20:00", "sat-sun": "08:30-21:00"}'::jsonb,
    31.2150,
    121.3800,
    '',
    TRUE
  )
) AS s(name, address, city, phone, opening_hours, latitude, longitude, image_url, is_active)
WHERE NOT EXISTS (SELECT 1 FROM coffee_shops LIMIT 1);

COMMIT;
