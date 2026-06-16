<script setup lang="ts">
const { t } = useI18n()

// 强制执行架构规范：必须声明 SEO
useSeoMeta({
  title: () => t('tasks.pageTitle'),
  description: () => t('tasks.pageDesc'),
})

// -------------------------------------------------------------
// 💡 最佳实践一：数据加载与状态同步 (免配置 Ajax，100% 类型推断)
// -------------------------------------------------------------
// -------------------------------------------------------------
// 💡 契约接口定义 (契约优先，显式指明后端接口返回的数据模型，极大降低开发成本)
// -------------------------------------------------------------
interface Task {
  id: string
  title: string
  completed: boolean
  created_at: string
}

interface TasksResponse {
  success: boolean
  message: string
  timestamp: string
  data: Task[]
}

// 1. 在 Nuxt 4 中，useFetch 默认在服务端和客户端同构运行，支持极致的 SEO。
// 2. data 变量是强类型的。通过传入泛型 useFetch<TasksResponse>，
//    我们在前端输入 `response.data` 时，IDE 将会提供 100% 完美的代码补全。
// 3. refresh 函数用于在执行写入、更新、删除操作后，瞬间触发数据重载，视图无缝同步。
const { data: response, refresh, pending } = await useFetch<TasksResponse>('/api/v1/tasks')

const formData = ref({ title: '' })
const isAdding = ref(false)
const processingId = ref<string | null>(null)

// -------------------------------------------------------------
// 💡 最佳实践二：参数校验与写操作 (Zod 参数把关，保障运行时安全)
// -------------------------------------------------------------
const submitData = async () => {
  if (!formData.value.title.trim()) return
  
  isAdding.value = true
  try {
    // 调用生成的接口契约。后端 index.post.ts 会用 Zod schema 对 body 进行强制安全校验
    await $fetch('/api/v1/tasks', {
      method: 'POST',
      body: formData.value
    })
    
    // 清空表单，并重新刷新列表。
    // 这比手动在前端维护一个数组并 unshift 更稳妥、也更利于前后端并发一致性。
    formData.value.title = ''
    await refresh()
  } catch (e: any) {
    alert(e.data?.statusMessage || t('tasks.addFailed'))
  } finally {
    isAdding.value = false
  }
}

// -------------------------------------------------------------
// 💡 最佳实践三：状态更新与删除 (Restful 规范，安全删除与切换)
// -------------------------------------------------------------
const toggleComplete = async (task: any) => {
  processingId.value = task.id
  try {
    await $fetch(`/api/v1/tasks/${task.id}`, {
      method: 'PATCH',
      body: { completed: !task.completed }
    })
    await refresh()
  } catch (e: any) {
    alert(e.data?.statusMessage || t('tasks.updateFailed'))
  } finally {
    processingId.value = null
  }
}

const deleteTask = async (id: string) => {
  if (!confirm(t('tasks.confirmDelete'))) return
  
  processingId.value = id
  try {
    await $fetch(`/api/v1/tasks/${id}`, {
      method: 'DELETE'
    })
    await refresh()
  } catch (e: any) {
    alert(e.data?.statusMessage || t('tasks.deleteFailed'))
  } finally {
    processingId.value = null
  }
}
</script>

