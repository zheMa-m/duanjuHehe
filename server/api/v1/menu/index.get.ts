// @api-auth: public
import { defineEventHandler, getQuery } from 'h3'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['Coffee Menu'],
    summary: 'List menu items',
    description: 'Returns menu items for a given shop, grouped by category.',
    parameters: [
      { in: 'query', name: 'shop_id', required: true, schema: { type: 'string' }, description: 'Shop UUID' },
      { in: 'query', name: 'category', schema: { type: 'string', enum: ['classic', 'specialty', 'tea', 'pastry', 'seasonal'] }, description: 'Filter by category' },
    ],
    responses: {
      200: { description: 'Menu items list' },
      400: { description: 'shop_id is required' },
    },
  } as any,
})

export default defineEventHandler(async (event) => {
  const db = getDB(event)
  const query = getQuery(event)
  const shopId = (query.shop_id as string || '').trim()
  const category = (query.category as string || '').trim()

  if (!shopId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'shop_id query parameter is required',
    })
  }

  let q = db
    .from('coffee_menu_items')
    .select('*')
    .eq('shop_id', shopId)
    .eq('is_available', true)
    .order('sort_order', { ascending: true })

  if (category) {
    q = q.eq('category', category)
  }

  const { data, error } = await q

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch menu items',
    })
  }

  return sendSuccess(event, data || [], 'Fetched menu items successfully')
})
