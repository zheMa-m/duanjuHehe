// @api-auth: user
import { defineEventHandler, readValidatedBody } from 'h3'
import { z } from 'zod'
import { assertUser } from '~~/server/utils/auth'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['广告'],
    summary: '记录广告观看并奖励金币',
    requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { episode_id: { type: 'string' } } } } } },
  } as any,
})

const adSchema = z.object({
  episode_id: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const user = assertUser(event)
  const db = getDB(event)
  const body = await readValidatedBody(event, adSchema.parse)

  const coinsEarned = 5

  // Credit coins
  const { data: userCoins } = await db.from('user_coins').select('*').eq('user_id', user.id).single()
  const currentBalance = userCoins?.balance || 0
  const newBalance = currentBalance + coinsEarned

  if (userCoins) {
    await db.from('user_coins').update({ balance: newBalance, total_earned: (userCoins.total_earned || 0) + coinsEarned }).eq('user_id', user.id)
  } else {
    await db.from('user_coins').insert({ user_id: user.id, balance: newBalance, total_earned: coinsEarned, total_spent: 0 })
  }

  await db.from('coin_transactions').insert({
    user_id: user.id,
    amount: coinsEarned,
    balance_after: newBalance,
    type: 'earn',
    reference_type: 'ad_watch',
    reference_id: body.episode_id || null,
    description: 'Watched ad',
  })

  await db.from('ad_watch_logs').insert({
    user_id: user.id,
    episode_id: body.episode_id || null,
    coins_earned: coinsEarned,
  })

  return sendSuccess(event, {
    coins_earned: coinsEarned,
    balance_after: newBalance,
  }, 'Ad reward credited')
})
