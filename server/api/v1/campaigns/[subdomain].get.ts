
// @api-auth: public
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['Campaigns'],
    summary: '按子域名获取营销活动',
    description: '返回指定子域名的营销活动公开配置，无需鉴权。',
    parameters: [
      { in: 'path', name: 'subdomain', required: true, schema: { type: 'string' }, description: '营销活动子域名' },
    ],
    responses: {
      200: { description: '营销活动对象' },
      404: { description: '营销活动未找到' },
    },
  } as any,
})

export default defineEventHandler(async (event) => {
  const subdomain = getRouterParam(event, 'subdomain')
  if (!subdomain) {
    throw createError({ statusCode: 400, statusMessage: 'Subdomain parameter is required' })
  }

  const db = getDB(event)

  const { data: campaign, error } = await db
    .from('campaigns')
    .select('*')
    .eq('subdomain', subdomain)
    .single()

  if (error || !campaign) {
    throw createError({ statusCode: 404, statusMessage: `Campaign not found for subdomain: ${subdomain}` })
  }

  return sendSuccess(event, campaign, 'Fetched campaign successfully')
})
