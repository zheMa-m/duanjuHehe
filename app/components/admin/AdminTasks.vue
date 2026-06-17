<script setup lang="ts">
interface Task {
  id: string
  title: string
  completed: boolean
  created_at: string
}

const props = defineProps<{
  tasks: Task[] | null
  isLoading: boolean
}>()

const emit = defineEmits<{
  refresh: []
  toggle: [task: Task]
  delete: [id: string]
  create: [title: string]
}>()

// ── 新建任务表单 ──────────────────────────────────────────────
const newTitle = ref('')
const isCreating = ref(false)

const submitCreate = async () => {
  if (!newTitle.value.trim() || isCreating.value) return
  isCreating.value = true
  emit('create', newTitle.value.trim())
  // 父组件创建成功后通过 refresh 刷新列表，此处重置表单
  newTitle.value = ''
  // 设置最大 loading 时限，防止父组件异常时按钮永久禁用
  setTimeout(() => { isCreating.value = false }, 3000)
}

const handleDelete = (id: string) => {
  if (!confirm('确定要强行删除该业务的任务吗？此操作会记录到审计日志。')) return
  emit('delete', id)
}
</script>

<template>
  <div class="space-y-8 animate-fade-in text-white">
    <!-- 标题 -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-semibold text-white tracking-tight">业务任务管理</h1>
        <p class="text-white/40 text-xs mt-1">管理员可直接在后台创建、回收业务任务，支持审计跟踪与状态切换</p>
      </div>
      <button 
        @click="$emit('refresh')"
        :disabled="isLoading"
        class="text-xs bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-full transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
      >
        <span :class="{'animate-spin': isLoading}">🔄</span>
        刷新任务
      </button>
    </div>

    <!-- 新建任务输入区 (毛玻璃卡片) -->
    <div class="bg-[#0c0c0e]/60 border border-white/[0.06] rounded-2xl p-5 backdrop-blur-xl shadow-lg relative overflow-hidden group">
      <div class="absolute -top-12 -left-12 w-24 h-24 rounded-full bg-blue-500/[0.03] blur-xl group-hover:bg-blue-500/[0.05] transition-all"></div>
      
      <form @submit.prevent="submitCreate" class="flex gap-3 relative z-10">
        <div class="relative flex-1 flex items-center">
          <span class="absolute left-4 text-white/20 text-xs">📝</span>
          <input
            v-model="newTitle"
            type="text"
            required
            :disabled="isLoading || isCreating"
            placeholder="输入新的任务标题，例如：🛡️ 加固 API 安全防御..."
            class="w-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] focus:border-[#0a84ff]/50 rounded-xl pl-11 pr-4 py-3 text-xs text-white placeholder:text-white/20 focus:outline-none focus:ring-4 focus:ring-[#0a84ff]/5 transition-all font-light tracking-wide"
          />
        </div>
        <button
          type="submit"
          :disabled="isLoading || isCreating || !newTitle.trim()"
          class="text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 disabled:from-white/5 disabled:to-white/5 disabled:text-white/20 text-white px-6 py-3 rounded-xl transition-all active:scale-[0.97] flex items-center gap-2 cursor-pointer shadow-[0_4px_12px_rgba(59,130,246,0.15)] disabled:shadow-none"
        >
          <span v-if="isCreating" class="inline-block animate-spin">⏳</span>
          <span v-else>➕</span>
          {{ isCreating ? '创建中...' : '新建任务' }}
        </button>
      </form>
    </div>

    <!-- 任务列表表格 (毛玻璃卡片) -->
    <div class="bg-[#0c0c0e]/60 border border-white/[0.06] rounded-2xl overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="border-b border-white/[0.05] text-white/40 uppercase tracking-widest text-[9px] bg-white/[0.005]">
              <th class="px-6 py-4 font-semibold font-mono">任务 ID</th>
              <th class="px-6 py-4 font-semibold font-mono">描述</th>
              <th class="px-6 py-4 font-semibold font-mono">当前状态</th>
              <th class="px-6 py-4 font-semibold font-mono">创建时间</th>
              <th class="px-6 py-4 font-semibold font-mono text-right">后台操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.04]">
            <tr v-for="task in tasks" :key="task.id" class="hover:bg-white/[0.02] transition-colors duration-200">
              <td class="px-6 py-4 text-white/40 font-mono text-[11px]">{{ task.id }}</td>
              <td class="px-6 py-4 text-white/90 font-light text-xs tracking-wide">{{ task.title }}</td>
              <td class="px-6 py-4">
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
              <td class="px-6 py-4 text-white/40 font-mono text-[11px]">{{ new Date(task.created_at).toLocaleString() }}</td>
              <td class="px-6 py-4 text-right">
                <button 
                  @click="handleDelete(task.id)"
                  class="text-[10px] font-semibold bg-[#ff453a]/10 hover:bg-[#ff453a]/20 text-[#ff453a] px-4 py-2 rounded-full border border-[#ff453a]/25 transition-all active:scale-[0.93] cursor-pointer focus:outline-none"
                >
                  回收删除
                </button>
              </td>
            </tr>
            <tr v-if="!tasks || tasks.length === 0">
              <td colspan="5" class="py-12 text-center text-xs text-white/25 font-light">
                暂无活动任务，请使用上方表单新建。
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
