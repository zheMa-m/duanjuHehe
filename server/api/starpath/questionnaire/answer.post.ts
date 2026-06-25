// @api-auth: public
import { z } from 'zod'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { starpathService } from '~~/server/services/starpath-service'

const answerSchema = z.object({
  sessionId: z.string().min(1),
  campaignId: z.string().uuid().optional(),
  step: z.number().int().min(0),
  questionKey: z.string().min(1),
  answerValue: z.union([z.string(), z.array(z.string()), z.record(z.string(), z.any())]),
  // ✅ 兼容旧格式（批量提交），逐步迁移到事件流
  // ⚠️ 标记为 optional，过渡期后移除
  gender: z.string().optional(),
  birthDate: z.string().optional(),
  birthTime: z.string().optional(),
  birthCity: z.string().optional(),
  fullName: z.string().optional(),
  // ✅ Intro 阶段数据（首次 q1 提交时附带，存入 questionnaire_answers）
  introAnswers: z.record(z.string(), z.union([z.string(), z.array(z.string())])).optional(),
})

defineRouteMeta({
  openAPI: {
    tags: ['智能问卷'],
    summary: '提交问卷答案（事件溯源模式）',
    description: '每次提交一个问题答案，以不可变事件流方式存储，支持完整审计与分析。',
    requestBody: {
      content: { 'application/json': { schema: { type: 'object' } } },
    },
    responses: {
      200: { description: '答案已记录' },
      400: { description: '参数校验失败' },
    },
  } as any,
})

/**
 * 智能问卷 问卷答案提交
 * POST /api/starpath/questionnaire/answer
 */
export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, answerSchema.parse)
  const db = getDB(event)

  const campaignId = body.campaignId || (await resolveCampaignId(db))

  // 1. 确保 session 存在并更新进度/基础信息
  const session = await starpathService.findOrCreateSession(event, {
    campaignId,
    sessionKey: body.sessionId,
    gender: body.gender,
    birthDate: body.birthDate,
    birthTime: body.birthTime,
    birthCity: body.birthCity,
    fullName: body.fullName,
    step: body.step,
  })

  // 2. 使用真实 DB session.id 写入答案，避免 session_key 与 UUID 外键混淆
  const answer = await starpathService.submitAnswer(event, {
    sessionId: session.id,
    step: body.step,
    questionKey: body.questionKey,
    answerValue: body.answerValue,
  })

  // 3. 首次提交时存储 intro 阶段数据（familiarity/focus/goal/relationship）
  if (body.introAnswers && Object.keys(body.introAnswers).length > 0) {
    await starpathService.submitIntroAnswers(event, session.id, body.introAnswers)
  }

  return sendSuccess(event, { answerId: answer.id, sessionId: session.id }, 'Answer recorded')
})

/** 获取或创建默认 campaign ID */
async function resolveCampaignId(db: any): Promise<string> {
  const { data } = await db
    .from('campaigns')
    .select('id')
    .eq('subdomain', 'starpath')
    .single()
  if (data) return data.id
  throw createError({ statusCode: 500, statusMessage: '智能问卷 campaign not configured' })
}
