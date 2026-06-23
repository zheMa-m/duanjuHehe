// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { assertAdmin } from '~~/server/utils/auth'
import { logAuditEvent } from '~~/server/utils/logger'
import { exportCSV, setCSVHeaders } from '~~/server/utils/export'

defineRouteMeta({
  openAPI: {
    tags: ['管理·系统-审计'],
    summary: '管理员：导出审计日志（CSV）',
    description: '导出符合条件的全部审计日志为 CSV 文件。支持按类别和日期范围筛选。',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'query', name: 'category', schema: { type: 'string' }, description: '筛选类别（ALL 为全部）' },
      { in: 'query', name: 'dateFrom', schema: { type: 'string', format: 'date' }, description: '起始日期 (YYYY-MM-DD)' },
      { in: 'query', name: 'dateTo', schema: { type: 'string', format: 'date' }, description: '结束日期 (YYYY-MM-DD)' },
    ],
    responses: {
      200: { description: 'CSV 文件下载' },
    },
  } as any,
})

export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)

  const query = getQuery(event)
  let dbQuery = db.from('activity_logs').select('*', { count: 'exact' })

  // 类别筛选
  const category = query.category as string
  if (category && category !== 'ALL') {
    dbQuery = dbQuery.eq('category', category)
  }

  // 日期范围筛选
  const dateFrom = query.dateFrom as string
  const dateTo = query.dateTo as string
  if (dateFrom) {
    dbQuery = dbQuery.gte('created_at', `${dateFrom}T00:00:00Z`)
  }
  if (dateTo) {
    dbQuery = dbQuery.lte('created_at', `${dateTo}T23:59:59Z`)
  }

  const { data: logs, error } = await dbQuery
    .order('created_at', { ascending: false })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to export activity logs' })
  }

  // 格式化导出数据
  const exportRows = (logs || []).map((log: any) => ({
    id: log.id,
    category: log.category,
    action: log.action,
    operator: log.metadata?.operator || log.user_id || 'system',
    ip: log.ip || '',
    status: log.metadata?.status || (log.metadata?.success ? 'SUCCESS' : log.metadata?.success === false ? 'FAILED' : '-'),
    metadata: JSON.stringify(log.metadata || {}),
    created_at: new Date(log.created_at).toISOString(),
  }))

  const filename = `audit_logs_${new Date().toISOString().slice(0, 10)}`
  setCSVHeaders(event, filename)

  const csvBuffer = exportCSV(exportRows, ['id', 'category', 'action', 'operator', 'ip', 'status', 'metadata', 'created_at'], ['ID', '类型', '行为', '操作者', 'IP', '状态', '元数据', '时间'])

  // 记录导出审计
  const currentUser = event.context.user
  await logAuditEvent(event, currentUser || null, 'export_audit_logs', 'INFO', undefined)

  return csvBuffer.toString('utf-8')
})
