// @api-auth: user
import { defineEventHandler } from 'h3'
import { z } from 'zod'
import { assertUser } from '~~/server/utils/auth'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['商品'],
    summary: '创建商品',
    description: '在当前租户下创建新商品，tenant_id 由服务端注入。',
    security: [{ BearerAuth: [] }],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string', minLength: 1 },
              price: { type: 'number', minimum: 0 },
              description: { type: 'string' },
              image_url: { type: 'string', format: 'uri' },
              is_active: { type: 'boolean' },
            },
            required: ['name', 'price'],
          },
        },
      },
    },
    responses: {
      201: {
        description: '商品创建成功',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                data: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    name: { type: 'string' },
                    price: { type: 'number' },
                    tenant_id: { type: 'string', format: 'uuid' },
                    created_at: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
      500: { description: '数据库错误' },
    },
  } as any,
})

const productCreateSchema = z.object({
  name: z.string().min(1, 'Product name cannot be empty').max(200),
  price: z.number().min(0, 'Price must be a non-negative number'),
  description: z.string().max(2000).default('').optional(),
  image_url: z.string().url().or(z.literal('')).default('').optional(),
  pricing: z.record(z.string(), z.any()).optional(),
  category: z.enum(['subscription', 'one_time', 'addon']).optional(),
})

export default defineEventHandler(async (event) => {
  const user = assertUser(event)
  const body = await readValidatedBody(event, productCreateSchema.parse)
  const db = getDB(event)

  // 注入当前租户 ID，强制防伪造（服务端覆盖，不信任客户端传入）
  const newRow = {
    name: body.name,
    price: body.price,
    description: body.description || '',
    image_url: body.image_url || '',
    pricing: body.pricing || {},
    category: body.category || 'subscription',
    tenant_id: user.tenantId,
    created_at: new Date().toISOString()
  }

  const { data, error } = await db
    .from('products')
    .insert(newRow)
    .select('*')

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to create product'
    })
  }

  return sendSuccess(event, data ? data[0] : null, 'Product created successfully', 201)
})
