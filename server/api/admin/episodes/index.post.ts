// @api-auth: admin
import { defineEventHandler, readValidatedBody } from 'h3'
import { z } from 'zod'
import { assertAdmin } from '~~/server/utils/auth'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

const episodeSchema = z.object({
  series_id: z.string(),
  episode_number: z.number().int().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  video_url: z.string().optional(),
  thumbnail_url: z.string().optional(),
  duration_seconds: z.number().int().default(60),
  is_free: z.boolean().default(true),
  coin_cost: z.number().int().default(0),
  sort_order: z.number().int().default(0),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
})

export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)
  const body = await readValidatedBody(event, episodeSchema.parse)

  const { data, error } = await db.from('episodes').insert({
    ...body, created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  }).select().single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message || 'Failed to create episode' })

  return sendSuccess(event, data, 'Episode created', 201)
})
