import { defineEventHandler } from 'h3'
import { recordMetric } from '~~/server/utils/apm'

export default defineEventHandler((event) => {
  // 仅监控 API 服务请求，不拦截静态页面
  if (!event.path.startsWith('/api/')) return

  const start = performance.now()

  // 监听 Node.js 底层 HTTP 响应结束事件
  event.node.res.on('finish', () => {
    const duration = performance.now() - start
    const statusCode = event.node.res.statusCode
    
    // 异步记录 APM 指标，不阻塞响应返回
    recordMetric(
      event.path, 
      event.node.req.method || 'GET', 
      statusCode, 
      duration
    )
  })
})
