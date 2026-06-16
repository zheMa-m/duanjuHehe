import fs from 'fs'
import path from 'path'

const name = process.argv[2]
if (!name) {
  console.error('Please specify a resource name (e.g. node scripts/scaffolder.mjs billing)')
  process.exit(1)
}

const apiPath = path.resolve(`server/api/v1/${name}/index.post.ts`)
const pagePath = path.resolve(`app/pages/(client)/${name}.vue`)

// 自动化生成符合架构规范的 API 控制器模板
const apiTemplate = `import { z } from 'zod'
import { getDB } from '~~/server/utils/db'

export const ${name}Schema = z.object({
  // 在此定义输入参数校验契约
  title: z.string().min(1, 'Title cannot be empty')
})

export default defineEventHandler(async (event) => {
  try {
    const body = await readValidatedBody(event, ${name}Schema.parse)
    const db = getDB(event)
    
    // TODO: 执行具体的数据库读写
    // const { data, error } = await db.from('${name}').insert(body)
    
    return {
      status: 'success',
      message: 'Created ${name} successfully',
      receivedData: body
    }
  } catch (error: any) {
    throw createError({
      statusCode: 400,
      statusMessage: error.message || 'Validation Error'
    })
  }
})`

// 自动化生成符合架构规范（含 App SEO 与 useFetch 端到端推断）的前端页面模板
const pageTemplate = `<script setup lang="ts">
// 强制执行架构规范：必须声明 SEO
useSeoMeta({
  title: '${name.toUpperCase()} - 全栈单仓独立项目',
  description: '配置和管理您的 ${name}。',
})

const formData = ref({ title: '' })
const responseData = ref<any>(null)

const submitData = async () => {
  try {
    // 调用生成的接口契约
    const res = await $fetch('/api/v1/${name}', {
      method: 'POST',
      body: formData.value
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
      <h1 class="text-2xl font-bold text-white">${name.toUpperCase()} 模块</h1>
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
</template>`

// 创建目录并写入文件
fs.mkdirSync(path.dirname(apiPath), { recursive: true })
fs.mkdirSync(path.dirname(pagePath), { recursive: true })
fs.mkdirSync('scripts', { recursive: true })

fs.writeFileSync(apiPath, apiTemplate)
fs.writeFileSync(pagePath, pageTemplate)

console.log(`[OK] Created API: ${apiPath}`)
console.log(`[OK] Created Page: ${pagePath}`)
