// @api-auth: user
import { defineEventHandler } from 'h3'
import { assertUser } from '~~/server/utils/auth'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: { tags: ['观看'], summary: '获取继续观看列表' } as any,
})

export default defineEventHandler(async (event) => {
  const user = assertUser(event)
  const db = getDB(event)

  // Get latest incomplete watch per series
  const { data } = await db.from('user_watch_history').select('*, episodes!inner(*), series!inner(*)').eq('user_id', user.id).eq('completed', false).order('watched_at', { ascending: false }).range(0, 19)

  return sendSuccess(event, { items: data || [] }, 'Continue watching list')
})
