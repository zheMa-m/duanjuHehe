// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['管理·营销-活动'],
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
  const pageSize = Math.min(Number(query.pageSize) || 100, 100)
  const page = Math.max(Number(query.page) || 1, 1)
  const offset = (page - 1) * pageSize

  try {
    let dbQuery = db.from('campaign_registrations').select('*', { count: 'exact', head: false })

    if (subdomain) {
      dbQuery = dbQuery.eq('subdomain', subdomain)
    }

    const { data: leads, error, count } = await dbQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: error.message || 'Failed to fetch campaign leads'
      })
    }

    return sendSuccess(event, {
      items: leads || [],
      total: count || 0,
      page,
      pageSize,
    })
  } catch (err: any) {
    // campaign_registrations 表不存在时返回空结果
    if (err?.statusCode === 500 && /relation|does not exist/i.test(err.statusMessage || '')) {
      return sendSuccess(event, { items: [], total: 0, page: 1, pageSize })
    }
    throw err
  }
})
