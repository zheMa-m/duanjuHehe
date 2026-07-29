// @api-auth: admin
import { defineEventHandler, getQuery } from 'h3'
import { assertAdmin } from '~~/server/utils/auth'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['管理-交易'],
    summary: '获取所有金币交易流水',
    parameters: [
      { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
      { in: 'query', name: 'pageSize', schema: { type: 'integer', default: 20 } },
      { in: 'query', name: 'type', schema: { type: 'string' } },
      { in: 'query', name: 'search', schema: { type: 'string' } },
    ],
  } as any,
})

export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)
  const query = getQuery(event)
  const page = Math.max(parseInt(query.page as string) || 1, 1)
  const pageSize = Math.min(parseInt(query.pageSize as string) || 20, 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const typeFilter = query.type as string || ''
  const search = (query.search as string || '').trim()

  let q = db.from('coin_transactions').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to)
  if (typeFilter && ['earn', 'purchase', 'spend', 'refund', 'bonus'].includes(typeFilter)) q = q.eq('type', typeFilter)

  const { data, error, count } = await q

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return sendSuccess(event, { items: data || [], pagination: { page, pageSize, total: count || 0 } })
})
