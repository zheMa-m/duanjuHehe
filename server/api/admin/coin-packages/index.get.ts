// @api-auth: admin
import { defineEventHandler } from 'h3'
import { assertAdmin } from '~~/server/utils/auth'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)
  const { data, error } = await db.from('coin_packages').select('*').order('sort_order', { ascending: true })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return sendSuccess(event, { items: data || [] })
})
