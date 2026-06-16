/**
 * OpenAPI 文档授权中间件
 *
 * 保护 /_openapi.json /_swagger /_scalar 三个端点，
 * 防止 API 文档被未授权用户访问。
 *
 * 鉴权方式（按优先级）：
 *   1. Query 参数: ?token=<OPENAPI_TOKEN>
 *   2. Bearer Header: Authorization: Bearer <OPENAPI_TOKEN>
 *   3. Cookie: openapi_token=<OPENAPI_TOKEN>
 *
 * 配置说明：
 *   - 开发环境（dev）自动放行，无需 token
 *   - 生产环境必须设置 OPENAPI_TOKEN 环境变量，否则 403 拒绝所有访问
 *   - OPENAPI_TOKEN 留空或未设置 → 生产环境下 API 文档不可访问（安全默认值）
 */
import { defineEventHandler, getQuery, parseCookies } from 'h3'

const OPENAPI_PATHS = ['/_openapi.json', '/_swagger', '/_scalar']

export default defineEventHandler((event) => {
  // 仅拦截 OpenAPI 文档路径
  if (!OPENAPI_PATHS.some(p => event.path === p || event.path.startsWith(p + '?'))) return

  // 开发环境自动放行
  if (process.env.NODE_ENV === 'development' || process.env.MOCK_DB === 'true') return

  const expectedToken = process.env.OPENAPI_TOKEN

  // 生产环境未配置 token → 拒绝访问（安全默认值）
  if (!expectedToken) {
    throw createError({
      statusCode: 403,
      statusMessage: 'OpenAPI documentation is disabled in production. Set OPENAPI_TOKEN to enable.',
    })
  }

  // 1. Query 参数
  const query = getQuery(event)
  if (query.token === expectedToken) return

  // 2. Bearer Header
  const authHeader = event.headers.get('authorization') || ''
  if (authHeader === `Bearer ${expectedToken}`) return

  // 3. Cookie
  const cookies = parseCookies(event)
  if (cookies.openapi_token === expectedToken) return

  // 所有验证失败 → 401
  throw createError({
    statusCode: 401,
    statusMessage: 'Invalid or missing OpenAPI access token. Use ?token=<OPENAPI_TOKEN> to authenticate.',
  })
})
