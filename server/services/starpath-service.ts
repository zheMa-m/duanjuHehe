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

/** 一次性购买价格配置：原价 + 折扣价 */
const ONE_TIME_PRICES: Record<string, { original: number; discount: number }> = {
  'one-time-report': { original: 19.99, discount: 9.99 },
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

  /** 提交单个问题答案（upsert 模式：同一 session + question_key 覆盖更新，支持多次提交）
   *  ⚠️ 依赖 migration 0110 创建的 UNIQUE INDEX (session_id, question_key)
   *     在迁移未执行前，回退到 check-then-insert 模式 */
  async submitAnswer(event: H3Event, input: AnswerInput) {
    const db = getDB(event)

    // 尝试 upsert（需要 UNIQUE INDEX 支持，migration 0110 后生效）
    let { data, error } = await db
      .from('questionnaire_answers')
      .upsert({
        session_id: input.sessionId,
        step: input.step,
        question_key: input.questionKey,
        answer_value: input.answerValue,
      }, { onConflict: 'session_id,question_key' })
      .select('*')
      .single()

    // 回退：若 UNIQUE INDEX 尚未创建（migration 未执行），回退到 check-then-insert
    if (error) {
      const { data: existing } = await db
        .from('questionnaire_answers')
        .select('id')
        .eq('session_id', input.sessionId)
        .eq('question_key', input.questionKey)
        .limit(1)

      if (existing && existing.length > 0) {
        const { data: updated, error: updateErr } = await db
          .from('questionnaire_answers')
          .update({
            step: input.step,
            answer_value: input.answerValue,
            answered_at: new Date().toISOString(),
          })
          .eq('id', existing[0].id)
          .select('*')
          .single()

        if (updateErr) throwError(500, updateErr.message)
        data = updated
        error = null
      } else {
        const { data: inserted, error: insertErr } = await db
          .from('questionnaire_answers')
          .insert({
            session_id: input.sessionId,
            step: input.step,
            question_key: input.questionKey,
            answer_value: input.answerValue,
          })
          .select('*')
          .single()

        if (insertErr) throwError(500, insertErr.message)
        data = inserted
        error = null
      }
    }

    if (error) throwError(500, error.message)

    // 更新 session 的 current_step
    await db
      .from('questionnaire_sessions')
      .update({ current_step: input.step, status: 'in_progress' })
      .eq('id', input.sessionId)

    return data
  },

  /** 存储 intro 阶段数据（familiarity/focus/goal/relationship）*/
  async submitIntroAnswers(
    event: H3Event,
    sessionId: string,
    introAnswers: Record<string, string | string[]>,
  ) {
    const db = getDB(event)

    // 检查是否已存在 intro 数据（幂等：只写一次）
    const { data: existing } = await db
      .from('questionnaire_answers')
      .select('id')
      .eq('session_id', sessionId)
      .eq('step', 0)
      .limit(1)

    if (existing && existing.length > 0) return { skipped: true }

    const rows = Object.entries(introAnswers).map(([key, value]) => ({
      session_id: sessionId,
      step: 0,
      question_key: `intro_${key}`,
      answer_value: typeof value === 'string' ? value : JSON.stringify(value),
    }))

    if (rows.length > 0) {
      const { error } = await db.from('questionnaire_answers').insert(rows)
      if (error) throwError(500, error.message)
    }

    return { inserted: rows.length }
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

    // 0. 查找商品 ID（关联 products 表）
    const productName = '智能问卷 7天试用订阅'
    const { data: products } = await db
      .from('products')
      .select('id')
      .eq('name', productName)
      .limit(1)

    const product = products?.[0]

    // 1. 创建订单（纯支付字段）
    const { data: order, error } = await db
      .from('orders')
      .insert({
        order_no: `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        user_id: input.userId || null,
        product_id: product?.id || null,
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

  /** 获取一次性购买价格配置 */
  getOneTimePrice(plan: string): { original: number; discount: number } {
    return ONE_TIME_PRICES[plan] || { original: 19.99, discount: 9.99 }
  },

  // ══════════════════════════════════════════════════════════════
  //  One-Time Purchase
  // ══════════════════════════════════════════════════════════════

  /** 创建一次性购买订单（报告购买，非订阅） */
  async createOneTimeOrder(event: H3Event, input: {
    sessionId: string
    campaignId: string
    reportId?: string
    platform: string
    paymentMethod: string
  }) {
    const db = getDB(event)
    const pricing = ONE_TIME_PRICES['one-time-report']!
    const isImmediatePayment = ['apple_iap', 'apple-pay', 'apple_pay'].includes(input.paymentMethod)

    // 映射前端 paymentMethod 到 DB 约束值
    const PAYMENT_PROVIDER_MAP: Record<string, string> = {
      'apple-pay': 'apple_iap',
      'apple_pay': 'apple_iap',
      'google-pay': 'google_pay',
      'google_pay': 'google_pay',
    }
    const dbPaymentProvider = PAYMENT_PROVIDER_MAP[input.paymentMethod] || input.paymentMethod

    // 1. 查找或创建报告记录（status: pending，支付后才触发内容生成）
    let reportId = input.reportId
    if (!reportId) {
      const { data: existingReports } = await db
        .from('ai_reports')
        .select('id, status')
        .eq('session_id', input.sessionId)
        .limit(1)

      if (existingReports && existingReports.length > 0) {
        reportId = existingReports[0].id
      } else {
        const { data: newReport, error: reportError } = await db
          .from('ai_reports')
          .insert({
            session_id: input.sessionId,
            user_id: null,
            campaign_id: input.campaignId,
            report_type: 'astrology',
            status: 'pending',
            content: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select('id')
          .single()

        if (reportError) throwError(500, reportError.message)
        reportId = newReport.id
      }
    }

    // 2. 创建一次性购买订单
    // 查找商品 ID（关联 products 表）
    const otProductName = '智能问卷 AI 报告（一次性购买）'
    const { data: otProducts } = await db
      .from('products')
      .select('id')
      .eq('name', otProductName)
      .limit(1)

    const otProduct = otProducts?.[0]

    const { data: order, error } = await db
      .from('orders')
      .insert({
        order_no: `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        user_id: null,
        product_id: otProduct?.id || null,
        product_name: '智能问卷 AI Report (One-Time)',
        amount: pricing.discount,
        original_amount: pricing.original,
        discount_amount: Number((pricing.original - pricing.discount).toFixed(2)),
        currency: 'USD',
        status: isImmediatePayment ? 'paid' : 'pending',
        payment_provider: dbPaymentProvider,
        purchase_type: 'one_time',
        paid_at: isImmediatePayment ? new Date().toISOString() : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id, status, amount, original_amount, discount_amount, currency')
      .single()

    if (error) throwError(500, error.message)

    // 3. 写入 campaign_orders 关联
    const { error: coError } = await db
      .from('campaign_orders')
      .insert({
        campaign_id: input.campaignId,
        order_id: order.id,
        session_id: input.sessionId,
        report_id: reportId,
        platform: input.platform,
        plan: 'one-time-report',
        created_at: new Date().toISOString(),
      })

    if (coError) throwError(500, coError.message)

    await logAuditEvent(
      event,
      null,
      `STARPATH_ONE_TIME_ORDER_CREATED:${order.id}:amount=${pricing.discount}`,
      'SUCCESS'
    )

    return {
      orderId: order.id,
      status: order.status,
      amount: pricing.discount,
      originalAmount: pricing.original,
      discountAmount: Number((pricing.original - pricing.discount).toFixed(2)),
      currency: order.currency || 'USD',
      reportId,
    }
  },

  /** 支付确认后触发报告生成 + 发送邮件 */
  async triggerReportAfterPayment(event: H3Event, orderId: string) {
    const db = getDB(event)

    // 1. 查找关联的 campaign_orders → report_id + session_id
    const { data: coRows } = await db
      .from('campaign_orders')
      .select('report_id, session_id, campaign_id')
      .eq('order_id', orderId)
      .limit(1)

    const co = coRows?.[0]
    if (!co || !co.report_id) return { triggered: false, reason: 'No associated report' }

    // 2. 更新报告状态为 generating
    await db
      .from('ai_reports')
      .update({ status: 'generating', updated_at: new Date().toISOString() })
      .eq('id', co.report_id)

    // 3. 查找用户邮箱（通过 metadata.session_id 精确匹配，防止发错邮箱）
    let email: string | null = null
    if (co.session_id) {
      const { data: registrations } = await db
        .from('campaign_registrations')
        .select('email, metadata')
        .eq('campaign_id', co.campaign_id)
        .eq('subdomain', 'starpath')
        .order('created_at', { ascending: false })
        .limit(50)

      if (registrations) {
        // 通过 metadata.session_id 精确匹配当前问卷 session
        const matched = registrations.find((r: any) => {
          const metaSessionId = r.metadata?.session_id
          return metaSessionId === co.session_id
        })
        email = matched?.email || null
      }
    }

    // 4. 如果找到邮箱，发送报告邮件
    if (email) {
      try {
        const origin = getRequestURL(event).origin
        const { sendEmail } = await import('~~/server/utils/email')
        await sendEmail({
          to: email,
          template: 'starpath-report',
          data: {
            name: 'Starseeker',
            reportUrl: `${origin}/h5/starpath/report?id=${co.report_id}`,
            supportEmail: process.env.EMAIL_FROM || 'support@heheapp.com',
          },
        })

        await db
          .from('ai_reports')
          .update({
            email_sent: true,
            email_sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', co.report_id)
      } catch (mailErr: any) {
        console.warn('[Starpath] Failed to send report email after payment:', mailErr.message)
      }
    }

    await logAuditEvent(
      event,
      null,
      `STARPATH_REPORT_TRIGGERED_AFTER_PAYMENT:${orderId}:report=${co.report_id}`,
      'SUCCESS'
    )

    return { triggered: true, reportId: co.report_id, email }
  },
}
