// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { assertAdmin } from '~~/server/utils/auth'

defineRouteMeta({
  openAPI: {
    tags: ['管理端配置'],
    summary: '获取支付通道公私钥配置',
    description: '管理员可用此端点获取所有支付通道的启用状态、前端公钥以及脱敏掩码后的私有密钥。',
    security: [{ BearerAuth: [] }],
    responses: {
      200: { description: '支付网关配置列表' },
    },
  } as any,
})

function maskKey(key?: string) {
  if (!key) return ''
  if (key.length <= 8) return '********'
  return `${key.slice(0, 4)}********${key.slice(-4)}`
}

/**
 * 获取支付网关配置（带私钥掩码）
 * GET /api/admin/config/payment
 */
export default defineEventHandler(async (event) => {
  const user = assertAdmin(event)
  const db = getDB(event)

  // 1. 读取公开的 payment_configs 表
  const { data: configs, error: configErr } = await db
    .from('payment_configs')
    .select('*')
    .order('provider', { ascending: true })

  if (configErr) {
    throw createError({ statusCode: 500, statusMessage: `Failed to fetch configurations: ${configErr.message}` })
  }

  // 2. 读取私密配置 system_configs 对应的 payment_secrets
  const { data: secretsRow } = await db
    .from('system_configs')
    .select('value')
    .eq('key', 'payment_secrets')
    .single()

  const secrets = secretsRow?.value || {}

  // 3. 合并脱敏返回
  const result = (configs || []).map((cfg: any) => {
    const providerSecrets = secrets[cfg.provider] || {}
    const maskedSecrets: Record<string, string> = {}
    
    // 对所有的私密 Key 进行掩码脱敏
    Object.keys(providerSecrets).forEach((k) => {
      maskedSecrets[k] = maskKey(providerSecrets[k])
    })

    return {
      provider: cfg.provider,
      isEnabled: cfg.is_enabled,
      publicKeys: cfg.public_keys || {},
      extraMeta: cfg.extra_meta || {},
      secrets: maskedSecrets, // 返回掩码后的数据，只供前台渲染“已配置”状态占位使用
      updatedAt: cfg.updated_at,
    }
  })

  return sendSuccess(event, result, 'Payment configurations retrieved successfully')
})
