<script setup lang="ts">
import AdminMediaDetail from './AdminMediaDetail.vue'

interface FileInfo {
  id: string
  name: string
  path: string
  bucket: string
  size: number
  sizeFormatted: string
  mimeType: string
  extension: string
  kind: 'image' | 'video' | 'audio' | 'document' | 'other'
  isImage: boolean
  isVideo: boolean
  publicUrl: string | null
  thumbnailUrl: string | null
  width: number | null
  height: number | null
  uploadedBy: string | null
  createdAt: string
  updatedAt: string
  exif?: Record<string, any> | null
}

interface StorageStats {
  bucket: string
  totalFiles: number
  totalSizeFormatted: string
  fileCount: number
}

const props = defineProps<{
  isLoading?: boolean
  pickerMode?: boolean
}>()

const emit = defineEmits<{
  refresh: []
  selected: [file: { url: string | null; path: string }]
  close: []
}>()

// ── Toast 通知 ────────────────────────────────────────────────
interface Toast { id: number; message: string; type: 'success' | 'error' | 'info' }
const toasts = ref<Toast[]>([])
let toastId = 0

function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const id = ++toastId
  toasts.value.push({ id, message, type })
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, 3500)
}

// ── 状态 ─────────────────────────────────────────────────────
const activeBucket = ref<string>('campaign-assets')
const activeView = ref<'files' | 'trash'>('files')
const viewMode = ref<'grid' | 'list'>('grid')
const searchQuery = ref('')
const kindFilter = ref('')
const dateFrom = ref('')
const dateTo = ref('')
const uploaderFilter = ref('')
const sortField = ref<'updated_at' | 'created_at' | 'name'>('updated_at')
const sortOrder = ref<'asc' | 'desc'>('desc')
const prefix = ref('')
const offset = ref(0)
const limit = 40

const files = ref<FileInfo[]>([])
const folders = ref<string[]>([])
const stats = ref<StorageStats | null>(null)
const total = ref(0)
const isFetching = ref(false)

// 批量选择（用普通对象代替 Set，解决 Vue 模板响应式追踪问题）
const selecting = ref(false)
const selectedMap = ref<Record<string, boolean>>({})

function isSelected(path: string): boolean {
  return !!selectedMap.value[path]
}

const selectedCount = computed(() => Object.keys(selectedMap.value).filter(k => selectedMap.value[k]).length)

// ── 前端二次过滤（日期范围 + 上传者）───────────────────────────
const filteredFiles = computed(() => {
  let result = files.value
  // 日期范围筛选（使用 createdAt 字段）
  if (dateFrom.value) {
    const from = new Date(dateFrom.value).getTime()
    result = result.filter(f => new Date(f.createdAt).getTime() >= from)
  }
  if (dateTo.value) {
    const to = new Date(dateTo.value + 'T23:59:59').getTime()
    result = result.filter(f => new Date(f.createdAt).getTime() <= to)
  }
  // 上传者筛选
  if (uploaderFilter.value) {
    const kw = uploaderFilter.value.toLowerCase()
    result = result.filter(f => (f.uploadedBy || '').toLowerCase().includes(kw))
  }
  return result
})

const filteredCount = computed(() => filteredFiles.value.length)

// 详情侧栏
const selectedFile = ref<FileInfo | null>(null)

// ── 动态桶 ────────────────────────────────────────────────────
interface BucketInfo {
  name: string
  public: boolean
  file_size_limit: number | null
  allowed_mime_types: string[] | null
  created_at: string
  isSystem: boolean
  fileCount?: number
  totalSize?: number
}
const buckets = ref<BucketInfo[]>([])
const showBucketModal = ref(false)
const newBucketForm = reactive({
  name: '',
  public: false,
  maxSize: 50,
  allowedMime: '',
})
const bucketNameError = computed(() => {
  const n = newBucketForm.name
  if (!n) return ''
  if (!/^[a-z][a-z0-9-]{2,49}$/.test(n)) return '桶名需 3-50 字符，小写字母/数字/连字符'
  if (buckets.value.some(b => b.name === n)) return '桶名已存在'
  return ''
})

async function fetchBuckets() {
  try {
    const res = await $fetch<{ success: boolean; data: BucketInfo[] }>('/api/admin/storage/buckets')
    buckets.value = res.data
  } catch (e) {
    console.error('Failed to fetch buckets:', e)
  }
}

async function handleCreateBucket() {
  if (bucketNameError.value || !newBucketForm.name) return
  try {
    const mimeArr = newBucketForm.allowedMime
      ? newBucketForm.allowedMime.split(',').map(s => s.trim()).filter(Boolean)
      : null
    await $fetch('/api/admin/storage/buckets', {
      method: 'POST',
      body: {
        name: newBucketForm.name,
        public: newBucketForm.public,
        maxSize: newBucketForm.maxSize * 1024 * 1024,
        allowedMime: mimeArr,
      },
    })
    showBucketModal.value = false
    newBucketForm.name = ''
    newBucketForm.public = false
    newBucketForm.maxSize = 50
    newBucketForm.allowedMime = ''
    await fetchBuckets()
  } catch (e: any) {
    console.error('Create bucket failed:', e)
  }
}

async function handleDeleteBucket(name: string) {
  if (!confirm(`确定要删除桶「${name}」吗？桶必须为空。`)) return
  try {
    await $fetch(`/api/admin/storage/buckets/${name}`, { method: 'DELETE' })
    await fetchBuckets()
    if (activeBucket.value === name) {
      activeBucket.value = 'campaign-assets'
    }
  } catch (e: any) {
    showToast(e?.data?.statusMessage || e?.message || '删除失败', 'error')
  }
}

// ── 重命名 / 移动 ───────────────────────────────────────────
const showRenameModal = ref(false)
const renameForm = reactive({ path: '', oldName: '', newName: '' })

function openRename(file: FileInfo) {
  renameForm.path = file.path
  renameForm.oldName = file.name
  renameForm.newName = file.name
  showRenameModal.value = true
}

// ── 重命名冲突预检 ──────────────────────────────────────────
const renameConflict = computed(() => {
  if (!renameForm.newName || renameForm.newName === renameForm.oldName) return ''
  const exists = files.value.some(f => f.name === renameForm.newName && f.path !== renameForm.path)
  return exists ? '当前目录已存在同名文件' : ''
})

async function handleRename() {
  if (!renameForm.newName || renameForm.newName === renameForm.oldName || renameConflict.value) return
  const dir = renameForm.path.includes('/') ? renameForm.path.substring(0, renameForm.path.lastIndexOf('/') + 1) : ''
  const toPath = dir + renameForm.newName
  try {
    await $fetch('/api/admin/storage/move', {
      method: 'POST',
      body: { bucket: activeBucket.value, fromPath: renameForm.path, toPath },
    })
    showRenameModal.value = false
    fetchFiles()
  } catch (e: any) {
    const status = e?.response?.status || e?.status || e?.statusCode
    if (status === 409) {
      showToast('目标位置已存在同名文件，请更换名称', 'error')
    } else {
      showToast(e?.data?.statusMessage || e?.message || '重命名失败', 'error')
    }
  }
}

