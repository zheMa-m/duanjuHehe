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
const errors = reactive<Record<string, string>>({})
const confirmDialog = ref<InstanceType<typeof AdminConfirmDialog> | null>(null)

// ─── 视频文件上传 ───
const { upload } = useStorage()
const videoUploading = ref(false)
const videoUploadProgress = ref(0)
const videoUploadName = ref('')
const videoFileInput = ref<HTMLInputElement | null>(null)

function triggerVideoPick() {
  videoFileInput.value?.click()
}

// 从视频文件中提取一帧作为缩略图
function captureVideoFrame(file: File, timeSec = 1): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'auto'
    video.muted = true
    video.src = url
    video.onloadeddata = () => { video.currentTime = Math.min(timeSec, video.duration * 0.3 || 1) }
    video.onseeked = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 400
      canvas.height = Math.round(400 * (video.videoHeight / video.videoWidth)) || 600
      canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(blob => { resolve(blob); video.remove(); URL.revokeObjectURL(url) }, 'image/png')
    }
    video.onerror = () => { resolve(null); video.remove(); URL.revokeObjectURL(url) }
    setTimeout(() => { resolve(null); video.remove(); URL.revokeObjectURL(url) }, 8000)
  })
}

async function handleVideoFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  videoUploadName.value = file.name
  videoUploading.value = true
  videoUploadProgress.value = 0

  try {
    // 1. 上传视频
    const result = await upload(file, 'series-videos', {
      onProgress: (pct) => { videoUploadProgress.value = pct },
    })
    form.video_url = result.publicUrl || result.path
    errors.video_url = ''

    // 2. 提取缩略图并上传
    videoUploadName.value = '生成缩略图...'
    const thumbBlob = await captureVideoFrame(file)
    if (thumbBlob) {
      const thumbFile = new File([thumbBlob], file.name.replace(/\.[^.]+$/, '.png'), { type: 'image/png' })
      const thumbResult = await upload(thumbFile, 'series-videos')
      form.thumbnail_url = thumbResult.publicUrl || thumbResult.path || ''
    }

    emit('toast', `上传成功: ${file.name}` + (thumbBlob ? '（含缩略图）' : ''), 'success')
  } catch (err: any) {
    emit('toast', '上传失败: ' + (err.message || 'Error'), 'error')
  } finally {
    videoUploading.value = false
    videoUploadProgress.value = 0
    videoUploadName.value = ''
    if (input) input.value = ''
  }
}

function validate(): boolean {
  errors.title = ''; errors.video_url = ''
  if (!form.title.trim()) errors.title = '请输入分集标题'
  if (!editingItem.value && !form.batch_mode) {
    if (!form.video_url.trim()) errors.video_url = '请输入视频 URL'
  }
  return !errors.title && !errors.video_url
}

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    published: 'bg-green-100 text-green-700 border-green-200',
    draft: 'bg-amber-100 text-amber-700 border-amber-200',
    archived: 'bg-gray-100 text-gray-400 border-gray-200',
  }
  return map[s] || 'bg-gray-100 text-gray-400 border-gray-200'
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
  } catch (e: any) { emit('toast', '加载失败: ' + (e.message || 'Error'), 'error') }
  finally { loading.value = false }
}

watch(selectedSeriesId, () => fetchEpisodes())

function openCreate() {
  editingItem.value = null; errors.title = ''; errors.video_url = ''
  form.series_id = selectedSeriesId.value
  form.episode_number = episodes.value.length + 1
  form.title = ''; form.description = ''; form.video_url = ''; form.thumbnail_url = ''
  form.duration_seconds = 60; form.is_free = true; form.coin_cost = 0
  form.sort_order = episodes.value.length + 1; form.status = 'published'
  form.batch_count = 0; form.batch_mode = false
  showModal.value = true
}

function openEdit(ep: any) {
  editingItem.value = ep; errors.title = ''; errors.video_url = ''
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
  if (!form.batch_mode && !validate()) return
  saving.value = true
  try {
    const body: Record<string, any> = { ...form }
    delete (body as any).batch_count; delete (body as any).batch_mode

    if (form.batch_mode && !editingItem.value && form.batch_count > 1) {
      for (let i = 0; i < form.batch_count; i++) {
        await $fetch('/api/admin/episodes', {
          method: 'POST',
          body: { ...body, episode_number: form.episode_number + i, sort_order: form.sort_order + i, title: `${form.title || 'Episode'} - Ep ${form.episode_number + i}` }
        })
      }
      emit('toast', `已批量创建 ${form.batch_count} 集`, 'success')
    } else if (editingItem.value) {
      await $fetch(`/api/admin/episodes/${editingItem.value.id}`, { method: 'PATCH', body })
      emit('toast', '分集已更新', 'success')
    } else {
      await $fetch('/api/admin/episodes', { method: 'POST', body })
      emit('toast', '分集已创建', 'success')
    }
    showModal.value = false
    await fetchEpisodes()
    // 如果系列没有封面，自动用第一个分集的缩略图
    await syncSeriesCover()
  } catch (e: any) { emit('toast', '保存失败: ' + (e.data?.statusMessage || e.message || 'Error'), 'error') }
  finally { saving.value = false }
}

