/**
 * POST /api/v1/feedback — 提交用户评价/反馈
 *
 * 需要已登录（非匿名）用户
 * // @api-auth: user
 */
import { z } from 'zod'
import { H3Event } from 'h3'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { logAuditEvent } from '~~/server/utils/logger'

defineRouteMeta({
  openAPI: {
    tags: ['Feedback'],
    summary: '提交评价/反馈',
    description: '提交一条评价，需要已登录的非匿名用户。type=review 时评分必填。',
    security: [{ BearerAuth: [] }],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              campaignSubdomain: { type: 'string' },
              type: { type: 'string', enum: ['review', 'bug', 'feature', 'general'], default: 'review' },
              rating: { type: 'integer', minimum: 1, maximum: 5 },
              comment: { type: 'string' },
              displayName: { type: 'string' },
            },
          },
        },
      },
    },
    responses: {
      201: { description: '评价已提交' },
      401: { description: '需要登录' },
    },
  } as any,
})

const schema = z.object({
  campaignSubdomain: z.string().max(64).optional(),
  type: z.enum(['review', 'bug', 'feature', 'general']).default('review'),
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().min(1).max(2000).optional(),
  displayName: z.string().max(64).optional(),
})

export default defineEventHandler(async (event: H3Event) => {
  const ctxUser = event.context.user

  // 要求已登录且非匿名
  if (!ctxUser || ctxUser.role === 'anonymous' || ctxUser.isAnonymous) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Login required to submit feedback. Please login first.'
    })
  }

  const body = await readValidatedBody(event, schema.parse)
  const db = getDB(event)

  // rating 仅 review 类型必填
  if (body.type === 'review' && !body.rating) {
    throw createError({ statusCode: 400, statusMessage: 'Rating is required for reviews' })
  }

  const { data: feedback, error } = await db.from('feedbacks').insert({
    user_id: ctxUser.id,
    campaign_subdomain: body.campaignSubdomain || null,
    type: body.type,
    rating: body.rating || null,
    comment: body.comment || null,
    display_name: body.displayName || ctxUser.username || 'Anonymous',
    is_approved: false,
    admin_reply: null,
    created_at: new Date().toISOString(),
  }).select('*')

  if (error) {
    throw createError({ statusCode: 400, statusMessage: error.message || 'Failed to submit feedback' })
  }

  await logAuditEvent(event, ctxUser, 'FEEDBACK_SUBMITTED', 'SUCCESS')

  return sendSuccess(event, feedback ? feedback[0] : null, 'Feedback submitted successfully', 201)
})