const showMoveModal = ref(false)
const moveForm = reactive({ fromPath: '', toPath: '' })

function openMove(file: FileInfo) {
  moveForm.fromPath = file.path
  moveForm.toPath = file.path
  showMoveModal.value = true
}

async function handleMove() {
  if (!moveForm.toPath || moveForm.toPath === moveForm.fromPath) return
  try {
    await $fetch('/api/admin/storage/move', {
      method: 'POST',
      body: { bucket: activeBucket.value, fromPath: moveForm.fromPath, toPath: moveForm.toPath },
    })
    showMoveModal.value = false
    fetchFiles()
  } catch (e: any) {
    const status = e?.response?.status || e?.status || e?.statusCode
    if (status === 409) {
      showToast('目标位置已存在同名文件，请更换名称或路径', 'error')
    } else {
      showToast(e?.data?.statusMessage || e?.message || '移动失败', 'error')
    }
  }
}

// ── 回收站 ──────────────────────────────────────────────────
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

// 回收站批量选择
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
  if (!confirm(`确定要还原 ${ids.length} 个文件吗？`)) return
  try {
    const res = await $fetch<{ success: boolean; data: { restored: number; errors: string[] } }>('/api/admin/storage/trash/batch-restore', {
      method: 'POST', body: { ids },
    })
    trashSelectedMap.value = {}
    const hasErrors = res.data.errors.length > 0
    showToast(`已还原 ${res.data.restored} 个文件${hasErrors ? `，${res.data.errors.length} 个失败` : ''}`, hasErrors ? 'info' : 'success')
    fetchTrash()
    if (activeView.value === 'files') fetchFiles()
  } catch (e: any) {
    showToast(e?.data?.statusMessage || '批量还原失败', 'error')
  }
}

async function handleBatchPermanentDelete() {
  const ids = trashSelectedIds.value
  if (ids.length === 0) return
  if (!confirm(`确定要永久删除 ${ids.length} 个文件吗？此操作不可撤销。`)) return
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
  if (!confirm('确定要清空回收站全部文件吗？此操作不可撤销。')) return
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

// 回收站分页
const trashHasPrev = computed(() => trashOffset.value > 0)
const trashHasNext = computed(() => trashOffset.value + trashLimit < trashTotal.value)
function trashPrevPage() { trashOffset.value = Math.max(0, trashOffset.value - trashLimit); fetchTrash() }
function trashNextPage() { trashOffset.value += trashLimit; fetchTrash() }

async function handleRestore(trashId: string) {
  try {
    await $fetch(`/api/admin/storage/trash/${trashId}/restore`, { method: 'POST' })
    showToast('文件已还原', 'success')
    fetchTrash()
    if (activeView.value === 'files') fetchFiles()
  } catch (e: any) {
    showToast(e?.data?.statusMessage || '还原失败', 'error')
  }
}

async function handlePermanentDelete(item: TrashItem) {
  if (!confirm(`确定要永久删除「${item.file_name}」吗？此操作不可撤销。`)) return
  try {
    await $fetch(`/api/admin/storage/trash/${item.id}`, { method: 'DELETE' })
    showToast('已永久删除', 'success')
    fetchTrash()
  } catch (e: any) {
    showToast(e?.data?.statusMessage || '删除失败', 'error')
  }
}

async function handleCleanupExpired() {
  if (!confirm('确定要清理所有已过期的回收站文件吗？')) return
  try {
    const res = await $fetch<{ success: boolean; data: { cleaned: number } }>('/api/admin/storage/trash/cleanup', { method: 'POST' })
    showToast(`已清理 ${res.data.cleaned} 个文件`, 'success')
    fetchTrash()
  } catch (e: any) {
    showToast(e?.data?.statusMessage || '清理失败', 'error')
  }
}

// ── 视图切换 ──────────────────────────────────────────────
watch(activeView, () => {
  if (activeView.value === 'trash') {
    trashOffset.value = 0
    fetchTrash()
  } else {
    fetchFiles()
  }
})

// 拖拽上传（用计数器代替布尔值，防止经过子元素时 dragleave 误触发闪烁）
let dragCounter = 0
const isDragging = ref(false)
const isUploading = ref(false)
const uploadProgress = ref(0)

// ── 数据获取 ─────────────────────────────────────────────────
const { upload, remove, getPublicUrl } = useStorage()

async function fetchFiles() {
  isFetching.value = true
  try {
    const params: Record<string, any> = {
      bucket: activeBucket.value,
      prefix: prefix.value,
      limit,
      offset: offset.value,
      sort: sortField.value,
      order: sortOrder.value,
    }
    if (searchQuery.value) params.search = searchQuery.value
    if (kindFilter.value) params.kind = kindFilter.value

    const res = await $fetch<{
      success: boolean
      data: { items: FileInfo[]; folders: string[]; total: number; storageStats: StorageStats }
    }>('/api/admin/storage', { params })

    files.value = res.data.items
    folders.value = res.data.folders
    total.value = res.data.total
    stats.value = res.data.storageStats
  } catch (e: any) {
    console.error('Failed to fetch storage files:', e)
  } finally {
    isFetching.value = false
  }
}

// ── 搜索防抖 ─────────────────────────────────────────────────
let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(searchQuery, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    offset.value = 0
    fetchFiles()
  }, 300)
})

// ── Bucket 切换 ───────────────────────────────────────────────
watch(activeBucket, () => {
  offset.value = 0
  prefix.value = ''
  selectedMap.value = {}
  selectedFile.value = null
  fetchFiles()
})

// ── 筛选/排序变化 ────────────────────────────────────────────
watch([kindFilter, sortField, sortOrder], () => {
  offset.value = 0
  fetchFiles()
})

// 初始加载
onMounted(() => { fetchFiles(); fetchBuckets() })

// ── 刷新 ─────────────────────────────────────────────────────
function handleRefresh() {
  fetchFiles()
  emit('refresh')
}

// ── 分页 ─────────────────────────────────────────────────────
const hasPrev = computed(() => offset.value > 0)
const hasNext = computed(() => offset.value + limit < total.value)
function prevPage() { offset.value = Math.max(0, offset.value - limit); fetchFiles() }
function nextPage() { offset.value += limit; fetchFiles() }

// ── 文件夹导航 ───────────────────────────────────────────────
function navigateFolder(folder: string) {
  prefix.value = prefix.value ? `${prefix.value}/${folder}` : folder
  offset.value = 0
  selectedFile.value = null
  selectedMap.value = {}
  fetchFiles()
}

const breadcrumbs = computed(() => {
  if (!prefix.value) return []
  const parts = prefix.value.split('/')
  return parts.map((p, i) => ({
    label: p.length > 12 ? p.slice(0, 6) + '...' + p.slice(-4) : p,
    full: p,
    path: parts.slice(0, i + 1).join('/'),
  }))
})

