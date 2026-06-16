// @api-auth: user
import { defineEventHandler } from 'h3'
import { assertUser } from '~~/server/utils/auth'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['Products'],
    summary: '删除商品',
    description: '删除当前租户下的指定商品。',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: '商品 ID' },
    ],
    responses: {
      200: { description: '商品已删除 — 返回 { id }' },
      400: { description: '缺少商品 ID' },
    },
  } as any,
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

  const db = getDB(event)
  const { error } = await db
    .from('products')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenantId)

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to delete product'
    })
  }

  return sendSuccess(event, { id }, 'Product deleted successfully')
})
