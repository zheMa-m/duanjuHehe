
// @api-auth: public
import { z } from 'zod'
import { sendSuccess } from '~~/server/utils/response'
import { recordAdEvent } from '~~/server/utils/ads'

defineRouteMeta({
  openAPI: {
    tags: ['Ads'],
    summary: '记录广告曝光/点击事件',
    description: '记录广告事件（曝光或点击），公开接口，IP 和 User-Agent 会被记录。',
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              adSlotId: { type: 'string' },
              eventType: { type: 'string', enum: ['impression', 'click'] },
              campaignSubdomain: { type: 'string' },
            },
            required: ['adSlotId', 'eventType'],
          },
        },
      },
    },
    responses: {
      200: { description: '广告事件已记录' },
    },
  } as any,
})

const adEventSchema = z.object({
  adSlotId: z.string().min(1),
  eventType: z.enum(['impression', 'click']),
  campaignSubdomain: z.string().optional(),
})

/**
 * 记录广告曝光/点击事件（公开接口）
 * POST /api/v1/ads/event
 */
export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, adEventSchema.parse)

  await recordAdEvent(event, {
    ad_slot_id: body.adSlotId,
    event_type: body.eventType,
    campaign_subdomain: body.campaignSubdomain,
  })

  return sendSuccess(event, null, 'Ad event recorded')
})
