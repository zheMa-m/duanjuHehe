// @api-auth: admin
import { defineEventHandler, getRouterParam, readValidatedBody } from 'h3'
import { z } from 'zod'
import { assertAdmin } from '~~/server/utils/auth'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

const updateSchema = z.object({ name: z.string().min(1).optional(), slug: z.string().min(1).optional(), icon: z.string().optional(), sort_order: z.number().int().optional() })

export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)
  const id = getRouterParam(event, 'id') || ''
  const body = await readValidatedBody(event, updateSchema.parse)
  const { data, error } = await db.from('genres').update(body).eq('id', id).select().single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return sendSuccess(event, data, 'Genre updated')
})
