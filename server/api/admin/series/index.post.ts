// @api-auth: admin
import { defineEventHandler, readValidatedBody } from 'h3'
import { z } from 'zod'
import { assertAdmin } from '~~/server/utils/auth'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['管理-剧集'],
    summary: '创建剧集',
    requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
  } as any,
})

const seriesSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  cover_image: z.string().optional(),
  poster_image: z.string().optional(),
  genre_id: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['draft', 'published', 'completed', 'archived']).default('draft'),
  total_episodes: z.number().int().default(0),
  free_episodes: z.number().int().default(5),
  is_featured: z.boolean().default(false),
  sort_order: z.number().int().default(0),
})

export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)
  const body = await readValidatedBody(event, seriesSchema.parse)

  const { data, error } = await db.from('series').insert({ ...body, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }).select().single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message || 'Failed to create series' })

  return sendSuccess(event, data, 'Series created', 201)
})
