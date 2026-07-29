// @api-auth: admin
import { defineEventHandler, readValidatedBody } from 'h3'
import { z } from 'zod'
import { assertAdmin } from '~~/server/utils/auth'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

const genreSchema = z.object({ name: z.string().min(1), slug: z.string().min(1), icon: z.string().optional(), sort_order: z.number().int().default(0) })

export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)
  const body = await readValidatedBody(event, genreSchema.parse)
  const { data, error } = await db.from('genres').insert({ ...body, created_at: new Date().toISOString() }).select().single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return sendSuccess(event, data, 'Genre created', 201)
})
