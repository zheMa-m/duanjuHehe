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
  <div class="space-y-8 animate-fade-in">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-semibold text-white tracking-tight">业务任务管理</h1>
        <p class="text-white/40 text-xs mt-1">管理员可直接在后台创建、回收业务任务，支持审计跟踪与状态切换</p>
      </div>
      <button 
        @click="$emit('refresh')"
        :disabled="isLoading"
        class="text-xs bg-white/10 hover:bg-white/15 text-white font-medium px-4 py-2 rounded-full transition-all active:scale-[0.98]"
      >
        🔄 刷新任务
      </button>
    </div>

    <!-- 新建任务输入区 -->
    <div class="bg-[#1c1c1e] border border-white/5 rounded-2xl p-5">
      <form @submit.prevent="submitCreate" class="flex gap-3">
        <input
          v-model="newTitle"
          type="text"
          required
          :disabled="isLoading || isCreating"
          placeholder="输入新的任务标题..."
          class="flex-1 bg-black/40 border border-white/10 hover:border-white/20 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-[#007aff]/50 transition-all disabled:opacity-40"
        />
        <button
          type="submit"
          :disabled="isLoading || isCreating || !newTitle.trim()"
          class="text-xs font-semibold bg-[#007aff] hover:bg-[#007aff]/85 disabled:bg-white/10 disabled:text-white/30 text-white px-5 py-2.5 rounded-xl transition-all active:scale-[0.97] flex items-center gap-1.5"
        >
          <span v-if="isCreating" class="inline-block animate-spin">⏳</span>
          <span v-else>➕</span>
          {{ isCreating ? '创建中...' : '新建任务' }}
        </button>
      </form>
    </div>

    <div class="bg-[#1c1c1e] border border-white/5 rounded-2xl overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="border-b border-white/5 text-white/40 uppercase tracking-wider text-[9px]">
              <th class="px-6 py-3.5 font-medium">任务 ID</th>
              <th class="px-6 py-3.5 font-medium">描述</th>
              <th class="px-6 py-3.5 font-medium">当前状态</th>
              <th class="px-6 py-3.5 font-medium">创建时间</th>
              <th class="px-6 py-3.5 font-medium text-right">后台操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            <tr v-for="task in tasks" :key="task.id" class="hover:bg-white/[0.02] transition-colors">
              <td class="px-6 py-3.5 text-white/40 font-mono">{{ task.id }}</td>
              <td class="px-6 py-3.5 text-white/90 font-light">{{ task.title }}</td>
              <td class="px-6 py-3.5">
                <button 
                  @click="$emit('toggle', task)"
                  class="px-2.5 py-0.5 rounded-full text-[10px] font-medium border-0 transition-all active:scale-[0.95]"
                  :class="task.completed ? 'bg-[#30d158]/10 text-[#30d158]' : 'bg-white/10 text-white/60 hover:bg-white/15'"
                >
                  {{ task.completed ? '已完成' : '待处理' }}
                </button>
              </td>
              <td class="px-6 py-3.5 text-white/40 font-mono">{{ new Date(task.created_at).toLocaleString() }}</td>
              <td class="px-6 py-3.5 text-right">
                <button 
                  @click="handleDelete(task.id)"
                  class="text-[11px] font-medium bg-[#ff453a]/10 hover:bg-[#ff453a]/25 text-[#ff453a] px-3.5 py-1.5 rounded-full transition-all active:scale-[0.95]"
                >
                  回收删除
                </button>
              </td>
            </tr>
            <tr v-if="!tasks || tasks.length === 0">
              <td colspan="5" class="py-12 text-center text-xs text-white/30">
                暂无任务数据
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
