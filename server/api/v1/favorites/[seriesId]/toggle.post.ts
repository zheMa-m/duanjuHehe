// @api-auth: user
import { defineEventHandler, getRouterParam } from 'h3'
import { assertUser } from '~~/server/utils/auth'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['收藏'],
    summary: '切换收藏状态（添加/移除）',
    parameters: [{ in: 'path', name: 'seriesId', schema: { type: 'string' }, required: true }],
  } as any,
})

export default defineEventHandler(async (event) => {
  const user = assertUser(event)
  const db = getDB(event)
  const seriesId = getRouterParam(event, 'seriesId') || ''

  const { data: existing } = await db.from('user_favorites').select('id').eq('user_id', user.id).eq('series_id', seriesId).single()

  if (existing) {
    await db.from('user_favorites').delete().eq('id', existing.id)
    return sendSuccess(event, { favorited: false }, 'Removed from favorites')
  } else {
    await db.from('user_favorites').insert({ user_id: user.id, series_id: seriesId })
    return sendSuccess(event, { favorited: true }, 'Added to favorites')
  }
})
