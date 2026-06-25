<script setup lang="ts">
const props = defineProps<{
  confirmDialog: any
}>()

const emit = defineEmits<{
  'refresh-files': []
}>()

// ── Toast ──────────────────────────────────────────────────
interface Toast { id: number; message: string; type: 'success' | 'error' | 'info' }
const toasts = ref<Toast[]>([])
let toastId = 0
function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const id = ++toastId
  toasts.value.push({ id, message, type })
  setTimeout(() => { toasts.value = toasts.value.filter(t => t.id !== id) }, 3500)
}

// ── 状态 ───────────────────────────────────────────────────
interface TrashItem {
  id: string
  original_bucket: string
  original_path: string
  file_name: string
  mime_type: string | null
  file_size: number
  deleted_by: string | null
  expires_at: string
  created_at: string
}
const trashItems = ref<TrashItem[]>([])
const trashTotal = ref(0)
const trashFetching = ref(false)
const trashOffset = ref(0)
const trashLimit = 50

const trashSelectedMap = ref<Record<string, boolean>>({})
const trashSelectedIds = computed(() => Object.keys(trashSelectedMap.value).filter(k => trashSelectedMap.value[k]))

function toggleTrashSelect(id: string) {
  const m = { ...trashSelectedMap.value }
  if (m[id]) delete m[id]; else m[id] = true
  trashSelectedMap.value = m
}
function toggleTrashSelectAll() {
  if (trashSelectedIds.value.length === trashItems.value.length) {
    trashSelectedMap.value = {}
  } else {
    const m: Record<string, boolean> = {}
    trashItems.value.forEach(i => { m[i.id] = true })
    trashSelectedMap.value = m
  }
}

async function handleBatchRestore() {
  const ids = trashSelectedIds.value
  if (ids.length === 0) return
  if (!await props.confirmDialog?.show(`确定要还原 ${ids.length} 个文件吗？`, { title: '批量还原文件', confirmText: '确认还原', icon: 'i-lucide-rotate-ccw' })) return
  try {
    const res = await $fetch<{ success: boolean; data: { restored: number; errors: string[] } }>('/api/admin/storage/trash/batch-restore', {
      method: 'POST', body: { ids },
    })
    trashSelectedMap.value = {}
    const hasErrors = res.data.errors.length > 0
    showToast(`已还原 ${res.data.restored} 个文件${hasErrors ? `，${res.data.errors.length} 个失败` : ''}`, hasErrors ? 'info' : 'success')
    fetchTrash()
    emit('refresh-files')
  } catch (e: any) {
    showToast(e?.data?.statusMessage || '批量还原失败', 'error')
  }
}

async function handleBatchPermanentDelete() {
  const ids = trashSelectedIds.value
  if (ids.length === 0) return
  if (!await props.confirmDialog?.show(`确定要永久删除 ${ids.length} 个文件吗？`, { title: '永久删除文件', detail: '此操作不可撤销。', confirmText: '确认删除', icon: 'i-lucide-trash-2' })) return
  try {
    const res = await $fetch<{ success: boolean; data: { deleted: number; errors: string[] } }>('/api/admin/storage/trash/batch-delete', {
      method: 'POST', body: { ids },
    })
    trashSelectedMap.value = {}
    const hasErrors = res.data.errors.length > 0
    showToast(`已永久删除 ${res.data.deleted} 个文件${hasErrors ? `，${res.data.errors.length} 个失败` : ''}`, hasErrors ? 'info' : 'success')
    fetchTrash()
  } catch (e: any) {
    showToast(e?.data?.statusMessage || '批量删除失败', 'error')
  }
}

async function handleEmptyTrash() {
  if (!await props.confirmDialog?.show('确定要清空回收站全部文件吗？', { title: '清空回收站', detail: '此操作不可撤销。', confirmText: '确认清空', icon: 'i-lucide-trash-2' })) return
  try {
    const res = await $fetch<{ success: boolean; data: { deleted: number } }>('/api/admin/storage/trash/empty', { method: 'POST' })
    showToast(`已清空 ${res.data.deleted} 个文件`, 'success')
    trashSelectedMap.value = {}
    fetchTrash()
  } catch (e: any) {
    showToast(e?.data?.statusMessage || '清空失败', 'error')
  }
}

