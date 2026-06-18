// @api-auth: admin
import { z } from 'zod'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { assertAdmin } from '~~/server/utils/auth'
import { logAuditEvent } from '~~/server/utils/logger'

defineRouteMeta({
  openAPI: {
    tags: ['管理端配置'],
    summary: '修改特定支付通道的公私钥配置',
    description: '管理员可用此端点启用/禁用支付提供商，或修改其相关公钥、私密密钥。对于未修改的私钥字段，请传入掩码值（包含*）以防覆盖。',
    security: [{ BearerAuth: [] }],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              provider: { type: 'string' },
              isEnabled: { type: 'boolean' },
              publicKeys: { type: 'object' },
              extraMeta: { type: 'object' },
              secrets: { type: 'object' },
            },
            required: ['provider', 'isEnabled'],
          },
        },
      },
    },
    responses: {
      200: { description: '支付网关配置更新成功' },
    },
  } as any,
})

const updatePaymentConfigSchema = z.object({
  provider: z.string().min(1),
  isEnabled: z.boolean(),
  publicKeys: z.record(z.any()).optional().default({}),
  extraMeta: z.record(z.any()).optional().default({}),
  secrets: z.record(z.any()).optional().default({}),
})

/**
 * 更新支付网关配置
 * PATCH /api/admin/config/payment
 */
export default defineEventHandler(async (event) => {
  const user = assertAdmin(event)
  const body = await readValidatedBody(event, updatePaymentConfigSchema.parse)
  const db = getDB(event)
  const provider = body.provider.toLowerCase()

  // 1. 更新公开属性配置
  await db.from('payment_configs').upsert({
    provider,
    is_enabled: body.isEnabled,
    public_keys: body.publicKeys,
    extra_meta: body.extraMeta,
    updated_at: new Date().toISOString()
  })

  // 2. 更新敏感私密属性 (system_configs.payment_secrets)
  const { data: currentSecretsRow } = await db
    .from('system_configs')
    .select('value')
    .eq('key', 'payment_secrets')
    .single()

  const allSecrets = currentSecretsRow?.value || {}
  const providerSecrets = allSecrets[provider] || {}

  // 合并输入的私钥，过滤掉无改动的掩码（包含 * 号）
  const updatedProviderSecrets: Record<string, string> = { ...providerSecrets }
  Object.keys(body.secrets).forEach((k) => {
    const val = body.secrets[k]
    if (val && typeof val === 'string' && !val.includes('*')) {
      updatedProviderSecrets[k] = val
    }
  })

  allSecrets[provider] = updatedProviderSecrets

  await db.from('system_configs').upsert({
    key: 'payment_secrets',
    value: allSecrets,
    updated_at: new Date().toISOString()
  })

  // 3. 记录管理端审计日志
  await logAuditEvent(
    event,
    user,
    `PAYMENT_CONFIG_UPDATE:${provider}:status=${body.isEnabled ? 'ENABLED' : 'DISABLED'}`,
    'SUCCESS'
  )

  return sendSuccess(event, { provider }, 'Payment configuration updated successfully')
})
