// @api-auth: admin
import { z } from 'zod'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { assertAdmin } from '~~/server/utils/auth'
import { logAuditEvent } from '~~/server/utils/logger'

defineRouteMeta({
  openAPI: {
    tags: ['管理端配置'],
    summary: '更新通知告警机器人配置',
    description: '管理员可用此端点设置飞书/钉钉/企业微信/Slack 机器人 Webhook 地址以及订阅事件源，用于支付、系统与安全告警通知。',
    security: [{ BearerAuth: [] }],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                platform: { type: 'string', enum: ['feishu', 'wechat', 'dingtalk', 'slack'] },
                url: { type: 'string' },
                events: { type: 'array', items: { type: 'string' } },
                isEnabled: { type: 'boolean' },
              },
              required: ['platform', 'url', 'events', 'isEnabled'],
            },
          },
        },
      },
    },
    responses: {
      200: { description: '通知配置保存成功' },
    },
  } as any,
})

const webhookItemSchema = z.object({
  platform: z.enum(['feishu', 'wechat', 'dingtalk', 'slack']),
  url: z.string().url('Invalid Webhook URL'),
  events: z.array(z.enum(['payment_success', 'payment_refund', 'system_alert', 'security_alert'])),
  isEnabled: z.boolean(),
})

const updateNotificationsSchema = z.array(webhookItemSchema)

/**
 * 更新通知网关配置
 * PATCH /api/admin/config/notifications
 */
export default defineEventHandler(async (event) => {
  const user = assertAdmin(event)
  const body = await readValidatedBody(event, updateNotificationsSchema.parse)
  const db = getDB(event)

  await db.from('system_configs').upsert({
    key: 'notification_webhooks',
    value: body,
    updated_at: new Date().toISOString()
  })

  // 记录审计日志
  await logAuditEvent(
    event,
    user,
    `NOTIFICATION_CONFIG_UPDATE:webhooks_count=${body.length}`,
    'SUCCESS'
  )

  return sendSuccess(event, body, 'Notification configurations updated successfully')
})
