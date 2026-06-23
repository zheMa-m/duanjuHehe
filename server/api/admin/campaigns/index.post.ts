// @api-auth: admin
import { z } from 'zod'
import { getDB } from '~~/server/utils/db'
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'
import { logAuditEvent } from '~~/server/utils/logger'
import { invalidateCampaignCache } from '~~/server/utils/cache'

defineRouteMeta({
  openAPI: {
    tags: ['管理·营销-活动'],
    summary: '管理员：新建营销活动',
    security: [{ BearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['subdomain', 'title', 'subtitle', 'badge'],
            properties: {
              subdomain: { type: 'string', minLength: 1 },
              title: { type: 'string', minLength: 1 },
              subtitle: { type: 'string', minLength: 1 },
              badge: { type: 'string', minLength: 1 },
              color_from: { type: 'string' },
              color_to: { type: 'string' },
              cta_text: { type: 'string' },
              cta_url: { type: 'string', nullable: true },
              cover_image: { type: 'string', nullable: true },
              description: { type: 'string', nullable: true },
              sort_order: { type: 'integer', minimum: 0 },
            },
          },
        },
      },
    },
    responses: {
      200: { description: '新建成功，返回创建的活动' },
      400: { description: '参数校验失败或 subdomain 重复' },
      401: { description: '未授权' },
    },
  } as any,
})

const createCampaignSchema = z.object({
  subdomain: z.string().min(1).max(50).regex(/^[a-z0-9][a-z0-9-]*$/, '仅允许小写字母、数字和短横线，且以字母或数字开头'),
  title: z.string().min(1).max(200),
  subtitle: z.string().min(1).max(500),
  badge: z.string().min(1).max(100),
  color_from: z.string().max(50).optional().default('#9333ea'),
  color_to: z.string().max(50).optional().default('#4f46e5'),
  cta_text: z.string().max(50).optional().default('立即预约'),
  cta_url: z.string().nullable().optional(),
  cover_image: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  sort_order: z.number().int().min(0).optional().default(0),
  ga_measurement_id: z.string().nullable().optional(),
  meta_pixel_id: z.string().nullable().optional(),
  tiktok_pixel_id: z.string().nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const admin = assertAdmin(event)
  const db = getDB(event)
  const body = await readValidatedBody(event, createCampaignSchema.parse)

  // 检查 subdomain 唯一性
  const { data: existing } = await db
    .from('campaigns')
    .select('id')
    .eq('subdomain', body.subdomain)
    .single()

  if (existing) {
    throw createError({ statusCode: 409, statusMessage: `Subdomain "${body.subdomain}" already exists` })
  }

  const now = new Date().toISOString()
  const newCampaign = {
    subdomain: body.subdomain,
    title: body.title,
    subtitle: body.subtitle,
    badge: body.badge,
    color_from: body.color_from,
    color_to: body.color_to,
    is_active: false, // 新建默认下线，需手动上线
    cta_text: body.cta_text,
    cta_url: body.cta_url || null,
    cover_image: body.cover_image || null,
    description: body.description || null,
    features: [],
    sort_order: body.sort_order,
    ga_measurement_id: body.ga_measurement_id || null,
    meta_pixel_id: body.meta_pixel_id || null,
    tiktok_pixel_id: body.tiktok_pixel_id || null,
    created_at: now,
    updated_at: now,
  }

  const { data: inserted, error } = await db
    .from('campaigns')
    .insert(newCampaign)
    .select('*')

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message || 'Failed to create campaign' })
  }

  await logAuditEvent(event, admin, `CAMPAIGN_CREATED: ${body.subdomain}`, 'SUCCESS')
  invalidateCampaignCache(body.subdomain)

  return sendSuccess(event, Array.isArray(inserted) ? inserted[0] : inserted, 'Campaign created successfully')
})