// 自动同步系列封面：取第一个分集的缩略图
async function syncSeriesCover() {
  const sid = selectedSeriesId.value
  if (!sid) return
  try {
    const seriesRes = await $fetch<any>(`/api/admin/series?pageSize=1`)
    const allSeries = seriesRes.data?.items || []
    const currentSeries = allSeries.find((s: any) => s.id === sid)
    if (!currentSeries || currentSeries.cover_image) return // 已有封面，跳过

    // 查找第一个有缩略图的分集
    const epsRes = await $fetch<any>(`/api/admin/episodes?series_id=${sid}&pageSize=50`)
    const firstWithThumb = (epsRes.data?.items || []).find((ep: any) => ep.thumbnail_url)
    if (firstWithThumb?.thumbnail_url) {
      await $fetch(`/api/admin/series/${sid}`, {
        method: 'PATCH',
        body: { cover_image: firstWithThumb.thumbnail_url, poster_image: firstWithThumb.thumbnail_url }
      })
    }
  } catch (_) { /* 静默失败 */ }
}

async function deleteEpisode(ep: any) {
  const ok = await confirmDialog.value?.show(`确定删除「${ep.title}」？`, { confirmLabel: '删除', confirmClass: 'btn-danger' })
  if (!ok) return
  try {
    await $fetch(`/api/admin/episodes/${ep.id}`, { method: 'DELETE' })
    emit('toast', '分集已删除', 'success')
    await fetchEpisodes()
  } catch (e: any) { emit('toast', '删除失败: ' + (e.message || 'Error'), 'error') }
}

