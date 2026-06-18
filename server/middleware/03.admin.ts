import { defineEventHandler, getHeader } from 'h3'
import { assertAdmin } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  // 强拦截：管理员专用私有接口必须先经过 assertAdmin 校验
  // 例外：
  //   1. login 端点用于管理员登录，无需预先认证
  //   2. 携带正确 x-cron-secret 校验头的请求，允许绕过 JWT 认证（供定时归档任务调用）
  if (event.path === '/api/admin/login') return
  if (event.path.startsWith('/api/admin/')) {
    const cronSecretHeader = getHeader(event, 'x-cron-secret')
    const envCronSecret = process.env.ARCHIVE_CRON_SECRET || 'hehe_archive_cron_secret_placeholder'
    if (cronSecretHeader && cronSecretHeader === envCronSecret) {
      return
    }
    await assertAdmin(event)
  }
})
