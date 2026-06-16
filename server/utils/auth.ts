import { H3Event } from 'h3'

// assertUser: 验证用户已登录，并返回用户信息
export function assertUser(event: H3Event) {
  const user = event.context.user
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: Session missing or expired'
    })
  }
  return user
}

// assertAdmin: 确保是管理员身份，否则抛出 403
// 
// ✅ 性能优化：不再重复查询 profiles 表。
//    02.auth.ts 中间件在每次请求时已完整解析 JWT 并将 role 写入
//    event.context.user，此处直接读取即可，无需二次 DB round-trip。
export function assertAdmin(event: H3Event) {
  const user = assertUser(event)

  if (user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Admin Access Forbidden'
    })
  }
  return user
}