function navigateToBreadcrumb(path: string) {
  prefix.value = path
  offset.value = 0
  selectedFile.value = null
  fetchFiles()
}

function clearPrefix() {
  prefix.value = ''
  offset.value = 0
  selectedFile.value = null
  fetchFiles()
}

// ── 选择 ─────────────────────────────────────────────────────
function toggleSelect(path: string) {
  const m = { ...selectedMap.value }
  if (m[path]) delete m[path]
  else m[path] = true
  selectedMap.value = m
}

function toggleSelectAll() {
  const displayFiles = filteredFiles.value
  if (selectedCount.value === displayFiles.length) {
    selectedMap.value = {}
  } else {
    const m: Record<string, boolean> = {}
    displayFiles.forEach(f => { m[f.path] = true })
    selectedMap.value = m
  }
}

function getSelectedPaths(): string[] {
  return Object.keys(selectedMap.value).filter(k => selectedMap.value[k])
}

// ── Lightbox 图片预览 ──────────────────────────────────────────
const lightboxFile = ref<FileInfo | null>(null)
function openLightbox(file: FileInfo) {
  if (file.isImage) {
    lightboxFile.value = file
  }
}
function closeLightbox() { lightboxFile.value = null }

// 键盘导航 Lightbox
function onLightboxKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') { closeLightbox(); return }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    const images = filteredFiles.value.filter(f => f.isImage)
    const idx = images.findIndex(f => f.path === lightboxFile.value?.path)
    if (e.key === 'ArrowLeft' && idx > 0) lightboxFile.value = images[idx - 1] ?? null
    if (e.key === 'ArrowRight' && idx < images.length - 1) lightboxFile.value = images[idx + 1] ?? null
  }
}

// ── 文件点击 ─────────────────────────────────────────────────
function handleFileClick(file: FileInfo) {
  if (selecting.value) {
    toggleSelect(file.path)
    return
  }
  if (props.pickerMode) {
    emit('selected', { url: file.publicUrl, path: file.path })
    return
  }
  // 图片文件双击 → Lightbox 预览；其他文件 → 详情侧栏
  if (file.isImage) {
    openLightbox(file)
    return
  }
  selectedFile.value = file
}

// ── 批量删除 ─────────────────────────────────────────────────
async function handleBatchDelete() {
  const paths = getSelectedPaths()
  if (paths.length === 0) return
  if (!confirm(`确定要将 ${paths.length} 个文件移入回收站吗？`)) return

  try {
    // 批量软删除到回收站
    await $fetch('/api/admin/storage/trash', {
      method: 'POST',
      body: { bucket: activeBucket.value, paths },
    })
    selectedMap.value = {}
    selecting.value = false
    fetchFiles()
  } catch (e: any) {
    console.error('Batch delete failed:', e)
  }
}

// ── 单文件删除 ───────────────────────────────────────────────
async function handleDeleteFile(file: FileInfo) {
  try {
    await $fetch('/api/admin/storage/trash', {
      method: 'POST',
      body: { bucket: activeBucket.value, paths: [file.path] },
    })
    selectedFile.value = null
    fetchFiles()
  } catch (e: any) {
    console.error('Delete failed:', e)
  }
}

// ── 拖拽上传 ─────────────────────────────────────────────────
function handleDragEnter(e: DragEvent) {
  e.preventDefault()
  dragCounter++
  isDragging.value = true
}

function handleDragLeave(e: DragEvent) {
  e.preventDefault()
  dragCounter--
  if (dragCounter <= 0) {
    dragCounter = 0
    isDragging.value = false
  }
}

function handleDragOver(e: DragEvent) {
  e.preventDefault()
}

async function handleDrop(e: DragEvent) {
  e.preventDefault()
  dragCounter = 0
  isDragging.value = false
  const droppedFiles = e.dataTransfer?.files
  if (!droppedFiles || droppedFiles.length === 0) return
  await uploadFiles(Array.from(droppedFiles))
}

// ── 文件夹拖拽上传 ───────────────────────────────────────────
function handleFolderDragOver(e: DragEvent) {
  e.preventDefault()
  const el = e.currentTarget as HTMLElement | null
  el?.classList.add('!border-indigo-500/50', '!bg-indigo-500/10', '!scale-105')
}

function handleFolderDragLeave(e: DragEvent) {
  const el = e.currentTarget as HTMLElement | null
  el?.classList.remove('!border-indigo-500/50', '!bg-indigo-500/10', '!scale-105')
}

function handleFolderDrop(e: DragEvent, folder: string) {
  e.preventDefault()
  const el = e.currentTarget as HTMLElement | null
  el?.classList.remove('!border-indigo-500/50', '!bg-indigo-500/10', '!scale-105')
  const droppedFiles = e.dataTransfer?.files
  if (!droppedFiles?.length) return
  const targetPrefix = prefix.value ? `${prefix.value}/${folder}` : folder
  uploadFiles(Array.from(droppedFiles), targetPrefix)
}

// ── 文件选择上传 ─────────────────────────────────────────────
const fileInputRef = ref<HTMLInputElement | null>(null)

function triggerUpload() {
  fileInputRef.value?.click()
}

async function handleFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  const selectedFiles = target.files
  if (!selectedFiles || selectedFiles.length === 0) return
  await uploadFiles(Array.from(selectedFiles))
  if (target) target.value = ''
}

async function uploadFiles(fileList: File[], customPrefix?: string) {
  isUploading.value = true
  uploadProgress.value = 0
  const targetPrefix = customPrefix || prefix.value
  const total = fileList.length
  let uploaded = 0
  let failed = 0
  const failedNames: string[] = []

  // 并发上传（最多 3 个并发），每个文件独立进度
  const CONCURRENCY = 3
  const queue = [...fileList]
  const progressPerFile = new Map<File, number>()

  async function processNext(): Promise<void> {
    const file = queue.shift()
    if (!file) return

    try {
      progressPerFile.set(file, 0)
      await upload(file, activeBucket.value, {
        path: targetPrefix ? `${targetPrefix}/${file.name}` : file.name,
        onProgress: (p) => {
          progressPerFile.set(file, p)
          // 汇总进度：已完成文件数 * 100% + 进行中文件的部分进度
          const completedProgress = uploaded * 100
          const inProgressSum = Array.from(progressPerFile.values()).reduce((a, b) => a + b, 0)
          uploadProgress.value = Math.round((completedProgress + inProgressSum) / total)
        },
      })
      uploaded++
    } catch (e) {
      failed++
      failedNames.push(file.name)
      console.error(`Failed to upload ${file.name}:`, e)
    }

    await processNext() // 继续处理下一个
  }

  // 启动并发 worker
  const workers = Array.from({ length: Math.min(CONCURRENCY, total) }, () => processNext())
  await Promise.all(workers)

  isUploading.value = false
  uploadProgress.value = 100
  fetchFiles()

  // 失败提示
  if (failed > 0) {
    const msg = failed === total
      ? `全部 ${total} 个文件上传失败，请检查网络或文件格式`
      : `${uploaded} 个成功，${failed} 个失败（${failedNames.slice(0, 3).join(', ')}${failedNames.length > 3 ? '...' : ''}）`
    showToast(msg, failed === total ? 'error' : 'info')
  } else if (uploaded > 0) {
    showToast(`成功上传 ${uploaded} 个文件`, 'success')
  }
}

