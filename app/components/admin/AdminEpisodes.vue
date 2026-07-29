<script setup lang="ts">
import AdminConfirmDialog from './AdminConfirmDialog.vue'

defineProps<{ isLoading: boolean }>()
const emit = defineEmits<{ refresh: []; toast: [msg: string, type: 'success' | 'error' | 'info'] }>()

const episodes = ref<any[]>([])
const allSeries = ref<any[]>([])
const loading = ref(false)
const selectedSeriesId = ref('')
const showModal = ref(false)
const editingItem = ref<any>(null)
const saving = ref(false)
const form = reactive({
  series_id: '', episode_number: 1, title: '', description: '',
  video_url: '', thumbnail_url: '', duration_seconds: 60,
  is_free: true, coin_cost: 0, sort_order: 1, status: 'draft' as string,
  batch_count: 0, batch_mode: false,
})
const confirmDialog = ref<InstanceType<typeof AdminConfirmDialog> | null>(null)

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    published: 'bg-[#30d158]/10 text-[#30d158] border-[#30d158]/20',
    draft: 'bg-[#ff9f0a]/10 text-[#ff9f0a] border-[#ff9f0a]/20',
    archived: 'bg-white/[0.04] text-white/30 border-white/[0.06]',
  }
  return map[s] || 'bg-white/[0.04] text-white/30 border-white/[0.06]'
}

async function fetchSeries() {
  try { const res = await $fetch<any>('/api/admin/series?pageSize=100'); allSeries.value = res.data?.items || [] } catch (_) {}
}

async function fetchEpisodes() {
  if (!selectedSeriesId.value) { episodes.value = []; return }
  loading.value = true
  try {
    const res = await $fetch<any>(`/api/admin/episodes?series_id=${selectedSeriesId.value}&pageSize=200`)
    episodes.value = res.data?.items || []
  } catch (e: any) { emit('toast', 'Failed to load: ' + (e.message || 'Error'), 'error') }
  finally { loading.value = false }
}

watch(selectedSeriesId, () => fetchEpisodes())

function openCreate() {
  editingItem.value = null
  form.series_id = selectedSeriesId.value
  form.episode_number = episodes.value.length + 1
  form.title = ''; form.description = ''; form.video_url = ''; form.thumbnail_url = ''
  form.duration_seconds = 60; form.is_free = true; form.coin_cost = 0
  form.sort_order = episodes.value.length + 1; form.status = 'draft'
  form.batch_count = 0; form.batch_mode = false
  showModal.value = true
}

function openEdit(ep: any) {
  editingItem.value = ep
  form.series_id = ep.series_id; form.episode_number = ep.episode_number
  form.title = ep.title; form.description = ep.description || ''
  form.video_url = ep.video_url || ''; form.thumbnail_url = ep.thumbnail_url || ''
  form.duration_seconds = ep.duration_seconds || 60
  form.is_free = ep.is_free; form.coin_cost = ep.coin_cost || 0
  form.sort_order = ep.sort_order; form.status = ep.status
  form.batch_count = 0; form.batch_mode = false
  showModal.value = true
}

async function save() {
  saving.value = true
  try {
    const body: Record<string, any> = { ...form }
    delete (body as any).batch_count; delete (body as any).batch_mode

    if (form.batch_mode && !editingItem.value && form.batch_count > 1) {
      // Batch create
      for (let i = 0; i < form.batch_count; i++) {
        await $fetch('/api/admin/episodes', {
          method: 'POST',
          body: { ...body, episode_number: form.episode_number + i, sort_order: form.sort_order + i, title: `${form.title} - Episode ${form.episode_number + i}` }
        })
      }
      emit('toast', `${form.batch_count} episodes created`, 'success')
    } else if (editingItem.value) {
      await $fetch(`/api/admin/episodes/${editingItem.value.id}`, { method: 'PATCH', body })
      emit('toast', 'Episode updated', 'success')
    } else {
      await $fetch('/api/admin/episodes', { method: 'POST', body })
      emit('toast', 'Episode created', 'success')
    }
    showModal.value = false
    await fetchEpisodes()
  } catch (e: any) { emit('toast', 'Save failed: ' + (e.data?.statusMessage || e.message || 'Error'), 'error') }
  finally { saving.value = false }
}

async function deleteEpisode(ep: any) {
  const ok = await confirmDialog.value?.show(`Delete "${ep.title}"?`, { confirmLabel: 'Delete', confirmClass: 'btn-danger' })
  if (!ok) return
  try {
    await $fetch(`/api/admin/episodes/${ep.id}`, { method: 'DELETE' })
    emit('toast', 'Episode deleted', 'success')
    await fetchEpisodes()
  } catch (e: any) { emit('toast', 'Delete failed: ' + (e.message || 'Error'), 'error') }
}

