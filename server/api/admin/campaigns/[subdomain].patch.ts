
// @api-auth: admin
import { z } from 'zod'
import { getDB } from '~~/server/utils/db'
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'
import { logAuditEvent } from '~~/server/utils/logger'

defineRouteMeta({
  openAPI: {
    tags: ['Admin Campaigns'],
    summary: '管理员：更新营销活动内容',
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
            },
            required: ['title', 'subtitle', 'badge'],
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
  title: z.string().min(1, 'Title cannot be empty'),
  subtitle: z.string().min(1, 'Subtitle cannot be empty'),
  badge: z.string().min(1, 'Badge cannot be empty')
})

export default defineEventHandler(async (event) => {
  const user = assertAdmin(event)
  const subdomain = getRouterParam(event, 'subdomain')
  if (!subdomain) {
    throw createError({ statusCode: 400, statusMessage: 'Subdomain is required' })
  }

  const body = await readValidatedBody(event, campaignUpdateSchema.parse)
  const db = getDB(event)

  const { error } = await db
    .from('campaigns')
    .update(body)
    .eq('subdomain', subdomain)

  if (error) {
    await logAuditEvent(event, user, `CAMPAIGN_UPDATE_FAILED: ${subdomain}`, 'FAILED')
    throw createError({ statusCode: 500, statusMessage: error.message || 'Failed to update campaign' })
  }

  await logAuditEvent(event, user, `CAMPAIGN_UPDATED: ${subdomain} | Title: ${body.title}`, 'SUCCESS')

  return sendSuccess(event, { subdomain, ...body }, 'Campaign updated successfully')
})
