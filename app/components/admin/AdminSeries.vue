<script setup lang="ts">
import AdminConfirmDialog from './AdminConfirmDialog.vue'

defineProps<{ isLoading: boolean }>()
const emit = defineEmits<{ refresh: []; toast: [msg: string, type: 'success' | 'error' | 'info'] }>()

const series = ref<any[]>([])
const genres = ref<any[]>([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const searchQuery = ref('')
const statusFilter = ref('')
const showModal = ref(false)
const editingItem = ref<any>(null)
const saving = ref(false)
const form = reactive({
  title: '', slug: '', description: '', cover_image: '', poster_image: '',
  genre_id: '', tags: [] as string[], tagsInput: '',
  status: 'draft' as string, total_episodes: 0, free_episodes: 5,
  is_featured: false, sort_order: 1,
})
const confirmDialog = ref<InstanceType<typeof AdminConfirmDialog> | null>(null)

const statusLabels: Record<string, string> = { draft: 'Draft', published: 'Published', completed: 'Completed', archived: 'Archived' }
const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    published: 'bg-[#30d158]/10 text-[#30d158] border-[#30d158]/20',
    draft: 'bg-[#ff9f0a]/10 text-[#ff9f0a] border-[#ff9f0a]/20',
    completed: 'bg-[#64d2ff]/10 text-[#64d2ff] border-[#64d2ff]/20',
    archived: 'bg-white/[0.04] text-white/30 border-white/[0.06]',
  }
  return map[s] || 'bg-white/[0.04] text-white/30 border-white/[0.06]'
}

async function fetchData() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    params.set('page', String(page.value)); params.set('pageSize', String(page.value))
    if (searchQuery.value) params.set('search', searchQuery.value)
    if (statusFilter.value) params.set('status', statusFilter.value)
    const res = await $fetch<any>(`/api/admin/series?page=${page.value}&pageSize=${pageSize.value}`)
    series.value = res.data?.items || []
    total.value = res.data?.pagination?.total || 0
  } catch (e: any) { emit('toast', 'Failed to load: ' + (e.message || 'Error'), 'error') }
  finally { loading.value = false }
}

async function fetchGenres() {
  try { const res = await $fetch<any>('/api/admin/genres'); genres.value = res.data?.items || [] } catch (_) {}
}

function openCreate() {
  editingItem.value = null
  form.title = ''; form.slug = ''; form.description = ''; form.cover_image = ''; form.poster_image = ''
  form.genre_id = ''; form.tags = []; form.tagsInput = ''; form.status = 'draft'
  form.total_episodes = 0; form.free_episodes = 5; form.is_featured = false; form.sort_order = series.value.length + 1
  showModal.value = true
}

function openEdit(s: any) {
  editingItem.value = s
  form.title = s.title; form.slug = s.slug; form.description = s.description || ''
  form.cover_image = s.cover_image || ''; form.poster_image = s.poster_image || ''
  form.genre_id = s.genre_id || ''; form.tags = s.tags || []; form.tagsInput = ''
  form.status = s.status; form.total_episodes = s.total_episodes
  form.free_episodes = s.free_episodes || 5; form.is_featured = s.is_featured; form.sort_order = s.sort_order
  showModal.value = true
}

function addTag() {
  const tag = form.tagsInput.trim()
  if (tag && !form.tags.includes(tag)) form.tags.push(tag)
  form.tagsInput = ''
}

function removeTag(tag: string) { form.tags = form.tags.filter(t => t !== tag) }

async function save() {
  saving.value = true
  try {
    const body: Record<string, any> = { ...form }
    delete (body as any).tagsInput
    if (editingItem.value) {
      await $fetch(`/api/admin/series/${editingItem.value.id}`, { method: 'PATCH', body })
      emit('toast', 'Series updated', 'success')
    } else {
      await $fetch('/api/admin/series', { method: 'POST', body })
      emit('toast', 'Series created', 'success')
    }
    showModal.value = false
    await fetchData()
  } catch (e: any) { emit('toast', 'Save failed: ' + (e.data?.statusMessage || e.message || 'Error'), 'error') }
  finally { saving.value = false }
}

