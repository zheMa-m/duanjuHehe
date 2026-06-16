import { H3Event } from 'h3'
import { getDB } from './db'
import { getClientRealIP } from './ip'

/**
 * 统一审计日志记录器
 */
export async function logAuditEvent(
  event: H3Event,
  user: { id: string; username: string; role?: string } | null,
  action: string,
  status: 'SUCCESS' | 'WARNING' | 'FAILED' | 'INFO' = 'SUCCESS',
  ipAddress?: string
) {
  const ip = ipAddress || getClientRealIP(event)
  const operatorName = user ? user.username : 'anonymous'
  
  // 打印美化的控制台结构化日志
  const color = status === 'SUCCESS' ? '\x1b[32m' : status === 'WARNING' ? '\x1b[33m' : '\x1b[31m'
  console.log(`[AUDIT] ${new Date().toISOString()} | ${color}${status}\x1b[0m | Action: ${action} | Operator: ${operatorName} | IP: ${ip}`)

  try {
    const db = getDB(event)
    // 写入底层数据库 (自动感知 Mock 状态)
    await db.from('activity_logs').insert({
      category: 'admin',
      action,
      user_id: user?.id || null,
      ip,
      metadata: {
        operator: operatorName,
        status,
      },
    })
  } catch (err) {
    // 审计系统自身的异常静默处理，不中断核心主业务交易
    console.error('🚨 Audit Log system failed:', err)
  }
}
