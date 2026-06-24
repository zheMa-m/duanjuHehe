import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendSuccess, throwError } from '../../../server/utils/response'

describe('sendSuccess', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('应返回标准的成功响应格式', () => {
    const event = { context: {} } as any
    const result = sendSuccess(event, { id: 1, name: '测试' }, '创建成功', 201)

    expect(result).toHaveProperty('success', true)
    expect(result).toHaveProperty('message', '创建成功')
    expect(result).toHaveProperty('timestamp')
    expect(result).toHaveProperty('data')
    expect(result.data).toEqual({ id: 1, name: '测试' })
    expect((globalThis as any).setResponseStatus).toHaveBeenCalled()
  })

  it('应使用默认状态码 200 和默认消息', () => {
    const result = sendSuccess({ context: {} } as any, null)

    expect(result.success).toBe(true)
    expect(result.message).toBe('Operation completed successfully')
  })

  it('应支持空数据响应', () => {
    const result = sendSuccess({ context: {} } as any, [])

    expect(result.success).toBe(true)
    expect(Array.isArray(result.data)).toBe(true)
    expect(result.data).toHaveLength(0)
  })
})

describe('throwError', () => {
  it('应抛出带有正确状态码和消息的错误', () => {
    try {
      throwError(400, '参数错误')
      expect(true).toBe(false)
    } catch (err: any) {
      expect(err.statusCode).toBe(400)
      expect(err.statusMessage).toBe('参数错误')
    }
  })

  it('应支持附带详细信息', () => {
    const details = { field: 'email', reason: '格式不正确' }
    try {
      throwError(422, '验证失败', details)
    } catch (err: any) {
      expect(err.data).toEqual(details)
    }
  })

  it('应正确处理 401 未授权错误', () => {
    try {
      throwError(401, 'Unauthorized: Session missing or expired')
    } catch (err: any) {
      expect(err.statusCode).toBe(401)
      expect(err.statusMessage).toContain('Unauthorized')
    }
  })

  it('应正确处理 403 禁止访问错误', () => {
    try {
      throwError(403, 'Admin Access Forbidden')
    } catch (err: any) {
      expect(err.statusCode).toBe(403)
    }
  })

  it('应正确处理 500 服务器内部错误', () => {
    try {
      throwError(500, 'Internal Server Error')
    } catch (err: any) {
      expect(err.statusCode).toBe(500)
    }
  })

  it('应抛出可捕获的 createError 异常', () => {
    expect(() => throwError(404, 'Not Found')).toThrow('Not Found')
  })
})
