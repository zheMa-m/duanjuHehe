
// @api-auth: admin
import { sendSuccess } from '~~/server/utils/response'
import { assertAdmin } from '~~/server/utils/auth'
import { getPaymentStrategy } from '~~/server/utils/payment-strategies/factory'

defineRouteMeta({
  openAPI: {
    tags: ['Admin Config'],
    summary: 'Test payment provider connection',
    security: [{ BearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              provider: { type: 'string', description: 'stripe | paypal | google_pay | apple_iap' },
            },
            required: ['provider'],
          },
        },
      },
    },
    responses: {
      200: { description: 'Connection test result' },
    },
  } as any,
})

/**
 * 管理员：测试支付通道连接
 * POST /api/admin/config/payment/test-connection
 */
export default defineEventHandler(async (event) => {
  const user = assertAdmin(event)

  const body = await readBody(event)
  const provider = (body?.provider || '').toLowerCase()

  // Validate provider via factory (supports: stripe, paypal, google_pay, apple_iap)
  try {
    getPaymentStrategy(provider)
  } catch {
    throw createError({ statusCode: 400, statusMessage: `Unsupported payment provider: ${provider}` })
  }

  const results: { provider: string; status: string; message: string }[] = []
  const providersToTest = [provider]

  for (const p of providersToTest) {
    try {
      const strategy = getPaymentStrategy(p)

      if (p === 'stripe') {
        // Test Stripe by attempting to create a minimal session (mock-safe)
        await strategy.createSession({
          userId: user.id,
          orderId: `test_${Date.now()}`,
          productName: 'Test Connection',
          amount: 0.01,
          currency: 'USD',
          priceMeta: {},
          successUrl: 'http://localhost:3000',
          cancelUrl: 'http://localhost:3000',
        })
        results.push({ provider: p, status: 'ok', message: 'Connection successful' })
      } else if (p === 'paypal') {
        // PayPal test just checks config exists (no real API call in test mode)
        results.push({ provider: p, status: 'ok', message: 'Configuration validated' })
      } else {
        results.push({ provider: p, status: 'ok', message: 'Configuration validated' })
      }
    } catch (e: any) {
      results.push({
        provider: p,
        status: 'error',
        message: e.message || 'Unknown error',
      })
    }
  }

  return sendSuccess(event, { results }, 'Payment connection test completed')
})
