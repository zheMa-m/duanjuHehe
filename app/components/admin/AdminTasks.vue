<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Task {
  id: string
  title: string
  completed: boolean
  created_at: string
}

interface CronJob {
  id: string
  name: string
  cronExpression: string
  description: string
  targetUrl: string
  status: string
  lastRunAt: string | null
}

const props = defineProps<{
  tasks: Task[] | null
  tasksTotal: number
  tasksPage: number
  tasksPageSize: number
  isLoading: boolean
}>()

const emit = defineEmits<{
  refresh: []
  toggle: [task: Task]
  delete: [id: string]
  create: [title: string]
  changePage: [page: number]
  toast: [msg: string, type: 'success' | 'error' | 'info']
}>()

const totalPages = computed(() => Math.max(1, Math.ceil(props.tasksTotal / props.tasksPageSize)))
const handlePageChange = (page: number) => {
  if (page < 1 || page > totalPages.value) return
  emit('changePage', page)
}

// ── Tab 切换 ──────────────────────────────────────────────────
const activeSubTab = ref<'business' | 'system'>('business')

// ── 新建任务表单 ──────────────────────────────────────────────
const newTitle = ref('')
const isCreating = ref(false)

const submitCreate = async () => {
  if (!newTitle.value.trim() || isCreating.value) return
  isCreating.value = true
  emit('create', newTitle.value.trim())
  newTitle.value = ''
  setTimeout(() => { isCreating.value = false }, 3000)
}

const handleDelete = (id: string) => {
  if (!confirm('确定要删除该任务吗？此操作将记录到审计日志。')) return
  emit('delete', id)
}

// ── 系统定时任务逻辑 ───────────────────────────────────────────
const cronJobs = ref<CronJob[]>([])
const cronLoading = ref(false)
const runningJobs = ref<Record<string, boolean>>({})

const fetchCronJobs = async () => {
  cronLoading.value = true
  try {
    const res = await $fetch<{ success: boolean; data: CronJob[] }>('/api/admin/tasks/cron')
    cronJobs.value = res.data || []
  } catch (e: any) {
    emit('toast', '系统定时任务获取失败: ' + (e.message || '未知错误'), 'error')
  } finally {
    cronLoading.value = false
  }
}

const runCronJob = async (job: CronJob) => {
  if (runningJobs.value[job.id]) return
  runningJobs.value[job.id] = true
  emit('toast', `正在运行定时任务 [${job.name}]...`, 'info')
  try {
    const res = await $fetch<any>(job.targetUrl, { method: 'POST' })
    if (res.success) {
      emit('toast', `🎉 任务运行成功！归档日志: ${res.data.archivedCount} 条`, 'success')
      await fetchCronJobs()
    } else {
      emit('toast', '任务执行异常: ' + (res.message || '未知错误'), 'error')
    }
  } catch (e: any) {
    emit('toast', '任务运行失败: ' + (e.data?.statusMessage || e.message || '网络连接超时'), 'error')
  } finally {
    runningJobs.value[job.id] = false
  }
}

// 监听 tab 切换自动拉取
watch(activeSubTab, (val) => {
  if (val === 'system') {
    fetchCronJobs()
  }
}, { immediate: true })
</script>

