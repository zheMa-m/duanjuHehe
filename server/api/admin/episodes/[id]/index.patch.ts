// @api-auth: admin
import { defineEventHandler, getRouterParam, readValidatedBody } from 'h3'
import { z } from 'zod'
import { assertAdmin } from '~~/server/utils/auth'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

const updateSchema = z.object({
  episode_number: z.number().int().min(1).optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  video_url: z.string().optional(),
  thumbnail_url: z.string().optional(),
  duration_seconds: z.number().int().optional(),
  is_free: z.boolean().optional(),
  coin_cost: z.number().int().optional(),
  sort_order: z.number().int().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
})

export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)
  const id = getRouterParam(event, 'id') || ''
  const body = await readValidatedBody(event, updateSchema.parse)

  const { data, error } = await db.from('episodes').update({ ...body, updated_at: new Date().toISOString() }).eq('id', id).select().single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message || 'Failed to update episode' })

  return sendSuccess(event, data, 'Episode updated')
})
