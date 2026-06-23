/**
 * 邮件服务 — 统一事务邮件发送封装
 *
 * 支持两种模式：
 * - Mock 模式（MOCK_DB=true）：输出到控制台，不实际发送
 * - Resend 模式（MOCK_DB=false）：通过 Resend API 发送真实邮件
 *
 * 使用方式：
 * ```ts
 * import { sendEmail } from '~/server/utils/email'
 * await sendEmail({ to: 'user@example.com', template: 'welcome', data: { name: 'Alice' } })
 * ```
 */

import { Resend } from 'resend'

// ── 类型定义 ──

export type EmailTemplate = 'welcome' | 'password-reset' | 'order-confirmed' | 'security-alert' | 'verification' | 'starpath-report'

export interface SendEmailOptions {
  to: string
  template: EmailTemplate
  data: Record<string, string>
}

interface EmailTemplateConfig {
  subject: string
  render(data: Record<string, string>): string
}

// ── 邮件模板（纯 HTML，兼容主流邮件客户端） ──

const TEMPLATES: Record<EmailTemplate, EmailTemplateConfig> = {
  welcome: {
    subject: '欢迎加入 HeHe',
    render: (data) => `
<!DOCTYPE html>
<html><body style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #0a0e1a;">欢迎加入 HeHe 🎉</h2>
  <p>你好 ${data.name || '用户'}，</p>
  <p>感谢你注册 HeHe 平台！你的账户已创建成功。</p>
  <p>现在你可以：</p>
  <ul>
    <li>浏览和管理你的订阅</li>
    <li>访问管理后台</li>
    <li>开始创建营销活动</li>
  </ul>
  <p style="margin-top: 30px;">
    <a href="${data.baseUrl || 'http://localhost:3000'}/admin"
       style="background: #0a0e1a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
      进入管理后台
    </a>
  </p>
  <p style="color: #666; font-size: 12px; margin-top: 40px;">
    HeHe 团队 · 如有问题请联系支持
  </p>
</body></html>`,
  },

  'password-reset': {
    subject: '重置你的 HeHe 密码',
    render: (data) => `
<!DOCTYPE html>
<html><body style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #0a0e1a;">重置密码</h2>
  <p>你好 ${data.name || '用户'}，</p>
  <p>我们收到了重置你 HeHe 账户密码的请求。请点击下方链接重置密码：</p>
  <p style="margin: 30px 0;">
    <a href="${data.resetLink}"
       style="background: #0a0e1a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
      重置密码
    </a>
  </p>
  <p>此链接将在 1 小时后过期。如果你没有请求重置密码，请忽略此邮件。</p>
  <p style="color: #666; font-size: 12px; margin-top: 40px;">
    HeHe 安全团队
  </p>
</body></html>`,
  },

  'order-confirmed': {
    subject: '订单确认 — HeHe',
    render: (data) => `
<!DOCTYPE html>
<html><body style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #0a0e1a;">订单确认 ✅</h2>
  <p>你好 ${data.name || '用户'}，</p>
  <p>你的订单已确认！以下是订单详情：</p>
  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">订单编号</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${data.orderId || '-'}</strong></td></tr>
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">金额</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${data.amount || '-'}</strong></td></tr>
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">状态</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${data.status || '已完成'}</strong></td></tr>
  </table>
  <p style="color: #666; font-size: 12px; margin-top: 40px;">
    HeHe 团队 · 如有问题请联系支持
  </p>
</body></html>`,
  },

  'security-alert': {
    subject: '安全提醒 — HeHe',
    render: (data) => `
<!DOCTYPE html>
<html><body style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #dc2626;">安全提醒 ⚠️</h2>
  <p>你好 ${data.name || '用户'}，</p>
  <p>我们检测到以下安全事件：</p>
  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">事件</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${data.event || '-'}</strong></td></tr>
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">时间</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${data.time || '-'}</strong></td></tr>
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">IP 地址</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${data.ip || '-'}</strong></td></tr>
  </table>
  <p>如果这不是你本人的操作，请立即修改密码并联系管理员。</p>
  <p style="color: #666; font-size: 12px; margin-top: 40px;">
    HeHe 安全团队
  </p>
</body></html>`,
  },

  verification: {
    subject: '验证你的邮箱 — HeHe',
    render: (data) => `
<!DOCTYPE html>
<html><body style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #0a0e1a;">验证邮箱地址</h2>
  <p>你好 ${data.name || '用户'}，</p>
  <p>请点击下方按钮验证你的邮箱地址：</p>
  <p style="margin: 30px 0;">
    <a href="${data.verifyLink}"
       style="background: #0a0e1a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
      验证邮箱
    </a>
  </p>
  <p>或复制以下链接到浏览器：</p>
  <p style="word-break: break-all; color: #2563eb; font-size: 12px;">${data.verifyLink || '-'}</p>
  <p style="color: #666; font-size: 12px; margin-top: 40px;">
    HeHe 团队
  </p>
</body></html>`,
  },

  'starpath-report': {
    subject: 'Your 智能问卷 Astrology Report is Ready 🔮',
    render: (data) => `
<!DOCTYPE html>
<html><body style="font-family: Inter, 'PingFang SC', Arial, sans-serif; padding: 0; margin: 0; background: #0a0a1a;">
  <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(180deg, #1a1040 0%, #0a0a1a 100%); color: #e0d8ff; padding: 40px 30px;">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #aa99ff; font-size: 24px; margin: 0 0 8px;">✨ Your Cosmic Blueprint is Ready</h1>
      <p style="color: #8a78cc; font-size: 14px; margin: 0;">Personalized AI Astrology Reading for ${data.name || 'You'}</p>
    </div>

    <div style="background: rgba(170, 153, 255, 0.08); border: 1px solid rgba(170, 153, 255, 0.2); border-radius: 16px; padding: 24px; margin-bottom: 24px;">
      <p style="font-size: 15px; line-height: 1.7; margin: 0; color: #c4b8ff;">
        We've analyzed your birth chart and decoded your personality traits, relationship patterns, and growth opportunities. Your complete reading is waiting.
      </p>
    </div>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${data.reportUrl || '#'}"
         style="display: inline-block; background: linear-gradient(135deg, #6546ff 0%, #aa99ff 100%); color: white; font-size: 16px; font-weight: 600; padding: 14px 40px; text-decoration: none; border-radius: 28px; box-shadow: 0 4px 20px rgba(101, 70, 255, 0.4);">
        View My Report →
      </a>
    </div>

    <div style="text-align: center; padding-top: 24px; border-top: 1px solid rgba(170, 153, 255, 0.15);">
      <p style="font-size: 12px; color: #5a4a88; margin: 0 0 4px;">
        For entertainment purposes only. Not a substitute for professional advice.
      </p>
      <p style="font-size: 12px; color: #5a4a88; margin: 0;">
        Need help? Contact <a href="mailto:${data.supportEmail || 'support@heheapp.com'}" style="color: #aa99ff;">${data.supportEmail || 'support@heheapp.com'}</a>
      </p>
    </div>
  </div>
</body></html>`,
  },
}

