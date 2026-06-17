
// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { assertAdmin } from '~~/server/utils/auth'

defineRouteMeta({
  openAPI: {
    tags: ['Admin Ad Slots'],
    summary: '管理员：获取所有广告位',
    security: [{ BearerAuth: [] }],
    responses: {
      200: { description: '按 sort_order 排序的广告位对象数组' },
    },
  } as any,
})

/**
 * 管理员：获取所有广告位
 * GET /api/admin/ad-slots
 */
export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)

  const { data: slots, error } = await db.from('ad_slots').select('*')
    .order('sort_order', { ascending: true })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch ad slots' })
  }

  return sendSuccess(event, slots || [], 'Ad slots retrieved')
})
