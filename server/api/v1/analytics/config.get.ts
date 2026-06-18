// @api-auth: public
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['分析埋点'],
    summary: '获取多平台埋点配置（公开）',
    description: '返回前端页面所需的 GA4 / Meta Pixel / TikTok Pixel 配置及各端开关，不含敏感信息。',
    responses: {
      200: { description: '埋点配置' },
    },
  } as any,
})

const DEFAULT_SETTINGS = {
  is_enabled: false,
  enable_client: true,
  enable_h5: true,
  enable_admin: false,
  ga_measurement_id: '',
  meta_pixel_id: '',
  tiktok_pixel_id: '',
}

/**
 * GET /api/v1/analytics/config
 * 公开接口：前端动态加载像素前先调此接口判断是否该注入哪些 SDK
 */
export default defineEventHandler(async (event) => {
  const db = getDB(event)

  const { data: row } = await db
    .from('system_configs')
    .select('value')
    .eq('key', 'analytics_settings')
    .single()

  const settings = { ...DEFAULT_SETTINGS, ...(row?.value || {}) }

  // 仅返回前端必要字段，不泄漏 updated_by 等管理信息
  return sendSuccess(event, {
    isEnabled:       settings.is_enabled,
    enableClient:    settings.enable_client,
    enableH5:        settings.enable_h5,
    enableAdmin:     settings.enable_admin,
    gaMeasurementId: settings.ga_measurement_id || null,
    metaPixelId:     settings.meta_pixel_id || null,
    tiktokPixelId:   settings.tiktok_pixel_id || null,
  }, 'Analytics config retrieved')
})
