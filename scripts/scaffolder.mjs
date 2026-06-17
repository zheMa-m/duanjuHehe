#!/usr/bin/env node
/**
 * 脚手架生成器 — 快速创建 API + 前端页面骨架
 *
 * 生成：
 *   - server/api/v1/{name}/index.post.ts  (含 defineRouteMeta + Zod + sendSuccess)
 *   - app/pages/(client)/{name}.vue       (含 SEO + 表单 + 结果展示)
 *
 * 用法: node scripts/scaffolder.mjs billing
 */

import fs from 'fs'
import path from 'path'
import { c, ok, section, info } from './_shared.mjs'

const name = process.argv[2]
if (!name) {
  console.error(`\n${c.red}  错误: 请指定资源名称${c.reset}`)
  console.error(`${c.yellow}  示例: node scripts/scaffolder.mjs billing${c.reset}\n`)
  process.exit(1)
}

const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')
const tag = cleanName.charAt(0).toUpperCase() + cleanName.slice(1)

const apiPath = path.resolve(`server/api/v1/${cleanName}/index.post.ts`)
const pagePath = path.resolve(`app/pages/(client)/${cleanName}.vue`)

section(`脚手架生成: ${cleanName}`)

// ─── API 控制器模板 ──────────────────────────────────
const apiTemplate = `// @api-auth: user
import { defineEventHandler } from 'h3'
import { z } from 'zod'
import { assertUser } from '~~/server/utils/auth'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['${tag}'],
    summary: '创建${cleanName}',
    description: 'TODO: 补充端点描述',
    security: [{ BearerAuth: [] }],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
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
    },
  } as any,
})

const ${cleanName}Schema = z.object({
  title: z.string().min(1, 'Title cannot be empty'),
})

export default defineEventHandler(async (event) => {
  const user = assertUser(event)
  const body = await readValidatedBody(event, ${cleanName}Schema.parse)
  const db = getDB(event)

  // TODO: 执行具体的数据库读写
  // const { data, error } = await db.from('${cleanName}').insert({ ...body, tenant_id: user.tenantId })

  return sendSuccess(event, body, 'Created ${cleanName} successfully', 201)
})
`

// ─── 前端页面模板 ──────────────────────────────────────
const pageTemplate = `<script setup lang="ts">
useSeoMeta({
  title: '${tag} - 全栈单仓独立项目',
  description: '配置和管理您的 ${cleanName}。',
})

const formData = ref({ title: '' })
const responseData = ref<any>(null)

const submitData = async () => {
  try {
    const res = await $fetch('/api/v1/${cleanName}', {
      method: 'POST',
      body: formData.value,
    })
    responseData.value = res
  } catch (e: any) {
    alert(e.data?.statusMessage || '提交失败')
  }
}
</script>

<template>
  <div class="p-8 max-w-4xl mx-auto">
    <div class="mb-8 pb-4 border-b border-slate-800 flex justify-between items-center">
      <h1 class="text-2xl font-bold text-white">${tag} 模块</h1>
      <NuxtLink to="/" class="text-slate-400 hover:text-white text-sm">返回首页</NuxtLink>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div class="bg-slate-800/30 border border-slate-700/50 p-6 rounded-xl">
        <h2 class="text-lg font-semibold text-white mb-4">输入参数提交</h2>
        <form @submit.prevent="submitData" class="space-y-4">
          <div>
            <label class="block text-xs uppercase tracking-wider text-slate-400 mb-2">Title 字段</label>
            <input
              v-model="formData.title"
              type="text"
              class="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              placeholder="请输入参数..."
            />
          </div>
          <button
            type="submit"
            class="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 rounded-lg transition-all"
          >
            向 API 提交并检验契约
          </button>
        </form>
      </div>

      <div class="bg-slate-800/30 border border-slate-700/50 p-6 rounded-xl">
        <h2 class="text-lg font-semibold text-white mb-4">后端响应结果</h2>
        <pre class="bg-black/50 p-4 rounded-lg text-xs font-mono text-cyan-400 overflow-x-auto min-h-[120px]">{{ responseData ? JSON.stringify(responseData, null, 2) : '// 暂无数据' }}</pre>
      </div>
    </div>
  </div>
</template>
`

// ─── 写入文件 ─────────────────────────────────────────
fs.mkdirSync(path.dirname(apiPath), { recursive: true })
fs.mkdirSync(path.dirname(pagePath), { recursive: true })

fs.writeFileSync(apiPath, apiTemplate)
ok(`API  → ${path.relative(process.cwd(), apiPath)}`)

fs.writeFileSync(pagePath, pageTemplate)
ok(`Page → ${path.relative(process.cwd(), pagePath)}`)

console.log()
process.exit(0)
