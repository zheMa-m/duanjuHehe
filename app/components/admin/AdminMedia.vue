<script setup lang="ts">
import AdminMediaDetail from './AdminMediaDetail.vue'
import AdminMediaTrash from './AdminMediaTrash.vue'
import AdminMediaGrid from './AdminMediaGrid.vue'

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
const showAdvancedFilters = ref(false)
const sortField = ref<'updated_at' | 'created_at' | 'name'>('updated_at')
const sortOrder = ref<'asc' | 'desc'>('desc')
const prefix = ref('')
const offset = ref(0)
const pageSize = ref(20)
const pageSizeOptions = [10, 20, 50, 100]

const files = ref<FileInfo[]>([])
const folders = ref<string[]>([])
const confirmDialog = ref()
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
  if (!await confirmDialog.value.show(`确定要删除桶「${name}」吗？`, { title: '删除存储桶', detail: '桶必须为空。', confirmText: '确认删除', icon: 'i-lucide-trash-2' })) return
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

// ── 回收站（已提取到 AdminMediaTrash.vue）─────────────────────
const trashRef = ref<InstanceType<typeof AdminMediaTrash> | null>(null)

// ── 视图切换 ──────────────────────────────────────────────
watch(activeView, () => {
  if (activeView.value === 'trash') {
    trashRef.value?.fetchTrash()
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
const { upload, remove, getPublicUrl, getSignedUrl } = useStorage()

async function fetchFiles() {
  isFetching.value = true
  try {
    const params: Record<string, any> = {
      bucket: activeBucket.value,
      prefix: prefix.value,
      limit: pageSize.value,
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
const currentPage = computed(() => Math.floor(offset.value / pageSize.value) + 1)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
const hasPrev = computed(() => offset.value > 0)
const hasNext = computed(() => offset.value + pageSize.value < total.value)
function prevPage() { offset.value = Math.max(0, offset.value - pageSize.value); fetchFiles() }
function nextPage() { offset.value += pageSize.value; fetchFiles() }
function goToPage(page: number) { offset.value = (page - 1) * pageSize.value; fetchFiles() }

// 每页条数切换
function changePageSize(size: number) {
  pageSize.value = size
  offset.value = 0
  fetchFiles()
}

// 快速跳页
const jumpPageInput = ref('')
function jumpToPage() {
  const p = parseInt(jumpPageInput.value)
  if (p >= 1 && p <= totalPages.value) {
    goToPage(p)
  }
  jumpPageInput.value = ''
}

// 生成可见页码列表（最多 5 个，带省略号）
const visiblePages = computed(() => {
  const tp = totalPages.value
  const cp = currentPage.value
  if (tp <= 5) return Array.from({ length: tp }, (_, i) => i + 1)
  const pages: (number | string)[] = []
  if (cp <= 3) {
    pages.push(1, 2, 3, 4, '...', tp)
  } else if (cp >= tp - 2) {
    pages.push(1, '...', tp - 3, tp - 2, tp - 1, tp)
  } else {
    pages.push(1, '...', cp - 1, cp, cp + 1, '...', tp)
  }
  return pages
})

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
const lightboxPreviewUrl = ref<string | null>(null)

function openLightbox(file: FileInfo) {
  if (file.isImage) {
    lightboxFile.value = file
    lightboxPreviewUrl.value = file.publicUrl
    // 私有桶文件无 publicUrl，自动生成临时签名链接
    if (!file.publicUrl) {
      getSignedUrl(file.bucket || activeBucket.value, file.path).then(url => {
        if (lightboxFile.value?.path === file.path) {
          lightboxPreviewUrl.value = url
        }
      }).catch(() => {})
    }
  }
}
function closeLightbox() { lightboxFile.value = null; lightboxPreviewUrl.value = null }

// 键盘导航 Lightbox
function onLightboxKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') { closeLightbox(); return }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    const images = filteredFiles.value.filter(f => f.isImage)
    const idx = images.findIndex(f => f.path === lightboxFile.value?.path)
    const next = e.key === 'ArrowLeft' ? (idx > 0 ? images[idx - 1] : null) : (idx < images.length - 1 ? images[idx + 1] : null)
    if (next) openLightbox(next)
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
  if (!await confirmDialog.value.show(`确定要将 ${paths.length} 个文件移入回收站吗？`, { title: '批量移入回收站', confirmText: '确认移入', icon: 'i-lucide-trash-2' })) return

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
  const allFiles = Array.from(droppedFiles)
  const { valid, invalid } = validateDropMime(allFiles)
  if (invalid.length > 0) {
    showToast(`${invalid.length} 个文件格式不支持（${invalid.slice(0, 3).join(', ')}${invalid.length > 3 ? '...' : ''}）`, 'error')
  }
  if (valid.length > 0) await uploadFiles(valid)
}

// ── Grid 文件夹拖拽上传（由子组件转发）──────────────────────────
function handleGridFolderDrop(files: File[], folder: string) {
  const targetPrefix = prefix.value ? `${prefix.value}/${folder}` : folder
  uploadFiles(files, targetPrefix)
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

// ── MIME accept 联动 ───────────────────────────────────────
const currentBucketAccept = computed(() => {
  const bucket = buckets.value.find(b => b.name === activeBucket.value)
  if (!bucket?.allowed_mime_types?.length) return undefined
  return bucket.allowed_mime_types.join(',')
})

function validateDropMime(files: File[]): { valid: File[]; invalid: string[] } {
  const accept = currentBucketAccept.value
  if (!accept) return { valid: files, invalid: [] }
  const patterns = accept.split(',').map(s => s.trim())
  const valid: File[] = []
  const invalid: string[] = []
  for (const file of files) {
    const match = patterns.some(p => {
      if (p === '*') return true
      if (p.endsWith('/*')) return file.type.startsWith(p.slice(0, -2))
      return file.type === p
    })
    if (match) valid.push(file); else invalid.push(file.name)
  }
  return { valid, invalid }
}

// ── 右键上下文菜单 ─────────────────────────────────────────
const contextMenu = ref<{ x: number; y: number; file: FileInfo } | null>(null)

function handleContextMenu(_e: MouseEvent, file: FileInfo) {
  contextMenu.value = { x: _e.clientX, y: _e.clientY, file }
}

function closeContextMenu() { contextMenu.value = null }

onMounted(() => {
  window.addEventListener('click', closeContextMenu)
  window.addEventListener('scroll', closeContextMenu, true)
})
onUnmounted(() => {
  window.removeEventListener('click', closeContextMenu)
  window.removeEventListener('scroll', closeContextMenu, true)
})

// ── 批量移动 ───────────────────────────────────────────
const showBatchMoveModal = ref(false)
const batchMoveForm = reactive({ targetFolder: '' })

function openBatchMove() {
  batchMoveForm.targetFolder = prefix.value || ''
  showBatchMoveModal.value = true
}

async function handleBatchMove() {
  const paths = getSelectedPaths()
  if (paths.length === 0) return
  const folder = batchMoveForm.targetFolder.trim()
  let successCount = 0
  let failCount = 0

  const CONCURRENCY = 3
  const queue = [...paths]

  async function processNext(): Promise<void> {
    const fromPath = queue.shift()
    if (!fromPath) return
    const fileName = fromPath.includes('/') ? fromPath.split('/').pop()! : fromPath
    const toPath = folder ? `${folder}/${fileName}` : fileName
    if (toPath === fromPath) { successCount++; await processNext(); return }
    try {
      await $fetch('/api/admin/storage/move', {
        method: 'POST',
        body: { bucket: activeBucket.value, fromPath, toPath },
      })
      successCount++
    } catch {
      failCount++
    }
    await processNext()
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, paths.length) }, () => processNext())
  await Promise.all(workers)

  showBatchMoveModal.value = false
  selectedMap.value = {}
  selecting.value = false
  fetchFiles()
  if (failCount > 0) {
    showToast(`${successCount} 个成功，${failCount} 个失败`, 'info')
  } else {
    showToast(`已移动 ${successCount} 个文件`, 'success')
  }
}

// ── 快捷键 ───────────────────────────────────────────────────
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (contextMenu.value) { closeContextMenu(); return }
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
        <span class="i-lucide-shield text-[11px] opacity-50 mr-0.5" /> {{ b.name }}
        <span class="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-indigo-500" :class="activeBucket === b.name && activeView === 'files' ? 'opacity-100' : 'opacity-0'" />
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
          class="hidden group-hover:inline-flex ml-1 w-4 h-4 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 items-center justify-center transition-all"
        ><span class="i-lucide-x text-[10px]" /></span>
        <span class="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-indigo-500" :class="activeBucket === b.name && activeView === 'files' ? 'opacity-100' : 'opacity-0'" />
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
        <span v-if="(trashRef?.trashTotal ?? 0) > 0" class="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold bg-[#ff453a] text-white rounded-full px-1">{{ trashRef?.trashTotal }}</span>
      </button>
      <!-- 桶统计 -->
      <span v-if="stats && activeView === 'files'" class="text-[10px] text-white/30 font-mono ml-2 flex-shrink-0 self-center">
        {{ stats.totalFiles }} 个文件 / {{ stats.totalSizeFormatted }}
      </span>
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
          class="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 cursor-pointer"
        ><span class="i-lucide-x text-[12px]" /></button>
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

      <!-- 高级筛选触发按钮 -->
      <button
        @click="showAdvancedFilters = !showAdvancedFilters"
        class="bg-white/[0.03] hover:bg-white/[0.08] border rounded-full px-3.5 py-2.5 text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5"
        :class="showAdvancedFilters || dateFrom || dateTo || uploaderFilter ? 'text-indigo-400 border-indigo-500/30' : 'text-white/60 border-white/[0.08] hover:text-white'"
      >
        <span class="i-lucide-sliders-horizontal text-[13px]" />
        筛选
        <span v-if="(dateFrom || dateTo || uploaderFilter)" class="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{{ (dateFrom || dateTo ? 1 : 0) + (uploaderFilter ? 1 : 0) }}</span>
      </button>

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

      <!-- 批量移动 -->
      <button
        v-if="selecting && selectedCount > 0"
        @click="openBatchMove"
        class="bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 text-indigo-400 rounded-full px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer"
      >
        <span class="i-lucide-folder-input text-[11px] mr-0.5" /> 移动 ({{ selectedCount }})
      </button>

      <!-- 上传按钮 -->
      <button
        @click="triggerUpload"
        class="bg-gradient-to-r from-indigo-600 to-indigo-400 hover:from-indigo-500 hover:to-indigo-300 text-sm font-semibold rounded-full text-white px-4 py-2.5 transition-all active:scale-[0.98] cursor-pointer shadow-[0_4px_12px_rgba(99,102,241,0.2)]"
      >
        上传文件
      </button>
      <input ref="fileInputRef" type="file" multiple class="hidden" :accept="currentBucketAccept" @change="handleFileChange" />

      <!-- 筛选计数 -->
      <span v-if="(dateFrom || dateTo || uploaderFilter) && filteredCount !== files.length" class="text-[11px] text-white/30 ml-1">
        显示 {{ filteredCount }}/{{ files.length }}
      </span>
    </div>

    <!-- ── 高级筛选展开区 ──────────────────────────────────────── -->
    <Transition name="fade">
      <div v-if="showAdvancedFilters && activeView === 'files'" class="flex flex-wrap items-center gap-3 px-1">
        <!-- 日期范围 -->
        <div class="flex items-center gap-1">
          <label class="text-[10px] text-white/30 uppercase tracking-wider font-mono">日期</label>
          <input
            v-model="dateFrom"
            type="date"
            class="bg-[#141416] border border-white/[0.08] hover:border-white/20 text-xs text-white/80 rounded-full px-3 py-2 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all cursor-pointer [color-scheme:dark] w-[120px]"
            title="起始日期"
          />
          <span class="text-white/20 text-xs">-</span>
          <input
            v-model="dateTo"
            type="date"
            class="bg-[#141416] border border-white/[0.08] hover:border-white/20 text-xs text-white/80 rounded-full px-3 py-2 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all cursor-pointer [color-scheme:dark] w-[120px]"
            title="结束日期"
          />
        </div>
        <!-- 上传者筛选 -->
        <div class="relative">
          <input
            v-model="uploaderFilter"
            type="text"
            placeholder="上传者..."
            class="bg-[#141416] border border-white/[0.08] hover:border-white/20 text-xs text-white/80 rounded-full px-3 py-2 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all w-[120px]"
          />
          <button
            v-if="uploaderFilter"
            @click="uploaderFilter = ''"
            class="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 cursor-pointer"
          ><span class="i-lucide-x text-[10px]" /></button>
        </div>
        <!-- 清除全部 -->
        <button
          v-if="dateFrom || dateTo || uploaderFilter"
          @click="dateFrom = ''; dateTo = ''; uploaderFilter = ''"
          class="text-[10px] text-white/30 hover:text-white/60 cursor-pointer flex items-center gap-1"
        ><span class="i-lucide-rotate-ccw text-[10px]" /> 清除筛选</button>
      </div>
    </Transition>

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
    <AdminMediaTrash
      v-if="activeView === 'trash'"
      ref="trashRef"
      :confirm-dialog="confirmDialog"
      @refresh-files="fetchFiles"
    />

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

    <!-- ── 文件视图（网格 / 列表）────────────────────────────── -->
    <AdminMediaGrid
      v-if="activeView === 'files'"
      :files="files"
      :folders="folders"
      :filtered-files="filteredFiles"
      :view-mode="viewMode"
      :selecting="selecting"
      :selected-file="selectedFile"
      :bucket="activeBucket"
      :prefix="prefix"
      :is-fetching="isFetching"
      :search-query="searchQuery"
      :date-from="dateFrom"
      :date-to="dateTo"
      :uploader-filter="uploaderFilter"
      :selected-count="selectedCount"
      :is-selected="isSelected"
      :get-file-icon="getFileIcon"
      @file-click="handleFileClick"
      @navigate-folder="navigateFolder"
      @folder-drop="handleGridFolderDrop"
      @toggle-select="toggleSelect"
      @toggle-select-all="toggleSelectAll"
      @rename="openRename"
      @move="openMove"
      @delete="handleDeleteFile"
      @copy="copyToClipboard"
      @trigger-upload="triggerUpload"
      @context-menu="handleContextMenu"
    />


    <!-- ── 分页 ───────────────────────────────────────────────── -->
    <div v-if="activeView === 'files' && total > 0" class="flex items-center justify-between gap-4 px-5 py-3 bg-white/[0.02] rounded-xl border border-white/[0.04] flex-wrap">
      <!-- 左：统计 + 每页条数 -->
      <div class="flex items-center gap-3">
        <span class="text-[11px] text-white/30 font-mono">
          共 {{ total }} 个文件 · 第 {{ currentPage }}/{{ totalPages }} 页
        </span>
        <div class="flex items-center gap-1.5">
          <span class="text-[10px] text-white/25">每页</span>
          <select
            :value="pageSize"
            @change="changePageSize(Number(($event.target as HTMLSelectElement).value))"
            class="text-[11px] bg-white/5 text-white/70 border border-white/10 rounded-md px-1.5 py-0.5 focus:outline-none focus:border-indigo-500/40 cursor-pointer appearance-none"
          >
            <option v-for="n in pageSizeOptions" :key="n" :value="n">{{ n }}</option>
          </select>
          <span class="text-[10px] text-white/25">条</span>
        </div>
      </div>

      <!-- 中：页码按钮 -->
      <div class="flex items-center gap-1.5">
        <button
          :disabled="!hasPrev"
          @click="prevPage"
          class="text-[11px] font-semibold bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white/80 px-2.5 py-1.5 rounded-full border border-white/10 transition-all cursor-pointer focus:outline-none"
        >上一页</button>
        <template v-for="p in visiblePages" :key="p">
          <span v-if="p === '...'" class="text-[11px] text-white/20 px-0.5">…</span>
          <button
            v-else
            @click="goToPage(p as number)"
            class="text-[11px] font-semibold min-w-[28px] h-7 rounded-full border transition-all cursor-pointer focus:outline-none"
            :class="p === currentPage
              ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
              : 'bg-white/5 hover:bg-white/10 text-white/80 border-white/10'"
          >{{ p }}</button>
        </template>
        <button
          :disabled="!hasNext"
          @click="nextPage"
          class="text-[11px] font-semibold bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white/80 px-2.5 py-1.5 rounded-full border border-white/10 transition-all cursor-pointer focus:outline-none"
        >下一页</button>
      </div>

      <!-- 右：快速跳页 -->
      <div v-if="totalPages > 5" class="flex items-center gap-1.5">
        <span class="text-[10px] text-white/25">跳至</span>
        <input
          v-model="jumpPageInput"
          @keydown.enter="jumpToPage"
          type="text"
          inputmode="numeric"
          pattern="[0-9]*"
          :placeholder="String(currentPage)"
          class="w-10 text-[11px] text-center bg-white/5 text-white/80 border border-white/10 rounded-md px-1 py-1 focus:outline-none focus:border-indigo-500/40 font-mono"
        />
        <span class="text-[10px] text-white/25">页</span>
        <button
          @click="jumpToPage"
          :disabled="!jumpPageInput"
          class="text-[10px] font-semibold bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed text-white/60 px-2 py-1 rounded-md border border-white/10 transition-all cursor-pointer focus:outline-none"
        >Go</button>
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
        @lightbox="openLightbox($event)"
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
            <div class="flex items-center justify-between">
              <label class="text-[11px] text-white/40 uppercase tracking-wider">公开</label>
              <button
                type="button"
                @click="newBucketForm.public = !newBucketForm.public"
                class="relative w-9 h-5 rounded-full transition-all cursor-pointer"
                :class="newBucketForm.public ? 'bg-indigo-500' : 'bg-white/[0.10]'"
              >
                <span class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform" :class="newBucketForm.public ? 'translate-x-4' : 'translate-x-0'" />
              </button>
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

    <!-- ── 批量移动弹窗 ─────────────────────────────────────────── -->
    <Transition name="fade">
      <div v-if="showBatchMoveModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" @click.self="showBatchMoveModal = false">
        <div class="bg-[#12121a] rounded-2xl p-6 w-[400px] space-y-4 shadow-2xl shadow-black/40">
          <h3 class="text-sm font-semibold text-white">批量移动文件</h3>
          <div>
            <label class="text-[11px] text-white/40 uppercase tracking-wider">目标目录</label>
            <input v-model="batchMoveForm.targetFolder" type="text" placeholder="folder/subfolder" class="w-full mt-1 bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 font-mono" />
            <p class="text-[10px] text-white/30 mt-1">留空则移动到根目录</p>
          </div>
          <div class="flex gap-3 pt-2">
            <button @click="handleBatchMove" class="flex-1 text-sm font-semibold bg-gradient-to-r from-indigo-600 to-indigo-400 text-white rounded-xl py-2.5 transition-all cursor-pointer">移动 {{ selectedCount }} 个文件</button>
            <button @click="showBatchMoveModal = false" class="flex-1 text-sm font-semibold bg-white/[0.05] text-white/70 border border-white/[0.08] rounded-xl py-2.5 cursor-pointer">取消</button>
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
          <button @click="closeLightbox" class="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white/80 flex items-center justify-center transition-all z-10 cursor-pointer"><span class="i-lucide-x text-[16px]" /></button>

          <!-- 上一张 -->
          <button
            @click.stop="onLightboxKeydown({ key: 'ArrowLeft' } as KeyboardEvent)"
            class="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white/80 flex items-center justify-center transition-all z-10 cursor-pointer"
          ><span class="i-lucide-chevron-left text-[20px]" /></button>

          <!-- 下一张 -->
          <button
            @click.stop="onLightboxKeydown({ key: 'ArrowRight' } as KeyboardEvent)"
            class="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white/80 flex items-center justify-center transition-all z-10 cursor-pointer"
          ><span class="i-lucide-chevron-right text-[20px]" /></button>

          <!-- 图片容器 -->
          <div class="max-w-[90vw] max-h-[90vh] flex flex-col items-center gap-4">
            <img
              :src="lightboxPreviewUrl || undefined"
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

    <!-- ── 右键上下文菜单 ───────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="contextMenu"
          class="fixed z-[150] bg-[#1a1a2e] border border-white/[0.08] rounded-xl shadow-2xl shadow-black/40 py-1.5 min-w-[160px] overflow-hidden"
          :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
          @click.stop
        >
          <div class="px-4 py-1.5 text-[10px] text-white/30 font-mono truncate border-b border-white/[0.05] mb-1">{{ contextMenu.file.name }}</div>
          <button @click="openRename(contextMenu.file); closeContextMenu()" class="w-full px-4 py-2 text-xs text-white/80 hover:bg-white/[0.05] flex items-center gap-2 cursor-pointer transition-colors">
            <span class="i-lucide-pencil text-[12px] text-white/40" /> 重命名
          </button>
          <button @click="openMove(contextMenu.file); closeContextMenu()" class="w-full px-4 py-2 text-xs text-white/80 hover:bg-white/[0.05] flex items-center gap-2 cursor-pointer transition-colors">
            <span class="i-lucide-folder-input text-[12px] text-white/40" /> 移动
          </button>
          <button v-if="contextMenu.file.publicUrl" @click="copyToClipboard(contextMenu.file.publicUrl!); closeContextMenu(); showToast('已复制链接', 'success')" class="w-full px-4 py-2 text-xs text-white/80 hover:bg-white/[0.05] flex items-center gap-2 cursor-pointer transition-colors">
            <span class="i-lucide-link text-[12px] text-white/40" /> 复制链接
          </button>
          <div class="border-t border-white/[0.05] my-1" />
          <button @click="handleDeleteFile(contextMenu.file); closeContextMenu()" class="w-full px-4 py-2 text-xs text-[#ff453a]/80 hover:bg-[#ff453a]/10 flex items-center gap-2 cursor-pointer transition-colors">
            <span class="i-lucide-trash-2 text-[12px]" /> 删除
          </button>
        </div>
      </Transition>
    </Teleport>
    <AdminConfirmDialog ref="confirmDialog" />
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
