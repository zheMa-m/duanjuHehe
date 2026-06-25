// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { assertAdmin, BUILTIN_ADMIN_UUID } from '~~/server/utils/auth'
import { logAuditEvent } from '~~/server/utils/logger'
import { getStripeClient } from '~~/server/utils/payments'

defineRouteMeta({
  openAPI: {
    tags: ['管理端商品'],
    summary: '管理员同步 Stripe 商品目录',
    description: '管理员可用此端点连接 Stripe API 拉取最新活跃产品及价格映射，自动导入/更新到本地商品库中，并返回差异报告。',
    security: [{ BearerAuth: [] }],
    responses: {
      200: { description: '同步商品目录成功（含差异报告）' },
    },
  } as any,
})

/**
 * 同步 Stripe 商品目录（增强版）
 * POST /api/admin/products/sync-stripe
 *
 * 改进：
 * - auto-pagination 支持 >100 个 Stripe 商品
 * - 批量构建内存索引，消除 N+1 查询
 * - 返回差异报告 { created, updated, skipped, deactivated }
 * - 自动下架 Stripe 已归档但本地仍 active 的商品
 */
export default defineEventHandler(async (event) => {
  const user = assertAdmin(event)
  const db = getDB(event)

  const report = { created: 0, updated: 0, skipped: 0, deactivated: 0, errors: [] as string[] }

  if (process.env.MOCK_DB === 'true') {
    // ── Mock 模式仿真同步 ──────────────────────────────────────────────
    try {
    const mockProducts = [
      {
        id: 'p-stripe-1',
        name: 'Stripe 极客月付套餐 (Mock)',
        price: 9.90,
        tenant_id: BUILTIN_ADMIN_UUID,
        is_active: true,
        payment_meta: { stripe: { priceId: 'price_mock_starter_99', mode: 'subscription' } },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'p-stripe-2',
        name: 'Stripe 专业订阅方案 (Mock)',
        price: 49.00,
        tenant_id: BUILTIN_ADMIN_UUID,
        is_active: true,
        payment_meta: { stripe: { priceId: 'price_mock_pro_49', mode: 'subscription' } },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'p-stripe-3',
        name: 'Stripe 终身尊享单品 (Mock)',
        price: 199.00,
        tenant_id: BUILTIN_ADMIN_UUID,
        is_active: true,
        payment_meta: { stripe: { priceId: 'price_mock_lifetime_199', mode: 'payment' } },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]

    for (const p of mockProducts) {
      await db.from('products').upsert(p)
      report.created++
    }
    } catch (err: any) {
      console.error('[Stripe Sync Mock] Error:', err.message)
      report.errors.push(err.message)
    }
  } else {
    // ── 真实 Stripe API 同步 ────────────────────────────────────────────
    const { data: secretsRow } = await db
      .from('system_configs')
      .select('value')
      .eq('key', 'payment_secrets')
      .single()

    const stripeSecretKey = secretsRow?.value?.stripe?.secretKey || undefined
    const stripe = getStripeClient(stripeSecretKey)

    if (!stripe) {
      throw createError({ statusCode: 400, statusMessage: '请先在系统设置中配置 Stripe Secret Key（设置 → 支付密钥 → Stripe secretKey）' })
    }

    // 1. 批量查询本地所有商品，构建内存索引 Map<stripeProductId, localRow>
    const { data: localProducts } = await db
      .from('products')
      .select('*')
      .eq('tenant_id', BUILTIN_ADMIN_UUID)

    const localByStripeId = new Map<string, any>()
    for (const p of (localProducts || [])) {
      const stripeProductId = p.payment_meta?.stripe?.productId
      if (stripeProductId) {
        localByStripeId.set(stripeProductId, p)
      }
    }

    // 2. Auto-pagination: 拉取全部 Stripe 活跃产品
    const stripeProductIds = new Set<string>()

    try {
      for await (const product of stripe.products.list({ active: true, limit: 100 })) {
        stripeProductIds.add(product.id)

        // 获取该产品关联的活跃价格
        const pricesRes = await stripe.prices.list({ product: product.id, active: true, limit: 10 })
        if (pricesRes.data.length === 0) {
          report.skipped++
          continue
        }

        const priceObj = pricesRes.data[0]
        const amount = (priceObj.unit_amount || 0) / 100
        const matched = localByStripeId.get(product.id)

        const payload: any = {
          name: product.name,
          price: amount,
          tenant_id: BUILTIN_ADMIN_UUID,
          is_active: true,
          payment_meta: {
            stripe: {
              productId: product.id,
              priceId: priceObj.id,
              mode: priceObj.type === 'recurring' ? 'subscription' : 'payment'
            }
          },
          pricing: {
            base_price: amount,
            currency: (priceObj.currency || 'usd').toUpperCase(),
            billing_interval: priceObj.recurring?.interval || 'one_time',
          },
          updated_at: new Date().toISOString()
        }

        if (matched) {
          // 价格或名称有变化才更新
          const priceChanged = Math.abs(Number(matched.price) - amount) > 0.001
          const nameChanged = matched.name !== product.name
          if (!priceChanged && !nameChanged) {
            report.skipped++
            continue
          }
          await db.from('products').update(payload).eq('id', matched.id)
          report.updated++
        } else {
          await db.from('products').insert({
            ...payload,
            created_at: new Date().toISOString()
          })
          report.created++
        }
      }

      // 3. 自动下架：本地 active 但 Stripe 已不存在的产品
      for (const [stripeId, localRow] of localByStripeId) {
        if (localRow.is_active && !stripeProductIds.has(stripeId)) {
          await db.from('products').update({
            is_active: false,
            updated_at: new Date().toISOString()
          }).eq('id', localRow.id)
          report.deactivated++
        }
      }
    } catch (err: any) {
      console.error('[Stripe Sync] Failed to sync products:', err.message)
      throw createError({ statusCode: 500, statusMessage: `Stripe sync failed: ${err.message}` })
    }
  }

  const total = report.created + report.updated + report.skipped + report.deactivated

  await logAuditEvent(
    event,
    user,
    `PRODUCT_STRIPE_SYNC:created=${report.created}:updated=${report.updated}:skipped=${report.skipped}:deactivated=${report.deactivated}`,
    'SUCCESS'
  )

  return sendSuccess(event, report, `Stripe sync complete: ${report.created} created, ${report.updated} updated, ${report.skipped} skipped, ${report.deactivated} deactivated`)
})
