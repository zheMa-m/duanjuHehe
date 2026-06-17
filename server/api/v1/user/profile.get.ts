
// @api-auth: user
import { getDB } from '~~/server/utils/db'
import { assertUser } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['User'],
    summary: '获取用户档案（租户隔离）',
    description: '返回已认证用户的档案信息，使用会话中的 tenant_id 进行租户隔离，防止水平越权。',
    security: [{ BearerAuth: [] }],
    responses: {
      200: { description: '{ userId, username, role, plan }' },
    },
  } as any,
})

export default defineEventHandler(async (event) => {
  // 1. 强制鉴权越权防护校验
  const user = assertUser(event)
  
  // 获取 DB 实例 (自动感知 MOCK_DB 状态)
  const db = getDB(event)
  
  // 2. 使用会话提取的真实租户 ID 查询用户 Profile，防御水平越权漏洞
  const { data: profile, error } = await db
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error.message || 'Database Error'
    })
  }

  // 统一的成功响应格式发送器
  return sendSuccess(event, {
    userId: profile.id,
    username: profile.username,
    role: profile.role,
    plan: profile.plan_status
  }, 'Fetched user profile successfully')
})
