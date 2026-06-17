
// @api-auth: public
import { sendSuccess } from '~~/server/utils/response'
import { getActiveAdSlots } from '~~/server/utils/ads'

defineRouteMeta({
  openAPI: {
    tags: ['Ads'],
    summary: '获取活跃广告位',
    description: '返回已启用的广告位配置，公开接口无需鉴权。',
    parameters: [
      { in: 'query', name: 'position', schema: { type: 'string' }, description: '按位置过滤（header_banner/footer_banner/native_inline/interstitial）' },
      { in: 'query', name: 'subdomain', schema: { type: 'string' }, description: '按营销活动子域名过滤' },
    ],
    responses: {
      200: { description: '活跃广告位对象数组' },
    },
  } as any,
})

/**
 * 获取活跃广告位（公开接口，无需鉴权）
 * GET /api/v1/ads?position=xxx&subdomain=yyy
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const position = query.position as string | undefined
  const subdomain = query.subdomain as string | undefined

  const slots = await getActiveAdSlots(event, position, subdomain)

  return sendSuccess(event, slots, 'Ad slots retrieved')
})
