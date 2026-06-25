// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { assertAdmin, BUILTIN_ADMIN_UUID } from '~~/server/utils/auth'

defineRouteMeta({
  openAPI: {
    tags: ['管理端商品'],
    summary: '管理员获取商品列表（分页 + 搜索 + 排序）',
    description: '返回平台全局商品目录（管理员视角），支持关键词搜索、分类过滤和多字段排序。',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'query', name: 'page', schema: { type: 'integer', default: 1 }, description: '页码' },
      { in: 'query', name: 'pageSize', schema: { type: 'integer', default: 20 }, description: '每页条数（最大 100）' },
      { in: 'query', name: 'search', schema: { type: 'string' }, description: '商品名称关键词搜索' },
      { in: 'query', name: 'category', schema: { type: 'string', enum: ['subscription', 'one_time', 'addon'] }, description: '分类过滤' },
      { in: 'query', name: 'sortBy', schema: { type: 'string', enum: ['created_at', 'price', 'name', 'updated_at'], default: 'created_at' }, description: '排序字段' },
      { in: 'query', name: 'sortOrder', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }, description: '排序方向' },
    ],
    responses: {
      200: { description: '分页商品列表（含总数）' },
    },
  } as any,
})

/**
 * 管理员获取商品列表
 * GET /api/admin/products
 *
 * 使用 BUILTIN_ADMIN_UUID 作为 tenant_id 过滤，
 * 与管理端 POST/PATCH 创建时写入的 tenant_id 保持一致。
 */
export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)

  const query = getQuery(event)
  const page = Math.max(parseInt(query.page as string) || 1, 1)
  const pageSize = Math.min(parseInt(query.pageSize as string) || 20, 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const search = (query.search as string || '').trim()
  const category = query.category as string || ''
  const sortBy = (['created_at', 'price', 'name', 'updated_at'].includes(query.sortBy as string) ? query.sortBy : 'created_at') as string
  const sortOrder = query.sortOrder === 'asc' ? true : false

  let q = db
    .from('products')
    .select('*', { count: 'exact' })
    .eq('tenant_id', BUILTIN_ADMIN_UUID)
    .order(sortBy, { ascending: sortOrder })
    .range(from, to)

  // 分类过滤
  if (category && ['subscription', 'one_time', 'addon'].includes(category)) {
    q = q.eq('category', category)
  }

  // 关键词搜索（名称模糊匹配）
  if (search) {
    q = q.ilike('name', `%${search}%`)
  }

  const { data, error, count } = await q

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch products',
    })
  }

  return sendSuccess(event, {
    items: data || [],
    pagination: { page, pageSize, total: count || 0 },
  })
})
