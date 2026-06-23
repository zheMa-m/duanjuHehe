
// @api-auth: admin
import { z } from 'zod'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { assertAdmin } from '~~/server/utils/auth'
import { logAuditEvent } from '~~/server/utils/logger'
import { getPaymentStrategy } from '~~/server/utils/payment-strategies/factory'

defineRouteMeta({
  openAPI: {
    tags: ['管理端订阅'],
    summary: '管理员：变更订阅方案（升级/降级）',
    description: '按 subscription_provider 分发到对应支付平台变更订阅方案。支持的平台：Stripe/PayPal。Apple IAP/支付宝/微信支付不支持服务端变更。',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: '订阅 ID (UUID)' },
    ],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              newPriceId: { type: 'string', description: '新的 Price/Plan ID（平台相关标识）' },
            },
            required: ['newPriceId'],
          },
        },
      },
    },
    responses: {
      200: { description: '方案变更成功' },
      400: { description: '订阅状态不支持变更或平台不支持' },
      404: { description: '订阅未找到' },
    },
  } as any,
})

const changePlanSchema = z.object({
  newPriceId: z.string().min(1, 'New price ID is required'),
})

/**
 * 管理员变更订阅方案（多平台路由）
 * POST /api/admin/subscriptions/:id/change-plan
 */
export default defineEventHandler(async (event) => {
  const adminUser = assertAdmin(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing subscription ID' })
  }

  const body = await readValidatedBody(event, changePlanSchema.parse)
  const db = getDB(event)

  // 1. 查询当前订阅
  const { data: sub, error: subErr } = await db
    .from('subscriptions')
    .select('*')
    .eq('id', id)
    .single()

  if (subErr || !sub) {
    throw createError({ statusCode: 404, statusMessage: 'Subscription not found' })
  }

  // 2. 仅允许 active 和 trialing 状态变更方案
  if (!['active', 'trialing'].includes(sub.status)) {
    throw createError({
      statusCode: 400,
      statusMessage: `Subscription status is [${sub.status}], only active/trialing can change plan.`
    })
  }

  const provider = sub.subscription_provider || 'stripe'

  if (process.env.MOCK_DB === 'true') {
    // Mock 模式：直接更新 price_id
    await db.from('subscriptions').update({
      price_id: body.newPriceId,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
  } else {
    // 3. 按 subscription_provider 分发到对应策略
    const strategy = getPaymentStrategy(provider)

    if (!strategy.changeSubscriptionPlan) {
      throw createError({
        statusCode: 400,
        statusMessage: `Change plan is not supported for provider [${provider}]. Please manage via the gateway directly.`
      })
    }

    try {
      await strategy.changeSubscriptionPlan(sub, body.newPriceId)
    } catch (err: any) {
      console.error(`[${provider} Change Plan] Action failed:`, err.message)
      throw createError({
        statusCode: 500,
        statusMessage: `${provider} plan change failed: ${err.message}`
      })
    }

    await db.from('subscriptions').update({
      price_id: body.newPriceId,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
  }

  // 4. 同步更新 profiles plan_status（根据 price_id 映射方案等级）
  if (sub.user_id) {
    await db.from('profiles').update({
      plan_status: 'pro',
      updated_at: new Date().toISOString(),
    }).eq('id', sub.user_id)
  }

  // 5. 审计日志
  await logAuditEvent(
    event,
    adminUser,
    `ADMIN_CHANGE_PLAN:${sub.gateway_subscription_id}:${sub.price_id}->${body.newPriceId}:provider=${provider}:user_id=${sub.user_id}`,
    'SUCCESS'
  )

  return sendSuccess(event, {
    id,
    oldPriceId: sub.price_id,
    newPriceId: body.newPriceId,
  }, 'Subscription plan changed successfully')
})
