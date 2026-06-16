import { defineEventHandler } from 'h3'
import { assertAdmin } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  // 强拦截：管理员专用私有接口必须先经过 assertAdmin 校验
  if (event.path.startsWith('/api/admin/')) {
    await assertAdmin(event)
  }
})
