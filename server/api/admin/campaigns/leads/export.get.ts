// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { assertAdmin } from '~~/server/utils/auth'
import { logAuditEvent } from '~~/server/utils/logger'

defineRouteMeta({
  openAPI: {
    tags: ['管理·营销-活动'],
    summary: '管理员：导出营销留资 CSV',
    description: '按 subdomain 过滤导出留资记录为 CSV 文件（UTF-8 BOM），不传 subdomain 则导出全量。',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'query', name: 'subdomain', required: false, schema: { type: 'string' }, description: '活动子域名过滤' },
    ],
    responses: {
      200: { description: 'CSV 文件流', content: { 'text/csv': {} } },
      401: { description: '未授权' },
    },
  } as any,
})

/** CSV 转义：含逗号/引号/换行时用双引号包裹 */
function csvEscape(val: unknown): string {
  const str = val == null ? '' : String(val)
  return /[,"\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

export default defineEventHandler(async (event) => {
  const admin = assertAdmin(event)
  const db = getDB(event)
  const query = getQuery(event)
  const subdomain = query.subdomain as string | undefined

  try {
    let dbQuery = db.from('campaign_registrations').select('*')

    if (subdomain) {
      dbQuery = dbQuery.eq('subdomain', subdomain)
    }

    const { data: leads, error } = await dbQuery.order('created_at', { ascending: false })

    if (error) {
      throw createError({ statusCode: 500, statusMessage: error.message || 'Failed to export leads' })
    }

    const rows = leads || []
    const headers = ['id', 'email', 'phone', 'subdomain', 'user_id', 'created_at']
    const csvLines = [headers.join(',')]
    for (const row of rows as any[]) {
      csvLines.push(headers.map(h => csvEscape(row[h])).join(','))
    }
    // UTF-8 BOM 让 Excel 正确识别中文
    const csvContent = '\uFEFF' + csvLines.join('\r\n')

    await logAuditEvent(event, admin, `CAMPAIGN_LEADS_EXPORTED: ${subdomain || 'all'} (${rows.length} rows)`, 'SUCCESS')

    const filename = `leads_${subdomain || 'all'}_${new Date().toISOString().slice(0, 10)}.csv`
    setResponseHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
    setResponseHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)

    return csvContent
  } catch (err: any) {
    if (err?.statusCode === 500 && /relation|does not exist/i.test(err.statusMessage || '')) {
      const csvContent = '\uFEFFid,email,phone,subdomain,user_id,created_at\r\n'
      setResponseHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
      setResponseHeader(event, 'Content-Disposition', `attachment; filename="leads_empty_${new Date().toISOString().slice(0, 10)}.csv"`)
      return csvContent
    }
    throw err
  }
})
