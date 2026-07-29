// @api-auth: admin
import { defineEventHandler, getQuery } from 'h3'
import { assertAdmin } from '~~/server/utils/auth'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['管理-剧集'],
    summary: '获取剧集列表（管理端）',
    parameters: [
      { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
      { in: 'query', name: 'pageSize', schema: { type: 'integer', default: 20 } },
      { in: 'query', name: 'search', schema: { type: 'string' } },
      { in: 'query', name: 'status', schema: { type: 'string' } },
    ],
  } as any,
})

export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)
  const query = getQuery(event)
  const page = Math.max(parseInt(query.page as string) || 1, 1)
  const pageSize = Math.min(parseInt(query.pageSize as string) || 20, 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const search = (query.search as string || '').trim()
  const status = query.status as string || ''

  let q = db.from('series').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to)

  if (search) q = q.ilike('title', `%${search}%`)
  if (status) q = q.eq('status', status)

  const { data, error, count } = await q

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return sendSuccess(event, { items: data || [], pagination: { page, pageSize, total: count || 0 } })
})
