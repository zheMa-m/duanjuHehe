-- ============================================================================
-- 0206 观看历史 + 收藏 + 广告观看记录
-- ============================================================================
BEGIN;

-- 1. user_watch_history 观看历史表
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

-- 2. user_favorites 收藏表
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

-- 3. ad_watch_logs 广告观看记录表
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
