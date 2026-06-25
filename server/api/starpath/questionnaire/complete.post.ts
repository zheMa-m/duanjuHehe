// @api-auth: public
import { z } from 'zod'
import { getDB } from '~~/server/utils/db'
import { sendSuccess, throwError } from '~~/server/utils/response'
import { starpathService } from '~~/server/services/starpath-service'
import { logAuditEvent } from '~~/server/utils/logger'

const completeSchema = z.object({
  sessionId: z.string().min(1),
  campaignId: z.string().uuid().optional(),
})

defineRouteMeta({
  openAPI: {
    tags: ['智能问卷'],
    summary: '完成问卷并触发生成报告',
    description: '用户答完所有问题后调用，标记 session 为 completed 并异步生成 AI 占星报告。',
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['sessionId'],
            properties: {
              sessionId: { type: 'string', description: '问卷 session ID（由 answer 接口返回的 DB session ID）' },
              campaignId: { type: 'string', format: 'uuid', description: '营销活动 ID（可选，默认 starpath）' },
            },
          },
        },
      },
    },
    responses: {
      200: { description: '问卷已完成，报告生成中' },
      404: { description: 'Session 不存在' },
    },
  } as any,
})

/**
 * 完成问卷并触发生成报告
 * POST /api/starpath/questionnaire/complete
 *
 * 前端在 loading 页面之前调用此端点：
 *   1. 标记 session 状态为 completed
 *   2. 创建 ai_reports 记录（status: pending）
 *   3. 后台异步生成报告内容（admin cron / 手动触发）
 */
export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, completeSchema.parse)
  const db = getDB(event)

  // 1. 验证 session 存在
  const { data: session, error: sessionError } = await db
    .from('questionnaire_sessions')
    .select('id, campaign_id, status, current_step')
    .eq('id', body.sessionId)
    .single()

  if (sessionError || !session) {
    throwError(404, 'Session not found')
  }

  // 2. 标记 session 为 completed
  await starpathService.completeSession(event, body.sessionId)

  // 3. 检查是否已有报告（避免重复生成）
  const { data: existingReports } = await db
    .from('ai_reports')
    .select('id, status')
    .eq('session_id', body.sessionId)
    .limit(1)

  if (existingReports && existingReports.length > 0) {
    return sendSuccess(event, {
      sessionId: body.sessionId,
      reportId: existingReports[0].id,
      status: existingReports[0].status,
    }, 'Session completed. Report already exists.')
  }

  // 4. 创建报告记录（pending 状态，后台异步生成）
  const campaignId = body.campaignId || session.campaign_id
  const report = await starpathService.requestReportGeneration(event, body.sessionId, campaignId)

  await logAuditEvent(
    event,
    null,
    `STARPATH_QUESTIONNAIRE_COMPLETED:${body.sessionId}:report=${report.id}`,
    'SUCCESS'
  )

  return sendSuccess(event, {
    sessionId: body.sessionId,
    reportId: report.id,
    status: report.status,
  }, 'Questionnaire completed. Report generation started.')
})
