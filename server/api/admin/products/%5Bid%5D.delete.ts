
// @api-auth: admin
import { z } from 'zod'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { assertAdmin } from '~~/server/utils/auth'
import { logAuditEvent } from '~~/server/utils/logger'

defineRouteMeta({
  openAPI: {
    tags: ['管理端商品'],
    summary: '管理员删除商品（软删除保护）',
    description: '删除商品前检查关联订单。有订单时仅设 is_active=false + archived_at；无订单时物理删除。',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: '商品 ID (UUID)' },
    ],
    responses: {
      200: { description: '商品操作完成' },
      404: { description: '商品未找到' },
    },
  } as any,
})

/**
 * 管理员删除商品（带关联订单保护）
 * DELETE /api/admin/products/:id
 */
export default defineEventHandler(async (event) => {
  const admin = assertAdmin(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing product ID' })
  }

  const db = getDB(event)

  // 1. 确认商品存在
  const { data: product, error: notFound } = await db
    .from('products')
    .select('*')
    .eq('id', id)
    .single()

  if (notFound || !product) {
    throw createError({ statusCode: 404, statusMessage: 'Product not found' })
  }

  // 2. 检查关联订单数
  const { count: orderCount } = await db
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('product_id', id)

  if (orderCount && orderCount > 0) {
    // 有历史订单：仅软删除
    await db.from('products').update({
      is_active: false,
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', id)

    await logAuditEvent(
      event, admin,
      `PRODUCT_SOFT_DELETE:${id}:${product.name}:orders=${orderCount}`,
      'SUCCESS'
    )

    return sendSuccess(event, {
      id,
      name: product.name,
      action: 'archived',
      orderCount,
    }, `Product archived (${orderCount} associated orders prevent hard delete)`)
  }

  // 3. 无关联订单：物理删除
  const { error: deleteErr } = await db
    .from('products')
    .delete()
    .eq('id', id)

  if (deleteErr) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to delete product' })
  }

  await logAuditEvent(
    event, admin,
    `PRODUCT_HARD_DELETE:${id}:${product.name}`,
    'SUCCESS'
  )

  return sendSuccess(event, { id, name: product.name, action: 'deleted' }, 'Product permanently deleted')
})
