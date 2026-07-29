-- ============================================================================
-- 0204 视频平台核心：剧集系列 + 分集 + 分类
-- ============================================================================
BEGIN;

-- 1. genres 分类标签表
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

CREATE INDEX IF NOT EXISTS idx_genres_slug ON genres(slug);

-- 2. series 剧集系列表
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

-- 3. episodes 分集表
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

COMMIT;
