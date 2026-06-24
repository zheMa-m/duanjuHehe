/**
 * Nuxt/Nitro 全局函数模拟
 *
 * Nuxt 在运行时通过 Auto-imports 自动注入 h3 函数。
 * 测试环境需要手动注册为 globalThis 属性。
 */

import { vi } from 'vitest'

// setResponseStatus — Nuxt auto-import 的 h3 函数，用于设置 HTTP 响应状态码
;(globalThis as any).setResponseStatus ??= vi.fn()

// createError — Nuxt auto-import 的 h3 函数，用于创建并抛出 HTTP 错误
;(globalThis as any).createError ??= vi.fn((opts: any) => {
  const err: any = new Error(opts.statusMessage)
  err.statusCode = opts.statusCode
  err.statusMessage = opts.statusMessage
  err.data = opts.data ?? null
  throw err
})

// 其他常用 h3 auto-imports
const h3Funcs = [
  'defineEventHandler',
  'getQuery',
  'getRouterParams',
  'readBody',
  'readFormData',
  'getHeader',
  'getHeaders',
  'setHeader',
  'setHeaders',
  'sendRedirect',
  'sendStream',
  'sendNoContent',
  'isMethod',
  'getRouterParam',
  'readMultipartFormData',
  'send',
]

for (const fn of h3Funcs) {
  ;(globalThis as any)[fn] ??= vi.fn()
}

export {}
