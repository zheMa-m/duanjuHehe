/**
 * 请求级权限守卫中间件
 *
 * 在 02.auth.ts 解析完身份后执行，
 * 确保需要登录态的接口不被匿名或未登录用户访问。
 */
import { defineEventHandler } from 'h3'

// 需要已登录（非匿名）的路由前缀
const AUTH_REQUIRED_PREFIXES = [
  '/api/v1/payments/',
  '/api/v1/orders/',
  '/api/v1/auth/profile',
  '/api/v1/auth/me',
  '/api/v1/auth/link',
  '/api/v1/auth/logout',
]

// 公开接口（匿名或未登录均可访问）
const PUBLIC_PREFIXES = [
  '/api/v1/ads/',
  '/api/v1/campaigns/',
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/callback',
  '/api/v1/user/',
  '/api/v1/feedback/',   // GET 公开读取评价，POST 内部校验登录态
]

export default defineEventHandler((event) => {
  if (!event.path.startsWith('/api/')) return

  // 检查是否为公开接口
  const isPublic = PUBLIC_PREFIXES.some(prefix => event.path.startsWith(prefix))
  if (isPublic) return

  // 检查是否需要登录
  const needsAuth = AUTH_REQUIRED_PREFIXES.some(prefix => event.path.startsWith(prefix))
  if (!needsAuth) return

  const user = event.context.user

  // 未登录
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required. Please login to continue.'
    })
  }

  // 匿名用户不允许访问支付/订单等敏感操作
  if (user.role === 'anonymous' || user.isAnonymous) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Login required for payment. Anonymous users cannot perform this action.'
    })
  }
})
