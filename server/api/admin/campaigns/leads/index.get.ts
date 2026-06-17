// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['Admin Campaigns'],
    summary: '管理员：获取所有营销活动预约留资记录',
    description: '获取全量营销留资记录，支持按子域名过滤，仅限管理员访问。',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'query', name: 'subdomain', required: false, schema: { type: 'string' }, description: '活动子域名过滤' },
    ],
    responses: {
      200: { description: '返回留资记录列表' },
      401: { description: '未授权' },
    },
  } as any,
})

export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)
  const query = getQuery(event)
  const subdomain = query.subdomain as string

  let dbQuery = db.from('campaign_registrations').select('*')
  
  if (subdomain) {
    dbQuery = dbQuery.eq('subdomain', subdomain)
  }

  // 按最新时间排序
  const { data: leads, error } = await dbQuery.order('created_at', { ascending: false })

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch campaign leads'
    })
  }

  return sendSuccess(event, leads || [])
})
