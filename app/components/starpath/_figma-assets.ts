/**
 * 智能问卷 Figma 资源 URL 映射
 *
 * 命名空间约定：page-{frameId}-{assetName}
 *
 * 文件以 `_` 前缀命名，Nuxt 不会把它当作 component 自动导入。
 */
export const figmaAssets = {
  // 问卷页面-0 (1:24)
  'page-0-bg-mask': '/starpath/images/page-0-bg-mask.svg',
  'page-0-male': '/starpath/images/page-0-male.webp',
  'page-0-female': '/starpath/images/page-0-female.webp',
  'page-0-logo': '/starpath/images/page-0-logo.webp',

  // 问卷页面-1 (1:74)
  'page-1-bg-mask': '/starpath/images/page-1-bg-mask.svg',
  'page-1-icon-lock': '/starpath/images/page-1-icon-lock.png',
  'page-1-icon-back': '/starpath/images/page-1-icon-back.svg',

  // 问卷页面-2 (1:485)
  'page-2-bg': '/starpath/images/page-2-bg.webp',
  'page-2-icon-two-hearts': '/starpath/images/page-2-icon-two-hearts.png',
  'page-2-icon-sparkles': '/starpath/images/page-2-icon-sparkles.png',
  'page-2-icon-briefcase': '/starpath/images/page-2-icon-briefcase.png',
  'page-2-icon-crescent-moon': '/starpath/images/page-2-icon-crescent-moon.png',

  // 问卷页面-4 (1:429)
  'page-4-bg': '/starpath/images/page-4-bg.webp',
  'page-4-icon-heart-with-arrow': '/starpath/images/page-4-icon-heart-with-arrow.png',
  'page-4-icon-money-bag': '/starpath/images/page-4-icon-money-bag.png',
  'page-4-icon-rainbow': '/starpath/images/page-4-icon-rainbow.png',

  // 问卷页面-5 (1:549)
  'page-5-relationship-sprite': '/starpath/images/page-5-relationship-sprite.webp',

  // 问卷页面-3 (1:123)
  'page-3-icon-lotus': '/starpath/images/page-3-icon-lotus.png',
  'page-3-icon-fencing': '/starpath/images/page-3-icon-fencing.png',
  'page-3-icon-crystal-ball': '/starpath/images/page-3-icon-crystal-ball.png',
  'page-3-checkmark': '/starpath/images/page-3-checkmark.svg',

  // 问卷页面-10 (1:708)
  'page-10-badge': '/starpath/images/page-10-badge.webp',

  // 问卷页面-填写邮箱 (1:890)
  'page-email-illustration': '/starpath/images/page-email-illustration.png',

  // 订阅-ios (1:948)
  'sub-ios-bg-mask': '/starpath/images/sub-ios-bg-mask.svg',
  'sub-ios-check': '/starpath/images/sub-ios-check.png',
  'sub-ios-banner': '/starpath/images/sub-ios-banner.png',
  'sub-ios-stars': '/starpath/images/sub-ios-stars.svg',
  'sub-ios-paypal': '/starpath/images/sub-ios-paypal.png',
  'sub-ios-google': '/starpath/images/sub-ios-google.png',
  'sub-ios-card-icon': '/starpath/images/sub-ios-card-icon.svg',
  'sub-ios-back': '/starpath/images/sub-ios-back.svg',
} as const

export type FigmaAssetKey = keyof typeof figmaAssets
