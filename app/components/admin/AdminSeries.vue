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
const errors = reactive<Record<string, string>>({})
const confirmDialog = ref<InstanceType<typeof AdminConfirmDialog> | null>(null)

function validate(): boolean {
  errors.title = ''; errors.slug = ''; errors.genre_id = ''
  if (!form.title.trim()) errors.title = '请输入剧集标题'
  if (!form.slug.trim()) errors.slug = '请输入 Slug'
  else if (!/^[a-z0-9-]+$/.test(form.slug)) errors.slug = 'Slug 只能包含小写字母、数字和连字符'
  if (!form.genre_id) errors.genre_id = '请选择分类'
  return !errors.title && !errors.slug && !errors.genre_id
}

const statusLabels: Record<string, string> = { draft: 'Draft', published: 'Published', completed: 'Completed', archived: 'Archived' }
const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    published: 'bg-green-100 text-green-700 border-green-200',
    draft: 'bg-amber-100 text-amber-700 border-amber-200',
    completed: 'bg-blue-100 text-blue-700 border-blue-200',
    archived: 'bg-gray-100 text-gray-400 border-gray-200',
  }
  return map[s] || 'bg-gray-100 text-gray-400 border-gray-200'
}

async function fetchData() {
  loading.value = true
  try {
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
  editingItem.value = null; errors.title = ''; errors.slug = ''; errors.genre_id = ''
  form.title = ''; form.slug = ''; form.description = ''; form.cover_image = ''; form.poster_image = ''
  form.genre_id = ''; form.tags = []; form.tagsInput = ''; form.status = 'published'
  form.total_episodes = 0; form.free_episodes = 999; form.is_featured = true; form.sort_order = series.value.length + 1
  newGenreName.value = ''; showNewGenre.value = false
  showModal.value = true
}

function openEdit(s: any) {
  editingItem.value = s; errors.title = ''; errors.slug = ''; errors.genre_id = ''
  form.title = s.title; form.slug = s.slug; form.description = s.description || ''
  form.cover_image = s.cover_image || ''; form.poster_image = s.poster_image || ''
  form.genre_id = s.genre_id || ''; form.tags = s.tags || []; form.tagsInput = ''
  form.status = s.status; form.total_episodes = s.total_episodes
  form.free_episodes = s.free_episodes || 5; form.is_featured = s.is_featured; form.sort_order = s.sort_order
  showModal.value = true
}

// Slug 自动生成：中文用拼音首字母 + 时间戳，英文直接转
function autoSlug(title: string) {
  if (!title) return ''
  // 如果包含英文，直接转 slug
  const hasEnglish = /[a-zA-Z]/.test(title)
  if (hasEnglish) {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }
  // 纯中文：用 title 的字数 + 简写
  const clean = title.replace(/\s+/g, '-').replace(/[^\w一-鿿-]/g, '')
  return clean.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '') || `series-${Date.now().toString(36)}`
}

// 监听标题变化自动填 slug（仅新建时）
watch(() => form.title, (val) => {
  if (!editingItem.value && (!form.slug || form.slug === autoSlug(prevTitle))) {
    form.slug = autoSlug(val)
  }
  prevTitle = autoSlug(val)
})
let prevTitle = ''

// 新建分类
const showNewGenre = ref(false)
const newGenreName = ref('')
const newGenreSlug = ref('')
const creatingGenre = ref(false)

watch(newGenreName, (val) => {
  if (showNewGenre.value) {
    newGenreSlug.value = val.toLowerCase().replace(/[^a-z0-9一-鿿]+/g, '-').replace(/^-|-$/g, '')
  }
})

async function createGenre() {
  const name = newGenreName.value.trim()
  if (!name) return
  creatingGenre.value = true
  try {
    const slug = newGenreSlug.value || name.toLowerCase().replace(/\s+/g, '-')
    const res = await $fetch<any>('/api/admin/genres', {
      method: 'POST',
      body: { name, slug, icon: 'i-lucide-tag', sort_order: genres.value.length + 1 }
    })
    if (res.data) {
      genres.value.push(res.data)
      form.genre_id = res.data.id
      emit('toast', `分类「${name}」已创建`, 'success')
    }
    showNewGenre.value = false
    newGenreName.value = ''
  } catch (e: any) {
    emit('toast', '创建分类失败: ' + (e.data?.statusMessage || e.message || 'Error'), 'error')
  } finally { creatingGenre.value = false }
}

