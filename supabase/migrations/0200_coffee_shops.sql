-- ============================================================================
-- 0200: Coffee Shops — coffee shop locations table
--
-- Depends: 0001_core.sql (set_updated_at(), is_admin())
-- ============================================================================

BEGIN;

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

-- RLS: public read active shops
CREATE POLICY coffee_shops_public_read ON coffee_shops
  FOR SELECT TO public
  USING (is_active = TRUE);

-- RLS: admin full access
CREATE POLICY coffee_shops_admin_all ON coffee_shops
  FOR ALL TO authenticated
  USING (is_admin((SELECT auth.uid())))
  WITH CHECK (is_admin((SELECT auth.uid())));

COMMIT;
