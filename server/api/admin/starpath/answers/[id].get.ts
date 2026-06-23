// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { assertAdmin } from '~~/server/utils/auth'

defineRouteMeta({
  openAPI: {
    tags: ['Admin 智能问卷'],
    summary: '获取单个 智能问卷 问卷 session 详情（含所有答案）',
    description: '管理员查看指定 session 的完整问卷答案和进度。',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: 'Session ID' },
    ],
    responses: {
      200: { description: 'Session 详情 + 答案列表' },
      404: { description: 'Session 不存在' },
    },
  } as any,
})

export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)
  const sessionId = getRouterParam(event, 'id')

  const { data: session, error } = await db
    .from('questionnaire_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (error || !session) {
    throw createError({ statusCode: 404, statusMessage: 'Session not found' })
  }

  const { data: answers } = await db
    .from('questionnaire_answers')
    .select('*')
    .eq('session_id', sessionId)
    .order('answered_at', { ascending: true })

  return sendSuccess(event, {
    session,
    answers: answers || [],
  }, 'Session detail retrieved')
})