// ── 复制 URL ─────────────────────────────────────────────────
async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // fallback
    const el = document.createElement('textarea')
    el.value = text
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
  }
}

// ── 文件图标 ─────────────────────────────────────────────────
function getFileIcon(kind: string, ext: string): string {
  const iconMap: Record<string, string> = {
    image: 'i-lucide-image', video: 'i-lucide-video', audio: 'i-lucide-music',
    document: 'i-lucide-file-text', other: 'i-lucide-package',
  }
  return iconMap[kind] || 'i-lucide-package'
}

// ── 快捷键 ───────────────────────────────────────────────────
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (selectedFile.value) { selectedFile.value = null; return }
    if (selecting.value) { selecting.value = false; selectedMap.value = {}; return }
    // pickerMode 下 Esc 关闭整个选取器
    if (props.pickerMode) { emit('close'); return }
  }
  if (e.key === 'Delete' && selectedFile.value) {
    handleDeleteFile(selectedFile.value)
  }
}
onMounted(() => { window.addEventListener('keydown', handleKeydown) })
onUnmounted(() => { window.removeEventListener('keydown', handleKeydown) })

defineExpose({ refresh: fetchFiles })
</script>

<template>
  <!-- ── Toast 通知 ──────────────────────────────────────────── -->
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

  <div
    class="space-y-6 animate-fade-in text-white relative"
    @dragenter="handleDragEnter"
    @dragover="handleDragOver"
  >
    <!-- ── 全屏拖拽覆盖层 ──────────────────────────────────── -->
    <Transition name="fade">
      <div
        v-if="isDragging"
        class="fixed inset-0 z-50 flex items-center justify-center bg-[#08080f]/85 backdrop-blur-md border-2 border-dashed border-indigo-500/60"
        @dragleave="handleDragLeave"
        @drop="handleDrop"
      >
        <div class="text-center space-y-3">
          <div class="text-4xl text-indigo-400 i-lucide-upload mx-auto" />
          <p class="text-lg font-medium text-indigo-400">松开以上传文件至 <span class="font-mono">{{ activeBucket }}</span></p>
          <p class="text-xs text-white/40">支持图片和视频文件，大小限制按 Bucket 配置</p>
        </div>
      </div>
    </Transition>

    <!-- ── 顶部统计栏 ───────────────────────────────────────── -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-[28px] font-bold text-white tracking-tight">{{ pickerMode ? '选取文件' : '媒体库管理' }}</h1>
        <p class="text-white/40 text-sm mt-1" v-if="stats">
          {{ stats.totalFiles }} 个文件 / {{ stats.totalSizeFormatted }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button
          v-if="pickerMode"
          @click="$emit('close')"
          class="text-xs bg-white/5 hover:bg-white/10 text-white/70 font-medium px-4 py-2 rounded-full transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1"
        ><span class="i-lucide-x text-[13px]" /> 取消</button>
        <button
          @click="handleRefresh"
          :disabled="isFetching"
          class="text-sm bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-full transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
        >
          <span class="i-lucide-refresh-cw text-[14px]" :class="{'animate-spin': isFetching}" />
          刷新
        </button>
      </div>
    </div>

    <!-- ── Bucket Tab ─────────────────────────────────────────── -->
    <div class="flex gap-1.5 border-b border-white/[0.06] pb-px flex-wrap">
      <!-- 系统桶 -->
      <button
        v-for="b in buckets.filter(b => b.isSystem)"
        :key="b.name"
        @click="activeBucket = b.name; activeView = 'files'"
        class="px-4 py-2.5 text-xs font-medium rounded-t-xl border transition-all cursor-pointer relative bg-transparent"
        :class="activeBucket === b.name && activeView === 'files'
          ? 'text-indigo-400 bg-white/[0.03] border-white/[0.08] border-b-transparent'
          : 'text-white/60 border-transparent hover:text-white/90 hover:bg-white/[0.02]'"
      >
        <span class="i-lucide-lock text-[11px] opacity-50 mr-0.5" /> {{ b.name }}
      </button>
      <!-- 自定义桶 -->
      <button
        v-for="b in buckets.filter(b => !b.isSystem)"
        :key="b.name"
        @click="activeBucket = b.name; activeView = 'files'"
        class="px-4 py-2.5 text-xs font-medium rounded-t-xl border transition-all cursor-pointer relative group bg-transparent"
        :class="activeBucket === b.name && activeView === 'files'
          ? 'text-indigo-400 bg-white/[0.03] border-white/[0.08] border-b-transparent'
          : 'text-white/60 border-transparent hover:text-white/90 hover:bg-white/[0.02]'"
      >
        <span :class="b.public ? 'i-lucide-globe' : 'i-lucide-lock'" class="text-[10px] opacity-40 mr-0.5" :title="b.public ? '公开桶' : '私有桶'" />
        {{ b.name }}
        <span
          @click.stop="handleDeleteBucket(b.name)"
          class="hidden group-hover:inline ml-1 text-[10px] text-red-400 hover:text-red-300"
        >✕</span>
      </button>
      <!-- 新建桶按钮 -->
      <button
        @click="showBucketModal = true"
        class="px-3 py-2.5 text-xs bg-transparent text-white/40 hover:text-white/80 border border-dashed border-white/[0.08] hover:border-white/20 rounded-t-xl transition-all cursor-pointer"
      >+ 新建桶</button>
      <!-- 回收站 Tab -->
      <button
        @click="activeView = 'trash'"
        class="px-4 py-2.5 text-xs font-medium rounded-t-xl border transition-all cursor-pointer relative ml-auto"
        :class="activeView === 'trash'
          ? 'text-[#ff9f0a] bg-white/[0.03] border-white/[0.08] border-b-transparent'
          : 'bg-transparent text-white/40 border-transparent hover:text-white/80 hover:bg-white/[0.02]'"
      >
        <span class="i-lucide-trash-2 text-[13px]" /> 回收站
        <span v-if="trashTotal > 0" class="ml-1 text-[10px] bg-[#ff9f0a]/20 text-[#ff9f0a] px-1.5 py-0.5 rounded-full">{{ trashTotal }}</span>
      </button>
    </div>

    <!-- ── 工具栏 ─────────────────────────────────────────────── -->
    <div v-show="activeView === 'files'" class="flex flex-wrap items-center gap-3">
      <!-- 搜索 -->
      <div class="flex-1 min-w-[160px] max-w-xs relative">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索文件名..."
          class="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500/50 rounded-xl pl-9 pr-8 py-2.5 text-sm text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
        />
        <span class="absolute left-3 top-1/2 -translate-y-1/2 i-lucide-search text-[13px] text-white/30 pointer-events-none" />
        <button
          v-if="searchQuery"
          @click="searchQuery = ''"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/30 hover:text-white/70 cursor-pointer"
        >✕</button>
      </div>

      <!-- 类型筛选 -->
      <select
        v-model="kindFilter"
        class="bg-[#141416] border border-white/[0.08] hover:border-white/20 text-xs text-white/80 rounded-full px-3.5 py-2.5 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all cursor-pointer [color-scheme:dark]"
      >
        <option value="" class="bg-[#141416] text-white">全部类型</option>
        <option value="image" class="bg-[#141416] text-white">图片</option>
        <option value="video" class="bg-[#141416] text-white">视频</option>
        <option value="audio" class="bg-[#141416] text-white">音频</option>
        <option value="document" class="bg-[#141416] text-white">文档</option>
        <option value="other" class="bg-[#141416] text-white">其他</option>
      </select>

      <!-- 排序 -->
      <div class="flex items-center gap-1">
        <select
          v-model="sortField"
          class="bg-[#141416] border border-white/[0.08] hover:border-white/20 text-xs text-white/80 rounded-full px-3 py-2.5 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all cursor-pointer [color-scheme:dark]"
        >
          <option value="updated_at" class="bg-[#141416] text-white">更新时间</option>
          <option value="created_at" class="bg-[#141416] text-white">创建时间</option>
          <option value="name" class="bg-[#141416] text-white">文件名</option>
        </select>
        <button
          @click="sortOrder = sortOrder === 'desc' ? 'asc' : 'desc'"
          class="relative bg-white/[0.03] hover:bg-white/[0.08] border rounded-full w-9 h-9 flex items-center justify-center text-white/70 hover:text-white transition-all cursor-pointer"
          :class="sortOrder === 'asc' ? 'border-indigo-500/30 text-indigo-400' : 'border-white/[0.08]'"
          :title="sortOrder === 'desc' ? '降序' : '升序'"
        >
          <span :class="sortOrder === 'desc' ? 'i-lucide-arrow-down' : 'i-lucide-arrow-up'" class="text-[14px]" />
        </button>
      </div>

      <!-- 日期范围 -->
      <div class="flex items-center gap-1">
        <input
          v-model="dateFrom"
          type="date"
          class="bg-[#141416] border border-white/[0.08] hover:border-white/20 text-xs text-white/80 rounded-full px-3 py-2.5 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all cursor-pointer [color-scheme:dark] w-[120px]"
          title="起始日期"
        />
        <span class="text-white/20 text-xs">-</span>
        <input
          v-model="dateTo"
          type="date"
          class="bg-[#141416] border border-white/[0.08] hover:border-white/20 text-xs text-white/80 rounded-full px-3 py-2.5 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all cursor-pointer [color-scheme:dark] w-[120px]"
          title="结束日期"
        />
        <button
          v-if="dateFrom || dateTo"
          @click="dateFrom = ''; dateTo = ''"
          class="text-[10px] text-white/30 hover:text-white/60 cursor-pointer"
        >✕</button>
      </div>

      <!-- 上传者筛选 -->
      <div class="relative" v-if="filteredFiles.some(f => f.uploadedBy)">
        <input
          v-model="uploaderFilter"
          type="text"
          placeholder="上传者..."
          class="bg-[#141416] border border-white/[0.08] hover:border-white/20 text-xs text-white/80 rounded-full px-3 py-2.5 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all w-[100px]"
        />
        <button
          v-if="uploaderFilter"
          @click="uploaderFilter = ''"
          class="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-white/30 hover:text-white/60 cursor-pointer"
        >✕</button>
      </div>

      <!-- 视图切换 -->
      <div class="flex items-center bg-white/[0.04] border border-white/[0.08] rounded-lg overflow-hidden divide-x divide-white/[0.06]">
        <button
          @click="viewMode = 'grid'"
          class="flex items-center justify-center w-9 h-9 transition-all cursor-pointer"
          :class="viewMode === 'grid' ? 'bg-indigo-500/20 text-indigo-400' : 'text-white/40 hover:text-white/70 bg-transparent'"
        ><span class="i-lucide-layout-grid text-[15px]" /></button>
        <button
          @click="viewMode = 'list'"
          class="flex items-center justify-center w-9 h-9 transition-all cursor-pointer"
          :class="viewMode === 'list' ? 'bg-indigo-500/20 text-indigo-400' : 'text-white/40 hover:text-white/70 bg-transparent'"
        ><span class="i-lucide-list text-[15px]" /></button>
      </div>

      <!-- 批量选择 -->
      <button
        @click="selecting = !selecting; if (!selecting) selectedMap = {}"
        class="bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] rounded-full px-3.5 py-2.5 text-xs font-medium transition-all cursor-pointer"
        :class="selecting ? 'text-[#ff9f0a] border-[#ff9f0a]/30' : 'text-white/60 hover:text-white'"
      >
        {{ selecting ? '取消选择' : '选择' }}
      </button>

      <!-- 批量删除 -->
      <button
        v-if="selecting && selectedCount > 0"
        @click="handleBatchDelete"
        class="bg-[#ff453a]/10 hover:bg-[#ff453a]/20 border border-[#ff453a]/25 text-[#ff453a] rounded-full px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer"
      >
        删除 ({{ selectedCount }})
      </button>

      <!-- 上传按钮 -->
      <button
        @click="triggerUpload"
        class="bg-gradient-to-r from-indigo-600 to-indigo-400 hover:from-indigo-500 hover:to-indigo-300 text-sm font-semibold rounded-full text-white px-4 py-2.5 transition-all active:scale-[0.98] cursor-pointer shadow-[0_4px_12px_rgba(99,102,241,0.2)]"
      >
        上传文件
      </button>
      <input ref="fileInputRef" type="file" multiple class="hidden" @change="handleFileChange" />

      <!-- 筛选计数 -->
      <span v-if="(dateFrom || dateTo || uploaderFilter) && filteredCount !== files.length" class="text-[11px] text-white/30 ml-1">
        显示 {{ filteredCount }}/{{ files.length }}
      </span>
    </div>

    <!-- ── 面包屑导航 ─────────────────────────────────────────── -->
    <div v-if="activeView === 'files' && breadcrumbs.length > 0" class="flex items-center gap-1.5 text-xs text-white/50">
      <button @click="clearPrefix" class="hover:text-indigo-400 transition-colors cursor-pointer flex items-center gap-1"><span class="i-lucide-folder text-[13px]" /> 根目录</button>
      <template v-for="(crumb, i) in breadcrumbs" :key="crumb.path">
        <span class="text-white/20">/</span>
        <button
          v-if="i < breadcrumbs.length - 1"
          @click="navigateToBreadcrumb(crumb.path)"
          class="hover:text-indigo-400 transition-colors cursor-pointer font-mono"
        >{{ crumb.label }}</button>
        <span v-else class="text-white/80 font-mono font-medium">{{ crumb.label }}</span>
      </template>
    </div>

    <!-- ── 回收站视图 ───────────────────────────────────────────── -->
    <div v-if="activeView === 'trash'" class="space-y-4">
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
        <div class="text-5xl">🗑️</div>
        <p class="text-sm">回收站是空的</p>
      </div>
      <div v-else class="bg-white/[0.04] rounded-2xl overflow-hidden shadow-xl shadow-black/20">
        <table class="w-full text-left text-sm border-collapse">
          <thead>
            <tr class="border-b border-white/[0.05] text-white/40 uppercase tracking-widest text-[10px] bg-white/[0.005]">
              <th class="px-4 py-4 w-10 font-semibold">
                <input type="checkbox" :checked="trashSelectedIds.length === trashItems.length && trashItems.length > 0" @change="toggleTrashSelectAll" class="cursor-pointer" />
              </th>
              <th class="px-6 py-4 font-semibold font-mono">文件名</th>
              <th class="px-6 py-4 font-semibold font-mono">原桶</th>
              <th class="px-6 py-4 font-semibold font-mono">原路径</th>
              <th class="px-6 py-4 font-semibold font-mono">删除时间</th>
              <th class="px-6 py-4 font-semibold font-mono">过期时间</th>
              <th class="px-6 py-4 font-semibold font-mono text-right">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.04]">
            <tr v-for="item in trashItems" :key="item.id" class="hover:bg-white/[0.02] transition-colors">
              <td class="px-4 py-5">
                <input type="checkbox" :checked="!!trashSelectedMap[item.id]" @change="toggleTrashSelect(item.id)" class="cursor-pointer" />
              </td>
              <td class="px-6 py-5 text-white/90 font-medium">{{ item.file_name }}</td>
              <td class="px-6 py-5 text-white/50 font-mono text-xs">{{ item.original_bucket }}</td>
              <td class="px-6 py-5 text-white/40 font-mono text-xs max-w-[200px] truncate" :title="item.original_path">{{ item.original_path }}</td>
              <td class="px-6 py-5 text-white/40 font-mono text-xs">{{ new Date(item.created_at).toLocaleString() }}</td>
              <td class="px-6 py-5 text-white/40 font-mono text-xs">{{ new Date(item.expires_at).toLocaleString() }}</td>
              <td class="px-6 py-5 text-right space-x-2" @click.stop>
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

    <!-- ── 上传进度 ───────────────────────────────────────────── -->
    <div v-show="activeView === 'files' && isUploading" class="bg-white/[0.04] border border-indigo-500/20 rounded-xl p-4 space-y-2 shadow-lg shadow-black/20">
      <div class="flex justify-between text-sm text-white/60">
        <span>上传中...</span>
        <span>{{ uploadProgress }}%</span>
      </div>
      <div class="h-1 bg-white/5 rounded-full overflow-hidden">
        <div class="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-300" :style="{ width: uploadProgress + '%' }"></div>
      </div>
    </div>

    <!-- ── 加载骨架屏 ─────────────────────────────────────────── -->
    <div v-if="activeView === 'files' && isFetching && files.length === 0" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      <div v-for="i in 8" :key="i" class="aspect-square rounded-xl bg-white/[0.02] animate-pulse border border-white/[0.04]"></div>
    </div>

    <!-- ── 空状态 ─────────────────────────────────────────────── -->
    <div v-else-if="activeView === 'files' && !isFetching && filteredFiles.length === 0" class="flex flex-col items-center justify-center py-20 text-center space-y-4">
      <span :class="(searchQuery || dateFrom || dateTo || uploaderFilter) ? 'i-lucide-search text-[48px]' : 'i-lucide-inbox text-[48px]'" class="opacity-30 text-white/40" />
      <p v-if="searchQuery || dateFrom || dateTo || uploaderFilter" class="text-white/40 text-sm">
        未找到匹配的文件<span v-if="files.length > 0" class="text-white/20">（共 {{ files.length }} 个文件被筛选）</span>
      </p>
      <template v-else>
        <p class="text-white/40 text-sm">此 Bucket 暂无文件</p>
        <p class="text-white/25 text-xs">拖拽文件到页面任意位置，或点击「上传文件」按钮开始</p>
        <button
          @click="triggerUpload"
          class="mt-2 bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.10] rounded-full px-6 py-2.5 text-xs text-white/70 font-medium transition-all cursor-pointer"
        >
          选择文件上传
        </button>
      </template>
    </div>

    <!-- ── 网格视图 ───────────────────────────────────────────── -->
    <template v-else-if="activeView === 'files' && viewMode === 'grid'">
      <!-- 文件夹 -->
      <div v-if="folders.length > 0" class="flex flex-wrap gap-3">
        <button
          v-for="folder in folders"
          :key="folder"
          @click="navigateFolder(folder)"
          @dragover.prevent="handleFolderDragOver"
          @dragleave="handleFolderDragLeave"
          @drop="handleFolderDrop($event, folder)"
          class="flex items-center gap-2 bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] rounded-xl px-4 py-3 text-xs text-white/70 transition-all cursor-pointer"
        >
          <span class="i-lucide-folder text-[14px] text-indigo-400/70" />
          <span class="font-mono">{{ folder }}</span>
        </button>
      </div>

      <!-- 文件网格 -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <div
          v-for="file in filteredFiles"
          :key="file.path"
          @click="handleFileClick(file)"
          class="group relative aspect-square rounded-xl overflow-hidden border cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
          :class="[
            selectedFile?.path === file.path ? 'border-indigo-500/50 ring-2 ring-indigo-500/20' : 'border-white/[0.06]',
            isSelected(file.path) ? 'border-[#ff9f0a]/50 ring-2 ring-[#ff9f0a]/20' : '',
          ]"
        >
          <!-- 选择 checkbox -->
          <div v-if="selecting" class="absolute top-2 left-2 z-10" @click.stop>
            <div
              @click.stop="toggleSelect(file.path)"
              class="w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer"
              :class="isSelected(file.path) ? 'bg-[#ff9f0a] border-[#ff9f0a] text-black' : 'border-white/30 bg-black/50'"
            >
              <span v-if="isSelected(file.path)" class="i-lucide-check text-[12px] font-bold" />
            </div>
          </div>

          <!-- 缩略图 / 图标 -->
          <div class="w-full h-full flex items-center justify-center bg-white/[0.02] group-hover:bg-white/[0.04] transition-colors">
            <img
              v-if="file.isImage && file.thumbnailUrl"
              :src="file.thumbnailUrl"
              :alt="file.name"
              class="w-full h-full object-cover"
              loading="lazy"
            />
            <img
              v-else-if="file.isImage && file.publicUrl"
              :src="file.publicUrl"
              :alt="file.name"
              class="w-full h-full object-cover"
              loading="lazy"
            />
            <div v-else class="text-center space-y-2">
              <div class="text-3xl">{{ getFileIcon(file.kind, file.extension) }}</div>
              <span class="text-[10px] text-white/30 font-mono uppercase">{{ file.extension }}</span>
            </div>
          </div>

          <!-- 底部信息条 -->
          <div class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-8 pb-2 px-2.5">
            <p class="text-[10px] text-white/90 font-medium truncate leading-tight">{{ file.name }}</p>
            <p class="text-[10px] text-white/40 font-mono mt-0.5">{{ file.sizeFormatted }}</p>
          </div>

          <!-- hover 操作按钮 -->
          <div class="absolute top-2 right-2 hidden group-hover:flex gap-1" @click.stop>
            <button @click="openRename(file)" class="w-6 h-6 rounded-md bg-black/60 hover:bg-black/80 text-white/70 text-[10px] flex items-center justify-center cursor-pointer" title="重命名">✏️</button>
            <button @click="openMove(file)" class="w-6 h-6 rounded-md bg-black/60 hover:bg-black/80 text-white/70 text-[10px] flex items-center justify-center cursor-pointer" title="移动"><span class="i-lucide-folder-input text-[12px]" /></button>
          </div>
        </div>
      </div>
    </template>

    <!-- ── 列表视图 ───────────────────────────────────────────── -->
    <template v-else-if="activeView === 'files'">
      <!-- 文件夹 -->
      <div v-if="folders.length > 0" class="flex flex-wrap gap-3 mb-4">
        <button
          v-for="folder in folders"
          :key="folder"
          @click="navigateFolder(folder)"
          class="flex items-center gap-2 bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] rounded-xl px-4 py-3 text-xs text-white/70 transition-all cursor-pointer"
        >
          <span class="i-lucide-folder text-[14px] text-indigo-400/70" />
          <span class="font-mono">{{ folder }}</span>
        </button>
      </div>

      <div class="bg-white/[0.04] rounded-2xl overflow-hidden shadow-xl shadow-black/20">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm border-collapse">
            <thead>
              <tr class="border-b border-white/[0.05] text-white/40 uppercase tracking-widest text-[10px] bg-white/[0.005]">
                <th v-if="selecting" class="px-4 py-4 w-10 font-semibold">
                  <input type="checkbox" :checked="selectedCount === filteredFiles.length && filteredFiles.length > 0" @change="toggleSelectAll" class="cursor-pointer" />
                </th>
                <th class="px-6 py-4 font-semibold font-mono">文件</th>
                <th class="px-6 py-4 font-semibold font-mono">类型</th>
                <th class="px-6 py-4 font-semibold font-mono">大小</th>
                <th class="px-6 py-4 font-semibold font-mono">更新时间</th>
                <th class="px-6 py-4 font-semibold font-mono text-right">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/[0.04]">
              <tr
                v-for="file in filteredFiles"
                :key="file.path"
                @click="handleFileClick(file)"
                class="hover:bg-white/[0.02] transition-colors duration-200 cursor-pointer"
                :class="selectedFile?.path === file.path ? 'bg-indigo-500/5' : ''"
              >
                <td v-if="selecting" class="px-4 py-3">
                  <input type="checkbox" :checked="isSelected(file.path)" @click.stop @change="toggleSelect(file.path)" class="cursor-pointer" />
                </td>
                <td class="px-6 py-5">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg overflow-hidden bg-white/[0.03] flex items-center justify-center flex-shrink-0">
                      <img v-if="file.isImage && (file.thumbnailUrl || file.publicUrl)" :src="file.thumbnailUrl || file.publicUrl!" class="w-full h-full object-cover" loading="lazy" />
                      <span v-else class="text-sm">{{ getFileIcon(file.kind, file.extension) }}</span>
                    </div>
                    <span class="text-white/90 font-medium truncate max-w-[200px]">{{ file.name }}</span>
                  </div>
                </td>
                <td class="px-6 py-5 text-white/50 font-mono text-xs">
                  <span class="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] uppercase">{{ file.extension }}</span>
                </td>
                <td class="px-6 py-5 text-white/50 font-mono">{{ file.sizeFormatted }}</td>
                <td class="px-6 py-5 text-white/40 font-mono text-xs">{{ new Date(file.updatedAt).toLocaleString() }}</td>
                <td class="px-6 py-5 text-right space-x-2" @click.stop>
                  <button
                    @click="openRename(file)"
                    class="text-[11px] font-semibold bg-white/10 hover:bg-white/15 text-white/80 px-4 py-2 rounded-full border border-white/15 transition-all cursor-pointer"
                  >重命名</button>
                  <button
                    @click="openMove(file)"
                    class="text-[11px] font-semibold bg-white/10 hover:bg-white/15 text-white/80 px-4 py-2 rounded-full border border-white/15 transition-all cursor-pointer"
                  >移动</button>
                  <button
                    v-if="file.publicUrl"
                    @click="copyToClipboard(file.publicUrl!)"
                    class="text-[11px] font-semibold bg-white/10 hover:bg-white/15 text-white/80 px-4 py-2 rounded-full border border-white/15 transition-all cursor-pointer"
                  >复制链接</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- ── 分页 ───────────────────────────────────────────────── -->
    <div v-if="activeView === 'files' && total > limit" class="flex items-center justify-between text-xs text-white/40">
      <span>共 {{ total }} 个文件，第 {{ Math.floor(offset / limit) + 1 }} / {{ Math.ceil(total / limit) }} 页</span>
      <div class="flex gap-2">
        <button
          :disabled="!hasPrev"
          @click="prevPage"
          class="bg-white/[0.05] hover:bg-white/[0.10] disabled:opacity-50 border border-white/[0.08] text-white/80 disabled:text-white/30 rounded-full px-4 py-2 transition-all cursor-pointer"
        >上一页</button>
        <button
          :disabled="!hasNext"
          @click="nextPage"
          class="bg-white/[0.05] hover:bg-white/[0.10] disabled:opacity-50 border border-white/[0.08] text-white/80 disabled:text-white/30 rounded-full px-4 py-2 transition-all cursor-pointer"
        >下一页</button>
      </div>
    </div>

    <!-- ── 文件详情侧栏 ───────────────────────────────────────── -->
    <Transition name="slide-right">
      <AdminMediaDetail
        v-if="selectedFile"
        :file="selectedFile"
        :bucket="activeBucket"
        @close="selectedFile = null"
        @delete="handleDeleteFile"
        @copy="copyToClipboard"
      />
    </Transition>

    <!-- ── 新建桶弹窗 ───────────────────────────────────────────── -->
    <Transition name="fade">
      <div v-if="showBucketModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" @click.self="showBucketModal = false">
        <div class="bg-[#12121a] rounded-2xl p-6 w-[400px] space-y-4 shadow-2xl shadow-black/40">
          <h3 class="text-sm font-semibold text-white">新建存储桶</h3>
          <div class="space-y-3">
            <div>
              <label class="text-[11px] text-white/40 uppercase tracking-wider">桶名 (slug 格式)</label>
              <input v-model="newBucketForm.name" type="text" placeholder="my-bucket" class="w-full mt-1 bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50" />
              <p v-if="bucketNameError" class="text-[10px] text-[#ff453a] mt-1">{{ bucketNameError }}</p>
            </div>
            <div class="flex items-center gap-3">
              <label class="text-[11px] text-white/40 uppercase tracking-wider">公开</label>
              <input v-model="newBucketForm.public" type="checkbox" class="cursor-pointer" />
            </div>
            <div>
              <label class="text-[11px] text-white/40 uppercase tracking-wider">大小限制 (MB)</label>
              <input v-model.number="newBucketForm.maxSize" type="number" min="1" max="500" class="w-full mt-1 bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50" />
            </div>
            <div>
              <label class="text-[11px] text-white/40 uppercase tracking-wider">MIME 白名单 (逗号分隔，可留空)</label>
              <input v-model="newBucketForm.allowedMime" type="text" placeholder="image/*, video/mp4" class="w-full mt-1 bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50" />
            </div>
          </div>
          <div class="flex gap-3 pt-2">
            <button @click="handleCreateBucket" :disabled="!!bucketNameError || !newBucketForm.name" class="flex-1 text-sm font-semibold bg-gradient-to-r from-indigo-600 to-indigo-400 text-white rounded-xl py-2.5 transition-all cursor-pointer disabled:opacity-40">创建</button>
            <button @click="showBucketModal = false" class="flex-1 text-sm font-semibold bg-white/[0.05] text-white/70 border border-white/[0.08] rounded-xl py-2.5 cursor-pointer">取消</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ── 重命名弹窗 ───────────────────────────────────────────── -->
    <Transition name="fade">
      <div v-if="showRenameModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" @click.self="showRenameModal = false">
        <div class="bg-[#12121a] rounded-2xl p-6 w-[400px] space-y-4 shadow-2xl shadow-black/40">
          <h3 class="text-sm font-semibold text-white">重命名文件</h3>
          <div>
            <label class="text-[11px] text-white/40 uppercase tracking-wider">新文件名</label>
            <input v-model="renameForm.newName" type="text" class="w-full mt-1 bg-white/[0.03] border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50" :class="renameConflict ? 'border-[#ff453a]/50' : 'border-white/[0.08]'" />
            <p v-if="renameConflict" class="text-[10px] text-[#ff453a] mt-1">{{ renameConflict }}</p>
          </div>
          <div class="flex gap-3 pt-2">
            <button @click="handleRename" :disabled="!renameForm.newName || renameForm.newName === renameForm.oldName || !!renameConflict" class="flex-1 text-sm font-semibold bg-gradient-to-r from-indigo-600 to-indigo-400 text-white rounded-xl py-2.5 transition-all cursor-pointer disabled:opacity-40">确认</button>
            <button @click="showRenameModal = false" class="flex-1 text-sm font-semibold bg-white/[0.05] text-white/70 border border-white/[0.08] rounded-xl py-2.5 cursor-pointer">取消</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ── 移动弹窗 ───────────────────────────────────────────── -->
    <Transition name="fade">
      <div v-if="showMoveModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" @click.self="showMoveModal = false">
        <div class="bg-[#12121a] rounded-2xl p-6 w-[400px] space-y-4 shadow-2xl shadow-black/40">
          <h3 class="text-sm font-semibold text-white">移动文件</h3>
          <div class="space-y-2">
            <div>
              <label class="text-[11px] text-white/40 uppercase tracking-wider">原路径</label>
              <p class="text-sm text-white/60 font-mono mt-1">{{ moveForm.fromPath }}</p>
            </div>
            <div>
              <label class="text-[11px] text-white/40 uppercase tracking-wider">目标路径</label>
              <input v-model="moveForm.toPath" type="text" placeholder="new-folder/filename.ext" class="w-full mt-1 bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50" />
            </div>
          </div>
          <div class="flex gap-3 pt-2">
            <button @click="handleMove" :disabled="!moveForm.toPath || moveForm.toPath === moveForm.fromPath" class="flex-1 text-sm font-semibold bg-gradient-to-r from-indigo-600 to-indigo-400 text-white rounded-xl py-2.5 transition-all cursor-pointer disabled:opacity-40">移动</button>
            <button @click="showMoveModal = false" class="flex-1 text-sm font-semibold bg-white/[0.05] text-white/70 border border-white/[0.08] rounded-xl py-2.5 cursor-pointer">取消</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ════════════════════ Lightbox 图片预览 ════════════════════ -->
    <Teleport to="body">
      <Transition name="lightbox">
        <div
          v-if="lightboxFile"
          class="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm"
          @click.self="closeLightbox"
          @keydown="onLightboxKeydown"
          tabindex="0"
        >
          <!-- 关闭按钮 -->
          <button @click="closeLightbox" class="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white/80 flex items-center justify-center text-lg transition-all z-10 cursor-pointer">✕</button>

          <!-- 上一张 -->
          <button
            @click.stop="onLightboxKeydown({ key: 'ArrowLeft' } as KeyboardEvent)"
            class="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white/80 flex items-center justify-center text-xl transition-all z-10 cursor-pointer"
          >‹</button>

          <!-- 下一张 -->
          <button
            @click.stop="onLightboxKeydown({ key: 'ArrowRight' } as KeyboardEvent)"
            class="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white/80 flex items-center justify-center text-xl transition-all z-10 cursor-pointer"
          >›</button>

          <!-- 图片容器 -->
          <div class="max-w-[90vw] max-h-[90vh] flex flex-col items-center gap-4">
            <img
              :src="lightboxFile.publicUrl || undefined"
              :alt="lightboxFile.name"
              class="max-w-full max-h-[82vh] object-contain rounded-lg shadow-2xl"
            />
            <!-- 底部信息 -->
            <div class="flex items-center gap-6 text-sm text-white/60">
              <span class="font-mono text-white/80">{{ lightboxFile.name }}</span>
              <span>{{ lightboxFile.sizeFormatted }}</span>
              <span v-if="lightboxFile.width && lightboxFile.height" class="text-white/40">{{ lightboxFile.width }}×{{ lightboxFile.height }}</span>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.toast-enter-active { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.toast-leave-active { transition: all 0.2s ease-in; }
.toast-enter-from { opacity: 0; transform: translateX(40px); }
.toast-leave-to { opacity: 0; transform: translateX(40px); }

.lightbox-enter-active, .lightbox-leave-active { transition: opacity 0.25s ease; }
.lightbox-enter-from, .lightbox-leave-to { opacity: 0; }
.lightbox-enter-active img, .lightbox-leave-active img { transition: transform 0.25s ease; }
.lightbox-enter-from img { transform: scale(0.95); }
.lightbox-leave-to img { transform: scale(0.95); }

.slide-right-enter-active, .slide-right-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-right-enter-from, .slide-right-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
