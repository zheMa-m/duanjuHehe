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
    summary: '管理员：关闭 2FA',
    description: '关闭双因素认证。需要提供当前有效的 TOTP 验证码或备用恢复码。',
    security: [{ BearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['code'],
            properties: {
              code: { type: 'string', description: 'TOTP 6 位验证码或 4 位备用恢复码' },
            },
          },
        },
      },
    },
    responses: {
      200: { description: '2FA 已关闭' },
    },
  } as any,
})

const disableSchema = z.object({
  code: z.string().min(4).max(6),
})

export default defineEventHandler(async (event) => {
  const user = assertAdmin(event)
  const body = await readValidatedBody(event, disableSchema.parse)
  const db = getDB(event)

  const { data: record, error: fetchError } = await db
    .from('admin_2fa')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (fetchError || !record) {
    throw createError({ statusCode: 400, statusMessage: '2FA is not configured.' })
  }

  if (!record.is_enabled) {
    throw createError({ statusCode: 400, statusMessage: '2FA is not enabled.' })
  }

  let verified = false

  // 尝试 TOTP 验证
  if (body.code.length === 6 && /^\d{6}$/.test(body.code)) {
    const result = verifySync({ token: body.code, secret: record.secret })
    verified = result.valid
  }

  // 尝试备用恢复码验证
  if (!verified && record.backup_codes?.length) {
    const idx = record.backup_codes.indexOf(body.code)
    if (idx !== -1) {
      verified = true
      // 移除已使用的恢复码
      const updatedCodes = [...record.backup_codes]
      updatedCodes.splice(idx, 1)
      const { error: codeUpdateError } = await db.from('admin_2fa').update({ backup_codes: updatedCodes }).eq('user_id', user.id)
      if (codeUpdateError) {
        throw createError({ statusCode: 500, statusMessage: 'Failed to invalidate recovery code' })
      }
    }
  }

  if (!verified) {
    await logAuditEvent(event, user, '2fa_disable_failed', 'WARNING')
    throw createError({ statusCode: 400, statusMessage: 'Invalid verification code.' })
  }

  // 关闭 2FA
  const { error: updateError } = await db
    .from('admin_2fa')
    .update({
      is_enabled: false,
      secret: '',
      backup_codes: [],
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)

  if (updateError) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to disable 2FA' })
  }

  await logAuditEvent(event, user, '2fa_disabled', 'SUCCESS')

  return sendSuccess(event, { enabled: false }, '2FA has been disabled')
})
