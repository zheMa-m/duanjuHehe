// @api-auth: user
import { defineEventHandler } from 'h3'
import { assertUser } from '~~/server/utils/auth'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: { tags: ['收藏'], summary: '获取用户收藏列表' } as any,
})

export default defineEventHandler(async (event) => {
  const user = assertUser(event)
  const db = getDB(event)

  const { data } = await db.from('user_favorites').select('*, series!inner(*)').eq('user_id', user.id).order('created_at', { ascending: false })

  return sendSuccess(event, { items: data || [] }, 'Fetched favorites')
})
