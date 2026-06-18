
// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['管理·营销-活动'],
    summary: '管理员：获取所有营销活动（分页，含留资统计）',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'query', name: 'page', schema: { type: 'integer', default: 1 }, description: '页码' },
      { in: 'query', name: 'pageSize', schema: { type: 'integer', default: 5 }, description: '每页条数（最大 100）' },
    ],
    responses: {
      200: { description: '分页营销活动列表（含 leads_count 与总数）' },
    },
  } as any,
})

export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)

  const query = getQuery(event)
  const page = Math.max(parseInt(query.page as string) || 1, 1)
  const pageSize = Math.min(parseInt(query.pageSize as string) || 5, 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data: campaigns, error, count } = await db
    .from('campaigns')
    .select('*', { count: 'exact' })
    .order('sort_order', { ascending: true })
    .range(from, to)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message || 'Failed to fetch campaigns' })
  }

  const items = campaigns || []
  try {
    // 优化：仅对当前页的 campaigns 并发 count 统计，避免全表拉取
    await Promise.all(
      items.map(async (cam: any) => {
        const { count } = await db
          .from('campaign_registrations')
          .select('*', { count: 'exact', head: true })
          .eq('subdomain', cam.subdomain)
        cam.leads_count = count || 0
      })
    )
  } catch {
    for (const cam of items) {
      (cam as any).leads_count = 0
    }
  }

  return sendSuccess(event, {
    items,
    pagination: { page, pageSize, total: count || 0 },
  }, 'Fetched campaigns successfully')
})