function addTag() {
  const tag = form.tagsInput.trim()
  if (tag && !form.tags.includes(tag)) form.tags.push(tag)
  form.tagsInput = ''
}

function removeTag(tag: string) { form.tags = form.tags.filter(t => t !== tag) }

async function save() {
  if (!validate()) return
  saving.value = true
  try {
    const body: Record<string, any> = { ...form }
    delete (body as any).tagsInput
    if (editingItem.value) {
      await $fetch(`/api/admin/series/${editingItem.value.id}`, { method: 'PATCH', body })
      emit('toast', '剧集已更新', 'success')
    } else {
      await $fetch('/api/admin/series', { method: 'POST', body })
      emit('toast', '剧集已创建', 'success')
    }
    showModal.value = false
    await fetchData()
  } catch (e: any) { emit('toast', '保存失败: ' + (e.data?.statusMessage || e.message || 'Error'), 'error') }
  finally { saving.value = false }
}

async function deleteSeries(s: any) {
  const ok = await confirmDialog.value?.show(`确定删除「${s.title}」？所有分集也会被删除。`, { confirmLabel: '删除', confirmClass: 'btn-danger' })
  if (!ok) return
  try {
    await $fetch(`/api/admin/series/${s.id}`, { method: 'DELETE' })
    emit('toast', '剧集已删除', 'success')
    await fetchData()
  } catch (e: any) { emit('toast', '删除失败: ' + (e.message || 'Error'), 'error') }
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
              <td colspan="8" class="px-5 py-10 text-center text-white/25">暂无剧集，点击「+ 新建剧集」开始</td>
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

    <!-- LIGHT MODAL -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" @click.self="showModal = false">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <!-- Modal Header -->
          <div class="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 rounded-t-2xl z-10">
            <h3 class="text-gray-900 text-lg font-bold">{{ editingItem ? '编辑剧集' : '新建剧集' }}</h3>
          </div>

          <div class="p-6 space-y-5">
            <!-- 标题 -->
            <div>
              <label class="text-sm font-semibold text-gray-700 mb-1.5 block">
                标题 <span class="text-red-500">*</span>
              </label>
              <input v-model="form.title" @input="errors.title = ''" placeholder="输入剧集标题"
                class="w-full bg-gray-50 border rounded-lg px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                :class="errors.title ? 'border-red-300 bg-red-50' : 'border-gray-200'" />
              <p v-if="errors.title" class="text-red-500 text-xs mt-1">{{ errors.title }}</p>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <!-- Slug -->
              <div>
                <label class="text-sm font-semibold text-gray-700 mb-1.5 block">
                  Slug <span class="text-red-500">*</span>
                  <span class="text-gray-400 font-normal text-xs ml-1">（URL 标识，输入标题自动生成）</span>
                </label>
                <input v-model="form.slug" @input="errors.slug = ''" placeholder="billionaire-double-life"
                  class="w-full bg-gray-50 border rounded-lg px-4 py-2.5 text-sm text-gray-900 font-mono outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  :class="errors.slug ? 'border-red-300 bg-red-50' : 'border-gray-200'" />
                <p v-if="errors.slug" class="text-red-500 text-xs mt-1">{{ errors.slug }}</p>
              </div>
              <!-- 分类 -->
              <div>
                <label class="text-sm font-semibold text-gray-700 mb-1.5 block">
                  分类 <span class="text-red-500">*</span>
                </label>
                <div class="flex gap-2">
                  <select v-model="form.genre_id" @change="errors.genre_id = ''"
                    class="flex-1 bg-gray-50 border rounded-lg px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    :class="errors.genre_id ? 'border-red-300 bg-red-50' : 'border-gray-200'">
                    <option value="">选择分类...</option>
                    <option v-for="g in genres" :key="g.id" :value="g.id">{{ g.name }}</option>
                  </select>
                  <button @click="showNewGenre = !showNewGenre" type="button"
                    class="shrink-0 px-3 py-2.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200 transition">
                    {{ showNewGenre ? '✕' : '+ 新建' }}
                  </button>
                </div>
                <!-- 新建分类 -->
                <div v-if="showNewGenre" class="mt-2 p-3 bg-indigo-50 rounded-lg border border-indigo-100 space-y-2">
                  <input v-model="newGenreName" placeholder="分类名称，如：藏族舞"
                    class="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-gray-400 font-mono">slug: {{ newGenreSlug || '(自动生成)' }}</span>
                    <button @click="createGenre" :disabled="!newGenreName.trim() || creatingGenre"
                      class="ml-auto px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition">
                      {{ creatingGenre ? '创建中...' : '创建分类' }}
                    </button>
                  </div>
                </div>
                <p v-if="errors.genre_id" class="text-red-500 text-xs mt-1">{{ errors.genre_id }}</p>
              </div>
            </div>

            <!-- 描述 -->
            <div>
              <label class="text-sm font-semibold text-gray-700 mb-1.5 block">描述</label>
              <textarea v-model="form.description" rows="3" placeholder="输入剧集简介..."
                class="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none" />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-sm font-semibold text-gray-700 mb-1.5 block">封面图 URL</label>
                <input v-model="form.cover_image" placeholder="https://..."
                  class="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
              </div>
              <div>
                <label class="text-sm font-semibold text-gray-700 mb-1.5 block">海报 URL</label>
                <input v-model="form.poster_image" placeholder="https://..."
                  class="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
              </div>
            </div>

            <!-- 标签 -->
            <div>
              <label class="text-sm font-semibold text-gray-700 mb-1.5 block">标签</label>
              <div class="flex gap-2">
                <input v-model="form.tagsInput" @keyup.enter.prevent="addTag" placeholder="输入标签后按回车添加"
                  class="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
              </div>
              <div v-if="form.tags.length" class="flex flex-wrap gap-1.5 mt-2">
                <span v-for="tag in form.tags" :key="tag" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-medium border border-indigo-100">
                  {{ tag }}
                  <button @click="removeTag(tag)" class="text-indigo-400 hover:text-red-500 ml-0.5">×</button>
                </span>
              </div>
            </div>

            <div class="grid grid-cols-4 gap-4">
              <div>
                <label class="text-sm font-semibold text-gray-700 mb-1.5 block">状态</label>
                <select v-model="form.status" class="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <label class="text-sm font-semibold text-gray-700 mb-1.5 block">总集数</label>
                <input v-model.number="form.total_episodes" type="number" min="0"
                  class="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
              </div>
              <div>
                <label class="text-sm font-semibold text-gray-700 mb-1.5 block">免费集数</label>
                <input v-model.number="form.free_episodes" type="number" min="0"
                  class="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
              </div>
              <div>
                <label class="text-sm font-semibold text-gray-700 mb-1.5 block">排序</label>
                <input v-model.number="form.sort_order" type="number" min="0"
                  class="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
              </div>
            </div>

            <label class="flex items-center gap-2 cursor-pointer pt-1">
              <input v-model="form.is_featured" type="checkbox" class="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              <span class="text-sm text-gray-700 font-medium">⭐ 设为精选推荐</span>
            </label>
          </div>

          <!-- Modal Footer -->
          <div class="sticky bottom-0 bg-gray-50 border-t border-gray-100 px-6 py-4 rounded-b-2xl flex justify-end gap-3">
            <button @click="showModal = false" class="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-200 transition">取消</button>
            <button @click="save" :disabled="saving" class="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2 shadow-sm">
              <span v-if="saving" class="i-lucide-loader-circle animate-spin text-xs" />
              {{ editingItem ? '保存修改' : '创建剧集' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <AdminConfirmDialog ref="confirmDialog" />
  </div>
</template>
