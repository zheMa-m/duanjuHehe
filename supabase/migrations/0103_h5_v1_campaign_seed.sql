-- ============================================================================
-- 0103 毛玻璃拟态 V1 演示活动种子（子域名 h5-v1）
-- ============================================================================

BEGIN;

INSERT INTO campaigns (
  subdomain, title, subtitle, badge,
  color_from, color_to, is_active, cta_text, sort_order
) VALUES (
  'h5-v1',
  '✨ HEHE 营销 H5 v1 毛玻璃拟态',
  '柔和毛玻璃质感与渐变光晕，适合品牌种草与轻转化场景。',
  'V1 示例',
  'from-rose-600', 'to-orange-600', TRUE,
  '立即体验',
  5
) ON CONFLICT (subdomain) DO NOTHING;

COMMIT;
