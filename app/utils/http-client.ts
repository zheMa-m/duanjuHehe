/**
 * #shell/http 兼容适配层
 *
 * biz-starpath 通过 `import http from '#shell/http'` 调用 API。
 * nuxt.config.ts 将 alias 映射到此文件，TypeScript 自动从导出推断类型。
 *
 * 功能：
 *   - 支持 GET/POST/PATCH/DELETE 常用方法
 *   - 15 秒超时保护
 *   - 统一错误转换（HTTP 4xx/5xx → throw Error）
 */

const DEFAULT_TIMEOUT = 15000 // 15s

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT'

interface RequestOptions extends Omit<RequestInit, 'method'> {
  timeout?: number
  params?: Record<string, string>
  method?: HttpMethod
}

export interface HttpInstance {
  <T = any>(url: string, opts?: RequestOptions): Promise<T>
  get: <T = any>(url: string, opts?: RequestOptions) => Promise<T>
  post: <T = any>(url: string, body?: any, opts?: Omit<RequestOptions, 'body'>) => Promise<T>
  patch: <T = any>(url: string, body?: any, opts?: Omit<RequestOptions, 'body'>) => Promise<T>
  delete: <T = any>(url: string, opts?: RequestOptions) => Promise<T>
}

class HttpError extends Error {
  statusCode: number
  data: any

  constructor(statusCode: number, message: string, data?: any) {
    super(message)
    this.name = 'HttpError'
    this.statusCode = statusCode
    this.data = data
  }
}

async function request<T = any>(url: string, opts: RequestOptions = {}): Promise<T> {
  const { timeout = DEFAULT_TIMEOUT, params, ...fetchOpts } = opts

  let fullUrl = url
  if (params) {
    const qs = new URLSearchParams(params).toString()
    fullUrl = `${url}${url.includes('?') ? '&' : '?'}${qs}`
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    // $fetch 自动导入的类型会基于 string URL 遍历所有路由映射，导致 TS2589 递归深度超限。
    // 此处用 Function 签名绕过路由级类型推断，返回值类型由外层泛型 T 控制。
    const response = await ($fetch as Function)(fullUrl, {
      ...fetchOpts,
      signal: controller.signal,
      onResponseError({ response }: { response: { status: number; _data: any } }) {
        const msg = (response._data as any)?.statusMessage || (response._data as any)?.message || `HTTP ${response.status}`
        throw new HttpError(response.status, msg, response._data)
      },
    }) as T
    return response
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new HttpError(408, `Request timeout after ${timeout}ms`, null)
    }
    if (err instanceof HttpError) throw err
    throw new HttpError(0, err.message || 'Network error', null)
  } finally {
    clearTimeout(timer)
  }
}

// Convenience helpers — 同时支持 `http(url)` 和 `http.get(url)` 两种调用方式
export const http: HttpInstance = <T = any>(url: string, opts?: RequestOptions): Promise<T> => {
  return request<T>(url, opts)
}

http.get = <T = any>(url: string, opts?: RequestOptions): Promise<T> =>
  request<T>(url, { ...opts, method: 'GET' })

http.post = <T = any>(url: string, body?: any, opts?: Omit<RequestOptions, 'body'>): Promise<T> =>
  request<T>(url, { ...opts, method: 'POST', body } as RequestOptions)

http.patch = <T = any>(url: string, body?: any, opts?: Omit<RequestOptions, 'body'>): Promise<T> =>
  request<T>(url, { ...opts, method: 'PATCH', body } as RequestOptions)

http.delete = <T = any>(url: string, opts?: RequestOptions): Promise<T> =>
  request<T>(url, { ...opts, method: 'DELETE' })

export default http
