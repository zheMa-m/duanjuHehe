-- ============================================================================
-- 0205 用户金币系统：金币套餐 + 用户余额 + 交易流水 + 剧集解锁
-- ============================================================================
BEGIN;

-- 1. coin_packages 金币套餐表
CREATE TABLE IF NOT EXISTS coin_packages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  coins_amount  INTEGER NOT NULL CHECK (coins_amount > 0),
  bonus_coins   INTEGER DEFAULT 0 CHECK (bonus_coins >= 0),
  price         NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  currency      TEXT NOT NULL DEFAULT 'USD',
  is_active     BOOLEAN DEFAULT TRUE,
  sort_order    INTEGER DEFAULT 0,
  tenant_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE coin_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_packages FORCE ROW LEVEL SECURITY;

CREATE POLICY coin_packages_public_read ON coin_packages FOR SELECT TO public USING (is_active = true);
CREATE POLICY coin_packages_admin_all ON coin_packages FOR ALL TO authenticated USING (is_admin((SELECT auth.uid())));

CREATE TRIGGER coin_packages_set_updated_at BEFORE UPDATE ON coin_packages FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2. user_coins 用户金币余额表
CREATE TABLE IF NOT EXISTS user_coins (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance      INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_earned INTEGER DEFAULT 0,
  total_spent  INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_coins ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_coins FORCE ROW LEVEL SECURITY;

CREATE POLICY user_coins_read_own ON user_coins FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY user_coins_admin_all ON user_coins FOR ALL TO authenticated USING (is_admin((SELECT auth.uid())));

CREATE INDEX IF NOT EXISTS idx_user_coins_user ON user_coins(user_id);
CREATE TRIGGER user_coins_set_updated_at BEFORE UPDATE ON user_coins FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 3. coin_transactions 金币交易流水表
CREATE TABLE IF NOT EXISTS coin_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount          INTEGER NOT NULL,
  balance_after   INTEGER NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('earn', 'purchase', 'spend', 'refund', 'bonus')),
  reference_type  TEXT,
  reference_id    UUID,
  description     TEXT DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_transactions FORCE ROW LEVEL SECURITY;

CREATE POLICY coin_transactions_read_own ON coin_transactions FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY coin_transactions_admin_all ON coin_transactions FOR ALL TO authenticated USING (is_admin((SELECT auth.uid())));

CREATE INDEX IF NOT EXISTS idx_coin_transactions_user ON coin_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_type ON coin_transactions(type);

-- 4. episode_unlocks 剧集解锁记录表
CREATE TABLE IF NOT EXISTS episode_unlocks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  episode_id    UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  coin_cost     INTEGER NOT NULL,
  unlocked_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, episode_id)
);

ALTER TABLE episode_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE episode_unlocks FORCE ROW LEVEL SECURITY;

CREATE POLICY episode_unlocks_read_own ON episode_unlocks FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY episode_unlocks_insert_own ON episode_unlocks FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY episode_unlocks_admin_all ON episode_unlocks FOR ALL TO authenticated USING (is_admin((SELECT auth.uid())));

CREATE INDEX IF NOT EXISTS idx_episode_unlocks_user ON episode_unlocks(user_id, episode_id);

COMMIT;
