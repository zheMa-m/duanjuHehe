// @api-auth: public
import { defineEventHandler, getQuery } from 'h3'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['剧集'],
    summary: '获取剧集列表（分页 + 筛选 + 搜索）',
    parameters: [
      { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
      { in: 'query', name: 'pageSize', schema: { type: 'integer', default: 20 } },
      { in: 'query', name: 'genre', schema: { type: 'string' } },
      { in: 'query', name: 'status', schema: { type: 'string', default: 'published' } },
      { in: 'query', name: 'search', schema: { type: 'string' } },
      { in: 'query', name: 'sortBy', schema: { type: 'string', enum: ['created_at', 'view_count', 'rating', 'title'], default: 'created_at' } },
      { in: 'query', name: 'sortOrder', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } },
      { in: 'query', name: 'featured', schema: { type: 'string' } },
    ],
  } as any,
})

export default defineEventHandler(async (event) => {
  const db = getDB(event)
  const query = getQuery(event)
  const page = Math.max(parseInt(query.page as string) || 1, 1)
  const pageSize = Math.min(parseInt(query.pageSize as string) || 20, 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const genre = query.genre as string || ''
  const status = query.status as string || 'published'
  const search = (query.search as string || '').trim()
  const sortBy = (['created_at', 'view_count', 'rating', 'title'].includes(query.sortBy as string) ? query.sortBy : 'created_at') as string
  const sortOrder = query.sortOrder === 'asc' ? true : false
  const featured = query.featured as string

  let q = db.from('series').select('*', { count: 'exact' }).eq('status', status).order(sortBy, { ascending: sortOrder }).range(from, to)

  if (genre) {
    q = q.eq('genre_id', genre)
  }
  if (featured === 'true') {
    q = q.eq('is_featured', true)
  }
  if (search) {
    q = q.ilike('title', `%${search}%`)
  }

  const { data, error, count } = await q

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message || 'Failed to fetch series' })
  }

  // 自动补全封面：无 cover_image 的系列用第一个分集的缩略图
  const items = data || []
  const seriesWithoutCover = items.filter((s: any) => !s.cover_image)
  if (seriesWithoutCover.length > 0) {
    const seriesIds = seriesWithoutCover.map((s: any) => s.id)
    const { data: firstEps } = await db.from('episodes')
      .select('series_id, thumbnail_url')
      .in('series_id', seriesIds)
      .eq('status', 'published')
      .order('sort_order', { ascending: true })
    if (firstEps) {
      const thumbMap = new Map<string, string>()
      for (const ep of firstEps) { if (!thumbMap.has(ep.series_id) && ep.thumbnail_url) thumbMap.set(ep.series_id, ep.thumbnail_url) }
      for (const item of items) { if (!item.cover_image && thumbMap.has(item.id)) item.cover_image = thumbMap.get(item.id) }
    }
  }

  return sendSuccess(event, {
    items,
    pagination: { page, pageSize, total: count || 0 },
  }, 'Fetched series successfully')
})
