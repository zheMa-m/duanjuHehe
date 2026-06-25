// @api-auth: user
import { defineEventHandler } from 'h3'
import { z } from 'zod'
import { assertUser } from '~~/server/utils/auth'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['商品'],
    summary: '更新商品',
    description: '部分更新商品名称/价格，仅允许白名单字段，tenant_id 由服务端强制校验。',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: '商品 ID' },
    ],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              price: { type: 'number' },
            },
          },
        },
      },
    },
    responses: {
      200: { description: '商品更新成功' },
      400: { description: '缺少商品 ID' },
    },
  } as any,
})

const productUpdateSchema = z.object({
  name: z.string().min(1, 'Product name cannot be empty').max(200).optional(),
  price: z.number().min(0, 'Price must be a non-negative number').optional(),
  description: z.string().max(2000).optional(),
  image_url: z.string().url().or(z.literal('')).optional(),
  pricing: z.record(z.string(), z.any()).optional(),
})

export default defineEventHandler(async (event) => {
  const user = assertUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Product ID is required'
    })
  }

  const body = await readValidatedBody(event, productUpdateSchema.parse)
  const db = getDB(event)

  const updatePayload: Record<string, any> = {}
  if (body.name !== undefined) updatePayload.name = body.name
  if (body.price !== undefined) updatePayload.price = body.price
  if (body.description !== undefined) updatePayload.description = body.description
  if (body.image_url !== undefined) updatePayload.image_url = body.image_url
  if (body.pricing !== undefined) updatePayload.pricing = body.pricing

  const { data, error } = await db
    .from('products')
    .update(updatePayload)
    .eq('id', id)
    .eq('tenant_id', user.tenantId)

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to update product'
    })
  }

  return sendSuccess(event, data, 'Product updated successfully')
})
