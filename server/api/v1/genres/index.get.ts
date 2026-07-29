// @api-auth: public
import { defineEventHandler } from 'h3'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['分类'],
    summary: '获取所有分类标签',
  } as any,
})

export default defineEventHandler(async (event) => {
  const db = getDB(event)
  const { data, error } = await db.from('genres').select('*').order('sort_order', { ascending: true })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return sendSuccess(event, { items: data || [] }, 'Fetched genres successfully')
})
