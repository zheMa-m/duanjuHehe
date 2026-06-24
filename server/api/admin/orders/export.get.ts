
// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { assertAdmin } from '~~/server/utils/auth'

defineRouteMeta({
  openAPI: {
    tags: ['管理·运营-订单'],
    summary: '管理员：导出订单 CSV',
    description: '将当前筛选条件下的订单列表导出为 CSV 文件（最多 10000 条）。',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'query', name: 'status', schema: { type: 'string' }, description: '按订单状态过滤' },
    ],
    responses: {
      200: { description: 'CSV 文件下载' },
    },
  } as any,
})

/**
 * 管理员导出订单为 CSV
 * GET /api/admin/orders/export
 */
export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)

  const query = getQuery(event)
  const statusFilter = query.status as string | undefined

  // 先自动过期 pending 订单
  await db.from('orders').update({
    status: 'expired',
    updated_at: new Date().toISOString(),
  }).eq('status', 'pending').lt('expires_at', new Date().toISOString())

  let chain = db.from('orders').select('*').order('created_at', { ascending: false }).limit(10000)

  if (statusFilter) {
    chain = chain.eq('status', statusFilter)
  }

  const { data: orders } = await chain

  const items = orders || []

  // 构造 CSV 表头
  const headers = ['Order No', 'Product', 'Amount', 'Currency', 'Status', 'Provider', 'User ID', 'Created At', 'Refund Amount']
  const rows = items.map((o: any) => [
    o.order_no || '',
    o.product_name || '',
    Number(o.amount || 0).toFixed(2),
    o.currency || 'USD',
    o.status || '',
    o.payment_provider || '',
    o.user_id || '',
    o.created_at || '',
    o.refund_amount ? Number(o.refund_amount).toFixed(2) : '',
  ])

  // 转义 CSV 特殊字符
  const escapeCSV = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`
    }
    return val
  }

  const csvContent = [
    headers.join(','),
    ...rows.map((row: any[]) => row.map(escapeCSV).join(',')),
  ].join('\n')

  // 添加 BOM 以支持 Excel 中文打开
  const bom = '\uFEFF'
  const buffer = Buffer.from(bom + csvContent, 'utf-8')

  setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setHeader(event, 'Content-Disposition', `attachment; filename="orders-export-${new Date().toISOString().slice(0, 10)}.csv"`)
  setHeader(event, 'Content-Length', buffer.length)

  return buffer
})
