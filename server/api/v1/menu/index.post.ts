// @api-auth: admin
import { defineEventHandler, readBody } from 'h3'
import { z } from 'zod'
import { assertAdmin } from '~~/server/utils/auth'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['Coffee Menu'],
    summary: 'Create menu item (admin)',
    description: 'Admin-only: create a new menu item for a coffee shop.',
    security: [{ BearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['shop_id', 'name', 'price', 'category'],
            properties: {
              shop_id: { type: 'string' },
              name: { type: 'string' },
              price: { type: 'number' },
              category: { type: 'string', enum: ['classic', 'specialty', 'tea', 'pastry', 'seasonal'] },
              description: { type: 'string' },
              image_url: { type: 'string' },
              sort_order: { type: 'integer' },
            },
          },
        },
      },
    },
    responses: {
      201: { description: 'Menu item created' },
      400: { description: 'Validation error' },
      403: { description: 'Admin only' },
    },
  } as any,
})

const bodySchema = z.object({
  shop_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  price: z.number().min(0),
  category: z.enum(['classic', 'specialty', 'tea', 'pastry', 'seasonal']),
  description: z.string().max(500).default(''),
  image_url: z.string().default(''),
  sort_order: z.number().int().default(0),
})

export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)
  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation failed',
      data: parsed.error.flatten(),
    })
  }

  const { data, error } = await db
    .from('coffee_menu_items')
    .insert(parsed.data)
    .select('*')
    .single()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to create menu item',
    })
  }

  return sendSuccess(event, data, 'Menu item created', 201)
})
