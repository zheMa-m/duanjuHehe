// @api-auth: user
import { defineEventHandler } from 'h3'
import { assertUser } from '~~/server/utils/auth'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['商品'],
    summary: '获取商品列表（分页）',
    description: '返回当前租户的所有商品（分页），按 created_at 降序排列。',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'query', name: 'page', schema: { type: 'integer', default: 1 }, description: '页码' },
      { in: 'query', name: 'pageSize', schema: { type: 'integer', default: 20 }, description: '每页条数（最大 100）' },
    ],
    responses: {
      200: { description: '分页商品列表（含总数）' },
      500: { description: '数据库错误' },
    },
  } as any,
})

export default defineEventHandler(async (event) => {
  const user = assertUser(event)
  const db = getDB(event)

  const query = getQuery(event)
  const page = Math.max(parseInt(query.page as string) || 1, 1)
  const pageSize = Math.min(parseInt(query.pageSize as string) || 20, 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await db
    .from('products')
    .select('*', { count: 'exact' })
    .eq('tenant_id', user.tenantId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch products'
    })
  }

  return sendSuccess(event, {
    items: data || [],
    pagination: { page, pageSize, total: count || 0 },
  }, 'Fetched products successfully')
})
