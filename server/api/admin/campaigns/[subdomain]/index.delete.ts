// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'
import { logAuditEvent } from '~~/server/utils/logger'
import { invalidateCampaignCache } from '~~/server/utils/cache'

defineRouteMeta({
  openAPI: {
    tags: ['管理·营销-活动'],
    summary: '管理员：删除营销活动',
    description: '删除指定 subdomain 的营销活动及其关联留资记录（级联）。',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'path', name: 'subdomain', required: true, schema: { type: 'string' } },
    ],
    responses: {
      200: { description: '删除成功' },
      404: { description: '活动不存在' },
      401: { description: '未授权' },
    },
  } as any,
})

export default defineEventHandler(async (event) => {
  const admin = assertAdmin(event)
  const db = getDB(event)
  const subdomain = getRouterParam(event, 'subdomain')

  if (!subdomain) {
    throw createError({ statusCode: 400, statusMessage: 'Subdomain is required' })
  }

  // 验证活动存在
  const { data: campaign, error: fetchError } = await db
    .from('campaigns')
    .select('*')
    .eq('subdomain', subdomain)
    .single()

  if (fetchError || !campaign) {
    throw createError({ statusCode: 404, statusMessage: `Campaign "${subdomain}" not found` })
  }

  // 删除关联留资（先删子表再删主表）
  try {
    await db.from('campaign_registrations').delete().eq('subdomain', subdomain)
  } catch {
    // campaign_registrations 表不存在时静默跳过
  }

  // 删除活动
  const { error: deleteError } = await db
    .from('campaigns')
    .delete()
    .eq('subdomain', subdomain)

  if (deleteError) {
    await logAuditEvent(event, admin, `CAMPAIGN_DELETE_FAILED: ${subdomain}`, 'FAILED')
    throw createError({ statusCode: 500, statusMessage: deleteError.message || 'Failed to delete campaign' })
  }

  await logAuditEvent(event, admin, `CAMPAIGN_DELETED: ${subdomain}`, 'SUCCESS')
  invalidateCampaignCache(subdomain)

  return sendSuccess(event, { subdomain }, 'Campaign deleted successfully')
})