onMounted(() => fetchSeries())
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-white/90 text-lg font-semibold">分集管理</h2>
      <div class="flex gap-2">
        <select v-model="selectedSeriesId" class="bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/70 outline-none min-w-[200px]">
          <option value="">— 选择剧集 —</option>
          <option v-for="s in allSeries" :key="s.id" :value="s.id">{{ s.title }}</option>
        </select>
        <button @click="openCreate" :disabled="!selectedSeriesId" class="px-4 py-2 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-sm hover:bg-indigo-500/30 transition disabled:opacity-30">+ 新建分集</button>
      </div>
    </div>

    <div v-if="!selectedSeriesId" class="text-center py-16 text-white/25">
      <span class="i-lucide-clapperboard text-4xl block mx-auto mb-3" />
      请先选择一部剧集
    </div>

    <div v-else class="bg-white/[0.04] rounded-2xl overflow-hidden shadow-xl shadow-black/20">
      <div class="overflow-x-auto max-h-[60vh]">
        <table class="w-full text-left text-sm border-collapse">
          <thead class="sticky top-0 z-10 bg-[#0d0d18]/95 backdrop-blur-sm">
            <tr>
              <th class="px-5 py-3 text-white/40 uppercase tracking-widest text-[10px] font-semibold font-mono w-16">#</th>
              <th class="px-5 py-3 text-white/40 uppercase tracking-widest text-[10px] font-semibold font-mono">标题</th>
              <th class="px-5 py-3 text-white/40 uppercase tracking-widest text-[10px] font-semibold font-mono">时长</th>
              <th class="px-5 py-3 text-white/40 uppercase tracking-widest text-[10px] font-semibold font-mono">免费/付费</th>
              <th class="px-5 py-3 text-white/40 uppercase tracking-widest text-[10px] font-semibold font-mono">金币</th>
              <th class="px-5 py-3 text-white/40 uppercase tracking-widest text-[10px] font-semibold font-mono">状态</th>
              <th class="px-5 py-3 text-white/40 uppercase tracking-widest text-[10px] font-semibold font-mono w-32">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ep in episodes" :key="ep.id" class="border-b border-white/[0.04] hover:bg-white/[0.02] transition">
              <td class="px-5 py-3 text-white/40 font-mono">{{ ep.episode_number }}</td>
              <td class="px-5 py-3 text-white/80 font-medium max-w-[250px] truncate">{{ ep.title }}</td>
              <td class="px-5 py-3 text-white/50 font-mono text-xs">{{ Math.floor(ep.duration_seconds / 60) }}:{{ String(ep.duration_seconds % 60).padStart(2, '0') }}</td>
              <td class="px-5 py-3">
                <span class="text-xs" :class="ep.is_free ? 'text-green-400' : 'text-yellow-400'">{{ ep.is_free ? 'Free' : 'Paid' }}</span>
              </td>
              <td class="px-5 py-3 text-white/50 font-mono">{{ ep.coin_cost || '—' }}</td>
              <td class="px-5 py-3">
                <span class="inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full border" :class="statusBadge(ep.status)">{{ ep.status }}</span>
              </td>
              <td class="px-5 py-3">
                <div class="flex gap-2">
                  <button @click="openEdit(ep)" class="text-xs text-indigo-400 hover:text-indigo-300 transition">编辑</button>
                  <button @click="deleteEpisode(ep)" class="text-xs text-red-400 hover:text-red-300 transition">删除</button>
                </div>
              </td>
            </tr>
            <tr v-if="episodes.length === 0 && !loading">
              <td colspan="7" class="px-5 py-10 text-center text-white/25">暂无分集，点击上方按钮创建</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" @click.self="showModal = false">
        <div class="bg-[#0e0e12] border border-white/[0.08] rounded-2xl p-6 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <h3 class="text-white/90 text-base font-semibold mb-4">{{ editingItem ? '编辑分集' : (form.batch_mode ? '批量创建分集' : '新建分集') }}</h3>
          <div class="space-y-4">
            <div v-if="!editingItem" class="flex items-center gap-2 mb-2">
              <label class="flex items-center gap-2 cursor-pointer">
                <input v-model="form.batch_mode" type="checkbox" class="rounded" />
                <span class="text-sm text-white/60">批量模式</span>
              </label>
            </div>
            <div v-if="form.batch_mode && !editingItem" class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide block mb-1">起始集号</label>
                <input v-model.number="form.episode_number" type="number" class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none" />
              </div>
              <div>
                <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide block mb-1">创建数量</label>
                <input v-model.number="form.batch_count" type="number" min="1" max="100" class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none" />
              </div>
            </div>
            <template v-if="!form.batch_mode || editingItem">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide block mb-1">集号</label>
                  <input v-model.number="form.episode_number" type="number" class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none" />
                </div>
                <div>
                  <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide block mb-1">时长 (秒)</label>
                  <input v-model.number="form.duration_seconds" type="number" class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none" />
                </div>
              </div>
            </template>
            <div>
              <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide block mb-1">标题</label>
              <input v-model="form.title" class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none" />
            </div>
            <div>
              <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide block mb-1">描述</label>
              <textarea v-model="form.description" rows="2" class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none resize-none" />
            </div>
            <div>
              <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide block mb-1">视频 URL</label>
              <input v-model="form.video_url" class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none font-mono" placeholder="https://..." />
            </div>
            <div>
              <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide block mb-1">缩略图 URL</label>
              <input v-model="form.thumbnail_url" class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none" />
            </div>
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide block mb-1">类型</label>
                <select v-model="form.is_free" class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none">
                  <option :value="true">免费</option>
                  <option :value="false">付费</option>
                </select>
              </div>
              <div>
                <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide block mb-1">金币价格</label>
                <input v-model.number="form.coin_cost" type="number" :disabled="form.is_free" class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none disabled:opacity-30" />
              </div>
              <div>
                <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide block mb-1">状态</label>
                <select v-model="form.status" class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
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
