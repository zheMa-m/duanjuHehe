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

  // 自动补全封面
  const items = data || []
  const withoutCover = items.filter((s: any) => !s.cover_image)
  if (withoutCover.length > 0) {
    const ids = withoutCover.map((s: any) => s.id)
    const { data: firstEps } = await db.from('episodes')
      .select('series_id, thumbnail_url').in('series_id', ids).eq('status', 'published').order('sort_order')
    if (firstEps) {
      const map = new Map<string, string>()
      for (const ep of firstEps) { if (!map.has(ep.series_id) && ep.thumbnail_url) map.set(ep.series_id, ep.thumbnail_url) }
      for (const item of items) { if (!item.cover_image && map.has(item.id)) item.cover_image = map.get(item.id) }
    }
  }

  return sendSuccess(event, { items, type }, 'Fetched discover list successfully')
})
