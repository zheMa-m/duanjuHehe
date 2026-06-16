import { z } from 'zod'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { logAuditEvent } from '~~/server/utils/logger'
import { getClientRealIP } from '~~/server/utils/ip'

defineRouteMeta({
  openAPI: {
    tags: ['Campaigns'],
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

  // 将预约信息写入审计日志（作为注册记录）
  const ip = getClientRealIP(event)
  await logAuditEvent(
    event,
    { id: 'h5-register', username: body.email, role: 'guest' },
    `CAMPAIGN_REGISTER:${body.subdomain}`,
    'SUCCESS',
    ip
  )

  // 同时记录到活动日志
  await db.from('activity_logs').insert({
    category: 'admin',
    action: `H5_REGISTER:${body.subdomain}`,
    user_id: null,
    ip,
    metadata: { operator: body.email, status: 'SUCCESS' }
  })

  return sendSuccess(event, {
    phone: body.phone,
    email: body.email,
    subdomain: body.subdomain,
    registeredAt: new Date().toISOString()
  }, 'Registration successful')
})
