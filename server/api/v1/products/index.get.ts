// @api-auth: user
import { defineEventHandler } from 'h3'
import { assertUser } from '~~/server/utils/auth'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { getProductCache, setProductCache } from '~~/server/utils/cache'

defineRouteMeta({
  openAPI: {
    tags: ['商品'],
    summary: '获取商品列表（分页 + 搜索 + 排序）',
    description: '返回当前租户的所有商品（分页），支持关键词搜索、分类过滤和多字段排序。',
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
  const search = (query.search as string || '').trim()
  const category = query.category as string || ''
  const sortBy = (['created_at', 'price', 'name', 'updated_at'].includes(query.sortBy as string) ? query.sortBy : 'created_at') as string
  const sortOrder = query.sortOrder === 'asc' ? true : false

  // 缓存命中直接返回（仅无搜索条件时）
  if (!search && !category) {
    const cached = getProductCache(user.tenantId, page, pageSize)
    if (cached) return cached.data
  }

  let q = db
    .from('products')
    .select('*', { count: 'exact' })
    .eq('tenant_id', user.tenantId)
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
      statusMessage: error.message || 'Failed to fetch products'
    })
  }

  const result = sendSuccess(event, {
    items: data || [],
    pagination: { page, pageSize, total: count || 0 },
  }, 'Fetched products successfully')

  // 仅无搜索条件时缓存
  if (!search && !category) {
    setProductCache(user.tenantId, page, pageSize, result)
  }
  return result
})