onMounted(() => fetchSeries())
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-white/90 text-lg font-semibold">分集管理</h2>
      <div class="flex gap-2">
        <select v-model="selectedSeriesId" class="bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/70 outline-none min-w-[220px]">
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
              <th class="px-5 py-3 text-white/40 uppercase tracking-widest text-[10px] font-semibold font-mono w-16">集号</th>
              <th class="px-5 py-3 text-white/40 uppercase tracking-widest text-[10px] font-semibold font-mono">标题</th>
              <th class="px-5 py-3 text-white/40 uppercase tracking-widest text-[10px] font-semibold font-mono">时长</th>
              <th class="px-5 py-3 text-white/40 uppercase tracking-widest text-[10px] font-semibold font-mono">类型</th>
              <th class="px-5 py-3 text-white/40 uppercase tracking-widest text-[10px] font-semibold font-mono">金币</th>
              <th class="px-5 py-3 text-white/40 uppercase tracking-widest text-[10px] font-semibold font-mono">状态</th>
              <th class="px-5 py-3 text-white/40 uppercase tracking-widest text-[10px] font-semibold font-mono w-28">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ep in episodes" :key="ep.id" class="border-b border-white/[0.04] hover:bg-white/[0.02] transition">
              <td class="px-5 py-3 text-white/40 font-mono">{{ ep.episode_number }}</td>
              <td class="px-5 py-3 text-white/80 font-medium max-w-[250px] truncate">{{ ep.title }}</td>
              <td class="px-5 py-3 text-white/50 font-mono text-xs">{{ Math.floor(ep.duration_seconds / 60) }}:{{ String(ep.duration_seconds % 60).padStart(2, '0') }}</td>
              <td class="px-5 py-3">
                <span class="text-xs font-medium" :class="ep.is_free ? 'text-green-400' : 'text-yellow-400'">{{ ep.is_free ? '免费' : '付费' }}</span>
              </td>
              <td class="px-5 py-3 text-white/50 font-mono text-xs">{{ ep.coin_cost || '—' }}</td>
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
              <td colspan="7" class="px-5 py-10 text-center text-white/25">暂无分集</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- LIGHT MODAL -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" @click.self="showModal = false">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div class="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 rounded-t-2xl z-10">
            <h3 class="text-gray-900 text-lg font-bold">{{ editingItem ? '编辑分集' : (form.batch_mode ? '批量创建分集' : '新建分集') }}</h3>
          </div>

          <div class="p-6 space-y-4">
            <!-- 批量模式开关 -->
            <label v-if="!editingItem" class="flex items-center gap-2 cursor-pointer">
              <input v-model="form.batch_mode" type="checkbox" class="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              <span class="text-sm text-gray-600">批量模式（一次性创建多个分集）</span>
            </label>

            <!-- 批量参数 -->
            <div v-if="form.batch_mode && !editingItem" class="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <div>
                <label class="text-sm font-semibold text-gray-700 mb-1.5 block">起始集号 <span class="text-red-500">*</span></label>
                <input v-model.number="form.episode_number" type="number" min="1" class="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
              </div>
              <div>
                <label class="text-sm font-semibold text-gray-700 mb-1.5 block">创建数量 <span class="text-red-500">*</span></label>
                <input v-model.number="form.batch_count" type="number" min="1" max="200" placeholder="例如 50" class="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
              </div>
            </div>

            <template v-if="!form.batch_mode || editingItem">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="text-sm font-semibold text-gray-700 mb-1.5 block">集号 <span class="text-red-500">*</span></label>
                  <input v-model.number="form.episode_number" type="number" min="1" class="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                </div>
                <div>
                  <label class="text-sm font-semibold text-gray-700 mb-1.5 block">时长 (秒)</label>
                  <input v-model.number="form.duration_seconds" type="number" min="1" class="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                </div>
              </div>

              <div>
                <label class="text-sm font-semibold text-gray-700 mb-1.5 block">标题 <span class="text-red-500">*</span></label>
                <input v-model="form.title" @input="errors.title = ''" placeholder="输入分集标题"
                  class="w-full bg-gray-50 border rounded-lg px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  :class="errors.title ? 'border-red-300 bg-red-50' : 'border-gray-200'" />
                <p v-if="errors.title" class="text-red-500 text-xs mt-1">{{ errors.title }}</p>
              </div>

              <div>
                <label class="text-sm font-semibold text-gray-700 mb-1.5 block">描述</label>
                <textarea v-model="form.description" rows="2" placeholder="输入分集简介..."
                  class="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none" />
              </div>

              <div>
                <label class="text-sm font-semibold text-gray-700 mb-1.5 block">视频 URL <span class="text-red-500">*</span></label>
                <div class="flex gap-2">
                  <input v-model="form.video_url" @input="errors.video_url = ''" placeholder="https://... 或上传视频文件"
                    class="flex-1 bg-gray-50 border rounded-lg px-4 py-2.5 text-sm text-gray-900 font-mono outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    :class="errors.video_url ? 'border-red-300 bg-red-50' : 'border-gray-200'" />
                  <input ref="videoFileInput" type="file" accept="video/*" class="hidden" @change="handleVideoFile" />
                  <button @click="triggerVideoPick" :disabled="videoUploading"
                    class="shrink-0 px-4 py-2.5 rounded-lg text-sm font-medium bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition disabled:opacity-50 whitespace-nowrap">
                    {{ videoUploading ? '上传中...' : '📁 选择文件' }}
                  </button>
                </div>
                <!-- 上传进度条 -->
                <div v-if="videoUploading" class="mt-2">
                  <div class="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <span class="i-lucide-loader-circle animate-spin" />
                    <span class="truncate">{{ videoUploadName }}</span>
                    <span class="font-mono">{{ videoUploadProgress }}%</span>
                  </div>
                  <div class="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div class="h-full bg-indigo-500 rounded-full transition-all duration-300" :style="{ width: videoUploadProgress + '%' }" />
                  </div>
                </div>
                <p v-if="errors.video_url" class="text-red-500 text-xs mt-1">{{ errors.video_url }}</p>
              </div>

              <div>
                <label class="text-sm font-semibold text-gray-700 mb-1.5 block">缩略图 URL</label>
                <input v-model="form.thumbnail_url" placeholder="https://..."
                  class="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
              </div>
            </template>

            <div class="grid grid-cols-3 gap-4">
              <div>
                <label class="text-sm font-semibold text-gray-700 mb-1.5 block">收费设置</label>
                <select v-model="form.is_free" class="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                  <option :value="true">免费</option>
                  <option :value="false">付费</option>
                </select>
              </div>
              <div>
                <label class="text-sm font-semibold text-gray-700 mb-1.5 block">金币价格</label>
                <input v-model.number="form.coin_cost" type="number" min="0" :disabled="form.is_free"
                  class="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-40" />
              </div>
              <div>
                <label class="text-sm font-semibold text-gray-700 mb-1.5 block">状态</label>
                <select v-model="form.status" class="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
          </div>

          <div class="sticky bottom-0 bg-gray-50 border-t border-gray-100 px-6 py-4 rounded-b-2xl flex justify-end gap-3">
            <button @click="showModal = false" class="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-200 transition">取消</button>
            <button @click="save" :disabled="saving" class="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2 shadow-sm">
              <span v-if="saving" class="i-lucide-loader-circle animate-spin text-xs" />
              {{ editingItem ? '保存修改' : (form.batch_mode ? `批量创建 ${form.batch_count || 0} 集` : '创建分集') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <AdminConfirmDialog ref="confirmDialog" />
  </div>
</template>
