// @api-auth: admin
import { defineEventHandler, getRouterParam, readValidatedBody } from 'h3'
import { z } from 'zod'
import { assertAdmin } from '~~/server/utils/auth'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

const updateSchema = z.object({
  name: z.string().min(1).optional(), coins_amount: z.number().int().min(1).optional(), bonus_coins: z.number().int().optional(),
  price: z.number().min(0).optional(), is_active: z.boolean().optional(), sort_order: z.number().int().optional(),
})

export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)
  const id = getRouterParam(event, 'id') || ''
  const body = await readValidatedBody(event, updateSchema.parse)
  const { data, error } = await db.from('coin_packages').update({ ...body, updated_at: new Date().toISOString() }).eq('id', id).select().single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return sendSuccess(event, data, 'Package updated')
})
