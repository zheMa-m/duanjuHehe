// @api-auth: admin
import { z } from 'zod'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { assertAdmin, BUILTIN_ADMIN_UUID } from '~~/server/utils/auth'
import { logAuditEvent } from '~~/server/utils/logger'

defineRouteMeta({
  openAPI: {
    tags: ['管理端商品'],
    summary: '管理员创建商品',
    description: '管理员可用此端点在平台全局商品目录中新增商品，并绑定 Stripe Price ID 等支付元数据。',
    security: [{ BearerAuth: [] }],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string', minLength: 1 },
              price: { type: 'number', minimum: 0 },
              paymentMeta: { type: 'object' },
            },
            required: ['name', 'price'],
          },
        },
      },
    },
    responses: {
      201: { description: '商品创建成功' },
    },
  } as any,
})

const createProductSchema = z.object({
  name: z.string().min(1, 'Product name cannot be empty'),
  price: z.number().min(0, 'Price must be a non-negative number'),
  paymentMeta: z.record(z.any()).optional().default({}),
  category: z.enum(['subscription', 'one_time', 'addon']).optional().default('subscription'),
})

/**
 * 管理员创建商品
 * POST /api/admin/products
 */
export default defineEventHandler(async (event) => {
  const user = assertAdmin(event)
  const body = await readValidatedBody(event, createProductSchema.parse)
  const db = getDB(event)

  const newRow = {
    name: body.name,
    price: body.price,
    category: body.category,
    tenant_id: BUILTIN_ADMIN_UUID, // 全局商品绑定为内置管理员 UUID
    payment_meta: body.paymentMeta,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  const { data, error } = await db
    .from('products')
    .insert(newRow)
    .select('*')

  if (error || !data) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message || 'Failed to create product'
    })
  }

  const createdProduct = data[0]

  // 审计日志
  await logAuditEvent(
    event,
    user,
    `PRODUCT_CREATE:${createdProduct.id}:${body.name}`,
    'SUCCESS'
  )

  return sendSuccess(event, createdProduct, 'Product created successfully', 201)
})