// ── 发送函数 ──

let resendClient: Resend | null = null

function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY || '')
  }
  return resendClient
}

/**
 * 发送事务邮件
 *
 * @param options - 邮件发送选项
 * @returns 发送结果（Mock 模式下返回模拟结果）
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ id: string }> {
  const template = TEMPLATES[options.template]
  if (!template) {
    throw new Error(`Unknown email template: ${options.template}`)
  }

  const html = template.render(options.data)
  const from = process.env.EMAIL_FROM || 'HeHe <noreply@heheapp.com>'

  if (process.env.MOCK_DB === 'true') {
    // Mock 模式：输出到控制台，不实际发送
    console.log('[Email Mock] ────────────────────────')
    console.log(`[Email Mock] To:       ${options.to}`)
    console.log(`[Email Mock] From:     ${from}`)
    console.log(`[Email Mock] Subject:  ${template.subject}`)
    console.log(`[Email Mock] Template: ${options.template}`)
    console.log(`[Email Mock] Data:     ${JSON.stringify(options.data)}`)
    console.log('[Email Mock] ────────────────────────')
    return { id: `mock-${Date.now()}` }
  }

  // 生产模式：通过 Resend 发送
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not configured, falling back to mock mode')
    console.log(`[Email Mock] Would send to ${options.to}: ${template.subject}`)
    return { id: `mock-${Date.now()}` }
  }

  const client = getResendClient()
  const { data, error } = await client.emails.send({
    from,
    to: options.to,
    subject: template.subject,
    html,
  })

  if (error) {
    console.error('[Email] Failed to send:', error)
    throw new Error(`Failed to send email: ${error.message}`)
  }

  console.log('[Email] Sent successfully:', data?.id)
  return { id: data?.id || `unknown-${Date.now()}` }
}

/**
 * 批量发送邮件（同模板、不同用户）
 * Mock 模式下顺序发送，生产模式可拆分并行
 */
export async function sendBulkEmails(
  recipients: Array<{ to: string; data: Record<string, string> }>,
  template: EmailTemplate
): Promise<Array<{ to: string; id: string }>> {
  const results: Array<{ to: string; id: string }> = []

  for (const recipient of recipients) {
    try {
      const result = await sendEmail({ to: recipient.to, template, data: recipient.data })
      results.push({ to: recipient.to, id: result.id })
    } catch (err: any) {
      console.error(`[Email] Failed to send to ${recipient.to}:`, err.message)
      results.push({ to: recipient.to, id: `failed-${Date.now()}` })
    }
  }

  return results
}
