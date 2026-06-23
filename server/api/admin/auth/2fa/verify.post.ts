// @api-auth: admin
import { verifySync } from 'otplib'
import { getDB } from '~~/server/utils/db'
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'
import { logAuditEvent } from '~~/server/utils/logger'
import { z } from 'zod'

defineRouteMeta({
  openAPI: {
    tags: ['管理·安全-2FA'],
    summary: '管理员：验证并启用 2FA',
    description: '验证 TOTP 验证码，通过后启用 2FA。验证码错误达 5 次则拒绝。',
    security: [{ BearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['code'],
            properties: {
              code: { type: 'string', description: '6 位 TOTP 验证码' },
            },
          },
        },
      },
    },
    responses: {
      200: { description: '2FA 已启用' },
    },
  } as any,
})

const verifySchema = z.object({
  code: z.string().min(6).max(6).regex(/^\d{6}$/, '验证码必须是 6 位数字'),
})

export default defineEventHandler(async (event) => {
  const user = assertAdmin(event)
  const body = await readValidatedBody(event, verifySchema.parse)
  const db = getDB(event)

  // 获取当前密钥
  const { data: record, error: fetchError } = await db
    .from('admin_2fa')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (fetchError || !record) {
    throw createError({ statusCode: 400, statusMessage: '2FA not initialized. Call setup first.' })
  }

  if (record.is_enabled) {
    throw createError({ statusCode: 400, statusMessage: '2FA is already enabled.' })
  }

  // 验证 TOTP
  const { valid } = verifySync({ token: body.code, secret: record.secret })

  if (!valid) {
    await logAuditEvent(event, user, '2fa_verify_failed', 'WARNING')
    throw createError({ statusCode: 400, statusMessage: 'Invalid verification code. Please try again.' })
  }

  // 启用 2FA
  const { error: updateError } = await db
    .from('admin_2fa')
    .update({
      is_enabled: true,
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)

  if (updateError) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to enable 2FA' })
  }

  await logAuditEvent(event, user, '2fa_enabled', 'SUCCESS')

  return sendSuccess(event, { enabled: true }, '2FA has been enabled successfully')
})
