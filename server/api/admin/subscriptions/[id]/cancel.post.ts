
// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { assertAdmin } from '~~/server/utils/auth'
import { logAuditEvent } from '~~/server/utils/logger'
import { getPaymentStrategy } from '~~/server/utils/payment-strategies/factory'

defineRouteMeta({
  openAPI: {
    tags: ['管理端订阅'],
    summary: '管理员：取消订阅',
    description: '管理员可立即取消订阅或设定周期末取消。按 subscription_provider 分发到对应支付平台。',
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
              immediate: { type: 'boolean', default: false, description: 'true=立即取消并降级, false=周期末取消' },
            },
          },
        },
      },
    },
    responses: {
      200: { description: '订阅取消成功' },
      400: { description: '订阅不满足取消条件或平台不支持' },
      404: { description: '订阅未找到' },
    },
  } as any,
})

/**
 * 管理员取消订阅（多平台路由）
 * POST /api/admin/subscriptions/:id/cancel
 */
export default defineEventHandler(async (event) => {
  const adminUser = assertAdmin(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing subscription ID' })
  }

  const body = await readBody(event).catch(() => ({}))
  const immediate = body?.immediate === true

  const db = getDB(event)

  // 1. 查询订阅记录
  const { data: sub, error: subErr } = await db
    .from('subscriptions')
    .select('*')
    .eq('id', id)
    .single()

  if (subErr || !sub) {
    throw createError({ statusCode: 404, statusMessage: 'Subscription not found' })
  }

  // 2. 校验状态：只有 active / trialing 可取消
  const cancellable = ['active', 'trialing']
  if (!cancellable.includes(sub.status)) {
    throw createError({
      statusCode: 400,
      statusMessage: `Subscription status is [${sub.status}], only active/trialing can be canceled.`
    })
  }

  const provider = sub.subscription_provider || 'stripe'

  if (process.env.MOCK_DB === 'true') {
    // 3. Mock 模式：直接更新状态
    await db.from('subscriptions').update({
      status: 'canceled',
      cancel_at_period_end: false,
      updated_at: new Date().toISOString()
    }).eq('id', id)

    if (immediate && sub.user_id) {
      await db.from('profiles').update({
        plan_status: 'free',
        updated_at: new Date().toISOString()
      }).eq('id', sub.user_id)
    }
  } else {
    // 4. 按 subscription_provider 分发到对应策略
    const strategy = getPaymentStrategy(provider)

    if (!strategy.cancelSubscription) {
      throw createError({
        statusCode: 400,
        statusMessage: `Cancel subscription is not supported for provider [${provider}]. Please manage via the gateway directly.`
      })
    }

    try {
      await strategy.cancelSubscription(sub, immediate)

      // 更新 DB 状态
      if (immediate) {
        await db.from('subscriptions').update({
          status: 'canceled',
          cancel_at_period_end: false,
          updated_at: new Date().toISOString()
        }).eq('id', id)
      } else {
        await db.from('subscriptions').update({
          cancel_at_period_end: true,
          updated_at: new Date().toISOString()
        }).eq('id', id)
      }

      // 同步降级用户
      if (sub.user_id) {
        await db.from('profiles').update({
          plan_status: 'free',
          updated_at: new Date().toISOString()
        }).eq('id', sub.user_id)
      }
    } catch (err: any) {
      console.error(`[${provider} Cancel Subscription] Action failed:`, err.message)
      throw createError({
        statusCode: 500,
        statusMessage: `${provider} cancel failed: ${err.message}`
      })
    }
  }

  // 5. 审计日志
  await logAuditEvent(
    event,
    adminUser,
    `ADMIN_CANCEL_SUBSCRIPTION:${sub.gateway_subscription_id}:provider=${provider}:user_id=${sub.user_id}:immediate=${immediate}`,
    'SUCCESS'
  )

  return sendSuccess(event, {
    id,
    status: immediate ? 'canceled' : 'cancel_at_period_end',
  }, immediate ? 'Subscription canceled immediately' : 'Subscription will cancel at period end')
})
