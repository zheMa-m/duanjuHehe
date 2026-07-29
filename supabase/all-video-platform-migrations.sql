-- ============================================================================
-- ReelShort 视频平台 — 完整建表 + 种子数据
-- 在 Supabase SQL Editor 中一次性执行即可
-- ============================================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- 0. 基础设施：profiles 表 + 触发器（视频平台依赖）
-- ═══════════════════════════════════════════════════════════════════════════

-- 通用 updated_at 触发器
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 用户档案表（关联 auth.users）
CREATE TABLE IF NOT EXISTS profiles (
  id                 UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email              TEXT,
  username           TEXT CHECK (char_length(username) <= 50),
  role               TEXT NOT NULL DEFAULT 'user'
                     CHECK (role IN ('user', 'admin')),
  plan_status        TEXT NOT NULL DEFAULT 'free'
                     CHECK (plan_status IN ('free', 'pro', 'enterprise')),
  avatar_url         TEXT,
  display_name       TEXT,
  auth_provider      TEXT NOT NULL DEFAULT 'email'
                     CHECK (auth_provider IN ('email', 'google', 'facebook', 'apple', 'anonymous')),
  provider_id        TEXT,
  device_id          TEXT,
  is_anonymous       BOOLEAN NOT NULL DEFAULT FALSE,
  email_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  stripe_customer_id TEXT UNIQUE,
  phone              TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles FORCE ROW LEVEL SECURITY;

-- RLS：用户读写自己
CREATE POLICY profiles_select_own ON profiles FOR SELECT TO authenticated USING ((SELECT auth.uid()) = id);
CREATE POLICY profiles_update_own ON profiles FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = id);

-- RLS：管理员全权限
CREATE POLICY profiles_admin_all ON profiles FOR ALL TO authenticated USING (is_admin((SELECT auth.uid())));

