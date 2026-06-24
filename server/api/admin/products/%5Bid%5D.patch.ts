// @api-auth: admin
import { z } from 'zod'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { assertAdmin } from '~~/server/utils/auth'
import { logAuditEvent } from '~~/server/utils/logger'

defineRouteMeta({
  openAPI: {
    tags: ['管理端商品'],
    summary: '管理员修改商品信息与上下架',
    description: '管理员可用此端点修改已有商品的名称、价格、支付映射数据以及是否在售（上下架）状态。',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: '商品 ID (UUID)' },
    ],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              price: { type: 'number', minimum: 0 },
              paymentMeta: { type: 'object' },
              isActive: { type: 'boolean' },
            },
          },
        },
      },
    },
    responses: {
      200: { description: '商品信息更新成功' },
      404: { description: '商品未找到' },
    },
  } as any,
})

const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  price: z.number().min(0).optional(),
  paymentMeta: z.record(z.string(), z.any()).optional(),
  isActive: z.boolean().optional(),
  category: z.enum(['subscription', 'one_time', 'addon']).optional(),
})

/**
 * 管理员修改商品
 * PATCH /api/admin/products/:id
 */
export default defineEventHandler(async (event) => {
  const user = assertAdmin(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing product ID' })
  }

  const body = await readValidatedBody(event, updateProductSchema.parse)
  const db = getDB(event)

  // 1. 检查商品是否存在
  const { data: existing, error: findErr } = await db
    .from('products')
    .select('id, name')
    .eq('id', id)
    .single()

  if (findErr || !existing) {
    throw createError({ statusCode: 404, statusMessage: 'Product not found' })
  }

  // 2. 构造更新载荷
  const updatePayload: any = {
    updated_at: new Date().toISOString()
  }
  if (body.name !== undefined) updatePayload.name = body.name
  if (body.price !== undefined) updatePayload.price = body.price
  if (body.paymentMeta !== undefined) updatePayload.payment_meta = body.paymentMeta
  if (body.isActive !== undefined) updatePayload.is_active = body.isActive
  if (body.category !== undefined) updatePayload.category = body.category

  const { data: updated, error: updateErr } = await db
    .from('products')
    .update(updatePayload)
    .eq('id', id)
    .select('*')

  if (updateErr || !updated) {
    throw createError({
      statusCode: 500,
      statusMessage: updateErr?.message || 'Failed to update product'
    })
  }

  const updatedProduct = updated[0]

  // 3. 审计日志
  let auditAction = `PRODUCT_UPDATE:${id}`
  if (body.isActive !== undefined) {
    auditAction = `PRODUCT_SHELVING:${id}:${body.isActive ? 'ON_SALE' : 'OFF_SALE'}`
  }
  await logAuditEvent(event, user, auditAction, 'SUCCESS')

  return sendSuccess(event, updatedProduct, 'Product updated successfully')
})
