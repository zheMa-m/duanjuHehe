// @api-auth: admin
import { getDB } from '~~/server/utils/db'
import { assertAdmin } from '~~/server/utils/auth'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['管理·运营-任务'],
    summary: '管理员：获取系统定时任务列表',
    description: '获取后台挂载的所有 System Cron Jobs，结合审计日志动态算出其上次运行时间，仅管理员可访问。',
    security: [{ BearerAuth: [] }],
    responses: {
      200: { description: '定时任务状态列表' },
      401: { description: '未授权' },
    },
  } as any,
})

const SYSTEM_JOBS = [
  {
    id: 'cron_archive_audit_logs',
    name: '审计日志冷热归档任务',
    cronExpression: '0 2 * * *',
    description: '每天凌晨 2:00 (UTC) 自动执行。将 90 天之前的系统操作审计日志归档打包上传至 storage 桶 [audit-archives]，并安全清除原表数据。',
    targetUrl: '/api/admin/audit-logs/archive',
    status: 'enabled',
  },
  {
    id: 'cron_trash_cleanup',
    name: '回收站过期文件自动清理',
    cronExpression: '0 3 * * *',
    description: '每天凌晨 3:00 (UTC) 自动执行。物理删除所有 expires_at 已到期的回收站文件（Supabase Storage + DB 记录），释放存储空间。',
    targetUrl: '/api/admin/storage/trash/cleanup',
    status: 'enabled',
  },
]

export default defineEventHandler(async (event) => {
  assertAdmin(event)
  const db = getDB(event)

  // ── 动态查询各任务的上次运行时间 ──
  const lastRuns: Record<string, string | null> = {}

  // 审计日志归档
  try {
    const { data: logs } = await db
      .from('activity_logs')
      .select('created_at')
      .like('action', 'AUDIT_LOGS_ARCHIVED%')
      .order('created_at', { ascending: false })
      .limit(1)
    lastRuns['cron_archive_audit_logs'] = (logs && logs.length > 0) ? logs[0].created_at : null
  } catch (e) {
    console.error('[Cron API] Failed to fetch archive last run:', e)
  }

  // 回收站清理
  try {
    const { data: cleanupLogs } = await db
      .from('activity_logs')
      .select('created_at')
      .like('action', 'STORAGE_TRASH_CLEANUP%')
      .order('created_at', { ascending: false })
      .limit(1)
    lastRuns['cron_trash_cleanup'] = (cleanupLogs && cleanupLogs.length > 0) ? cleanupLogs[0].created_at : null
  } catch (e) {
    console.error('[Cron API] Failed to fetch trash cleanup last run:', e)
  }

  // 组装定时任务列表数据
  const items = SYSTEM_JOBS.map(job => ({
    ...job,
    lastRunAt: lastRuns[job.id] || null,
  }))

  return sendSuccess(event, items, 'Fetched system cron jobs successfully')
})
