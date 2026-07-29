<script setup lang="ts">
import AdminConfirmDialog from './AdminConfirmDialog.vue'

defineProps<{ isLoading: boolean }>()
const emit = defineEmits<{ refresh: []; toast: [msg: string, type: 'success' | 'error' | 'info'] }>()

const genres = ref<any[]>([])
const loading = ref(false)
const showModal = ref(false)
const editingGenre = ref<any>(null)
const form = reactive({ name: '', slug: '', icon: '', sort_order: 0 })
const confirmDialog = ref<InstanceType<typeof AdminConfirmDialog> | null>(null)

async function fetchGenres() {
  loading.value = true
  try {
    const res = await $fetch<any>('/api/admin/genres')
    genres.value = res.data?.items || []
  } catch (e: any) { emit('toast', 'Failed to load genres: ' + (e.message || 'Error'), 'error') }
  finally { loading.value = false }
}

function openCreate() {
  editingGenre.value = null
  form.name = ''; form.slug = ''; form.icon = ''; form.sort_order = genres.value.length + 1
  showModal.value = true
}

function openEdit(genre: any) {
  editingGenre.value = genre
  form.name = genre.name; form.slug = genre.slug; form.icon = genre.icon || ''; form.sort_order = genre.sort_order
  showModal.value = true
}

async function save() {
  try {
    if (editingGenre.value) {
      await $fetch(`/api/admin/genres/${editingGenre.value.id}`, { method: 'PATCH', body: { ...form } })
      emit('toast', 'Genre updated', 'success')
    } else {
      await $fetch('/api/admin/genres', { method: 'POST', body: { ...form } })
      emit('toast', 'Genre created', 'success')
    }
    showModal.value = false
    await fetchGenres()
  } catch (e: any) { emit('toast', 'Save failed: ' + (e.message || 'Error'), 'error') }
}

async function deleteGenre(genre: any) {
  const ok = await confirmDialog.value?.show(`Delete "${genre.name}"?`, { confirmLabel: 'Delete', confirmClass: 'btn-danger' })
  if (!ok) return
  try {
    await $fetch(`/api/admin/genres/${genre.id}`, { method: 'DELETE' })
    emit('toast', 'Genre deleted', 'success')
    await fetchGenres()
  } catch (e: any) { emit('toast', 'Delete failed: ' + (e.message || 'Error'), 'error') }
}

onMounted(() => fetchGenres())
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-white/90 text-lg font-semibold">分类标签管理</h2>
      <button @click="openCreate" class="px-4 py-2 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-sm hover:bg-indigo-500/30 transition">+ 新建分类</button>
    </div>

    <div class="bg-white/[0.04] rounded-2xl overflow-hidden shadow-xl shadow-black/20">
      <div class="overflow-x-auto max-h-[60vh]">
        <table class="w-full text-left text-sm border-collapse">
          <thead class="sticky top-0 z-10 bg-[#0d0d18]/95 backdrop-blur-sm">
            <tr>
              <th class="px-5 py-3 text-white/40 uppercase tracking-widest text-[10px] font-semibold font-mono">图标</th>
              <th class="px-5 py-3 text-white/40 uppercase tracking-widest text-[10px] font-semibold font-mono">名称</th>
              <th class="px-5 py-3 text-white/40 uppercase tracking-widest text-[10px] font-semibold font-mono">Slug</th>
              <th class="px-5 py-3 text-white/40 uppercase tracking-widest text-[10px] font-semibold font-mono">排序</th>
              <th class="px-5 py-3 text-white/40 uppercase tracking-widest text-[10px] font-semibold font-mono w-24">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="g in genres" :key="g.id" class="border-b border-white/[0.04] hover:bg-white/[0.02] transition">
              <td class="px-5 py-3"><span :class="g.icon || 'i-lucide-tag'" class="text-white/60 text-lg" /></td>
              <td class="px-5 py-3 text-white/80 font-medium">{{ g.name }}</td>
              <td class="px-5 py-3 text-white/40 font-mono text-xs">{{ g.slug }}</td>
              <td class="px-5 py-3 text-white/50">{{ g.sort_order }}</td>
              <td class="px-5 py-3">
                <div class="flex gap-2">
                  <button @click="openEdit(g)" class="text-xs text-indigo-400 hover:text-indigo-300 transition">编辑</button>
                  <button @click="deleteGenre(g)" class="text-xs text-red-400 hover:text-red-300 transition">删除</button>
                </div>
              </td>
            </tr>
            <tr v-if="genres.length === 0 && !loading">
              <td colspan="5" class="px-5 py-10 text-center text-white/25">暂无分类，点击上方按钮创建</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" @click.self="showModal = false">
        <div class="bg-[#0e0e12] border border-white/[0.08] rounded-2xl p-6 shadow-2xl w-full max-w-md">
          <h3 class="text-white/90 text-base font-semibold mb-4">{{ editingGenre ? '编辑分类' : '新建分类' }}</h3>
          <div class="space-y-4">
            <div>
              <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide block mb-1">名称</label>
              <input v-model="form.name" class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none" placeholder="Romance" />
            </div>
            <div>
              <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide block mb-1">Slug</label>
              <input v-model="form.slug" class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none" placeholder="romance" />
            </div>
            <div>
              <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide block mb-1">图标 (Lucide class)</label>
              <input v-model="form.icon" class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none" placeholder="i-lucide-heart" />
            </div>
            <div>
              <label class="text-[11px] font-semibold text-white/40 uppercase tracking-wide block mb-1">排序</label>
              <input v-model.number="form.sort_order" type="number" class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none" />
            </div>
          </div>
          <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-white/[0.06]">
            <button @click="showModal = false" class="px-4 py-2 rounded-lg text-sm text-white/50 hover:text-white/80 transition">取消</button>
            <button @click="save" class="px-4 py-2 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-sm hover:bg-indigo-500/30 transition">保存</button>
          </div>
        </div>
      </div>
    </Teleport>

    <AdminConfirmDialog ref="confirmDialog" />
  </div>
</template>
