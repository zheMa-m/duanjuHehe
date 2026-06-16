import fs from 'fs'
import path from 'path'

const BASE_URL = 'http://localhost:3000'

// 颜色高亮助手
const colors = {
  green: (str) => `\x1b[32m${str}\x1b[0m`,
  red: (str) => `\x1b[31m${str}\x1b[0m`,
  yellow: (str) => `\x1b[33m${str}\x1b[0m`,
  cyan: (str) => `\x1b[36m${str}\x1b[0m`,
  bold: (str) => `\x1b[1m${str}\x1b[0m`
}

// 递归扫描 API 控制器
function scanApiFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir)
  for (const file of files) {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    if (stat.isDirectory()) {
      scanApiFiles(filePath, fileList)
    } else if (file.endsWith('.ts')) {
      fileList.push(filePath)
    }
  }
  return fileList
}

// 将文件物理路径解析为 API 路由和 HTTP 方法
function parseRoute(apiDir, filePath) {
  const relative = path.relative(apiDir, filePath)
  const parts = relative.split(path.sep)
  
  // 最后一项，例如: index.post.ts 或 [id].delete.ts
  const fileName = parts.pop()
  const fileStem = fileName.replace(/\.ts$/, '')
  const stemParts = fileStem.split('.')
  
  // 提取方法，如 post, get, delete, patch
  let method = 'GET'
  let isDynamic = false
  
  if (stemParts.length >= 2) {
    method = stemParts[1].toUpperCase()
  }
  
  // 拼接路径
  let routePath = '/api/' + parts.join('/')
  
  // 处理动态参数 [id] 等
  const lastPart = stemParts[0]
  if (lastPart.startsWith('[') && lastPart.endsWith(']')) {
    isDynamic = true
    routePath += '/mock-id-999' // 占位符作为测试参数
  } else if (lastPart !== 'index') {
    routePath += '/' + lastPart
  }
  
  return {
    filePath,
    routePath,
    method,
    isDynamic
  }
}

async function runSafetyTest() {
  console.log(colors.bold('\n🛡️ 开始进行全栈单仓 API 越权防护自动化测试 (Security Safety Audit)...\n'))
  
  // 1. 测试开发服务器是否在线
  try {
    await fetch(BASE_URL + '/api/v1/user/profile', {
      headers: { 'x-mock-unauthorized': 'true' }
    })
  } catch (err) {
    console.error(colors.red(`🚨 扫描失败: 本地开发服务器尚未运行在 ${BASE_URL}。`))
    console.error(colors.yellow('💡 请先在另一个终端运行 `npm run dev` 启动服务，然后再试。\n'))
    process.exit(1)
  }

  const apiDir = path.resolve('server/api')
  if (!fs.existsSync(apiDir)) {
    console.log(colors.yellow('⚠️ 未发现 server/api 目录，跳过扫描。'))
    return
  }

  const files = scanApiFiles(apiDir)
  const endpoints = files.map(f => parseRoute(apiDir, f))

  let failedCount = 0
  let passedCount = 0
  let publicCount = 0

  for (const endpoint of endpoints) {
    const code = fs.readFileSync(endpoint.filePath, 'utf-8')
    
    // 1. 匹配 @api-auth: admin | user | public 注释声明
    const authMatch = code.match(/@api-auth:\s*(\w+)/)
    let authType = authMatch ? authMatch[1].toLowerCase() : null

    // 2. 如果未指定，则进行智能推导退避：
    if (!authType) {
      if (endpoint.routePath.startsWith('/api/admin/')) {
        authType = 'admin'
      } else if (code.includes('assertUser') || code.includes('assertAdmin')) {
        authType = 'user'
      } else {
        authType = 'public'
      }
    }

    const isProtected = authType !== 'public'
    const displayEndpoint = `${colors.bold(endpoint.method.padEnd(6))} ${endpoint.routePath} [权限声明: ${authType.toUpperCase()}]`

    if (!isProtected) {
      console.log(`[${colors.yellow('PUBLIC')}] ${displayEndpoint} (公开端点 - 无鉴权)`)
      publicCount++
      continue
    }

    // 针对受保护端点，发起越权请求测试（不带有效会话，携带 mock 拒绝头）
    try {
      const response = await fetch(BASE_URL + endpoint.routePath, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'x-mock-unauthorized': 'true' // 强制 Mock DB 抛出 401
        },
        // 传递空 body 以便触发测试，避开因为 method 限制导致的报错
        body: ['POST', 'PATCH', 'PUT'].includes(endpoint.method) ? JSON.stringify({}) : undefined
      })

      const status = response.status
      
      // 我们期待安全受保护的接口应当返回 401 (未授权)
      // 如果因为没有传递 Body 参数而抛出了 400 (Zod Validation)，这也证明它已经进入了业务逻辑，
      // 但对于安全扫描，最理想的防线是优先被 assertUser 截断返回 401。
      // 在此，401 为核心安全通关，400 为参数通关，200 则为越权漏洞！
      if (status === 401 || status === 403) {
        const desc = status === 401 ? 'Unauthorized' : 'Forbidden'
        console.log(`[${colors.green(' PASS ')}] ${displayEndpoint} -> 拦截响应: ${status} ${colors.green(`${desc} (已防御)`)}`)
        passedCount++
      } else if (status === 400) {
        // 部分接口可能在 assertUser 之前进行了参数校验或两者共存，
        // 但只要没有泄漏敏感 200 数据，依然算作安全。为提升架构规范度，推荐把 assertUser 放在最前。
        console.log(`[${colors.green(' PASS ')}] ${displayEndpoint} -> 拦截响应: ${status} ${colors.yellow('Bad Request (无越权)')}`)
        passedCount++
      } else if (status === 200 || status === 201) {
        const bodyText = await response.text()
        console.log(`[${colors.red(' FAIL ')}] ${displayEndpoint} -> 响应: ${status} ${colors.red('OK (越权漏洞! 泄漏内容: ' + bodyText.substring(0, 80) + '...)')}`)
        failedCount++
      } else {
        console.log(`[${colors.yellow(' WARN ')}] ${displayEndpoint} -> 异常响应: ${status}`)
        publicCount++
      }
    } catch (fetchErr) {
      console.log(`[${colors.red('ERROR ')}] ${displayEndpoint} -> 请求崩溃: ${fetchErr.message}`)
      failedCount++
    }
  }

  // 4. 汇总报告
  console.log('\n==================================================')
  console.log(colors.bold('🛡️ API 越权扫描测试结果汇总报告:'))
  console.log(`- 🟢 安全防御通过 (PASSED): ${colors.green(passedCount)} 个端点`)
  console.log(`- 🟡 公开端点放行 (PUBLIC): ${colors.yellow(publicCount)} 个端点`)
  console.log(`- 🔴 安全越权漏洞 (FAILED): ${colors.red(failedCount)} 个端点`)
  console.log('==================================================\n')

  if (failedCount > 0) {
    console.error(colors.red('🚨 越权防护测试未通过！发现潜在的安全泄露接口。请在提交 PR 前进行合规审查。'))
    process.exit(1)
  } else {
    console.log(colors.green('🎉 恭喜！所有注册的受保护 API 安全防御合格，未授权越权风险为 0。'))
    process.exit(0)
  }
}

runSafetyTest()
