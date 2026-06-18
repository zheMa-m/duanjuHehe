
// @api-auth: public
import { z } from 'zod'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { logAuditEvent } from '~~/server/utils/logger'
import { getClientRealIP } from '~~/server/utils/ip'

defineRouteMeta({
  openAPI: {
    tags: ['营销活动'],
    summary: '营销活动预约注册（H5 表单）',
    description: '记录来自 H5 营销活动落地页的用户注册/预约信息。',
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              phone: { type: 'string' },
              email: { type: 'string', format: 'email' },
              subdomain: { type: 'string' },
            },
            required: ['phone', 'email', 'subdomain'],
          },
        },
      },
    },
    responses: {
      200: { description: '预约信息已记录' },
    },
  } as any,
})

const registerSchema = z.object({
  phone: z.string().min(5).max(20),
  email: z.string().email(),
  subdomain: z.string().min(1).max(50),
})

/**
 * H5 营销活动预约注册接口
 * POST /api/v1/campaigns/register
 */
export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, registerSchema.parse)
  const db = getDB(event)

  // 1. 获取 campaign 详情以获取 ID，验证 subdomain 确实存在
  const { data: campaign } = await db
    .from('campaigns')
    .select('id')
    .eq('subdomain', body.subdomain)
    .single()

  if (!campaign) {
    throw createError({
      statusCode: 400,
      statusMessage: `Campaign with subdomain '${body.subdomain}' does not exist.`
    })
  }

  const ip = getClientRealIP(event)
  const ctxUser = event.context.user

  // 2. 真实将数据写入 campaign_registrations 表
  const { data: reg, error: insertError } = await db
    .from('campaign_registrations')
    .insert({
      campaign_id: campaign.id,
      subdomain: body.subdomain,
      phone: body.phone,
      email: body.email,
      user_id: ctxUser ? ctxUser.id : null,
      created_at: new Date().toISOString()
    })
    .select('*')

  if (insertError) {
    throw createError({
      statusCode: 500,
      statusMessage: insertError.message || 'Failed to record campaign registration'
    })
  }

  // 3. 记录日志 (系统审计 + 活动流)
  await logAuditEvent(
    event,
    ctxUser || { id: 'h5-register', username: body.email, role: 'guest' },
    `CAMPAIGN_REGISTER:${body.subdomain}`,
    'SUCCESS',
    ip
  )

  await db.from('activity_logs').insert({
    category: 'admin',
    action: `H5_REGISTER:${body.subdomain}`,
    user_id: ctxUser ? ctxUser.id : null,
    ip,
    metadata: { operator: body.email, status: 'SUCCESS' }
  })

  return sendSuccess(event, {
    id: reg && reg[0] ? reg[0].id : null,
    phone: body.phone,
    email: body.email,
    subdomain: body.subdomain,
    registeredAt: reg && reg[0] ? reg[0].created_at : new Date().toISOString()
  }, 'Registration successful')
})
