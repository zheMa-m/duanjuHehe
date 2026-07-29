// @api-auth: public
import { defineEventHandler, getQuery } from 'h3'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['搜索'],
    summary: '搜索剧集',
    parameters: [
      { in: 'query', name: 'q', schema: { type: 'string' }, required: true },
      { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
      { in: 'query', name: 'pageSize', schema: { type: 'integer', default: 20 } },
    ],
  } as any,
})

export default defineEventHandler(async (event) => {
  const db = getDB(event)
  const query = getQuery(event)
  const q = (query.q as string || '').trim()
  if (!q) return sendSuccess(event, { items: [], pagination: { page: 1, pageSize: 20, total: 0 } }, 'Empty search query')

  const page = Math.max(parseInt(query.page as string) || 1, 1)
  const pageSize = Math.min(parseInt(query.pageSize as string) || 20, 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await db.from('series').select('*', { count: 'exact' }).eq('status', 'published').ilike('title', `%${q}%`).order('view_count', { ascending: false }).range(from, to)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return sendSuccess(event, {
    items: data || [],
    pagination: { page, pageSize, total: count || 0 },
  }, 'Search results')
})
