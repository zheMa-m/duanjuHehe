// @api-auth: user
import { defineEventHandler, getRouterParam } from 'h3'
import { assertUser } from '~~/server/utils/auth'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['分集'],
    summary: '获取单集详情（含解锁状态）',
    parameters: [
      { in: 'path', name: 'id', schema: { type: 'string' }, required: true },
    ],
  } as any,
})

export default defineEventHandler(async (event) => {
  const user = assertUser(event)
  const db = getDB(event)
  const id = getRouterParam(event, 'id') || ''

  const { data: episode, error } = await db.from('episodes').select('*, series:series_id(*)').eq('id', id).single()

  if (error || !episode) {
    throw createError({ statusCode: 404, statusMessage: 'Episode not found' })
  }

  // Check unlock status
  let isUnlocked = episode.is_free === true
  if (!isUnlocked && user) {
    const { data: unlock } = await db.from('episode_unlocks').select('*').eq('user_id', user.id).eq('episode_id', id).single()
    if (unlock) isUnlocked = true
  }

  return sendSuccess(event, {
    ...episode,
    is_unlocked: isUnlocked,
    video_url: isUnlocked ? episode.video_url : null,
  }, 'Fetched episode successfully')
})
