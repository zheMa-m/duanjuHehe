// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'
import { assertAdmin } from '~~/server/utils/auth'

defineRouteMeta({
  openAPI: {
    tags: ['管理端反馈'],
    summary: '审核/更新反馈状态',
    description: '管理员审核（批准/拒绝）指定反馈。',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: '反馈 ID' },
    ],
    requestBody: {
      content: { 'application/json': { schema: { type: 'object', properties: { is_approved: { type: 'boolean' }, admin_reply: { type: 'string' } } } } },
    },
    responses: { 200: { description: '更新成功' } },
  } as any,
})

/**
 * 管理员审核/更新反馈
 * PATCH /api/admin/feedback/:id
 */
export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing feedback id' })

  const body = await readBody(event)
  const updateData: Record<string, any> = {}
  if (typeof body.is_approved === 'boolean') updateData.is_approved = body.is_approved
  if (typeof body.admin_reply === 'string') updateData.admin_reply = body.admin_reply

  if (!Object.keys(updateData).length) {
    throw createError({ statusCode: 400, statusMessage: 'No valid fields to update' })
  }

  const { data, error } = await db
    .from('feedbacks')
    .update(updateData)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message || 'Failed to update feedback' })
  }

  return sendSuccess(event, data)
})
