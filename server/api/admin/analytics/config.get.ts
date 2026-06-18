// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['管理·系统-分析'],
    summary: '管理员：获取多平台埋点完整配置',
    description: '返回全局 GA4 / Meta Pixel / TikTok Pixel 配置的完整内容，包括各端开关和像素 ID，供管理后台表单回显。',
    security: [{ BearerAuth: [] }],
    responses: {
      200: { description: '完整埋点配置' },
      403: { description: '非管理员' },
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
 * GET /api/admin/analytics/config
 * 管理端：获取完整的多平台埋点配置（含时间戳）
 */
export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)

  const { data: row } = await db
    .from('system_configs')
    .select('value, updated_at')
    .eq('key', 'analytics_settings')
    .single()

  const settings = { ...DEFAULT_SETTINGS, ...(row?.value || {}) }

  return sendSuccess(event, {
    isEnabled:       settings.is_enabled,
    enableClient:    settings.enable_client,
    enableH5:        settings.enable_h5,
    enableAdmin:     settings.enable_admin,
    gaMeasurementId: settings.ga_measurement_id || '',
    metaPixelId:     settings.meta_pixel_id || '',
    tiktokPixelId:   settings.tiktok_pixel_id || '',
    updatedAt:       row?.updated_at || null,
  }, 'Analytics config retrieved')
})
