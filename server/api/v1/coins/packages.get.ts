// @api-auth: public
import { defineEventHandler } from 'h3'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: { tags: ['金币'], summary: '获取金币套餐列表' } as any,
})

export default defineEventHandler(async (event) => {
  const db = getDB(event)
  const { data, error } = await db.from('coin_packages').select('*').eq('is_active', true).order('sort_order', { ascending: true })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return sendSuccess(event, { items: data || [] }, 'Fetched coin packages')
})
