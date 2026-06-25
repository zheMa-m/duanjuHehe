
// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { assertAdmin } from '~~/server/utils/auth'

defineRouteMeta({
  openAPI: {
    tags: ['Admin Orders'],
    summary: 'Get payment transaction history for a specific order',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'path', name: 'id', schema: { type: 'string' }, required: true, description: 'Order UUID' },
    ],
    responses: {
      200: { description: 'Transaction history list' },
    },
  } as any,
})

/**
 * 管理员：获取指定订单的支付网关交易流水
 * GET /api/admin/orders/:id/transactions
 */
export default defineEventHandler(async (event) => {
  const user = assertAdmin(event)
  const db = getDB(event)
  const { id } = event.context.params || {}

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Order ID is required' })
  }

  const { data: transactions, error } = await db
    .from('payment_transactions')
    .select('*')
    .eq('order_id', id)
    .order('created_at', { ascending: false })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch transactions' })
  }

  return sendSuccess(event, {
    items: transactions || [],
    total: transactions?.length || 0,
  }, 'Order transactions retrieved')
})
