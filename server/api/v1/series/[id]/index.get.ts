// @api-auth: public
import { defineEventHandler, getRouterParam } from 'h3'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['剧集'],
    summary: '获取剧集详情（含分集列表）',
    parameters: [
      { in: 'path', name: 'id', schema: { type: 'string' }, required: true, description: 'Series slug or UUID' },
    ],
  } as any,
})

export default defineEventHandler(async (event) => {
  const db = getDB(event)
  const id = getRouterParam(event, 'id') || ''

  // Try slug first, then UUID
  let q = db.from('series').select('*')
  if (id.match(/^[0-9a-f-]{36}$/i)) {
    q = q.eq('id', id)
  } else {
    q = q.eq('slug', id)
  }
  const { data: series, error } = await q.single()

  if (error || !series) {
    throw createError({ statusCode: 404, statusMessage: 'Series not found' })
  }

  // Fetch episodes
  const { data: episodes } = await db.from('episodes').select('id, episode_number, title, thumbnail_url, duration_seconds, is_free, coin_cost, sort_order, status').eq('series_id', series.id).eq('status', 'published').order('sort_order', { ascending: true })

  return sendSuccess(event, {
    ...series,
    episodes: episodes || [],
  }, 'Fetched series detail successfully')
})
