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
    description: '管理员可用此端点连接 Stripe API 拉取最新活跃产品及价格映射，自动导入/更新到本地商品库中。',
    security: [{ BearerAuth: [] }],
    responses: {
      200: { description: '同步商品目录成功' },
    },
  } as any,
})

/**
 * 同步 Stripe 商品目录
 * POST /api/admin/products/sync-stripe
 */
export default defineEventHandler(async (event) => {
  const user = assertAdmin(event)
  const db = getDB(event)

  let syncCount = 0

  if (process.env.MOCK_DB === 'true') {
    // 1. Mock 模式仿真同步
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
      syncCount++
    }
  } else {
    // 2. 真实 Stripe API 同步
    // 从 system_configs 读取 Stripe 私钥
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
      // 获取 Stripe 活跃的产品
      const productsRes = await stripe.products.list({ active: true, limit: 100 })
      
      for (const product of productsRes.data) {
        // 获取该产品关联的活跃的价格列表
        const pricesRes = await stripe.prices.list({ product: product.id, active: true, limit: 10 })
        if (pricesRes.data.length === 0) continue

        // 取最新的或者首选价格作为默认
        const priceObj = pricesRes.data[0]
        const amount = (priceObj.unit_amount || 0) / 100

        // 使用产品 id 作为本地商品 UUID (为防长度不匹配，可以通过 hash 生成或让 postgres 自行生成 UUID，
        // 最佳实践是将 Stripe Product ID 作为 payment_meta.stripe.productId 存储，并基于此做对齐 upsert)
        // 检查本地是否已存在该 Stripe 产品的映射
        const { data: existingProducts } = await db
          .from('products')
          .select('*')
          .eq('tenant_id', BUILTIN_ADMIN_UUID)

        const matched = (existingProducts || []).find(
          (x: any) => x.payment_meta?.stripe?.productId === product.id
        )

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
          updated_at: new Date().toISOString()
        }

        if (matched) {
          await db.from('products').update(payload).eq('id', matched.id)
        } else {
          await db.from('products').insert({
            ...payload,
            created_at: new Date().toISOString()
          })
        }
        syncCount++
      }
    } catch (err: any) {
      console.error('[Stripe Sync] Failed to sync products:', err.message)
      throw createError({ statusCode: 500, statusMessage: `Stripe sync failed: ${err.message}` })
    }
  }

  await logAuditEvent(
    event,
    user,
    `PRODUCT_STRIPE_SYNC:synchronized_count=${syncCount}`,
    'SUCCESS'
  )

  return sendSuccess(event, { synchronized: syncCount }, `Successfully synchronized ${syncCount} products from Stripe`)
})
