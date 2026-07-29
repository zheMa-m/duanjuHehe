// @api-auth: admin
import { defineEventHandler, getQuery } from 'h3'
import { assertAdmin } from '~~/server/utils/auth'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['管理-分集'],
    summary: '获取分集列表（管理端，可按剧集筛选）',
    parameters: [
      { in: 'query', name: 'series_id', schema: { type: 'string' }, required: true },
      { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
      { in: 'query', name: 'pageSize', schema: { type: 'integer', default: 100 } },
    ],
  } as any,
})

export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)
  const query = getQuery(event)
  const seriesId = query.series_id as string || ''
  const page = Math.max(parseInt(query.page as string) || 1, 1)
  const pageSize = Math.min(parseInt(query.pageSize as string) || 100, 500)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await db.from('episodes').select('*', { count: 'exact' }).eq('series_id', seriesId).order('sort_order', { ascending: true }).range(from, to)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return sendSuccess(event, { items: data || [], pagination: { page, pageSize, total: count || 0 } })
})
