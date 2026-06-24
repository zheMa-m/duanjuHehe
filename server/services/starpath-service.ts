/**
 * 智能问卷 Service Layer
 *
 * 核心业务逻辑，由 API handler 调用。职责：
 *   - 问卷：Session 管理 + 答案事件流
 *   - 留资：email 写入 campaign_registrations
 *   - 支付：订单创建/确认/取消
 *   - 报告：AI 报告查询与生成请求
 */

import { H3Event } from 'h3'
import { getDB } from '~~/server/utils/db'
import { throwError } from '~~/server/utils/response'
import { logAuditEvent } from '~~/server/utils/logger'

// ── 类型 ──

export interface SessionInput {
  campaignId: string
  userId?: string | null
  sessionKey: string
  gender?: string
  birthDate?: string
  birthTime?: string
  birthCity?: string
  fullName?: string
  step?: number
}

export interface AnswerInput {
  sessionId: string
  step: number
  questionKey: string
  answerValue: any
}

export interface EmailInput {
  campaignId: string
  email: string
  agreedTerms: boolean
  metadata?: Record<string, any>
}

export interface OrderInput {
  campaignId: string
  userId?: string | null
  sessionId?: string
  reportId?: string
  platform: string
  paymentMethod: string
  plan: string
  amount: number
  currency?: string
}

export interface OrderConfirmInput {
  orderId: string
  paymentProvider: string
  transactionId: string
}

// ── Pricing 映射 ──

const PLAN_PRICES: Record<string, number> = {
  'trial-7d': 7.99,
  'monthly': 29.99,
  'yearly': 99.99,
}

// ── Service 函数 ──

