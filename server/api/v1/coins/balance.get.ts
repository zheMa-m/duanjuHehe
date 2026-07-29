// @api-auth: user
import { defineEventHandler } from 'h3'
import { assertUser } from '~~/server/utils/auth'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: { tags: ['金币'], summary: '获取用户金币余额' } as any,
})

export default defineEventHandler(async (event) => {
  const user = assertUser(event)
  const db = getDB(event)

  const { data } = await db.from('user_coins').select('*').eq('user_id', user.id).single()

  return sendSuccess(event, {
    balance: data?.balance || 0,
    total_earned: data?.total_earned || 0,
    total_spent: data?.total_spent || 0,
  }, 'Fetched coin balance')
})
