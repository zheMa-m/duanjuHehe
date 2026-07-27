// @api-auth: public
import { defineEventHandler, getQuery } from 'h3'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['Coffee Shops'],
    summary: 'List coffee shops',
    description: 'Returns all active coffee shops, ordered by creation date.',
    parameters: [
      { in: 'query', name: 'city', schema: { type: 'string' }, description: 'Filter by city' },
    ],
    responses: {
      200: { description: 'List of coffee shops' },
      500: { description: 'Database error' },
    },
  } as any,
})

export default defineEventHandler(async (event) => {
  const db = getDB(event)
  const query = getQuery(event)
  const city = (query.city as string || '').trim()

  let q = db
    .from('coffee_shops')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (city) {
    q = q.ilike('city', '%' + city + '%')
  }

  const { data, error } = await q

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch shops',
    })
  }

  return sendSuccess(event, data || [], 'Fetched shops successfully')
})
