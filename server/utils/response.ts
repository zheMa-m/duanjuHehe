import { H3Event } from 'h3'

export interface StandardResponse<T = any> {
  success: boolean
  message: string
  timestamp: string
  data: T
}

/**
 * 统一成功响应发送器
 */
export function sendSuccess<T = any>(
  event: H3Event, 
  data: T, 
  message = 'Operation completed successfully', 
  statusCode = 200
): StandardResponse<T> {
  setResponseStatus(event, statusCode)
  return {
    success: true,
    message,
    timestamp: new Date().toISOString(),
    data
  }
}

/**
 * 统一错误拦截抛出器 (Nuxt 标准异常)
 */
export function sendError(
  statusCode: number, 
  message: string, 
  details: any = null
) {
  throw createError({
    statusCode,
    statusMessage: message,
    data: details
  })
}
