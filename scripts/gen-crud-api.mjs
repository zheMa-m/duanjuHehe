import fs from 'fs'
import path from 'path'

// 获取资源名称
const resourceName = process.argv[2]

if (!resourceName) {
  console.error('\x1b[31m🚨 错误: 请指定需要生成 CRUD 接口的单数资源名称！\x1b[0m')
  console.error('\x1b[33m💡 示例: node scripts/gen-crud-api.mjs product\x1b[0m\n')
  process.exit(1)
}

const name = resourceName.trim().toLowerCase().replace(/[^a-z]/g, '')

// 计算复数名称作为文件夹名
function getPlural(str) {
  if (str.endsWith('y')) {
    return str.slice(0, -1) + 'ies'
  } else if (str.endsWith('s')) {
    return str
  } else {
    return str + 's'
  }
}

const pluralName = getPlural(name)
const apiDir = path.resolve(`server/api/v1/${pluralName}`)

// 创建文件夹
if (!fs.existsSync(apiDir)) {
  fs.mkdirSync(apiDir, { recursive: true })
}

// -------------------------------------------------------------
// 1. GET 列表拉取 (index.get.ts)
// -------------------------------------------------------------
const getTemplate = `// @api-auth: user
import { defineEventHandler } from 'h3'
import { assertUser } from '~~/server/utils/auth'
import { getDB } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  // 1. 强鉴权拦截并提取当前登录用户
  const user = assertUser(event)
  const db = getDB(event)

  // 2. 查询属于当前用户的数据 (行级隔离)
  const { data, error } = await db
    .from('${pluralName}')
    .select('*')
    .eq('tenant_id', user.tenantId)
    .order('created_at', { ascending: false })

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: \`获取${pluralName}列表失败: \${error.message}\`
    })
  }

  return {
    success: true,
    data
  }
})
`

// -------------------------------------------------------------
// 2. POST 插入数据 (index.post.ts)
// -------------------------------------------------------------
const postTemplate = `// @api-auth: user
import { defineEventHandler, readBody } from 'h3'
import { assertUser } from '~~/server/utils/auth'
import { getDB } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  // 1. 强鉴权拦截并提取当前登录用户
  const user = assertUser(event)
  const body = await readBody(event)
  const db = getDB(event)

  // 参数简单校验
  if (!body || Object.keys(body).length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: '请求参数正文不能为空'
    })
  }

  // 2. 注入当前用户 ID 强制防伪造
  const newRow = {
    ...body,
    tenant_id: user.tenantId,
    created_at: new Date().toISOString()
  }

  const { data, error } = await db
    .from('${pluralName}')
    .insert(newRow)
    .select()
    .single()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: \`创建${name}记录失败: \${error.message}\`
    })
  }

  return {
    success: true,
    message: '创建成功',
    data
  }
})
`

// -------------------------------------------------------------
// 3. PATCH 修改数据 ([id].patch.ts)
// -------------------------------------------------------------
const patchTemplate = `// @api-auth: user
import { defineEventHandler, readBody, getRouterParam } from 'h3'
import { assertUser } from '~~/server/utils/auth'
import { getDB } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  // 1. 强鉴权拦截并提取当前登录用户
  const user = assertUser(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const db = getDB(event)

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: '缺少必填的记录 ID 参数'
    })
  }

  // 2. 局部修改操作，同时严格判定 tenant_id 物理防御越权
  const { data, error } = await db
    .from('${pluralName}')
    .update(body)
    .eq('id', id)
    .eq('tenant_id', user.tenantId)
    .select()
    .single()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: \`修改${name}记录失败: \${error.message}\`
    })
  }

  return {
    success: true,
    message: '更新成功',
    data
  }
})
`

// -------------------------------------------------------------
// 4. DELETE 删除数据 ([id].delete.ts)
// -------------------------------------------------------------
const deleteTemplate = `// @api-auth: user
import { defineEventHandler, getRouterParam } from 'h3'
import { assertUser } from '~~/server/utils/auth'
import { getDB } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  // 1. 强鉴权拦截并提取当前登录用户
  const user = assertUser(event)
  const id = getRouterParam(event, 'id')
  const db = getDB(event)

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: '缺少必填的记录 ID 参数'
    })
  }

  // 2. 执行物理删除/数据清理，必须限定 tenant_id 防越权
  const { error } = await db
    .from('${pluralName}')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenantId)

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: \`删除${name}记录失败: \${error.message}\`
    })
  }

  return {
    success: true,
    message: '记录已成功回收'
  }
})
`

// 写入文件
fs.writeFileSync(path.join(apiDir, 'index.get.ts'), getTemplate, 'utf-8')
fs.writeFileSync(path.join(apiDir, 'index.post.ts'), postTemplate, 'utf-8')
fs.writeFileSync(path.join(apiDir, '[id].patch.ts'), patchTemplate, 'utf-8')
fs.writeFileSync(path.join(apiDir, '[id].delete.ts'), deleteTemplate, 'utf-8')

console.log(`\x1b[32m✔ 成功生成 [${name}] 的 RESTful CRUD 控制器组!\x1b[0m`)
console.log(`📂 物理目录: [${apiDir}]`)
console.log(`- 📄 index.get.ts       (拉取列表)`)
console.log(`- 📄 index.post.ts      (插入记录)`)
console.log(`- 📄 [id].patch.ts      (修改记录)`)
console.log(`- 📄 [id].delete.ts     (强删记录)\n`)
process.exit(0)