<template>
  <div class="relative min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 overflow-x-hidden selection:bg-indigo-500 selection:text-white">
    <!-- 发光装饰圈 -->
    <div class="absolute top-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-blue-600/5 blur-[120px] pointer-events-none"></div>

    <div class="max-w-5xl mx-auto space-y-10">
      <!-- 页面头部 -->
      <div class="flex justify-between items-center pb-6 border-b border-slate-800">
        <div>
          <h1 class="text-3xl font-black text-white flex items-center gap-3">
            📝 {{ t('tasks.heading') }} <span class="text-xs px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-md">CRUD Demo</span>
          </h1>
          <p class="text-slate-400 text-xs mt-1.5">{{ t('tasks.subtitle') }}</p>
        </div>
        <NuxtLink 
          to="/" 
          class="text-xs font-semibold px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 text-slate-300 transition-all active:scale-95"
        >
          {{ t('tasks.backHome') }}
        </NuxtLink>
      </div>

      <!-- 网格两栏布局 -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <!-- 左侧：最佳实践教学区 (降低团队学习成本的关键) -->
        <div class="space-y-6 lg:col-span-1">
          <div class="bg-indigo-950/20 border border-indigo-500/10 p-6 rounded-2xl space-y-4">
            <h2 class="text-sm font-bold text-indigo-400 flex items-center gap-1.5">
              💡 {{ t('tasks.bestPractices') }}
            </h2>
            <div class="space-y-3 text-xs text-slate-400 leading-normal">
              <div>
                <span class="block text-white font-semibold mb-1">{{ t('tasks.bp1Title') }}</span>
                {{ t('tasks.bp1Desc') }}
              </div>
              <div>
                <span class="block text-white font-semibold mb-1">{{ t('tasks.bp2Title') }}</span>
                {{ t('tasks.bp2Desc') }}
              </div>
              <div>
                <span class="block text-white font-semibold mb-1">{{ t('tasks.bp3Title') }}</span>
                {{ t('tasks.bp3Desc') }}
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧：看板实操区 -->
        <div class="lg:col-span-2 space-y-6">
          
          <!-- 新建任务输入框 -->
          <div class="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl">
            <h2 class="text-sm font-bold text-white mb-4">🆕 {{ t('tasks.createTitle') }}</h2>
            <form @submit.prevent="submitData" class="flex gap-3">
              <input 
                v-model="formData.title" 
                type="text" 
                required
                :disabled="isAdding"
                class="flex-1 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600 disabled:opacity-50"
                :placeholder="t('tasks.createPlaceholder')"
              />
              <button 
                type="submit"
                :disabled="isAdding || !formData.title.trim()"
                class="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-semibold text-xs px-6 py-3 rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-2"
              >
                <span v-if="isAdding">⏳ {{ t('tasks.addingButton') }}</span>
                <span v-else>➕ {{ t('tasks.addButton') }}</span>
              </button>
            </form>
          </div>

          <!-- 任务列表 -->
          <div class="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/20">
              <h2 class="text-sm font-bold text-white">📋 {{ t('tasks.listTitle') }}</h2>
              <span class="text-[10px] px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full font-mono">
                {{ t('tasks.totalCount', { count: response?.data?.length || 0 }) }}
              </span>
            </div>

            <!-- 加载状态 -->
            <div v-if="pending" class="p-12 text-center text-xs text-slate-500">
              <span class="inline-block animate-spin mr-2">🔄</span> {{ t('tasks.loadingData') }}
            </div>

            <!-- 列表为空 -->
            <div v-else-if="!response?.data?.length" class="p-12 text-center text-xs text-slate-500">
              📭 {{ t('tasks.emptyState') }}
            </div>

            <!-- 任务项循环 -->
            <div v-else class="divide-y divide-slate-800/60">
              <div 
                v-for="task in response.data" 
                :key="task.id" 
                class="p-4 flex items-center justify-between gap-4 hover:bg-white/5 transition-all"
                :class="{'opacity-50': processingId === task.id}"
              >
                <div class="flex items-center gap-3 min-w-0">
                  <button 
                    @click="toggleComplete(task)"
                    :disabled="processingId !== null"
                    class="w-5 h-5 rounded-full border border-slate-700 flex items-center justify-center text-[10px] transition-all"
                    :class="task.completed ? 'bg-emerald-500 border-emerald-400 text-white' : 'hover:border-indigo-500 bg-slate-950 text-transparent'"
                  >
                    ✔
                  </button>
                  <span 
                    class="text-xs text-slate-200 truncate"
                    :class="{'line-through text-slate-500': task.completed}"
                  >
                    {{ task.title }}
                  </span>
                </div>

                <div class="flex items-center gap-3 flex-shrink-0">
                  <span class="text-[9px] font-mono text-slate-500 hidden sm:inline">
                    {{ new Date(task.created_at).toLocaleTimeString() }}
                  </span>
                  <button 
                    @click="deleteTask(task.id)"
                    :disabled="processingId !== null"
                    class="w-8 h-8 rounded-lg bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/20 text-red-400 flex items-center justify-center transition-all active:scale-95"
                    :title="t('tasks.deleteTitle')"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
/* 隐藏移动端滚动条 */
.scrollbar-none::-webkit-scrollbar {
  display: none;
}
.scrollbar-none {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>