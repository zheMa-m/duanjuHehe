import type { PaymentStrategy, CreateSessionParams, PaymentStrategyResult, WebhookResult, SubscriptionRecord } from './types'

/**
 * Manual Payment Strategy
 *
 * Used for offline/out-of-band payments where an admin manually records
 * that a payment was received (e.g., bank transfer, cash, promotional credit).
 *
 * - createSession(): Always returns a "pending" session — the admin must
 *   manually confirm via the admin panel.
 * - verifyWebhook(): Not applicable — returns null.
 * - confirmManualPayment(): Called by admin to mark an order as paid.
 */
export class ManualPaymentStrategy implements PaymentStrategy {
  async createSession(params: CreateSessionParams): Promise<PaymentStrategyResult> {
    return {
      sessionId: `manual_${params.orderId}`,
      checkoutUrl: '',
      paymentIntentId: undefined,
    }
  }

  async verifyWebhook(_rawBody: string | Buffer, _signature: string): Promise<WebhookResult | null> {
    // Manual payments have no webhook
    return null
  }

  /**
   * Admin confirms a manual payment for the given order.
   * This would be called from the admin panel API.
   */
  async confirmManualPayment(orderId: string, adminUserId: string, note?: string): Promise<void> {
    const { getDB } = await import('../db')
    const db = getDB()

    const now = new Date().toISOString()

    const { error } = await db
      .from('orders')
      .update({
        status: 'paid',
        paid_at: now,
        payment_provider: 'manual',
        extra_meta: {
          confirmed_by: adminUserId,
          confirmed_at: now,
          note: note || '',
        },
      })
      .eq('id', orderId)

    if (error) {
      throw new Error(`Failed to confirm manual payment: ${error.message}`)
    }

    // Log audit event
    const { logAuditEvent } = await import('../logger')
    await logAuditEvent(
      null,
      { id: adminUserId, username: adminUserId },
      `manual_payment_confirmed:${orderId}`,
      'SUCCESS',
    )
  }

  /**
   * Cancel a manual subscription — update DB state only, no gateway call.
   */
  async cancelSubscription(subscription: SubscriptionRecord, _immediate: boolean): Promise<void> {
    const { getDB } = await import('../db')
    const db = getDB()

    const { error } = await db
      .from('subscriptions')
      .update({
        status: 'canceled',
        cancel_at_period_end: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.id)
      .eq('subscription_provider', 'manual')

    if (error) {
      throw new Error(`Failed to cancel manual subscription: ${error.message}`)
    }
  }

  /**
   * Refund a manual payment — marks the order as refunded.
   */
  async refundPayment(orderId: string, _amount?: number): Promise<any> {
    return { id: `manual_refund_${orderId}`, status: 'recorded' }
  }

  /**
   * Admin records a manual refund for the given order.
   */
  async recordManualRefund(orderId: string, adminUserId: string, reason: string): Promise<void> {
    const { getDB } = await import('../db')
    const db = getDB()

    const now = new Date().toISOString()

    const { error } = await db
      .from('orders')
      .update({
        status: 'refunded',
        refund_reason: reason,
        refunded_at: now,
        extra_meta: {
          refunded_by: adminUserId,
          refunded_at: now,
          reason,
        },
      })
      .eq('id', orderId)

    if (error) {
      throw new Error(`Failed to record manual refund: ${error.message}`)
    }

    const { logAuditEvent } = await import('../logger')
    await logAuditEvent(
      null,
      { id: adminUserId, username: adminUserId },
      `manual_refund_recorded:${orderId}`,
      'SUCCESS',
    )
  }
}
