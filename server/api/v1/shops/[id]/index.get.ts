// @api-auth: public
import { defineEventHandler, getRouterParam } from 'h3'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['Coffee Shops'],
    summary: 'Get shop detail',
    description: 'Returns a single coffee shop by ID.',
    parameters: [
      { in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: 'Shop UUID' },
    ],
    responses: {
      200: { description: 'Shop detail' },
      404: { description: 'Shop not found' },
    },
  } as any,
})

export default defineEventHandler(async (event) => {
  const db = getDB(event)
  const id = getRouterParam(event, 'id')

  const { data, error } = await db
    .from('coffee_shops')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Shop not found',
    })
  }

  return sendSuccess(event, data, 'Fetched shop successfully')
})
