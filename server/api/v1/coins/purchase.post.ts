// @api-auth: user
import { defineEventHandler, readValidatedBody } from 'h3'
import { z } from 'zod'
import { assertUser } from '~~/server/utils/auth'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['金币'],
    summary: '购买金币套餐（创建支付订单）',
    requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { package_id: { type: 'string' }, payment_provider: { type: 'string' } } } } } },
  } as any,
})

const purchaseSchema = z.object({
  package_id: z.string(),
  payment_provider: z.string().default('stripe'),
})

export default defineEventHandler(async (event) => {
  const user = assertUser(event)
  const db = getDB(event)
  const body = await readValidatedBody(event, purchaseSchema.parse)

  const { data: pkg } = await db.from('coin_packages').select('*').eq('id', body.package_id).single()
  if (!pkg || !pkg.is_active) throw createError({ statusCode: 404, statusMessage: 'Package not found' })

  // Create order record
  const orderId = `ord-coin-${Date.now().toString(36)}`
  const orderNo = `COIN-${Date.now().toString(36).toUpperCase()}`
  await db.from('orders').insert({
    id: orderId,
    order_no: orderNo,
    user_id: user.id,
    product_name: pkg.name,
    amount: pkg.price,
    currency: pkg.currency,
    status: 'pending',
    payment_provider: body.payment_provider,
    metadata: { package_id: pkg.id, coins_amount: pkg.coins_amount, bonus_coins: pkg.bonus_coins },
  })

  // On successful mock payment, credit coins
  const { data: userCoins } = await db.from('user_coins').select('*').eq('user_id', user.id).single()
  const currentBalance = userCoins?.balance || 0
  const newBalance = currentBalance + pkg.coins_amount + pkg.bonus_coins

  if (userCoins) {
    await db.from('user_coins').update({ balance: newBalance, total_earned: (userCoins.total_earned || 0) + pkg.coins_amount + pkg.bonus_coins }).eq('user_id', user.id)
  } else {
    await db.from('user_coins').insert({ user_id: user.id, balance: newBalance, total_earned: pkg.coins_amount + pkg.bonus_coins, total_spent: 0 })
  }

  await db.from('coin_transactions').insert({
    user_id: user.id,
    amount: pkg.coins_amount + pkg.bonus_coins,
    balance_after: newBalance,
    type: 'purchase',
    reference_type: 'coin_package',
    reference_id: pkg.id,
    description: `Purchased ${pkg.name} (+${pkg.coins_amount}${pkg.bonus_coins > 0 ? ` + ${pkg.bonus_coins} bonus` : ''} coins)`,
  })

  // Update order status
  await db.from('orders').update({ status: 'paid' }).eq('id', orderId)

  return sendSuccess(event, {
    order_no: orderNo,
    coins_credited: pkg.coins_amount + pkg.bonus_coins,
    balance_after: newBalance,
  }, 'Coins purchased successfully')
})
