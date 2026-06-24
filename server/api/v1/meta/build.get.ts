// @api-auth: public
import { setHeader } from 'h3'
import { resolveBuildId } from '~/utils/build-id'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['元信息'],
    summary: '获取当前部署构建 ID',
    description: '用于客户端检测新版本并触发刷新。响应禁止缓存。',
    responses: {
      200: { description: 'buildId' },
    },
  } as any,
})

/**
 * GET /api/v1/meta/build
 * 公开接口：返回当前部署的唯一 buildId（每次 Vercel 发布变化）
 */
export default defineEventHandler((event) => {
  setHeader(event, 'Cache-Control', 'no-store, no-cache, must-revalidate')
  setHeader(event, 'Pragma', 'no-cache')

  return sendSuccess(event, { buildId: resolveBuildId() })
})
