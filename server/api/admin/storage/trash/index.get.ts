
// @api-auth: admin
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'
import { getTrashList } from '~~/server/utils/storage'

defineRouteMeta({
  openAPI: {
    tags: ['管理·营销-媒体库'],
    summary: '管理员：列出回收站文件',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'query', name: 'limit', schema: { type: 'integer', default: 50 } },
      { in: 'query', name: 'offset', schema: { type: 'integer', default: 0 } },
    ],
    responses: {
      200: { description: '回收站列表' },
      403: { description: '非管理员' },
    },
  } as any,
})

/**
 * 管理员：列出回收站
 * GET /api/admin/storage/trash
 */
export default defineEventHandler(async (event) => {
  assertAdmin(event)

  const q = getQuery(event)
  const limit = Math.min(Math.max(parseInt(q.limit as string) || 50, 1), 100)
  const offset = Math.max(parseInt(q.offset as string) || 0, 0)

  const result = await getTrashList({ limit, offset }, event)

  return sendSuccess(event, result, 'Trash list retrieved successfully')
})
