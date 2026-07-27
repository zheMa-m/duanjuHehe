import { z } from 'zod'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { assertUser } from '~~/server/utils/auth'

defineRouteMeta({
  openAPI: {
    tags: ['Coffee Orders'],
    summary: 'Place a coffee order',
    description: 'Creates a new coffee order with items, customizations, and order type.',
    security: [{ BearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['shop_id', 'items'],
            properties: {
              shop_id: { type: 'string', description: 'Coffee shop UUID' },
              order_type: { type: 'string', enum: ['dine_in', 'takeout'], default: 'takeout' },
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['menu_item_id', 'name', 'price', 'quantity'],
                  properties: {
                    menu_item_id: { type: 'string' },
                    name: { type: 'string' },
                    price: { type: 'number' },
                    quantity: { type: 'integer', minimum: 1 },
                    sugar: { type: 'string', enum: ['full', 'half', 'none'], default: 'full' },
                    ice: { type: 'string', enum: ['normal', 'less', 'none'], default: 'normal' },
                    size: { type: 'string', enum: ['small', 'medium', 'large'], default: 'medium' },
                  },
                },
              },
            },
          },
        },
      },
    },
    responses: {
      200: { description: 'Order placed successfully' },
      400: { description: 'Validation error' },
      401: { description: 'Unauthorized' },
    },
  } as any,
})

const orderSchema = z.object({
  shop_id: z.string().uuid(),
  order_type: z.enum(['dine_in', 'takeout']).default('takeout'),
  items: z.array(z.object({
    menu_item_id: z.string().uuid(),
    name: z.string().min(1),
    price: z.number().positive(),
    quantity: z.number().int().min(1),
    sugar: z.enum(['full', 'half', 'none']).default('full'),
    ice: z.enum(['normal', 'less', 'none']).default('normal'),
    size: z.enum(['small', 'medium', 'large']).default('medium'),
  })).min(1),
})

function generatePickupCode(): string {
  const prefix = String.fromCharCode(65 + Math.floor(Math.random() * 26))
  const digits = String(Math.floor(Math.random() * 900) + 100)
  return prefix + digits
}

export default defineEventHandler(async (event) => {
  const user = assertUser(event)
  const db = getDB(event)

  const body = await readBody(event)
  const parsed = orderSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues.map(e => e.message).join('; '),
    })
  }

  const { shop_id, order_type, items } = parsed.data

  // Verify shop exists and is active
  const { data: shop, error: shopErr } = await db
    .from('coffee_shops')
    .select('id')
    .eq('id', shop_id)
    .eq('is_active', true)
    .single()

  if (shopErr || !shop) {
    throw createError({ statusCode: 404, statusMessage: 'Shop not found or inactive' })
  }

  const pickupCode = generatePickupCode()
  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const customizations = items.map(item => ({
    menu_item_id: item.menu_item_id,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    sugar: item.sugar,
    ice: item.ice,
    size: item.size,
  }))

  const { data: order, error: orderErr } = await db
    .from('orders')
    .insert({
      user_id: user.id,
      shop_id,
      order_type,
      pickup_code: pickupCode,
      customizations,
      total_amount: totalAmount,
      status: 'pending',
      currency: 'CNY',
    })
    .select('id, order_no, shop_id, pickup_code, order_type, status, customizations, amount, created_at')
    .single()

  if (orderErr) {
    throw createError({ statusCode: 500, statusMessage: orderErr.message || 'Failed to create order' })
  }

  // Return shape matching mobile Order type
  return sendSuccess(event, {
    id: order.id,
    order_no: order.order_no,
    shop_id: order.shop_id,
    pickup_code: order.pickup_code,
    order_type: order.order_type,
    status: order.status,
    customizations: order.customizations || customizations,
    amount: order.amount || totalAmount,
    created_at: order.created_at,
  }, 'Order placed successfully')
})
