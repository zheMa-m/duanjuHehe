import { z } from 'zod'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { assertAdmin } from '~~/server/utils/auth'
import { logAuditEvent } from '~~/server/utils/logger'

defineRouteMeta({
  openAPI: {
    tags: ['Admin Ad Slots'],
    summary: '管理员：更新广告位',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: '广告位 ID' },
    ],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              position: { type: 'string', enum: ['header_banner', 'footer_banner', 'native_inline', 'interstitial'] },
              is_active: { type: 'boolean' },
              campaign_id: { type: 'string', format: 'uuid', nullable: true },
              ad_provider: { type: 'string', enum: ['adsense', 'meta', 'custom'] },
              ad_config: { type: 'object' },
              sort_order: { type: 'integer' },
            },
          },
        },
      },
    },
    responses: {
      200: { description: '广告位已更新' },
      404: { description: '广告位未找到' },
    },
  } as any,
})

const updateAdSlotSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  position: z.enum(['header_banner', 'footer_banner', 'native_inline', 'interstitial']).optional(),
  is_active: z.boolean().optional(),
  campaign_id: z.string().uuid().nullable().optional(),
  ad_provider: z.enum(['adsense', 'meta', 'custom']).optional(),
  ad_config: z.record(z.any()).optional(),
  sort_order: z.number().int().optional(),
})

/**
 * 管理员：更新广告位
 * PATCH /api/admin/ad-slots/:id
 */
export default defineEventHandler(async (event) => {
  const user = assertAdmin(event)
  const id = getRouterParam(event, 'id')
  const body = await readValidatedBody(event, updateAdSlotSchema.parse)

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing ad slot ID' })
  }

  const db = getDB(event)
  const { data: slot, error: notFound } = await db.from('ad_slots').select('*').eq('id', id).single()

  if (notFound || !slot) {
    throw createError({ statusCode: 404, statusMessage: 'Ad slot not found' })
  }

  const { data: updated } = await db.from('ad_slots').update(body).eq('id', id).select().single()

  await logAuditEvent(event, user, `ADMIN_AD_SLOT_UPDATE:${id}`, 'SUCCESS')

  return sendSuccess(event, updated, 'Ad slot updated')
})
