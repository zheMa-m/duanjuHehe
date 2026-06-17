// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'
import { logAuditEvent } from '~~/server/utils/logger'

defineRouteMeta({
  openAPI: {
    tags: ['Admin Campaigns'],
    summary: '管理员：删除特定营销留资预约记录',
    description: '通过记录 ID 删除一条营销活动留资记录，仅限管理员访问。',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: '留资记录 ID' },
    ],
    responses: {
      200: { description: '删除成功' },
      401: { description: '未授权' },
    },
  } as any,
})

export default defineEventHandler(async (event) => {
  const user = assertAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Lead ID is required'
    })
  }

  const db = getDB(event)
  const { error } = await db.from('campaign_registrations').delete().eq('id', id)

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to delete lead'
    })
  }

  await logAuditEvent(event, user, `CAMPAIGN_LEAD_DELETED:${id}`, 'SUCCESS')

  return sendSuccess(event, { id }, 'Lead deleted successfully')
})
