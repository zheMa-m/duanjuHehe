// @api-auth: user
import { defineEventHandler, getRouterParam, readValidatedBody } from 'h3'
import { z } from 'zod'
import { assertUser } from '~~/server/utils/auth'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['分集'],
    summary: '用金币解锁剧集',
    requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { episode_id: { type: 'string' } } } } } },
  } as any,
})

const unlockSchema = z.object({ episode_id: z.string().uuid().optional() }).optional()

export default defineEventHandler(async (event) => {
  const user = assertUser(event)
  const db = getDB(event)
  const id = getRouterParam(event, 'id') || ''

  // Fetch episode
  const { data: episode } = await db.from('episodes').select('*').eq('id', id).single()
  if (!episode) throw createError({ statusCode: 404, statusMessage: 'Episode not found' })
  if (episode.is_free) {
    return sendSuccess(event, { unlocked: true }, 'Episode is free')
  }

  // Check if already unlocked
  const { data: existing } = await db.from('episode_unlocks').select('*').eq('user_id', user.id).eq('episode_id', id).single()
  if (existing) {
    return sendSuccess(event, { unlocked: true }, 'Already unlocked')
  }

  // Check coin balance
  const { data: coins } = await db.from('user_coins').select('*').eq('user_id', user.id).single()
  if (!coins || coins.balance < episode.coin_cost) {
    throw createError({ statusCode: 402, statusMessage: `Insufficient coins. Need ${episode.coin_cost}, have ${coins?.balance || 0}` })
  }

  // Deduct coins & unlock
  const newBalance = coins.balance - episode.coin_cost
  await db.from('user_coins').update({ balance: newBalance, total_spent: (coins.total_spent || 0) + episode.coin_cost }).eq('user_id', user.id)
  await db.from('coin_transactions').insert({ user_id: user.id, amount: -episode.coin_cost, balance_after: newBalance, type: 'spend', reference_type: 'episode_unlock', reference_id: id, description: `Unlocked episode: ${episode.title}` })
  await db.from('episode_unlocks').insert({ user_id: user.id, episode_id: id, coin_cost: episode.coin_cost })

  return sendSuccess(event, {
    unlocked: true,
    balance_after: newBalance,
    coin_cost: episode.coin_cost,
  }, 'Episode unlocked successfully')
})
