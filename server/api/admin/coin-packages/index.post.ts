// @api-auth: admin
import { defineEventHandler, readValidatedBody } from 'h3'
import { z } from 'zod'
import { assertAdmin } from '~~/server/utils/auth'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

const BUILTIN_ADMIN_UUID = '9e638ba2-41aa-4434-a68b-6bd9f7ed0963'
const pkgSchema = z.object({
  name: z.string().min(1), coins_amount: z.number().int().min(1), bonus_coins: z.number().int().default(0),
  price: z.number().min(0), currency: z.string().default('USD'), is_active: z.boolean().default(true), sort_order: z.number().int().default(0),
})

export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)
  const body = await readValidatedBody(event, pkgSchema.parse)
  const { data, error } = await db.from('coin_packages').insert({ ...body, tenant_id: BUILTIN_ADMIN_UUID, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }).select().single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return sendSuccess(event, data, 'Package created', 201)
})
