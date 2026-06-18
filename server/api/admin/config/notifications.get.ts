// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { assertAdmin } from '~~/server/utils/auth'

defineRouteMeta({
  openAPI: {
    tags: ['管理端配置'],
    summary: '获取通知告警机器人配置',
    description: '管理员可用此端点获取当前的飞书/钉钉/企业微信/Slack 通知机器人 Webhook 链接及事件绑定。',
    security: [{ BearerAuth: [] }],
    responses: {
      200: { description: '通知网关配置' },
    },
  } as any,
})

/**
 * 获取通知网关配置
 * GET /api/admin/config/notifications
 */
export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)

  const { data: row } = await db
    .from('system_configs')
    .select('value')
    .eq('key', 'notification_webhooks')
    .single()

  // 默认返回空数组
  const webhooks = row?.value || []

  return sendSuccess(event, webhooks, 'Notification webhooks retrieved successfully')
})
