
// @api-auth: admin
import { z } from 'zod'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { assertAdmin } from '~~/server/utils/auth'
import { logAuditEvent } from '~~/server/utils/logger'

defineRouteMeta({
  openAPI: {
    tags: ['Admin Orders'],
    summary: '管理员：更新订单状态',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: '订单 ID' },
    ],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['pending', 'paid', 'failed', 'refunded'] },
            },
          },
        },
      },
    },
    responses: {
      200: { description: '订单已更新' },
      404: { description: '订单未找到' },
    },
  } as any,
})

const orderUpdateSchema = z.object({
  status: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
})

/**
 * 管理员：更新订单状态（如标记退款）
 * PATCH /api/admin/orders/:id
 */
export default defineEventHandler(async (event) => {
  const user = assertAdmin(event)
  const id = getRouterParam(event, 'id')
  const body = await readValidatedBody(event, orderUpdateSchema.parse)

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing order ID' })
  }

  const db = getDB(event)
  const { data: order, error: notFound } = await db.from('orders').select('*').eq('id', id).single()

  if (notFound || !order) {
    throw createError({ statusCode: 404, statusMessage: 'Order not found' })
  }

  const { data: updated } = await db.from('orders').update({
    ...body,
    updated_at: new Date().toISOString()
  }).eq('id', id).select().single()

  await logAuditEvent(event, user, `ADMIN_ORDER_UPDATE:${id}:${body.status || 'updated'}`, 'SUCCESS')

  return sendSuccess(event, updated, 'Order updated')
})