<template>
  <div class="space-y-6 animate-fade-in text-white">
    <!-- 子 Tab 导航 -->
    <div class="flex border-b border-white/[0.06] gap-1">
      <button
        @click="activeSubTab = 'business'"
        class="px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer bg-transparent border-t-0 border-x-0 outline-none"
        :class="activeSubTab === 'business' ? 'border-indigo-500 text-white' : 'border-transparent text-white/40 hover:text-white/70'"
      >
        待办业务任务
      </button>
      <button
        @click="activeSubTab = 'system'"
        class="px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer bg-transparent border-t-0 border-x-0 outline-none"
        :class="activeSubTab === 'system' ? 'border-purple-500 text-white' : 'border-transparent text-white/40 hover:text-white/70'"
      >
        系统定时任务
      </button>
    </div>

    <!-- ── 1. 待办业务任务面板 ── -->
    <div v-if="activeSubTab === 'business'" class="space-y-5">
      <!-- 新建任务输入区 -->
      <div class="bg-white/[0.04] rounded-xl p-4 shadow-lg shadow-black/20 relative overflow-hidden group">
        <div class="absolute -top-12 -left-12 w-24 h-24 rounded-full bg-indigo-500/[0.05] blur-xl group-hover:bg-indigo-500/[0.08] transition-all"></div>
        
        <form @submit.prevent="submitCreate" class="flex gap-2 relative z-10">
          <div class="relative flex-1 flex items-center">
            <span class="absolute left-3 text-white/20 text-xs">📝</span>
            <input
              v-model="newTitle"
              type="text"
              required
              :disabled="isLoading || isCreating"
              placeholder="新建待办任务..."
              class="w-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] focus:border-indigo-500/50 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all font-light tracking-wide"
            />
          </div>
          <button
            type="submit"
            :disabled="isLoading || isCreating || !newTitle.trim()"
            class="text-sm font-semibold bg-gradient-to-r from-indigo-600 to-indigo-400 hover:from-indigo-500 hover:to-indigo-300 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg transition-all active:scale-[0.97] flex items-center gap-2 cursor-pointer shadow-[0_4px_12px_rgba(99,102,241,0.2)] disabled:shadow-none"
          >
            <span v-if="isCreating" class="inline-block animate-spin">⏳</span>
            <span v-else>➕</span>
            {{ isCreating ? '...' : '创建' }}
          </button>
        </form>
      </div>

      <!-- 任务列表表格 -->
      <div class="bg-white/[0.04] rounded-xl overflow-hidden shadow-xl shadow-black/20">
        <div class="overflow-x-auto overflow-y-auto max-h-[60vh]">
          <table class="w-full text-left text-sm border-collapse">
            <thead class="sticky top-0 z-10">
              <tr class="border-b border-white/[0.05] text-white/40 uppercase tracking-widest text-[10px] bg-[#0d0d18]/95 backdrop-blur-sm">
                <th class="px-4 py-3 font-semibold font-mono">ID</th>
                <th class="px-4 py-3 font-semibold font-mono">描述</th>
                <th class="px-4 py-3 font-semibold font-mono">状态</th>
                <th class="px-4 py-3 font-semibold font-mono">创建时间</th>
                <th class="px-4 py-3 font-semibold font-mono text-right">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/[0.04]">
              <tr v-for="task in tasks" :key="task.id" class="hover:bg-white/[0.02] transition-colors duration-200">
                <td class="px-4 py-4 text-white/40 font-mono text-xs">{{ task.id }}</td>
                <td class="px-4 py-4 text-white/90 font-light text-sm tracking-wide">{{ task.title }}</td>
                <td class="px-4 py-4">
                  <button 
                    @click="$emit('toggle', task)"
                    class="px-3 py-1 rounded-full text-[10px] font-semibold border transition-all active:scale-[0.93] inline-flex items-center gap-1.5 cursor-pointer focus:outline-none"
                    :class="task.completed 
                      ? 'bg-[#30d158]/10 text-[#30d158] border-[#30d158]/20 shadow-[inset_0_1px_rgba(48,209,88,0.05)]' 
                      : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:border-white/20'"
                  >
                    <span 
                      class="w-1.5 h-1.5 rounded-full"
                      :class="task.completed ? 'bg-[#30d158] animate-pulse' : 'bg-white/30'"
                    ></span>
                    {{ task.completed ? '已完成' : '待处理' }}
                  </button>
                </td>
                <td class="px-4 py-4 text-white/40 font-mono text-xs">{{ new Date(task.created_at).toLocaleString() }}</td>
                <td class="px-4 py-4 text-right">
                  <button 
                    @click="handleDelete(task.id)"
                    class="text-[11px] font-semibold bg-[#ff453a]/10 hover:bg-[#ff453a]/20 text-[#ff453a] px-3 py-1.5 rounded-full border border-[#ff453a]/25 transition-all active:scale-[0.93] cursor-pointer focus:outline-none"
                  >
                    删除
                  </button>
                </td>
              </tr>
              <tr v-if="!tasks || tasks.length === 0">
                <td colspan="5" class="py-10 text-center text-xs text-white/25 font-light">
                  暂无任务，使用上方输入框新建。
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 分页控制栏 -->
      <div v-if="tasksTotal > 0" class="flex items-center justify-between px-5 py-3 bg-white/[0.02] rounded-xl border border-white/[0.04]">
        <div class="text-[11px] text-white/30 font-mono">共 {{ tasksTotal }} 条 · 第 {{ tasksPage }}/{{ totalPages }} 页</div>
        <div class="flex items-center gap-2">
          <button @click="handlePageChange(tasksPage - 1)" :disabled="tasksPage <= 1" class="text-[11px] font-semibold bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white/80 px-3 py-1.5 rounded-full border border-white/10 transition-all cursor-pointer focus:outline-none">上一页</button>
          <button @click="handlePageChange(tasksPage + 1)" :disabled="tasksPage >= totalPages" class="text-[11px] font-semibold bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white/80 px-3 py-1.5 rounded-full border border-white/10 transition-all cursor-pointer focus:outline-none">下一页</button>
        </div>
      </div>
    </div>

    <!-- ── 2. 系统定时任务面板 ── -->
    <div v-else class="space-y-4">
      <div v-if="cronLoading" class="flex items-center justify-center py-12">
        <span class="i-lucide-loader-2 animate-spin text-2xl text-purple-400" />
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="job in cronJobs"
          :key="job.id"
          class="bg-white/[0.03] border border-white/[0.05] rounded-xl p-5 shadow-lg relative overflow-hidden group flex flex-col justify-between gap-4"
        >
          <div>
            <div class="flex justify-between items-start">
              <div>
                <h4 class="text-sm font-semibold text-white/95">{{ job.name }}</h4>
                <p class="text-[10px] text-white/40 mt-0.5 font-mono">ID: {{ job.id }}</p>
              </div>
              <span
                class="px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase"
                :class="job.status === 'enabled'
                  ? 'bg-[#30d158]/10 text-[#30d158] border-[#30d158]/20'
                  : 'bg-white/5 text-white/40 border-white/10'"
              >
                {{ job.status === 'enabled' ? '运行中' : '已禁用' }}
              </span>
            </div>

            <p class="text-xs text-white/50 mt-3 leading-relaxed font-light">
              {{ job.description }}
            </p>

            <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono bg-black/25 p-3 rounded-lg border border-white/[0.02]">
              <div>
                <span class="text-white/35 block text-[10px] uppercase">调度周期 (Cron)</span>
                <span class="text-purple-300 font-semibold text-xs mt-0.5 block">{{ job.cronExpression }}</span>
              </div>
              <div>
                <span class="text-white/35 block text-[10px] uppercase">上次执行时间</span>
                <span class="text-white/70 text-xs mt-0.5 block">
                  {{ job.lastRunAt ? new Date(job.lastRunAt).toLocaleString('zh-CN') : '从未运行 / 暂无记录' }}
                </span>
              </div>
            </div>
          </div>

          <div class="flex justify-between items-center border-t border-white/[0.04] pt-3">
            <div class="text-[10px] font-mono text-white/35">
              目标路径: <span class="text-white/55">{{ job.targetUrl }}</span>
            </div>
            <button
              @click="runCronJob(job)"
              :disabled="runningJobs[job.id]"
              class="text-xs font-semibold bg-purple-600/15 hover:bg-purple-600/30 text-purple-300 px-4 py-1.5 rounded-full border border-purple-500/25 transition-all active:scale-[0.95] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="runningJobs[job.id]" class="inline-block animate-spin mr-1">⏳</span>
              立即执行
            </button>
          </div>
        </div>

        <div v-if="cronJobs.length === 0" class="py-12 text-center text-xs text-white/20 font-light">
          暂无可用系统定时任务。
        </div>
      </div>
    </div>
  </div>
</template>

