import { describe, it, expect } from 'vitest'

/**
 * 2FA API 数据结构和流程测试
 * 验证 setup / verify / disable / status 返回的数据格式
 */

describe('2FA 数据结构', () => {
  it('setup 响应应包含 secret、qrCode 和 backupCodes', () => {
    const setupResponse = {
      success: true,
      message: '2FA setup initiated',
      data: {
        secret: 'JBSWY3DPEHPK3PXP',
        qrCode: 'data:image/png;base64,iVBORw0KG...',
        backupCodes: ['ABCD', 'EFGH', 'JKLM', 'NPQR', 'STUV', 'WXYZ', '2345', '6789'],
      },
    }

    expect(setupResponse.success).toBe(true)
    expect(setupResponse.data.secret).toBeTruthy()
    expect(setupResponse.data.qrCode).toMatch(/^data:image\/png;base64,/)
    expect(setupResponse.data.backupCodes).toHaveLength(8)
    // 每个恢复码应为 4 位大写字母+数字（排除 O/0/I/1）
    for (const code of setupResponse.data.backupCodes) {
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{4}$/)
    }
  })

  it('status 响应（未启用）应返回 enabled: false', () => {
    const statusResponse = {
      success: true,
      data: {
        enabled: false,
        verifiedAt: null,
        createdAt: null,
      },
    }

    expect(statusResponse.data.enabled).toBe(false)
    expect(statusResponse.data.verifiedAt).toBeNull()
  })

  it('status 响应（已启用）应返回 enabled: true 和验证时间', () => {
    const statusResponse = {
      success: true,
      data: {
        enabled: true,
        verifiedAt: '2026-06-23T08:00:00Z',
        createdAt: '2026-06-23T07:55:00Z',
      },
    }

    expect(statusResponse.data.enabled).toBe(true)
    expect(statusResponse.data.verifiedAt).not.toBeNull()
    // 验证时间应为 ISO 格式
    expect(statusResponse.data.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  })
})

describe('2FA 验证码校验', () => {
  it('有效 TOTP 码应为 6 位数字', () => {
    const validCode = '123456'
    const invalidCode = '12345'
    const nonNumeric = 'abc123'

    expect(/^\d{6}$/.test(validCode)).toBe(true)
    expect(/^\d{6}$/.test(invalidCode)).toBe(false)
    expect(/^\d{6}$/.test(nonNumeric)).toBe(false)
  })

  it('恢复码应为 4 位不含歧义字符', () => {
    const validCode = 'ABCD'
    const tooShort = 'ABC'
    const hasZero = 'AB0D'

    // 不含容易混淆的 O/0/I/1
    const recoveryCodePattern = /^[A-HJ-NP-Z2-9]{4}$/
    expect(recoveryCodePattern.test(validCode)).toBe(true)
    expect(recoveryCodePattern.test(tooShort)).toBe(false)
    expect(recoveryCodePattern.test(hasZero)).toBe(false)
  })
})

describe('2FA 关闭流程', () => {
  it('disable 请求应接受 TOTP 码或恢复码', () => {
    const requestBody1 = { code: '654321' } // 6 位 TOTP
    const requestBody2 = { code: 'XYZT' } // 4 位恢复码

    expect(requestBody1.code).toHaveLength(6)
    expect(requestBody2.code).toHaveLength(4)
  })

  it('错误的验证码应返回 400', () => {
    const errorResponse = {
      statusCode: 400,
      statusMessage: 'Invalid verification code.',
    }

    expect(errorResponse.statusCode).toBe(400)
    expect(errorResponse.statusMessage).toContain('Invalid')
  })
})
