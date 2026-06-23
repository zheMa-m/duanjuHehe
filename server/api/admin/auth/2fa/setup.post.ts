// @api-auth: admin
import { generateSecret, generateURI } from 'otplib'
import QRCode from 'qrcode'
import { getDB } from '~~/server/utils/db'
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'
import { logAuditEvent } from '~~/server/utils/logger'

defineRouteMeta({
  openAPI: {
    tags: ['管理·安全-2FA'],
    summary: '管理员：设置 2FA（生成密钥与 QR Code）',
    description: '生成 TOTP 密钥、QR Code（data URI）和备用恢复码。第一次调用会覆盖之前未验证的密钥。',
    security: [{ BearerAuth: [] }],
    responses: {
      200: { description: '包含 secret、qrCode (data URI) 和 backupCodes' },
    },
  } as any,
})

export default defineEventHandler(async (event) => {
  const user = assertAdmin(event)
  const db = getDB(event)

  const appName = process.env.APP_NAME || 'HeHe Admin'
  const accountName = user.username || user.email || user.id

  // 生成密钥
  const secret = generateSecret()

  // 生成 otpauth URI
  const otpauth = generateURI({
    issuer: appName,
    label: accountName,
    secret,
  })

  // 生成 QR Code (data URI)
  const qrCode = await QRCode.toDataURL(otpauth, {
    width: 300,
    margin: 2,
    color: { dark: '#ffffff', light: '#00000000' },
  })

  // 生成 8 个备用恢复码
  const backupCodes: string[] = []
  for (let i = 0; i < 8; i++) {
    const code = Array.from({ length: 4 }, () =>
      'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]
    ).join('')
    backupCodes.push(code)
  }

  // 写入 DB（upsert）
  const { error } = await db.from('admin_2fa').upsert({
    user_id: user.id,
    secret,
    is_enabled: false,
    backup_codes: backupCodes,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id', ignoreDuplicates: false })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to setup 2FA' })
  }

  await logAuditEvent(event, user, '2fa_setup_initiated', 'INFO')

  return sendSuccess(event, {
    secret,
    qrCode,
    backupCodes,
  }, '2FA setup initiated. Verify with a code to enable.')
})
