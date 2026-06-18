// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'
import { logAuditEvent } from '~~/server/utils/logger'
import { uploadFile } from '~~/server/utils/storage'

defineRouteMeta({
  openAPI: {
    tags: ['管理·运营-审计'],
    summary: '管理员/定时器：冷热归档审计日志',
    description: '打包 90 天之前的审计日志并将其归档上传到 Supabase Storage 私有桶，然后物理清理原表数据。',
    security: [{ BearerAuth: [] }],
    responses: {
      200: { description: '归档操作执行完毕，返回清理的日志条数和备份文件名' },
      401: { description: '鉴权失败' },
    },
  } as any,
})

export default defineEventHandler(async (event) => {
  // ── 1. 双重鉴权体系（允许来自 pg_cron 定时器和管理员手动触发） ──
  const cronSecretHeader = getHeader(event, 'x-cron-secret')
  const envCronSecret = process.env.ARCHIVE_CRON_SECRET || 'hehe_archive_cron_secret_placeholder'

  let isCronTrigger = false
  if (cronSecretHeader && cronSecretHeader === envCronSecret) {
    isCronTrigger = true
  } else {
    // 若不是定时器触发，则强行要求管理员 JWT 鉴权
    assertAdmin(event)
  }

  const db = getDB(event)

  // ── 2. 计算 90 天前的时间戳 ──
  const retentionDays = 90
  const thresholdDate = new Date(Date.now() - retentionDays * 86400 * 1000)
  const thresholdIso = thresholdDate.toISOString()

  // ── 3. 查询需要归档的行数据 ──
  const { data: logs, error: queryErr } = await db
    .from('activity_logs')
    .select('*')
    .lt('created_at', thresholdIso)
    .order('created_at', { ascending: true })

  if (queryErr) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch logs for archiving: ${queryErr.message}`,
    })
  }

  const count = logs?.length || 0

  if (count === 0) {
    return sendSuccess(event, { archivedCount: 0 }, '没有需要归档的历史审计日志')
  }

  // ── 4. 打包并序列化为 JSON 写入私有存储 ──
  const jsonContent = JSON.stringify(logs, null, 2)
  const encoder = new TextEncoder()
  const fileData = encoder.encode(jsonContent)

  const timestampStr = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `archive_logs_${timestampStr}.json`
  const storagePath = `audit_logs_backup/${filename}`

  try {
    // 上传文件至私有桶
    await uploadFile('audit-archives', storagePath, fileData, 'application/json', event)
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to upload archive package: ${err.message}`,
    })
  }

  // ── 5. 上传成功后，开启物理清理 ──
  const { error: deleteErr } = await db
    .from('activity_logs')
    .delete()
    .lt('created_at', thresholdIso)

  if (deleteErr) {
    // 物理清理失败时，记录异常，但不直接阻断（备份已妥善在桶中）
    console.error('🚨 Audit log cleanup failed after archiving:', deleteErr.message)
    throw createError({
      statusCode: 500,
      statusMessage: `Archive package uploaded but failed to clear main table: ${deleteErr.message}`,
    })
  }

  // ── 6. 记录本次归档事件的审计日志（免去被归档） ──
  // 对于定时器触发，传入 user = null 会记录为 anonymous 操作者
  const operatorUser = isCronTrigger ? null : (event.context.user || null)
  await logAuditEvent(
    event,
    operatorUser,
    `AUDIT_LOGS_ARCHIVED: Successfully archived ${count} logs into storage [${filename}]`,
    'SUCCESS'
  )

  return sendSuccess(event, {
    archivedCount: count,
    filename,
    storagePath,
  }, `Successfully archived ${count} old audit logs.`)
})