async function deleteSeries(s: any) {
  const ok = await confirmDialog.value?.show(`Delete "${s.title}"? This will also delete all episodes.`, { confirmLabel: 'Delete', confirmClass: 'btn-danger' })
  if (!ok) return
  try {
    await $fetch(`/api/admin/series/${s.id}`, { method: 'DELETE' })
    emit('toast', 'Series deleted', 'success')
    await fetchData()
  } catch (e: any) { emit('toast', 'Delete failed: ' + (e.message || 'Error'), 'error') }
}

function changePage(p: number) { page.value = p; fetchData() }

onMounted(() => { fetchData(); fetchGenres() })
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-white/90 text-lg font-semibold">剧集管理</h2>
      <div class="flex gap-2">
        <input v-model="searchQuery" @keyup.enter="page = 1; fetchData()" placeholder="搜索剧集..." class="bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white/70 outline-none w-48 focus:border-indigo-500/40" />
        <select v-model="statusFilter" @change="page = 1; fetchData()" class="bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white/70 outline-none">
          <option value="">全部状态</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
        <button @click="openCreate" class="px-4 py-2 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-sm hover:bg-indigo-500/30 transition">+ 新建剧集</button>
      </div>
    </div>

    <div class="bg-white/[0.04] rounded-2xl overflow-hidden shadow-xl shadow-black/20">
      <div class="overflow-x-auto max-h-[60vh]">
        <table class="w-full text-left text-sm border-collapse">
          <thead class="sticky top-0 z-10 bg-[#0d0d18]/95 backdrop-blur-sm">
            <tr>
              <th class="px-5 py-3 text-white/40 uppercase tracking-widest text-[10px] font-semibold font-mono">封面</th>
              <th class="px-5 py-3 text-white/40 uppercase tracking-widest text-[10px] font-semibold font-mono">标题</th>
              <th class="px-5 py-3 text-white/40 uppercase tracking-widest text-[10px] font-semibold font-mono">Slug</th>
              <th class="px-5 py-3 text-white/40 uppercase tracking-widest text-[10px] font-semibold font-mono">状态</th>
              <th class="px-5 py-3 text-white/40 uppercase tracking-widest text-[10px] font-semibold font-mono">集数</th>
              <th class="px-5 py-3 text-white/40 uppercase tracking-widest text-[10px] font-semibold font-mono">评分</th>
              <th class="px-5 py-3 text-white/40 uppercase tracking-widest text-[10px] font-semibold font-mono">推荐</th>
              <th class="px-5 py-3 text-white/40 uppercase tracking-widest text-[10px] font-semibold font-mono w-32">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in series" :key="s.id" class="border-b border-white/[0.04] hover:bg-white/[0.02] transition">
              <td class="px-5 py-3">
                <img v-if="s.cover_image" :src="s.cover_image" class="w-10 h-14 rounded object-cover" alt="" />
                <div v-else class="w-10 h-14 rounded bg-white/[0.04]" />
              </td>
              <td class="px-5 py-3 text-white/80 font-medium max-w-[200px] truncate">{{ s.title }}</td>
              <td class="px-5 py-3 text-white/40 font-mono text-xs">{{ s.slug }}</td>
              <td class="px-5 py-3">
                <span class="inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full border" :class="statusBadge(s.status)">{{ statusLabels[s.status] || s.status }}</span>
              </td>
              <td class="px-5 py-3 text-white/50">{{ s.total_episodes }}</td>
              <td class="px-5 py-3 text-yellow-400 font-mono">{{ s.rating || '—' }}</td>
              <td class="px-5 py-3">
                <span v-if="s.is_featured" class="text-yellow-400 text-xs">⭐</span>
                <span v-else class="text-white/15">—</span>
              </td>
              <td class="px-5 py-3">
                <div class="flex gap-2">
                  <button @click="openEdit(s)" class="text-xs text-indigo-400 hover:text-indigo-300 transition">编辑</button>
                  <button @click="deleteSeries(s)" class="text-xs text-red-400 hover:text-red-300 transition">删除</button>
                </div>
              </td>
            </tr>
            <tr v-if="series.length === 0 && !loading">
              <td colspan="8" class="px-5 py-10 text-center text-white/25">暂无剧集</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="total > pageSize" class="flex items-center justify-between px-5 py-3 bg-white/[0.02] border-t border-white/[0.04]">
        <span class="text-white/30 text-xs">共 {{ total }} 条</span>
        <div class="flex gap-2">
          <button @click="changePage(page - 1)" :disabled="page <= 1" class="px-3 py-1 rounded-lg bg-white/5 text-white/50 text-xs hover:bg-white/10 disabled:opacity-30 transition">上一页</button>
          <span class="text-white/40 text-xs px-2 py-1">{{ page }} / {{ Math.ceil(total / pageSize) }}</span>
          <button @click="changePage(page + 1)" :disabled="page >= Math.ceil(total / pageSize)" class="px-3 py-1 rounded-lg bg-white/5 text-white/50 text-xs hover:bg-white/10 disabled:opacity-30 transition">下一页</button>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" @click.self="showModal = false">
        <div class="bg-[#0e0e12] border border-white/[0.08] rounded-2xl p-6 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <h3 class="text-white/90 text-base font-semibold mb-4">{{ editingItem ? '编辑剧集' : '新建剧集' }}</h3>
          <div class="grid grid-cols-2 gap-4">
            <div class="col-span-2">
              <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide block mb-1">标题</label>
              <input v-model="form.title" class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none" />
            </div>
            <div>
              <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide block mb-1">Slug</label>
              <input v-model="form.slug" class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none font-mono" />
            </div>
            <div>
              <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide block mb-1">分类</label>
              <select v-model="form.genre_id" class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none">
                <option value="">选择分类</option>
                <option v-for="g in genres" :key="g.id" :value="g.id">{{ g.name }}</option>
              </select>
            </div>
            <div class="col-span-2">
              <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide block mb-1">描述</label>
              <textarea v-model="form.description" rows="3" class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none resize-none" />
            </div>
            <div>
              <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide block mb-1">封面图 URL</label>
              <input v-model="form.cover_image" class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none" />
            </div>
            <div>
              <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide block mb-1">海报 URL</label>
              <input v-model="form.poster_image" class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none" />
            </div>
            <div>
              <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide block mb-1">标签 (回车添加)</label>
              <input v-model="form.tagsInput" @keyup.enter.prevent="addTag" class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none" placeholder="输入标签后按回车" />
              <div class="flex flex-wrap gap-1 mt-2">
                <span v-for="tag in form.tags" :key="tag" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 text-[10px] border border-indigo-500/20">
                  {{ tag }}
                  <button @click="removeTag(tag)" class="hover:text-red-400">×</button>
                </span>
              </div>
            </div>
            <div>
              <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide block mb-1">状态</label>
              <select v-model="form.status" class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide block mb-1">总集数</label>
                <input v-model.number="form.total_episodes" type="number" class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none" />
              </div>
              <div>
                <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide block mb-1">免费集数</label>
                <input v-model.number="form.free_episodes" type="number" class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none" />
              </div>
              <div>
                <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide block mb-1">排序</label>
                <input v-model.number="form.sort_order" type="number" class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none" />
              </div>
            </div>
            <div class="flex items-center gap-3">
              <label class="flex items-center gap-2 cursor-pointer">
                <input v-model="form.is_featured" type="checkbox" class="rounded" />
                <span class="text-sm text-white/60">精选推荐</span>
              </label>
            </div>
          </div>
          <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-white/[0.06]">
            <button @click="showModal = false" class="px-4 py-2 rounded-lg text-sm text-white/50 hover:text-white/80 transition">取消</button>
            <button @click="save" :disabled="saving" class="px-4 py-2 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-sm hover:bg-indigo-500/30 transition flex items-center gap-2">
              <span v-if="saving" class="i-lucide-loader-circle animate-spin text-xs" />
              保存
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <AdminConfirmDialog ref="confirmDialog" />
  </div>
</template>