async function fetchTrash() {
  trashFetching.value = true
  try {
    const res = await $fetch<{ success: boolean; data: { items: TrashItem[]; total: number } }>('/api/admin/storage/trash', {
      params: { limit: trashLimit, offset: trashOffset.value },
    })
    trashItems.value = res.data.items
    trashTotal.value = res.data.total
  } catch (e) {
    console.error('Failed to fetch trash:', e)
  } finally {
    trashFetching.value = false
  }
}

const trashHasPrev = computed(() => trashOffset.value > 0)
const trashHasNext = computed(() => trashOffset.value + trashLimit < trashTotal.value)
function trashPrevPage() { trashOffset.value = Math.max(0, trashOffset.value - trashLimit); fetchTrash() }
function trashNextPage() { trashOffset.value += trashLimit; fetchTrash() }

async function handleRestore(trashId: string) {
  try {
    await $fetch(`/api/admin/storage/trash/${trashId}/restore`, { method: 'POST' })
    showToast('文件已还原', 'success')
    fetchTrash()
    emit('refresh-files')
  } catch (e: any) {
    showToast(e?.data?.statusMessage || '还原失败', 'error')
  }
}

async function handlePermanentDelete(item: TrashItem) {
  if (!await props.confirmDialog?.show(`确定要永久删除「${item.file_name}」吗？`, { title: '永久删除文件', detail: '此操作不可撤销。', confirmText: '确认删除', icon: 'i-lucide-trash-2' })) return
  try {
    await $fetch(`/api/admin/storage/trash/${item.id}`, { method: 'DELETE' })
    showToast('已永久删除', 'success')
    fetchTrash()
  } catch (e: any) {
    showToast(e?.data?.statusMessage || '删除失败', 'error')
  }
}

async function handleCleanupExpired() {
  if (!await props.confirmDialog?.show('确定要清理所有已过期的回收站文件吗？', { title: '清理已过期文件', confirmText: '确认清理', icon: 'i-lucide-sparkles' })) return
  try {
    const res = await $fetch<{ success: boolean; data: { cleaned: number } }>('/api/admin/storage/trash/cleanup', { method: 'POST' })
    showToast(`已清理 ${res.data.cleaned} 个文件`, 'success')
    fetchTrash()
  } catch (e: any) {
    showToast(e?.data?.statusMessage || '清理失败', 'error')
  }
}

// ── 暴露方法供父组件调用 ─────────────────────────────────────
defineExpose({ fetchTrash, trashTotal })
</script>

