// @api-auth: public
import { z } from 'zod'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { starpathService } from '~~/server/services/starpath-service'
import { throwError } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['智能问卷'],
    summary: '获取 AI 占星报告',
    description: '根据 ID 从 ai_reports 表获取用户报告。不存在时返回 404。',
    parameters: [
      { in: 'query', name: 'id', schema: { type: 'string' }, description: '报告 ID', required: true },
    ],
    responses: {
      200: { description: '报告数据（含 signs, aspects, reading）' },
      404: { description: '报告不存在' },
    },
  } as any,
})

/**
 * 获取 智能问卷 AI 报告
 * GET /api/starpath/report?id=xxx
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const reportId = (query.id as string) || ''

  if (!reportId) throwError(400, 'Report ID is required')

  const report = await starpathService.getReport(event, reportId)

  const content = report.content as Record<string, any>

  return sendSuccess(event, {
    reportId: report.id,
    status: report.status,
    user: {
      name: content.full_name || '',
      bornAt: content.birth_date ? `${content.birth_date} ${content.birth_time || ''}` : '',
      bornCity: content.birth_city || '',
    },
    signs: {
      sun: content.sun_sign || '',
      moon: content.moon_sign || '',
      rising: content.ascendant || '',
    },
    summary: content.core_reading?.summary || '',
    sections: content.core_reading?.sections || [],
    aspects: content.aspects || [],
    professional: content.core_reading?.professional || {},
    generatedAt: report.generated_at,
  }, 'Report retrieved')
})
