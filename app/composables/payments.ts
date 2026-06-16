/**
 * usePayment — Stripe 支付流程封装
 *
 * 提供创建支付 session、跳转 Stripe、轮询订单状态等能力
 */
export function usePayment() {
  const isProcessing = ref(false)
  const currentOrder = ref<Record<string, any> | null>(null)

  // 创建支付 session 并跳转 Stripe
  const createAndRedirect = async (params: {
    productId: string
    productName: string
    amount: number
    currency?: string
  }) => {
    isProcessing.value = true
    try {
      const res = await $fetch<any>('/api/v1/payments/create', {
        method: 'POST',
        body: {
          productId: params.productId,
          productName: params.productName,
          amount: params.amount,
          currency: params.currency || 'USD',
        },
      })

      currentOrder.value = res.data

      // 跳转到 Stripe Checkout 页面
      if (res.data?.checkoutUrl) {
        window.location.href = res.data.checkoutUrl
      }

      return res.data
    } catch (e) {
      isProcessing.value = false
      throw e
    }
  }

  // 查询订单状态
  const checkOrderStatus = async (orderId: string) => {
    try {
      const res = await $fetch<any>(`/api/v1/payments/${orderId}`)
      return res.data
    } catch {
      return null
    }
  }

  // 轮询订单状态（支付结果确认）
  const pollOrderStatus = async (
    orderId: string,
    interval = 3000,
    maxAttempts = 10
  ): Promise<Record<string, any> | null> => {
    for (let i = 0; i < maxAttempts; i++) {
      const order = await checkOrderStatus(orderId)
      if (order && (order.status === 'paid' || order.status === 'failed')) {
        return order
      }
      await new Promise(r => setTimeout(r, interval))
    }
    return null
  }

  return {
    isProcessing: readonly(isProcessing),
    currentOrder: readonly(currentOrder),
    createAndRedirect,
    checkOrderStatus,
    pollOrderStatus,
  }
}
