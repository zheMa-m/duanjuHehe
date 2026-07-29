// @api-auth: admin
import { defineEventHandler, getRouterParam, readValidatedBody } from 'h3'
import { z } from 'zod'
import { assertAdmin } from '~~/server/utils/auth'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: { tags: ['管理-剧集'], summary: '更新剧集', parameters: [{ in: 'path', name: 'id', schema: { type: 'string' }, required: true }] } as any,
})

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  cover_image: z.string().optional(),
  poster_image: z.string().optional(),
  genre_id: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['draft', 'published', 'completed', 'archived']).optional(),
  total_episodes: z.number().int().optional(),
  free_episodes: z.number().int().optional(),
  is_featured: z.boolean().optional(),
  sort_order: z.number().int().optional(),
})

export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)
  const id = getRouterParam(event, 'id') || ''
  const body = await readValidatedBody(event, updateSchema.parse)

  const updateData: Record<string, any> = { ...body, updated_at: new Date().toISOString() }
  const { data, error } = await db.from('series').update(updateData).eq('id', id).select().single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message || 'Failed to update series' })

  return sendSuccess(event, data, 'Series updated')
})
