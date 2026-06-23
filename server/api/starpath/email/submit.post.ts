// @api-auth: public
import { z } from 'zod'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { starpathService } from '~~/server/utils/starpath-service'
import { sendEmail } from '~~/server/utils/email'
import { logAuditEvent } from '~~/server/utils/logger'

const emailSchema = z.object({
  bizCode: z.literal('starpath'),
  email: z.string().email('Valid email required'),
  agreedTerms: z.literal(true, { errorMap: () => ({ message: 'You must agree to terms' }) }),
  reportId: z.string().min(1).optional(),
  campaignId: z.string().uuid().optional(),
})

defineRouteMeta({
  openAPI: {
    tags: ['智能问卷'],
    summary: '提交邮箱接收报告',
    description: '用户完成问卷后提交邮箱，用于接收占星报告。支持触发邮件发送。',
    requestBody: {
      content: { 'application/json': { schema: { type: 'object' } } },
    },
    responses: {
      200: { description: '邮箱已保存' },
      400: { description: '参数校验失败' },
    },
  } as any,
})

/**
 * 智能问卷 邮箱提交
 * POST /api/starpath/email/submit
 */
export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, emailSchema.parse)
  const db = getDB(event)

  // 解析 campaign ID
  const campaignId = body.campaignId || (await getDefaultCampaignId(db))

  // 写入 campaign_registrations（统一留资表）
  await starpathService.submitEmail(event, {
    campaignId,
    email: body.email,
    agreedTerms: body.agreedTerms,
    metadata: {
      biz_code: 'starpath',
      report_id: body.reportId || null,
      source: 'starpath-email',
      submitted_at: new Date().toISOString(),
    },
  })

  // 尝试发送报告邮件（非阻塞，失败不影响留资）
  try {
    await sendEmail({
      to: body.email,
      template: 'starpath-report',
      data: {
        name: 'Starseeker',
        reportUrl: body.reportId
          ? `${getRequestURL(event).origin}/h5/starpath/邮箱收到的报告`
          : `${getRequestURL(event).origin}/h5/starpath/question-page-twelve`,
        supportEmail: process.env.EMAIL_FROM || 'support@heheapp.com',
      },
    })
  } catch (mailErr: any) {
    console.warn('[智能问卷 Email] Failed to send report email:', mailErr.message)
    // 不阻断流程
  }

  await logAuditEvent(
    event,
    null,
    `STARPATH_EMAIL_SENT:${body.email}`,
    'SUCCESS'
  )

  return sendSuccess(event, {
    ok: true,
    etaMinutes: 5,
  }, 'Email submitted successfully')
})

async function getDefaultCampaignId(db: any): Promise<string> {
  const { data } = await db
    .from('campaigns')
    .select('id')
    .eq('subdomain', 'starpath')
    .single()
  if (data) return data.id
  throw createError({ statusCode: 500, statusMessage: '智能问卷 campaign not configured' })
}
