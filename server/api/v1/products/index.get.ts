// @api-auth: user
import { defineEventHandler } from 'h3'
import { assertUser } from '~~/server/utils/auth'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['Products'],
    summary: '获取商品列表',
    description: '返回当前租户的所有商品，按 created_at 降序排列。',
    security: [{ BearerAuth: [] }],
    responses: {
      200: { description: '商品对象数组' },
      500: { description: '数据库错误' },
    },
  } as any,
})

export default defineEventHandler(async (event) => {
  const user = assertUser(event)
  const db = getDB(event)

  const { data, error } = await db
    .from('products')
    .select('*')
    .eq('tenant_id', user.tenantId)
    .order('created_at', { ascending: false })

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch products'
    })
  }

  return sendSuccess(event, data || [], 'Fetched products successfully')
})
