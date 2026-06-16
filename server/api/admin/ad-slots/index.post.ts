import { z } from 'zod'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { assertAdmin } from '~~/server/utils/auth'
import { logAuditEvent } from '~~/server/utils/logger'

defineRouteMeta({
  openAPI: {
    tags: ['Admin Ad Slots'],
    summary: '管理员：创建广告位',
    security: [{ BearerAuth: [] }],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              position: { type: 'string', enum: ['header_banner', 'footer_banner', 'native_inline', 'interstitial'] },
              is_active: { type: 'boolean', default: true },
              campaign_id: { type: 'string', format: 'uuid', nullable: true },
              ad_provider: { type: 'string', enum: ['adsense', 'meta', 'custom'], default: 'custom' },
              ad_config: { type: 'object' },
              sort_order: { type: 'integer', default: 0 },
            },
            required: ['name', 'position'],
          },
        },
      },
    },
    responses: {
      201: { description: '广告位已创建' },
    },
  } as any,
})

const createAdSlotSchema = z.object({
  name: z.string().min(1).max(100),
  position: z.enum(['header_banner', 'footer_banner', 'native_inline', 'interstitial']),
  is_active: z.boolean().default(true),
  campaign_id: z.string().uuid().nullable().optional(),
  ad_provider: z.enum(['adsense', 'meta', 'custom']).default('custom'),
  ad_config: z.record(z.any()).default({}),
  sort_order: z.number().int().default(0),
})

/**
 * 管理员：创建广告位
 * POST /api/admin/ad-slots
 */
export default defineEventHandler(async (event) => {
  const user = assertAdmin(event)
  const body = await readValidatedBody(event, createAdSlotSchema.parse)
  const db = getDB(event)

  const newSlot = {
    id: `ad-${Date.now()}`,
    ...body,
    created_at: new Date().toISOString(),
  }

  await db.from('ad_slots').insert(newSlot)

  await logAuditEvent(event, user, `ADMIN_AD_SLOT_CREATE:${newSlot.name}`, 'SUCCESS')

  return sendSuccess(event, newSlot, 'Ad slot created', 201)
})
