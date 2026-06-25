-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  0108: 修复 handle_new_user() 触发器 — 补充 device_id 字段保存            ║
-- ║                                                                          ║
-- ║  问题：匿名登录时 device_id 通过 raw_user_meta_data 传入，但触发器        ║
-- ║        INSERT profiles 时遗漏了该字段，导致匿名用户设备 ID 未持久化。       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

BEGIN;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  provider_val TEXT;
  is_oauth     BOOLEAN;
BEGIN
  provider_val := COALESCE(NEW.raw_user_meta_data->>'provider', 'email');
  is_oauth     := provider_val IN ('google', 'facebook', 'apple');

  INSERT INTO public.profiles (
    id, email, username, display_name, auth_provider, is_anonymous, email_verified, device_id
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    provider_val,
    COALESCE((NEW.raw_user_meta_data->>'is_anonymous')::boolean, FALSE),
    CASE WHEN is_oauth THEN TRUE ELSE FALSE END,
    NEW.raw_user_meta_data->>'device_id'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
