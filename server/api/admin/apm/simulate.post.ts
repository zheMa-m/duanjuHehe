
// @api-auth: admin
import { defineEventHandler, readBody } from 'h3'
import { assertAdmin } from '~~/server/utils/auth'
import { triggerAlert } from '~~/server/utils/apm'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['管理·系统-监控'],
    summary: '管理员：模拟 APM 警报',
    description: '触发测试警报以验证警报管线（Warning 800ms / Critical 2000ms）。',
    security: [{ BearerAuth: [] }],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              level: { type: 'string', enum: ['warning', 'critical'], default: 'warning' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    responses: {
      200: { description: '模拟警报已记录' },
    },
  } as any,
})

export default defineEventHandler(async (event) => {
  assertAdmin(event)

  const body = await readBody(event)
  const level = body?.level || 'warning'
  const message = body?.message || 'User triggered simulation alert from admin panel'

  triggerAlert('SIMULATION', message, level)

  return sendSuccess(event, null, 'Simulation alert recorded successfully')
})
