
// @api-auth: public
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { getCampaignCache, setCampaignCache } from '~~/server/utils/cache'

defineRouteMeta({
  openAPI: {
    tags: ['营销活动'],
    summary: '按子域名获取营销活动',
    description: '返回指定子域名的营销活动公开配置，无需鉴权。',
    parameters: [
      { in: 'path', name: 'subdomain', required: true, schema: { type: 'string' }, description: '营销活动子域名' },
    ],
    responses: {
      200: {
        description: '营销活动对象',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                data: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    subdomain: { type: 'string' },
                    title: { type: 'string' },
                    subtitle: { type: 'string' },
                    badge: { type: 'string' },
                    color_from: { type: 'string' },
                    color_to: { type: 'string' },
                    cta_text: { type: 'string' },
                    is_active: { type: 'boolean' },
                  },
                },
              },
            },
          },
        },
      },
      404: { description: '营销活动未找到' },
    },
  } as any,
})

export default defineEventHandler(async (event) => {
  const subdomain = getRouterParam(event, 'subdomain')
  if (!subdomain) {
    throw createError({ statusCode: 400, statusMessage: 'Subdomain parameter is required' })
  }

  // 缓存命中直接返回
  const cached = getCampaignCache(subdomain)
  if (cached) return cached.data

  const db = getDB(event)

  const { data: campaign, error } = await db
    .from('campaigns')
    .select('*')
    .eq('subdomain', subdomain)
    .single()

  if (error || !campaign) {
    throw createError({ statusCode: 404, statusMessage: `Campaign not found for subdomain: ${subdomain}` })
  }

  const result = sendSuccess(event, campaign, 'Fetched campaign successfully')
  setCampaignCache(subdomain, result)
  return result
})
