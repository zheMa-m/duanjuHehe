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

  // 查询用户提交的邮箱（通过 campaign_registrations 关联）
  let email: string | null = null
  let emailSubmittedAt: string | null = null
  const { data: registrations } = await db
    .from('campaign_registrations')
    .select('email, created_at, metadata')
    .eq('campaign_id', session.campaign_id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (registrations && registrations.length > 0) {
    // 通过 metadata.session_id 或 metadata->>session_id 匹配
    const matched = registrations.find((r: any) => {
      const metaSessionId = r.metadata?.session_id || r.metadata?.['session_id']
      return metaSessionId === sessionId
    })
    if (matched) {
      email = matched.email
      emailSubmittedAt = matched.created_at
    }
  }

  // 分离 intro 数据和问卷答案
  const allAnswers = answers || []
  const introAnswers = allAnswers.filter((a: any) => a.question_key?.startsWith('intro_'))
  const questionAnswers = allAnswers.filter((a: any) => !a.question_key?.startsWith('intro_'))

  return sendSuccess(event, {
    session,
    answers: questionAnswers,
    introAnswers: introAnswers.map((a: any) => ({
      key: a.question_key.replace('intro_', ''),
      value: a.answer_value,
    })),
    email,
    emailSubmittedAt,
  }, 'Session detail retrieved')
})
