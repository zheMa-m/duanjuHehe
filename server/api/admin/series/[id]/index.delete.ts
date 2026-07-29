// @api-auth: admin
import { defineEventHandler, getRouterParam } from 'h3'
import { assertAdmin } from '~~/server/utils/auth'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: { tags: ['管理-剧集'], summary: '删除剧集', parameters: [{ in: 'path', name: 'id', schema: { type: 'string' }, required: true }] } as any,
})

export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)
  const id = getRouterParam(event, 'id') || ''

  await db.from('series').delete().eq('id', id)

  return sendSuccess(event, null, 'Series deleted')
})
