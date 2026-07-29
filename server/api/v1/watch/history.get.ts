// @api-auth: user
import { defineEventHandler, getQuery } from 'h3'
import { assertUser } from '~~/server/utils/auth'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['观看'],
    summary: '获取用户观看历史',
    parameters: [
      { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
      { in: 'query', name: 'pageSize', schema: { type: 'integer', default: 20 } },
    ],
  } as any,
})

export default defineEventHandler(async (event) => {
  const user = assertUser(event)
  const db = getDB(event)
  const query = getQuery(event)
  const page = Math.max(parseInt(query.page as string) || 1, 1)
  const pageSize = Math.min(parseInt(query.pageSize as string) || 20, 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await db.from('user_watch_history').select('*, episodes!inner(*), series!inner(*)', { count: 'exact' }).eq('user_id', user.id).order('watched_at', { ascending: false }).range(from, to)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return sendSuccess(event, {
    items: data || [],
    pagination: { page, pageSize, total: count || 0 },
  }, 'Fetched watch history')
})
