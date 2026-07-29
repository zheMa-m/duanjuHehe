// @api-auth: public
import { defineEventHandler, getRouterParam } from 'h3'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['剧集'],
    summary: '获取剧集的分集列表',
    parameters: [
      { in: 'path', name: 'id', schema: { type: 'string' }, required: true },
    ],
  } as any,
})

export default defineEventHandler(async (event) => {
  const db = getDB(event)
  const id = getRouterParam(event, 'id') || ''

  // Resolve series
  let seriesQ = db.from('series').select('id')
  if (id.match(/^[0-9a-f-]{36}$/i)) {
    seriesQ = seriesQ.eq('id', id)
  } else {
    seriesQ = seriesQ.eq('slug', id)
  }
  const { data: series } = await seriesQ.single()

  if (!series) {
    throw createError({ statusCode: 404, statusMessage: 'Series not found' })
  }

  const { data, error } = await db.from('episodes').select('id, episode_number, title, description, thumbnail_url, duration_seconds, is_free, coin_cost, sort_order, status').eq('series_id', series.id).eq('status', 'published').order('sort_order', { ascending: true })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return sendSuccess(event, { items: data || [] }, 'Fetched episodes successfully')
})
