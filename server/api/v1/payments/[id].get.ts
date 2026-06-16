import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { assertUser } from '~~/server/utils/auth'

defineRouteMeta({
  openAPI: {
    tags: ['Payments'],
    summary: '获取单个订单状态',
    description: '返回订单详情，RLS 限制用户仅可查看自己的订单（管理员除外）。',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: '订单 ID' },
    ],
    responses: {
      200: { description: '订单对象' },
      403: { description: '无权访问' },
      404: { description: '订单未找到' },
    },
  } as any,
})

/**
 * 获取单个订单/支付状态
 * GET /api/v1/payments/:id
 */
export default defineEventHandler(async (event) => {
  const user = assertUser(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing order ID' })
  }

  const db = getDB(event)
  const { data: order, error } = await db.from('orders').select('*').eq('id', id).single()

  if (error || !order) {
    throw createError({ statusCode: 404, statusMessage: 'Order not found' })
  }

  // RLS：用户仅可查看自己的订单
  if (order.user_id !== user.id && user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Access denied' })
  }

  return sendSuccess(event, order, 'Order retrieved')
})
