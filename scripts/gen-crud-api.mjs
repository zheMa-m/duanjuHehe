#!/usr/bin/env node
/**
 * CRUD API 生成器 — 生成符合项目规范的 RESTful 控制器组
 *
 * 生成的模板包含：
 *   - defineRouteMeta OpenAPI 元数据
 *   - sendSuccess / throwError 统一响应
 *   - Zod + readValidatedBody 参数校验
 *   - @api-auth 权限声明
 *
 * 用法: node scripts/gen-crud-api.mjs product
 */

import fs from 'fs'
import path from 'path'
import { c, ok, fail, section, info } from './_shared.mjs'

const resourceName = process.argv[2]

if (!resourceName) {
  console.error(`\n${c.red}  错误: 请指定资源名称（单数）${c.reset}`)
  console.error(`${c.yellow}  示例: node scripts/gen-crud-api.mjs product${c.reset}\n`)
  process.exit(1)
}

const name = resourceName.trim().toLowerCase().replace(/[^a-z]/g, '')

function getPlural(str) {
  if (str.endsWith('y')) return str.slice(0, -1) + 'ies'
  if (str.endsWith('s')) return str
  return str + 's'
}

const plural = getPlural(name)
const tag = plural.charAt(0).toUpperCase() + plural.slice(1)
const apiDir = path.resolve(`server/api/v1/${plural}`)

if (!fs.existsSync(apiDir)) {
  fs.mkdirSync(apiDir, { recursive: true })
}

section(`生成 ${name} CRUD 控制器 → server/api/v1/${plural}/`)

// ─── 1. GET 列表 (index.get.ts) ─────────────────────
const getTemplate = `// @api-auth: user
import { defineEventHandler } from 'h3'
import { assertUser } from '~~/server/utils/auth'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['${tag}'],
    summary: '获取${name}列表',
    description: '拉取当前租户下的所有${name}记录，按创建时间倒序。',
    security: [{ BearerAuth: [] }],
    responses: {
      200: { description: '${name}列表' },
      500: { description: '数据库错误' },
    },
  } as any,
})

export default defineEventHandler(async (event) => {
  const user = assertUser(event)
  const db = getDB(event)

  const { data, error } = await db
    .from('${plural}')
    .select('*')
    .eq('tenant_id', user.tenantId)
    .order('created_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return sendSuccess(event, data)
})
`

// ─── 2. POST 创建 (index.post.ts) ──────────────────
const postTemplate = `// @api-auth: user
import { defineEventHandler } from 'h3'
import { z } from 'zod'
import { assertUser } from '~~/server/utils/auth'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['${tag}'],
    summary: '创建${name}',
    description: '在当前租户下创建新的${name}记录，tenant_id 由服务端注入。',
    security: [{ BearerAuth: [] }],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              // TODO: 根据业务定义字段
              title: { type: 'string' },
            },
            required: ['title'],
          },
        },
      },
    },
    responses: {
      201: { description: '创建成功' },
      400: { description: '参数校验失败' },
      500: { description: '数据库错误' },
    },
  } as any,
})

const createSchema = z.object({
  // TODO: 根据业务定义校验规则
  title: z.string().min(1, 'Title cannot be empty'),
})

export default defineEventHandler(async (event) => {
  const user = assertUser(event)
  const body = await readValidatedBody(event, createSchema.parse)
  const db = getDB(event)

  const newRow = {
    ...body,
    tenant_id: user.tenantId,
    created_at: new Date().toISOString(),
  }

  const { data, error } = await db
    .from('${plural}')
    .insert(newRow)
    .select('*')

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return sendSuccess(event, data ? data[0] : null, 'Created successfully', 201)
})
`

// ─── 3. PATCH 更新 ([id].patch.ts) ──────────────────
const patchTemplate = `// @api-auth: user
import { defineEventHandler, getRouterParam } from 'h3'
import { z } from 'zod'
import { assertUser } from '~~/server/utils/auth'
import { getDB } from '~~/server/utils/db'
import { sendSuccess, throwError } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['${tag}'],
    summary: '更新${name}',
    description: '局部更新指定${name}记录，tenant_id 物理隔离防越权。',
    security: [{ BearerAuth: [] }],
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
    ],
    responses: {
      200: { description: '更新成功' },
      404: { description: '记录不存在' },
      500: { description: '数据库错误' },
    },
  } as any,
})

const updateSchema = z.object({
  // TODO: 根据业务定义可更新字段（Partial）
}).passthrough()

export default defineEventHandler(async (event) => {
  const user = assertUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throwError(400, 'Missing record ID')

  const body = await readValidatedBody(event, updateSchema.parse)
  const db = getDB(event)

  const { data, error } = await db
    .from('${plural}')
    .update(body)
    .eq('id', id)
    .eq('tenant_id', user.tenantId)
    .select('*')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!data) throwError(404, 'Record not found')

  return sendSuccess(event, data, 'Updated successfully')
})
`

// ─── 4. DELETE 删除 ([id].delete.ts) ────────────────
const deleteTemplate = `// @api-auth: user
import { defineEventHandler, getRouterParam } from 'h3'
import { assertUser } from '~~/server/utils/auth'
import { getDB } from '~~/server/utils/db'
import { sendSuccess, throwError } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['${tag}'],
    summary: '删除${name}',
    description: '物理删除指定${name}记录，tenant_id 物理隔离防越权。',
    security: [{ BearerAuth: [] }],
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
    ],
    responses: {
      200: { description: '删除成功' },
      404: { description: '记录不存在' },
      500: { description: '数据库错误' },
    },
  } as any,
})

export default defineEventHandler(async (event) => {
  const user = assertUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throwError(400, 'Missing record ID')

  const db = getDB(event)

  const { error } = await db
    .from('${plural}')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenantId)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return sendSuccess(event, null, 'Deleted successfully')
})
`

// ─── 写入文件 ────────────────────────────────────────
const files = [
  ['index.get.ts', getTemplate, 'GET  列表拉取'],
  ['index.post.ts', postTemplate, 'POST 创建记录'],
  ['[id].patch.ts', patchTemplate, 'PATCH 更新记录'],
  ['[id].delete.ts', deleteTemplate, 'DELETE 删除记录'],
]

for (const [filename, content, desc] of files) {
  fs.writeFileSync(path.join(apiDir, filename), content, 'utf-8')
  ok(`${filename} — ${desc}`)
}

console.log(`\n${c.green}  ✔ 成功生成 [${name}] CRUD 控制器组!${c.reset}`)
info(`目录: ${apiDir}`)
console.log()
process.exit(0)
