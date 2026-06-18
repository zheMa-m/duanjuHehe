
// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { assertAdmin } from '~~/server/utils/auth'
import { logAuditEvent } from '~~/server/utils/logger'
import { getStripeClient } from '~~/server/utils/payments'

defineRouteMeta({
  openAPI: {
    tags: ['管理端订阅'],
    summary: '管理员：取消订阅',
    description: '管理员可立即取消订阅或设定周期末取消。立即取消将同步降级用户 plan_status。',
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
      400: { description: '订阅不满足取消条件' },
      404: { description: '订阅未找到' },
    },
  } as any,
})

/**
 * 管理员取消订阅
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
    // 4. 真实 Stripe 模式
    const { data: secretsRow } = await db
      .from('system_configs')
      .select('value')
      .eq('key', 'payment_secrets')
      .single()

    const stripeSecretKey = secretsRow?.value?.stripe?.secretKey || undefined
    const stripe = getStripeClient(stripeSecretKey)

    if (!stripe) {
      throw createError({ statusCode: 500, statusMessage: 'Stripe client is not configured' })
    }

    try {
      if (immediate) {
        // 立即取消
        await stripe.subscriptions.cancel(sub.stripe_subscription_id)

        await db.from('subscriptions').update({
          status: 'canceled',
          cancel_at_period_end: false,
          updated_at: new Date().toISOString()
        }).eq('id', id)

        // 同步降级用户
        if (sub.user_id) {
          await db.from('profiles').update({
            plan_status: 'free',
            updated_at: new Date().toISOString()
          }).eq('id', sub.user_id)
        }
      } else {
        // 周期末取消
        await stripe.subscriptions.update(sub.stripe_subscription_id, {
          cancel_at_period_end: true
        })

        await db.from('subscriptions').update({
          cancel_at_period_end: true,
          updated_at: new Date().toISOString()
        }).eq('id', id)
      }
    } catch (err: any) {
      console.error('[Stripe Cancel Subscription] Action failed:', err.message)
      throw createError({
        statusCode: 500,
        statusMessage: `Stripe cancel failed: ${err.message}`
      })
    }
  }

  // 5. 审计日志
  await logAuditEvent(
    event,
    adminUser,
    `ADMIN_CANCEL_SUBSCRIPTION:${sub.stripe_subscription_id}:user_id=${sub.user_id}:immediate=${immediate}`,
    'SUCCESS'
  )

  return sendSuccess(event, {
    id,
    status: immediate ? 'canceled' : 'cancel_at_period_end',
  }, immediate ? 'Subscription canceled immediately' : 'Subscription will cancel at period end')
})
