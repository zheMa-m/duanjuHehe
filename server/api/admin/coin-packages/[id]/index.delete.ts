// @api-auth: admin
import { defineEventHandler, getRouterParam } from 'h3'
import { assertAdmin } from '~~/server/utils/auth'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)
  const id = getRouterParam(event, 'id') || ''
  await db.from('coin_packages').delete().eq('id', id)
  return sendSuccess(event, null, 'Package deleted')
})
