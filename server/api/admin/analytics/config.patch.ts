// @api-auth: admin
import { z } from 'zod'
import { getDB } from '~~/server/utils/db'
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess, throwError } from '~~/server/utils/response'
import { logAuditEvent } from '~~/server/utils/logger'

const BodySchema = z.object({
  isEnabled:       z.boolean().optional(),
  enableClient:    z.boolean().optional(),
  enableH5:        z.boolean().optional(),
  enableAdmin:     z.boolean().optional(),
  gaMeasurementId: z.string().max(50).optional(),
  metaPixelId:     z.string().max(30).optional(),
  tiktokPixelId:   z.string().max(50).optional(),
}).strict()

defineRouteMeta({
  openAPI: {
    tags: ['管理·系统-分析'],
    summary: '管理员：更新多平台埋点配置',
    description: '更新全局 GA4 / Meta Pixel / TikTok Pixel 的像素 ID 及各端开关，立即生效。',
    security: [{ BearerAuth: [] }],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              isEnabled:       { type: 'boolean', description: '全局埋点总开关' },
              enableClient:    { type: 'boolean', description: '官网端开关' },
              enableH5:        { type: 'boolean', description: '营销 H5 端开关' },
              enableAdmin:     { type: 'boolean', description: '管理后台端开关' },
              gaMeasurementId: { type: 'string',  description: 'GA4 衡量 ID（如 G-XXXXXXXXXX）' },
              metaPixelId:     { type: 'string',  description: 'Meta (Facebook) Pixel ID' },
              tiktokPixelId:   { type: 'string',  description: 'TikTok Pixel ID' },
            },
          },
        },
      },
    },
    responses: {
      200: { description: '配置已更新' },
      400: { description: '参数校验失败' },
      403: { description: '非管理员' },
    },
  } as any,
})

/**
 * PATCH /api/admin/analytics/config
 * 管理端：更新多平台埋点全局配置（使用 system_configs 键值存储）
 */
export default defineEventHandler(async (event) => {
  const user = assertAdmin(event)
  const db = getDB(event)

  const body = await readBody(event)
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    throwError(400, 'Invalid analytics configuration', parsed.error.flatten())
  }

  const input = parsed.data!

  // 读取当前配置并合并更新（patch 语义，未传字段保持原值）
  const { data: currentRow } = await db
    .from('system_configs')
    .select('value')
    .eq('key', 'analytics_settings')
    .single()

  const current = currentRow?.value || {}
  const updated = {
    is_enabled:       input.isEnabled       ?? current.is_enabled       ?? false,
    enable_client:    input.enableClient    ?? current.enable_client    ?? true,
    enable_h5:        input.enableH5        ?? current.enable_h5        ?? true,
    enable_admin:     input.enableAdmin     ?? current.enable_admin     ?? false,
    ga_measurement_id: input.gaMeasurementId !== undefined ? input.gaMeasurementId : (current.ga_measurement_id || ''),
    meta_pixel_id:     input.metaPixelId    !== undefined ? input.metaPixelId    : (current.meta_pixel_id    || ''),
    tiktok_pixel_id:   input.tiktokPixelId  !== undefined ? input.tiktokPixelId  : (current.tiktok_pixel_id  || ''),
  }

  const { error } = await db.from('system_configs').upsert({
    key: 'analytics_settings',
    value: updated,
    updated_at: new Date().toISOString(),
  })

  if (error) {
    throwError(500, 'Failed to update analytics configuration')
  }

  // 记录审计日志
  const changedFields = Object.keys(input).join(', ')
  await logAuditEvent(event, user, `ANALYTICS_CONFIG_UPDATED: ${changedFields}`, 'SUCCESS')

  return sendSuccess(event, { updated: true }, 'Analytics configuration updated successfully')
})
