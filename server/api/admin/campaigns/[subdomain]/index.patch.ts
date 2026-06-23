
// @api-auth: admin
import { z } from 'zod'
import { getDB } from '~~/server/utils/db'
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'
import { logAuditEvent } from '~~/server/utils/logger'
import { invalidateCampaignCache } from '~~/server/utils/cache'

defineRouteMeta({
  openAPI: {
    tags: ['管理·营销-活动'],
    summary: '管理员：更新营销活动配置（全字段）',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'path', name: 'subdomain', required: true, schema: { type: 'string' }, description: '营销活动子域名' },
    ],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              subtitle: { type: 'string' },
              badge: { type: 'string' },
              is_active: { type: 'boolean' },
              cta_text: { type: 'string' },
              cta_url: { type: 'string', nullable: true },
              sort_order: { type: 'integer' },
              color_from: { type: 'string' },
              color_to: { type: 'string' },
              description: { type: 'string', nullable: true },
            },
          },
        },
      },
    },
    responses: {
      200: { description: '营销活动已更新' },
    },
  } as any,
})

const campaignUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  subtitle: z.string().min(1).optional(),
  badge: z.string().min(1).optional(),
  is_active: z.boolean().optional(),
  cta_text: z.string().optional(),
  cta_url: z.string().nullable().optional(),
  sort_order: z.number().int().min(0).optional(),
  color_from: z.string().optional(),
  color_to: z.string().optional(),
  description: z.string().nullable().optional(),
  cover_image: z.string().nullable().optional(),
  ga_measurement_id: z.string().nullable().optional(),
  meta_pixel_id: z.string().nullable().optional(),
  tiktok_pixel_id: z.string().nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const user = assertAdmin(event)
  const subdomain = getRouterParam(event, 'subdomain')
  if (!subdomain) {
    throw createError({ statusCode: 400, statusMessage: 'Subdomain is required' })
  }

  const body = await readValidatedBody(event, campaignUpdateSchema.parse)
  if (Object.keys(body).length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No fields to update' })
  }

  const db = getDB(event)
  const { error } = await db
    .from('campaigns')
    .update(body)
    .eq('subdomain', subdomain)

  if (error) {
    await logAuditEvent(event, user, `CAMPAIGN_UPDATE_FAILED: ${subdomain}`, 'FAILED')
    throw createError({ statusCode: 500, statusMessage: error.message || 'Failed to update campaign' })
  }

  const changedFields = Object.keys(body).join(', ')
  await logAuditEvent(event, user, `CAMPAIGN_UPDATED: ${subdomain} | Fields: ${changedFields}`, 'SUCCESS')
  invalidateCampaignCache(subdomain)

  return sendSuccess(event, { subdomain, ...body }, 'Campaign updated successfully')
})
