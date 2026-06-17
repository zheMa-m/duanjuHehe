
// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['Admin Campaigns'],
    summary: '管理员：获取所有营销活动',
    security: [{ BearerAuth: [] }],
    responses: {
      200: { description: '营销活动对象数组' },
    },
  } as any,
})

export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)

  const { data: campaigns, error } = await db.from('campaigns').select('*')
  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message || 'Failed to fetch campaigns' })
  }

  return sendSuccess(event, campaigns || [], 'Fetched campaigns successfully')
})
