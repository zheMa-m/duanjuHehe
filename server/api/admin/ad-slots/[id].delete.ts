
// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { assertAdmin } from '~~/server/utils/auth'
import { logAuditEvent } from '~~/server/utils/logger'

defineRouteMeta({
  openAPI: {
    tags: ['Admin Ad Slots'],
    summary: '管理员：删除广告位',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: '广告位 ID' },
    ],
    responses: {
      200: { description: '广告位已删除' },
      404: { description: '广告位未找到' },
    },
  } as any,
})

/**
 * 管理员：删除广告位
 * DELETE /api/admin/ad-slots/:id
 */
export default defineEventHandler(async (event) => {
  const user = assertAdmin(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing ad slot ID' })
  }

  const db = getDB(event)
  const { data: slot, error: notFound } = await db.from('ad_slots').select('*').eq('id', id).single()

  if (notFound || !slot) {
    throw createError({ statusCode: 404, statusMessage: 'Ad slot not found' })
  }

  await db.from('ad_slots').delete().eq('id', id)

  await logAuditEvent(event, user, `ADMIN_AD_SLOT_DELETE:${id}:${slot.name}`, 'SUCCESS')

  return sendSuccess(event, { id }, 'Ad slot deleted')
})