<template>
  <!-- Toast 通知 -->
  <Teleport to="body">
    <div class="fixed top-6 right-6 z-[200] flex flex-col gap-2 pointer-events-none">
      <TransitionGroup name="toast">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="pointer-events-auto px-4 py-3 rounded-xl text-sm font-medium shadow-2xl backdrop-blur-md border max-w-sm"
          :class="{
            'bg-[#30d158]/10 border-[#30d158]/25 text-[#30d158]': t.type === 'success',
            'bg-[#ff453a]/10 border-[#ff453a]/25 text-[#ff453a]': t.type === 'error',
            'bg-indigo-500/10 border-indigo-500/25 text-indigo-400': t.type === 'info',
          }"
        >
          {{ t.message }}
        </div>
      </TransitionGroup>
    </div>
  </Teleport>

  <div class="space-y-4">
    <!-- 回收站工具栏 -->
    <div class="flex items-center justify-between flex-wrap gap-2">
      <p class="text-sm text-white/60">回收站中的文件将在 30 天后自动清理</p>
      <div class="flex items-center gap-2">
        <button
          v-if="trashSelectedIds.length > 0"
          @click="handleBatchRestore"
          class="text-xs bg-[#30d158]/10 hover:bg-[#30d158]/20 text-[#30d158] border border-[#30d158]/25 rounded-full px-4 py-2 transition-all cursor-pointer"
        >还原选中 ({{ trashSelectedIds.length }})</button>
        <button
          v-if="trashSelectedIds.length > 0"
          @click="handleBatchPermanentDelete"
          class="text-xs bg-[#ff453a]/10 hover:bg-[#ff453a]/20 text-[#ff453a] border border-[#ff453a]/25 rounded-full px-4 py-2 transition-all cursor-pointer"
        >永久删除 ({{ trashSelectedIds.length }})</button>
        <button
          v-if="trashItems.length > 0"
          @click="handleEmptyTrash"
          class="text-xs bg-[#ff453a]/10 hover:bg-[#ff453a]/20 text-[#ff453a] border border-[#ff453a]/25 rounded-full px-4 py-2 transition-all cursor-pointer"
        >清空回收站</button>
        <button
          @click="handleCleanupExpired"
          class="text-xs bg-[#ff9f0a]/10 hover:bg-[#ff9f0a]/20 text-[#ff9f0a] border border-[#ff9f0a]/25 rounded-full px-4 py-2 transition-all cursor-pointer"
        >清理已过期</button>
      </div>
    </div>
    <!-- 回收站列表 -->
    <div v-if="trashFetching" class="text-center py-10 text-white/40 text-sm">加载中...</div>
    <div v-else-if="trashItems.length === 0" class="text-center py-20 text-white/30 space-y-3">
      <span class="i-lucide-trash-2 text-[48px] text-white/10 inline-block" />
      <p class="text-sm">回收站是空的</p>
    </div>
    <div v-else class="bg-white/[0.04] rounded-2xl overflow-hidden shadow-xl shadow-black/20">
      <table class="w-full text-left text-sm border-collapse">
        <thead>
          <tr class="border-b border-white/[0.05] text-white/40 uppercase tracking-widest text-[10px] bg-white/[0.005]">
            <th class="px-4 py-3 w-10 font-semibold">
              <input type="checkbox" :checked="trashSelectedIds.length === trashItems.length && trashItems.length > 0" @change="toggleTrashSelectAll" class="cursor-pointer" />
            </th>
            <th class="px-6 py-3 font-semibold font-mono">文件名</th>
            <th class="px-6 py-3 font-semibold font-mono">原桶</th>
            <th class="px-6 py-3 font-semibold font-mono">原路径</th>
            <th class="px-6 py-3 font-semibold font-mono">删除时间</th>
            <th class="px-6 py-3 font-semibold font-mono">过期时间</th>
            <th class="px-6 py-3 font-semibold font-mono text-right">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/[0.04]">
          <tr v-for="item in trashItems" :key="item.id" class="hover:bg-white/[0.02] transition-colors">
            <td class="px-4 py-3">
              <input type="checkbox" :checked="!!trashSelectedMap[item.id]" @change="toggleTrashSelect(item.id)" class="cursor-pointer" />
            </td>
            <td class="px-6 py-3 text-white/90 font-medium">{{ item.file_name }}</td>
            <td class="px-6 py-3 text-white/50 font-mono text-xs">{{ item.original_bucket }}</td>
            <td class="px-6 py-3 text-white/40 font-mono text-xs max-w-[200px] truncate" :title="item.original_path">{{ item.original_path }}</td>
            <td class="px-6 py-3 text-white/40 font-mono text-xs">{{ new Date(item.created_at).toLocaleString() }}</td>
            <td class="px-6 py-3 text-white/40 font-mono text-xs">{{ new Date(item.expires_at).toLocaleString() }}</td>
            <td class="px-6 py-3 text-right space-x-2" @click.stop>
              <button
                @click="handleRestore(item.id)"
                class="text-[11px] font-semibold bg-[#30d158]/10 hover:bg-[#30d158]/20 text-[#30d158] border border-[#30d158]/25 px-4 py-2 rounded-full transition-all cursor-pointer"
              >还原</button>
              <button
                @click="handlePermanentDelete(item)"
                class="text-[11px] font-semibold bg-[#ff453a]/10 hover:bg-[#ff453a]/20 text-[#ff453a] border border-[#ff453a]/25 px-4 py-2 rounded-full transition-all cursor-pointer"
              >永久删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <!-- 回收站分页 -->
    <div v-if="trashTotal > trashLimit" class="flex items-center justify-between text-xs text-white/40">
      <span>共 {{ trashTotal }} 项，第 {{ Math.floor(trashOffset / trashLimit) + 1 }} / {{ Math.ceil(trashTotal / trashLimit) }} 页</span>
      <div class="flex gap-2">
        <button
          :disabled="!trashHasPrev"
          @click="trashPrevPage"
          class="bg-white/[0.05] hover:bg-white/[0.10] disabled:opacity-50 border border-white/[0.08] text-white/80 disabled:text-white/30 rounded-full px-4 py-2 transition-all cursor-pointer"
        >上一页</button>
        <button
          :disabled="!trashHasNext"
          @click="trashNextPage"
          class="bg-white/[0.05] hover:bg-white/[0.10] disabled:opacity-50 border border-white/[0.08] text-white/80 disabled:text-white/30 rounded-full px-4 py-2 transition-all cursor-pointer"
        >下一页</button>
      </div>
    </div>
  </div>
</template>
