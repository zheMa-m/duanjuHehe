// @api-auth: user
import { defineEventHandler, getRouterParam } from 'h3'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { assertUser } from '~~/server/utils/auth'

defineRouteMeta({
  openAPI: {
    tags: ['Coffee Orders'],
    summary: 'Get order detail',
    description: 'Returns a single order by ID, including coffee-specific fields (pickup_code, order_type, customizations).',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: 'Order UUID' },
    ],
    responses: {
      200: { description: 'Order detail' },
      404: { description: 'Order not found' },
      401: { description: 'Unauthorized' },
    },
  } as any,
})

export default defineEventHandler(async (event) => {
  const user = assertUser(event)
  const db = getDB(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Order ID is required' })
  }

  // Fetch order belonging to the authenticated user
  const { data, error } = await db
    .from('orders')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !data) {
    throw createError({ statusCode: 404, statusMessage: 'Order not found' })
  }

  return sendSuccess(event, data, 'Order detail retrieved')
})