export const starpathService = {
  // ══════════════════════════════════════════════════════════════
  //  Questionnaire
  // ══════════════════════════════════════════════════════════════

  /** 创建或恢复问卷 session */
  async findOrCreateSession(event: H3Event, input: SessionInput) {
    const db = getDB(event)

    // 尝试查找已有 session
    const { data: existing } = await db
      .from('questionnaire_sessions')
      .select('*')
      .eq('campaign_id', input.campaignId)
      .eq('session_key', input.sessionKey)
      .single()

    if (existing) {
      // 更新 session（增量字段）
      const updates: Record<string, any> = { current_step: input.step || existing.current_step }
      if (input.gender) updates.gender = input.gender
      if (input.birthDate) updates.birth_date = input.birthDate
      if (input.birthTime) updates.birth_time = input.birthTime
      if (input.birthCity) updates.birth_city = input.birthCity
      if (input.fullName) updates.full_name = input.fullName
      if (existing.status === 'started') updates.status = 'in_progress'

      const { data: updated, error } = await db
        .from('questionnaire_sessions')
        .update(updates)
        .eq('id', existing.id)
        .select('*')
        .single()

      if (error) throwError(500, error.message)
      return updated
    }

    // 新建 session
    const { data: created, error } = await db
      .from('questionnaire_sessions')
      .insert({
        campaign_id: input.campaignId,
        user_id: input.userId || null,
        session_key: input.sessionKey,
        gender: input.gender || null,
        birth_date: input.birthDate || null,
        birth_time: input.birthTime || null,
        birth_city: input.birthCity || null,
        full_name: input.fullName || null,
        current_step: input.step || 0,
        status: 'started',
      })
      .select('*')
      .single()

    if (error) throwError(500, error.message)
    return created
  },

  /** 提交单个问题答案（event sourcing: 追加不可变事件） */
  async submitAnswer(event: H3Event, input: AnswerInput) {
    const db = getDB(event)

    const { data, error } = await db
      .from('questionnaire_answers')
      .insert({
        session_id: input.sessionId,
        step: input.step,
        question_key: input.questionKey,
        answer_value: input.answerValue,
      })
      .select('*')
      .single()

    if (error) throwError(500, error.message)

    // 更新 session 的 current_step
    await db
      .from('questionnaire_sessions')
      .update({ current_step: input.step, status: 'in_progress' })
      .eq('id', input.sessionId)

    return data
  },

  /** 完成问卷 */
  async completeSession(event: H3Event, sessionId: string) {
    const db = getDB(event)

    const { error } = await db
      .from('questionnaire_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', sessionId)

    if (error) throwError(500, error.message)

    await logAuditEvent(
      event,
      null,
      `STARPATH_SESSION_COMPLETED:${sessionId}`,
      'SUCCESS'
    )

    return { ok: true }
  },

  /** 获取 session 进度 */
  async getSessionProgress(event: H3Event, sessionId: string) {
    const db = getDB(event)

    const { data: session, error } = await db
      .from('questionnaire_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (error || !session) throwError(404, 'Session not found')

    const { data: answers } = await db
      .from('questionnaire_answers')
      .select('step, question_key, answer_value')
      .eq('session_id', sessionId)
      .order('answered_at', { ascending: true })

    return {
      session,
      answers: answers || [],
    }
  },

  // ══════════════════════════════════════════════════════════════
  //  Email / Registration
  // ══════════════════════════════════════════════════════════════

  /** 提交邮箱留资 */
  async submitEmail(event: H3Event, input: EmailInput) {
    const db = getDB(event)

    const { data, error } = await db
      .from('campaign_registrations')
      .insert({
        campaign_id: input.campaignId,
        subdomain: 'starpath',
        phone: '',
        email: input.email,
        agreed_terms: input.agreedTerms,
        source: 'starpath-email',
        metadata: input.metadata || {},
        created_at: new Date().toISOString(),
      })
      .select('*')
      .single()

    if (error) throwError(500, error.message)

    await logAuditEvent(
      event,
      null,
      `STARPATH_EMAIL_SUBMIT:${input.email}`,
      'SUCCESS'
    )

    return data
  },

  // ══════════════════════════════════════════════════════════════
  //  Orders
  // ══════════════════════════════════════════════════════════════

  /** 创建订单（orders + campaign_orders 关联） */
  async createOrder(event: H3Event, input: OrderInput) {
    const db = getDB(event)

    // 仅 Apple IAP（原生 iOS SDK 已完成扣款）为即时支付
    // PayPal / Google Pay / Card 走后端异步确认
    const isImmediatePayment = ['apple_iap', 'apple-pay', 'apple_pay'].includes(input.paymentMethod)

    // 1. 创建订单（纯支付字段）
    const { data: order, error } = await db
      .from('orders')
      .insert({
        order_no: `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        user_id: input.userId || null,
        product_name: `智能问卷 Plan: ${input.plan}`,
        amount: input.amount,
        currency: input.currency || 'USD',
        status: isImmediatePayment ? 'paid' : 'pending',
        payment_provider: input.paymentMethod,
        paid_at: isImmediatePayment ? new Date().toISOString() : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id, status')
      .single()

    if (error) throwError(500, error.message)

    // 2. 创建活动-订单关联记录
    const { error: coError } = await db
      .from('campaign_orders')
      .insert({
        campaign_id: input.campaignId,
        order_id: order.id,
        session_id: input.sessionId || null,
        report_id: input.reportId || null,
        platform: input.platform,
        plan: input.plan,
        created_at: new Date().toISOString(),
      })

    if (coError) throwError(500, coError.message)

    await logAuditEvent(
      event,
      null,
      `STARPATH_ORDER_CREATED:${order.id}:plan=${input.plan}:amount=${input.amount}`,
      'SUCCESS'
    )

    return order
  },

  /** 确认支付（更新订单状态） */
  async confirmOrder(event: H3Event, input: OrderConfirmInput) {
    const db = getDB(event)

    const { error } = await db
      .from('orders')
      .update({
        status: 'paid',
        payment_provider: input.paymentProvider,
        payment_intent_id: input.transactionId,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.orderId)

    if (error) throwError(500, error.message)

    await logAuditEvent(
      event,
      null,
      `STARPATH_ORDER_CONFIRMED:${input.orderId}:${input.paymentProvider}`,
      'SUCCESS'
    )

    return { status: 'paid', receiptId: `rcpt_${Date.now()}` }
  },

  // ══════════════════════════════════════════════════════════════
  //  Reports
  // ══════════════════════════════════════════════════════════════

  /** 获取报告 */
  async getReport(event: H3Event, reportId: string) {
    const db = getDB(event)

    const { data, error } = await db
      .from('ai_reports')
      .select('*')
      .eq('id', reportId)
      .single()

    if (error || !data) throwError(404, 'Report not found')

    return data
  },

  /** 请求生成报告（异步，返回 pending 状态） */
  async requestReportGeneration(event: H3Event, sessionId: string, campaignId: string) {
    const db = getDB(event)

    // 获取 session 数据
    const { data: session } = await db
      .from('questionnaire_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (!session) throwError(404, 'Session not found')

    const { data, error } = await db
      .from('ai_reports')
      .insert({
        session_id: sessionId,
        user_id: session.user_id,
        campaign_id: campaignId,
        report_type: 'astrology',
        status: 'pending',
        content: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single()

    if (error) throwError(500, error.message)

    await logAuditEvent(
      event,
      null,
      `STARPATH_REPORT_REQUESTED:${data.id}`,
      'SUCCESS'
    )

    return data
  },

  // ══════════════════════════════════════════════════════════════
  //  Pricing
  // ══════════════════════════════════════════════════════════════

  /** 获取 plan 价格 */
  getPlanPrice(plan: string): number {
    return PLAN_PRICES[plan] || 7.99
  },
}
