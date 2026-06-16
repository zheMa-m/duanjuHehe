import { H3Event } from 'h3'
import { getDB } from './db'
import { sendError } from './response'

/**
 * 校验项目资源配额限制
 */
export async function checkTenantLimit(
  event: H3Event,
  user: { id: string; username: string; role?: string },
  featureCode: 'tasks' | 'campaigns'
) {
  const db = getDB(event)

  // 1. 获取用户的项目计划状态 (从 profiles 表获取，只拉取所需字段)
  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select('plan_status')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return sendError(400, 'Failed to resolve user project profile')
  }

  const planStatus = profile.plan_status || 'free'

  // 2. 执行配额限制判定
  if (featureCode === 'tasks') {
    // 免费计划限额为 3，Pro 计划为 100
    const limit = planStatus === 'pro' ? 100 : 3

    // 性能优化：使用 count 聚合 + head:true，服务器只返回行数，不传输任何数据行
    const { count, error: countError } = await db
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', user.id)

    const currentCount = countError ? 0 : (count ?? 0)

    if (currentCount >= limit) {
      return sendError(
        403,
        `Resource limit reached: Current plan [${planStatus.toUpperCase()}] allows up to ${limit} tasks. Upgrade to increase quota.`
      )
    }
  }
}
