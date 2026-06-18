
// @api-auth: admin
import { z } from 'zod'
import { getDB } from '~~/server/utils/db'
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'
import { logAuditEvent } from '~~/server/utils/logger'

defineRouteMeta({
  openAPI: {
    tags: ['管理·营销-活动'],
    summary: '管理员：切换营销活动上下线状态',
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
              is_active: { type: 'boolean' },
            },
            required: ['is_active'],
          },
        },
      },
    },
    responses: {
      200: { description: '活动状态已切换' },
    },
  } as any,
})

const statusToggleSchema = z.object({
  is_active: z.boolean(),
})

/**
 * 快速切换营销活动上下线状态
 * PATCH /api/admin/campaigns/:subdomain/status
 */
export default defineEventHandler(async (event) => {
  const admin = assertAdmin(event)
  const subdomain = getRouterParam(event, 'subdomain')
  if (!subdomain) {
    throw createError({ statusCode: 400, statusMessage: 'Subdomain is required' })
  }

  const body = await readValidatedBody(event, statusToggleSchema.parse)
  const isActive = body.is_active

  const db = getDB(event)
  const { error } = await db
    .from('campaigns')
    .update({ is_active: isActive })
    .eq('subdomain', subdomain)

  if (error) {
    await logAuditEvent(event, admin, `CAMPAIGN_STATUS_FAILED: ${subdomain}`, 'FAILED')
    throw createError({ statusCode: 500, statusMessage: 'Failed to update campaign status' })
  }

  const action = isActive ? 'ONLINE' : 'OFFLINE'
  await logAuditEvent(event, admin, `CAMPAIGN_${action}: ${subdomain}`, 'SUCCESS')

  return sendSuccess(event, { subdomain, is_active: isActive }, `Campaign ${isActive ? 'activated' : 'deactivated'}`)
})
