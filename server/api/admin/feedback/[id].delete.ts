// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { assertAdmin } from '~~/server/utils/auth'

defineRouteMeta({
  openAPI: {
    tags: ['管理端反馈'],
    summary: '删除指定反馈',
    description: '管理员删除指定反馈记录。',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: '反馈 ID' },
    ],
    responses: { 200: { description: '删除成功' } },
  } as any,
})

/**
 * 管理员删除反馈
 * DELETE /api/admin/feedback/:id
 */
export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing feedback id' })

  const { error } = await db
    .from('feedbacks')
    .delete()
    .eq('id', id)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message || 'Failed to delete feedback' })
  }

  return sendSuccess(event, { deleted: true })
})
