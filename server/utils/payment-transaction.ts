/**
 * Payment Transaction Logger
 *
 * Writes every payment lifecycle event (created → confirmed → refunded)
 * into the payment_transactions table for audit trail.
 */
import { getDB } from './db'

export interface PaymentTransactionParams {
  orderId: string
  provider: string
  type: 'payment' | 'refund' | 'cancellation' | 'verification'
  gatewayTransactionId?: string
  amount?: number
  currency?: string
  status: 'succeeded' | 'failed' | 'pending' | 'refunded'
  gatewayResponse?: any
  errorMessage?: string
  context?: Record<string, any>
}

export async function logPaymentTransaction(
  event: any,
  params: PaymentTransactionParams,
): Promise<void> {
  const db = getDB(event)
  const { error } = await db.from('payment_transactions').insert({
    order_id: params.orderId,
    payment_provider: params.provider,
    transaction_type: params.type,
    gateway_transaction_id: params.gatewayTransactionId || null,
    amount: params.amount ?? null,
    currency: params.currency || 'USD',
    status: params.status,
    gateway_response: params.gatewayResponse || null,
    error_message: params.errorMessage || null,
    context: params.context || null,
  })

  if (error) {
    console.error('[PaymentTransaction] Failed to log:', error.message)
  }
}
