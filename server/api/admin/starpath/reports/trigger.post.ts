// @api-auth: admin
import { z } from 'zod'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { assertAdmin } from '~~/server/utils/auth'
import { logAuditEvent } from '~~/server/utils/logger'
import { starpathService } from '~~/server/utils/starpath-service'

defineRouteMeta({
  openAPI: {
    tags: ['Admin 智能问卷'],
    summary: '手动触发 AI 报告生成',
    description: '管理员手动为指定 session 触发生成占星报告。',
    security: [{ BearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['sessionId'],
            properties: {
              sessionId: { type: 'string' },
            },
          },
        },
      },
    },
    responses: {
      200: { description: '报告生成请求已提交（pending 状态）' },
      404: { description: 'Session 不存在' },
    },
  } as any,
})

const triggerSchema = z.object({
  sessionId: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const admin = assertAdmin(event)
  const db = getDB(event)
  const body = await readValidatedBody(event, triggerSchema.parse)

  // 验证 session 存在
  const { data: session } = await db
    .from('questionnaire_sessions')
    .select('id, campaign_id')
    .eq('id', body.sessionId)
    .single()

  if (!session) {
    throw createError({ statusCode: 404, statusMessage: 'Session not found' })
  }

  // 检查是否已有报告
  const { data: existingReport } = await db
    .from('ai_reports')
    .select('id, status')
    .eq('session_id', body.sessionId)
    .single()

  if (existingReport) {
    // 已有报告：如果状态是 pending 或 generating，提示等待；否则重新生成
    if (existingReport.status === 'pending' || existingReport.status === 'generating') {
      return sendSuccess(event, { reportId: existingReport.id, status: existingReport.status }, 'Report generation already in progress')
    }

    // 重置为 pending 以重新生成
    await db
      .from('ai_reports')
      .update({ status: 'pending', updated_at: new Date().toISOString() })
      .eq('id', existingReport.id)

    await logAuditEvent(event, admin, `STARPATH_REPORT_RETRIGGER:${existingReport.id}`, 'SUCCESS')
    return sendSuccess(event, { reportId: existingReport.id, status: 'pending' }, 'Report generation re-triggered')
  }

  // 新建报告
  const report = await starpathService.requestReportGeneration(event, body.sessionId, session.campaign_id || 'starpath')

  await logAuditEvent(event, admin, `STARPATH_REPORT_TRIGGERED:${report.id}`, 'SUCCESS')
  return sendSuccess(event, { reportId: report.id, status: 'pending' }, 'Report generation triggered')
})
