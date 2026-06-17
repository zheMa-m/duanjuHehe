-- ====================================================================
-- 0006 营销活动 H5 v2 种子数据
--
-- 为"营销 H5 v2 新野兽派"页面插入对应的活动配置记录。
-- 若记录已存在（以 subdomain 为唯一键），则跳过，安全幂等。
--
-- 前置依赖：0002_campaign_optional.sql（campaigns 表）
-- ====================================================================

INSERT INTO "campaigns" (
  "subdomain",
  "title",
  "subtitle",
  "badge",
  "color_from",
  "color_to",
  "is_active",
  "cta_text",
  "sort_order"
) VALUES (
  'h5-v2',
  '🎨 HEHE 营销 H5 v2 新野兽派',
  '采用大胆的新野兽派视觉版式，引入 3D 浮动卡片、扫光粒子与极客跑马灯。',
  '全新 V2 体验',
  'from-green-400',
  'to-emerald-600',
  TRUE,
  '立即体验',
  10
) ON CONFLICT ("subdomain") DO NOTHING;
