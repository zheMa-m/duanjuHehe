// @api-auth: public
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['支付'],
    summary: '获取当前可用的支付通道配置',
    description: '获取全站已启用的支付渠道及其对应的前台公钥/Client ID 配置信息，用于前端按需加载 SDK 并渲染收银台。',
    responses: {
      200: { description: '返回已启用的支付配置列表' },
    },
  } as any,
})

/**
 * 获取可用支付通道配置
 * GET /api/v1/payments/config
 */
export default defineEventHandler(async (event) => {
  const db = getDB(event)

  const { data: configs } = await db
    .from('payment_configs')
    .select('provider, is_enabled, public_keys, extra_meta')
    .eq('is_enabled', true)

  const formattedConfigs: Record<string, any> = {}
  if (configs) {
    for (const item of configs) {
      formattedConfigs[item.provider] = {
        enabled: item.is_enabled,
        ...item.public_keys,
        meta: item.extra_meta
      }
    }
  }

  return sendSuccess(event, formattedConfigs, 'Active payment configurations retrieved')
})
