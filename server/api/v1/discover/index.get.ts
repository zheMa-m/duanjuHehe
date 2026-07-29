// @api-auth: public
import { defineEventHandler, getQuery } from 'h3'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['发现'],
    summary: '获取热门/推荐/精选剧集',
    parameters: [
      { in: 'query', name: 'type', schema: { type: 'string', enum: ['trending', 'featured', 'recommended'], default: 'trending' } },
      { in: 'query', name: 'limit', schema: { type: 'integer', default: 10 } },
    ],
  } as any,
})

export default defineEventHandler(async (event) => {
  const db = getDB(event)
  const query = getQuery(event)
  const type = (query.type as string) || 'trending'
  const limit = Math.min(parseInt(query.limit as string) || 10, 50)

  let q = db.from('series').select('*').eq('status', 'published')

  if (type === 'featured') {
    q = q.eq('is_featured', true)
  }

  q = q.order(type === 'trending' ? 'view_count' : 'rating', { ascending: false }).range(0, limit - 1)

  const { data, error } = await q

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return sendSuccess(event, { items: data || [], type }, 'Fetched discover list successfully')
})
