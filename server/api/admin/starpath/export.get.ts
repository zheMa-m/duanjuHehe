// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { assertAdmin } from '~~/server/utils/auth'
import { logAuditEvent } from '~~/server/utils/logger'

defineRouteMeta({
  openAPI: {
    tags: ['Admin 智能问卷'],
    summary: '导出 智能问卷 数据为 CSV',
    description: '导出问卷答案或邮箱留资为 CSV 格式。type=answers|emails。',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'query', name: 'type', required: true, schema: { type: 'string', enum: ['answers', 'emails'] }, description: '导出类型' },
    ],
    responses: {
      200: { description: 'CSV 文本数据' },
    },
  } as any,
})

export default defineEventHandler(async (event) => {
  const admin = assertAdmin(event)
  const db = getDB(event)
  const query = getQuery(event)
  const type = query.type as string

  if (type === 'emails') {
    const { data: items } = await db
      .from('campaign_registrations')
      .select('*')
      .eq('source', 'starpath-email')
      .order('created_at', { ascending: false })

    const headers = ['邮箱', '已同意条款', '已退订', '来源', '发送时间', '创建时间']
    const rows = (items || []).map((r: any) => [
      r.email || '',
      r.agreed_terms ? '是' : '否',
      r.unsubscribed ? '是' : '否',
      r.source || '',
      r.sent_at ? new Date(r.sent_at).toISOString() : '',
      new Date(r.created_at).toISOString(),
    ])

    const csv = [headers.join(','), ...rows.map((row: any[]) => row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n')

    await logAuditEvent(event, admin, 'STARPATH_EXPORT_EMAILS', 'SUCCESS')

    setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
    setHeader(event, 'Content-Disposition', `attachment; filename=starpath_emails_${new Date().toISOString().slice(0, 10)}.csv`)
    return csv
  }

  // type === 'answers'
  const { data: sessions } = await db
    .from('questionnaire_sessions')
    .select('*')
    .order('created_at', { ascending: false })

  const headers = ['Session ID', '姓名', '性别', '出生日期', '出生时间', '出生城市', '状态', '当前步骤', '创建时间', '完成时间']
  const rows = (sessions || []).map((s: any) => [
    s.id || '',
    s.full_name || '',
    s.gender === 'male' ? '男' : s.gender === 'female' ? '女' : '',
    s.birth_date || '',
    s.birth_time || '',
    s.birth_city || '',
    s.status || '',
    s.current_step || 0,
    s.created_at ? new Date(s.created_at).toISOString() : '',
    s.completed_at ? new Date(s.completed_at).toISOString() : '',
  ])

  const csv = [headers.join(','), ...rows.map((row: any[]) => row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n')

  await logAuditEvent(event, admin, 'STARPATH_EXPORT_ANSWERS', 'SUCCESS')

  setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setHeader(event, 'Content-Disposition', `attachment; filename=starpath_answers_${new Date().toISOString().slice(0, 10)}.csv`)
  return csv
})