CREATE INDEX IF NOT EXISTS idx_profiles_device_id ON profiles(device_id) WHERE device_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_provider  ON profiles(auth_provider);

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 新用户注册时自动创建 profile
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, display_name, role, auth_provider, is_anonymous)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    'user',
    COALESCE(NEW.raw_user_meta_data->>'provider', 'email'),
    FALSE
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 如果触发器已存在则替换
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 管理员检查函数
CREATE OR REPLACE FUNCTION is_admin(uid uuid)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = uid AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ═══════════════════════════════════════════════════════════════════════════
-- 0b. 审计日志 + 系统配置表（管理后台依赖）
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS activity_logs (
  id         BIGSERIAL PRIMARY KEY,
  category   TEXT NOT NULL DEFAULT 'system' CHECK (category IN ('auth', 'admin', 'system')),
  user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action     TEXT NOT NULL,
  ip         TEXT,
  metadata   JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs FORCE ROW LEVEL SECURITY;

CREATE POLICY activity_logs_admin_all ON activity_logs FOR ALL TO authenticated USING (is_admin((SELECT auth.uid())));

CREATE INDEX IF NOT EXISTS idx_activity_logs_category ON activity_logs(category);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS system_configs (
  key   TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'
);

ALTER TABLE system_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_configs FORCE ROW LEVEL SECURITY;

CREATE POLICY system_configs_admin_all ON system_configs FOR ALL TO authenticated USING (is_admin((SELECT auth.uid())));

INSERT INTO system_configs (key, value) VALUES
  ('analytics_settings', '{"is_enabled":false,"enable_client":true,"enable_h5":true,"enable_admin":false,"ga_measurement_id":"","meta_pixel_id":"","tiktok_pixel_id":""}'),
  ('notification_webhooks', '[]')
ON CONFLICT (key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. genres 分类标签表
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS genres (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  slug       TEXT NOT NULL UNIQUE,
  icon       TEXT DEFAULT '',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE genres FORCE ROW LEVEL SECURITY;

CREATE POLICY genres_public_read ON genres FOR SELECT TO public USING (true);
CREATE POLICY genres_admin_all ON genres FOR ALL TO authenticated USING (is_admin((SELECT auth.uid())));

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. series 剧集系列表
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS series (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  description     TEXT DEFAULT '',
  cover_image     TEXT DEFAULT '',
  poster_image    TEXT DEFAULT '',
  trailer_url     TEXT DEFAULT '',
  genre_id        UUID REFERENCES genres(id) ON DELETE SET NULL,
  tags            TEXT[] DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'published', 'completed', 'archived')),
  total_episodes  INTEGER NOT NULL DEFAULT 0,
  free_episodes   INTEGER NOT NULL DEFAULT 5,
  rating          NUMERIC(3,1) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  view_count      BIGINT DEFAULT 0,
  favorite_count  BIGINT DEFAULT 0,
  is_featured     BOOLEAN DEFAULT FALSE,
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE series ENABLE ROW LEVEL SECURITY;
ALTER TABLE series FORCE ROW LEVEL SECURITY;

CREATE POLICY series_public_read ON series FOR SELECT TO public USING (status = 'published');
CREATE POLICY series_admin_all ON series FOR ALL TO authenticated USING (is_admin((SELECT auth.uid())));

CREATE INDEX IF NOT EXISTS idx_series_status ON series(status);
CREATE INDEX IF NOT EXISTS idx_series_genre ON series(genre_id);
CREATE INDEX IF NOT EXISTS idx_series_featured ON series(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_series_slug ON series(slug);

CREATE TRIGGER series_set_updated_at BEFORE UPDATE ON series FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. episodes 分集表
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS episodes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id        UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  episode_number   INTEGER NOT NULL,
  title            TEXT NOT NULL,
  description      TEXT DEFAULT '',
  video_url        TEXT NOT NULL DEFAULT '',
  thumbnail_url    TEXT DEFAULT '',
  duration_seconds INTEGER DEFAULT 60,
  is_free          BOOLEAN DEFAULT TRUE,
  coin_cost        INTEGER DEFAULT 0,
  sort_order       INTEGER DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft', 'published', 'archived')),
  view_count       BIGINT DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(series_id, episode_number)
);

ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodes FORCE ROW LEVEL SECURITY;

CREATE POLICY episodes_public_read ON episodes FOR SELECT TO public USING (status = 'published');
CREATE POLICY episodes_admin_all ON episodes FOR ALL TO authenticated USING (is_admin((SELECT auth.uid())));

CREATE INDEX IF NOT EXISTS idx_episodes_series ON episodes(series_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_episodes_free ON episodes(series_id, is_free);

CREATE TRIGGER episodes_set_updated_at BEFORE UPDATE ON episodes FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. coin_packages 金币套餐表
-- ═══════════════════════════════════════════════════════════════════════════

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

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. user_coins 用户金币余额表
-- ═══════════════════════════════════════════════════════════════════════════

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

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. coin_transactions 金币交易流水表
-- ═══════════════════════════════════════════════════════════════════════════

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

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. episode_unlocks 剧集解锁记录表
-- ═══════════════════════════════════════════════════════════════════════════

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

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. user_watch_history 观看历史表
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_watch_history (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  episode_id        UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  series_id         UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  progress_seconds  INTEGER DEFAULT 0,
  duration_seconds  INTEGER DEFAULT 0,
  completed         BOOLEAN DEFAULT FALSE,
  watched_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, episode_id)
);

ALTER TABLE user_watch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_watch_history FORCE ROW LEVEL SECURITY;

CREATE POLICY watch_history_read_own ON user_watch_history FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY watch_history_insert_own ON user_watch_history FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY watch_history_update_own ON user_watch_history FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY watch_history_admin_all ON user_watch_history FOR ALL TO authenticated USING (is_admin((SELECT auth.uid())));

CREATE INDEX IF NOT EXISTS idx_watch_history_user ON user_watch_history(user_id, watched_at DESC);
CREATE INDEX IF NOT EXISTS idx_watch_history_series ON user_watch_history(user_id, series_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 10. user_favorites 收藏表
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_favorites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  series_id   UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, series_id)
);

ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites FORCE ROW LEVEL SECURITY;

CREATE POLICY favorites_read_own ON user_favorites FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY favorites_insert_own ON user_favorites FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY favorites_delete_own ON user_favorites FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY favorites_admin_all ON user_favorites FOR ALL TO authenticated USING (is_admin((SELECT auth.uid())));

-- ═══════════════════════════════════════════════════════════════════════════
-- 11. ad_watch_logs 广告观看记录表
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ad_watch_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  episode_id    UUID REFERENCES episodes(id) ON DELETE SET NULL,
  coins_earned  INTEGER DEFAULT 0,
  watched_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ad_watch_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_watch_logs FORCE ROW LEVEL SECURITY;

CREATE POLICY ad_watch_logs_read_own ON ad_watch_logs FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY ad_watch_logs_insert_own ON ad_watch_logs FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY ad_watch_logs_admin_all ON ad_watch_logs FOR ALL TO authenticated USING (is_admin((SELECT auth.uid())));

CREATE INDEX IF NOT EXISTS idx_ad_watch_logs_user ON ad_watch_logs(user_id, watched_at DESC);

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- 12. 种子数据
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 12.1 分类标签 ────────────────────────────────────────────────────────

INSERT INTO genres (id, name, slug, icon, sort_order) VALUES
  ('11111111-1111-4111-8111-111111111101', 'Romance',        'romance',        'i-lucide-heart',       1),
  ('11111111-1111-4111-8111-111111111102', 'Drama',          'drama',          'i-lucide-film',        2),
  ('11111111-1111-4111-8111-111111111103', 'Fantasy',        'fantasy',        'i-lucide-sparkles',    3),
  ('11111111-1111-4111-8111-111111111104', 'Thriller',       'thriller',       'i-lucide-zap',         4),
  ('11111111-1111-4111-8111-111111111105', 'Comedy',         'comedy',         'i-lucide-smile',       5),
  ('11111111-1111-4111-8111-111111111106', 'Billionaire',    'billionaire',    'i-lucide-crown',       6),
  ('11111111-1111-4111-8111-111111111107', 'Revenge',        'revenge',        'i-lucide-swords',      7),
  ('11111111-1111-4111-8111-111111111108', 'CEO',            'ceo',            'i-lucide-briefcase',   8),
  ('11111111-1111-4111-8111-111111111109', 'Werewolf',       'werewolf',       'i-lucide-moon',        9),
  ('11111111-1111-4111-8111-111111111110', 'Mafia',          'mafia',          'i-lucide-shield',      10),
  ('11111111-1111-4111-8111-111111111111', 'Hidden Identity','hidden-identity', 'i-lucide-eye-off',     11),
  ('11111111-1111-4111-8111-111111111112', 'Forbidden Love', 'forbidden-love',  'i-lucide-heart-crack', 12)
ON CONFLICT (slug) DO NOTHING;


-- ── 12.2 剧集系列 ────────────────────────────────────────────────────────

INSERT INTO series (id, title, slug, description, cover_image, poster_image, genre_id, tags, status, total_episodes, free_episodes, rating, view_count, favorite_count, is_featured, sort_order) VALUES
  (
    '22222222-2222-4222-8222-222222222201',
    'The Double Life of My Billionaire Husband',
    'billionaire-double-life',
    'She thought she married a poor mechanic. But when his secret identity as the heir to a trillion-dollar empire is exposed, everything changes. Betrayal, revenge, and a love that defies all odds.',
    'https://picsum.photos/seed/series1/400/600',
    'https://picsum.photos/seed/series1b/800/400',
    '11111111-1111-4111-8111-111111111106',
    ARRAY['billionaire','hidden identity','romance','revenge','marriage'],
    'published', 60, 5, 4.7, 12500000, 890000, true, 1
  ),
  (
    '22222222-2222-4222-8222-222222222202',
    'Fated to My Forbidden Alpha',
    'forbidden-alpha',
    'A human girl discovers she is mated to the most powerful Alpha in existence. But ancient pack law forbids their union. As war looms between packs, their love becomes the only hope for peace.',
    'https://picsum.photos/seed/series2/400/600',
    'https://picsum.photos/seed/series2b/800/400',
    '11111111-1111-4111-8111-111111111109',
    ARRAY['werewolf','alpha','forbidden love','fated mates','fantasy'],
    'published', 75, 5, 4.8, 18700000, 1200000, true, 2
  ),
  (
    '22222222-2222-4222-8222-222222222203',
    'Never Divorce a Secret Billionaire Heiress',
    'secret-heiress',
    'Everyone thinks she is a gold digger who trapped the CEO into marriage. But when her true identity as the heiress of a trillion-dollar empire is revealed, the tables turn in spectacular fashion.',
    'https://picsum.photos/seed/series3/400/600',
    'https://picsum.photos/seed/series3b/800/400',
    '11111111-1111-4111-8111-111111111106',
    ARRAY['billionaire','heiress','revenge','CEO','marriage'],
    'published', 55, 5, 4.6, 9800000, 650000, false, 3
  ),
  (
    '22222222-2222-4222-8222-222222222204',
    'The Mafia Boss Bride',
    'mafia-boss-bride',
    'To save her family from bankruptcy, she agrees to marry the most feared mafia boss in the city. But beneath his cold exterior lies a secret that will change both their lives forever.',
    'https://picsum.photos/seed/series4/400/600',
    'https://picsum.photos/seed/series4b/800/400',
    '11111111-1111-4111-8111-111111111110',
    ARRAY['mafia','marriage','dark romance','thriller','danger'],
    'published', 50, 5, 4.5, 7200000, 480000, false, 4
  ),
  (
    '22222222-2222-4222-8222-222222222205',
    'CEO Above, Me Below',
    'ceo-above-me-below',
    'A clumsy intern accidentally spills coffee on the cold CEO. Instead of firing her, he promotes her to his personal assistant. Office politics, undeniable chemistry, and a secret from her past.',
    'https://picsum.photos/seed/series5/400/600',
    'https://picsum.photos/seed/series5b/800/400',
    '11111111-1111-4111-8111-111111111108',
    ARRAY['CEO','office romance','comedy','drama','hidden identity'],
    'published', 45, 5, 4.4, 5600000, 320000, true, 5
  )
ON CONFLICT (slug) DO NOTHING;

-- ── 12.3 分集数据 ────────────────────────────────────────────────────────

-- 为每部剧集生成前8集（1-5免费，6-8付费）
DO $$
DECLARE
  s RECORD;
  ep_num INTEGER;
  eps_count INTEGER;
BEGIN
  FOR s IN SELECT * FROM series LOOP
    eps_count := LEAST(s.total_episodes, 8);
    FOR ep_num IN 1..eps_count LOOP
      INSERT INTO episodes (id, series_id, episode_number, title, description, video_url, thumbnail_url, duration_seconds, is_free, coin_cost, sort_order, status)
      VALUES (
        gen_random_uuid(),
        s.id,
        ep_num,
        s.title || ' — Episode ' || ep_num,
        CASE
          WHEN ep_num <= s.free_episodes THEN 'A new chapter unfolds. Secrets are revealed and tensions rise. (Free episode)'
          ELSE 'The drama intensifies. Relationships are tested and new alliances form. Unlock with coins to continue.'
        END,
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        'https://picsum.photos/seed/ep' || replace(s.id::text, '-', '') || ep_num || '/400/600',
        60 + (random() * 60)::INTEGER,
        ep_num <= s.free_episodes,
        CASE WHEN ep_num <= s.free_episodes THEN 0 ELSE 5 + ep_num END,
        ep_num,
        'published'
      )
      ON CONFLICT (series_id, episode_number) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- ── 12.4 金币套餐 ────────────────────────────────────────────────────────

INSERT INTO coin_packages (id, name, coins_amount, bonus_coins, price, currency, is_active, sort_order) VALUES
  ('33333333-3333-4333-8333-333333333301', 'Starter Pack',    500,   50,   4.99,  'USD', true, 1),
  ('33333333-3333-4333-8333-333333333302', 'Popular Pack',   1200,  200,   9.99,  'USD', true, 2),
  ('33333333-3333-4333-8333-333333333303', 'Value Pack',     2500,  500,  19.99,  'USD', true, 3),
  ('33333333-3333-4333-8333-333333333304', 'Super Saver',    5000, 1500,  39.99,  'USD', true, 4),
  ('33333333-3333-4333-8333-333333333305', 'Ultimate Bundle', 10000, 4000,  69.99, 'USD', true, 5)
ON CONFLICT DO NOTHING;

COMMIT;
