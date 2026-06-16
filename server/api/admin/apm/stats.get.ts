import { defineEventHandler } from 'h3'
import { assertAdmin } from '~~/server/utils/auth'
import { getApmStats } from '~~/server/utils/apm'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['Admin APM'],
    summary: '管理员：获取 APM 统计数据',
    description: '返回内存中的 APM 指标（请求数、延迟百分位、警报）。',
    security: [{ BearerAuth: [] }],
    responses: {
      200: { description: 'APM 统计对象' },
    },
  } as any,
})

export default defineEventHandler(async (event) => {
  assertAdmin(event)

  return sendSuccess(event, getApmStats(), 'Fetched APM stats successfully')
})
