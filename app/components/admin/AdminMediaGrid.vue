<script setup lang="ts">
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

const props = defineProps<{
  files: FileInfo[]
  folders: string[]
  filteredFiles: FileInfo[]
  viewMode: 'grid' | 'list'
  selecting: boolean
  selectedFile: FileInfo | null
  bucket: string
  prefix: string
  isFetching: boolean
  searchQuery: string
  dateFrom: string
  dateTo: string
  uploaderFilter: string
  selectedCount: number
  isSelected: (path: string) => boolean
  getFileIcon: (kind: string, ext: string) => string
}>()

const emit = defineEmits<{
  'file-click': [file: FileInfo]
  'navigate-folder': [folder: string]
  'folder-drop': [files: File[], folder: string]
  'toggle-select': [path: string]
  'toggle-select-all': []
  'rename': [file: FileInfo]
  'move': [file: FileInfo]
  'delete': [file: FileInfo]
  'copy': [text: string]
  'trigger-upload': []
  'context-menu': [e: MouseEvent, file: FileInfo]
}>()

function handleFileClick(file: FileInfo) { emit('file-click', file) }
function navigateFolder(folder: string) { emit('navigate-folder', folder) }
function openRename(file: FileInfo) { emit('rename', file) }
function openMove(file: FileInfo) { emit('move', file) }
function handleDeleteFile(file: FileInfo) { emit('delete', file) }
function copyToClipboard(text: string) { emit('copy', text) }
function toggleSelect(path: string) { emit('toggle-select', path) }
function toggleSelectAll() { emit('toggle-select-all') }

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
  emit('folder-drop', Array.from(droppedFiles), folder)
}

function onContextMenu(e: MouseEvent, file: FileInfo) {
  e.preventDefault()
  emit('context-menu', e, file)
}
</script>

<template>
  <!-- ── 加载骨架屏 ─────────────────────────────────────────── -->
  <div v-if="isFetching && files.length === 0" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
    <div v-for="i in 8" :key="i" class="aspect-square rounded-xl bg-white/[0.02] animate-pulse border border-white/[0.04]"></div>
  </div>

  <!-- ── 空状态 ─────────────────────────────────────────────── -->
  <div v-else-if="!isFetching && filteredFiles.length === 0" class="flex flex-col items-center justify-center py-20 text-center space-y-4">
    <span :class="(searchQuery || dateFrom || dateTo || uploaderFilter) ? 'i-lucide-search text-[48px]' : 'i-lucide-inbox text-[48px]'" class="opacity-30 text-white/40" />
    <p v-if="searchQuery || dateFrom || dateTo || uploaderFilter" class="text-white/40 text-sm">
      未找到匹配的文件<span v-if="files.length > 0" class="text-white/20">（共 {{ files.length }} 个文件被筛选）</span>
    </p>
    <template v-else>
      <p class="text-white/40 text-sm">此 Bucket 暂无文件</p>
      <p class="text-white/25 text-xs">拖拽文件到页面任意位置，或点击「上传文件」按钮开始</p>
      <button
        @click="$emit('trigger-upload')"
        class="mt-2 bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.10] rounded-full px-6 py-2.5 text-xs text-white/70 font-medium transition-all cursor-pointer"
      >
        选择文件上传
      </button>
    </template>
  </div>

  <!-- ── 网格视图 ───────────────────────────────────────────── -->
  <template v-else-if="viewMode === 'grid'">
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
        @contextmenu="onContextMenu($event, file)"
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
            @error="($event.target as HTMLImageElement).src = file.publicUrl || ''"
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
          <div class="flex items-center gap-1.5">
            <p class="text-[10px] text-white/90 font-medium truncate leading-tight flex-1">{{ file.name }}</p>
            <span v-if="file.extension" class="flex-shrink-0 text-[8px] font-mono uppercase bg-white/15 text-white/70 rounded px-1 py-0.5 leading-none">{{ file.extension }}</span>
          </div>
          <p class="text-[10px] text-white/40 font-mono mt-0.5">{{ file.sizeFormatted }}</p>
        </div>

        <!-- hover 操作按钮 -->
        <div class="absolute top-2 right-2 hidden group-hover:flex gap-1" @click.stop>
          <button @click="openRename(file)" class="w-6 h-6 rounded-md bg-black/60 hover:bg-black/80 text-white/70 flex items-center justify-center cursor-pointer" title="重命名"><span class="i-lucide-pencil text-[11px]" /></button>
          <button @click="openMove(file)" class="w-6 h-6 rounded-md bg-black/60 hover:bg-black/80 text-white/70 flex items-center justify-center cursor-pointer" title="移动"><span class="i-lucide-folder-input text-[12px]" /></button>
          <button @click="handleDeleteFile(file)" class="w-6 h-6 rounded-md bg-black/60 hover:bg-[#ff453a]/40 text-white/70 hover:text-[#ff453a] flex items-center justify-center cursor-pointer" title="删除"><span class="i-lucide-trash-2 text-[11px]" /></button>
        </div>
      </div>
    </div>
  </template>

  <!-- ── 列表视图 ───────────────────────────────────────────── -->
  <template v-else>
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
              <th v-if="selecting" class="px-4 py-3 w-10 font-semibold">
                <input type="checkbox" :checked="selectedCount === filteredFiles.length && filteredFiles.length > 0" @change="toggleSelectAll" class="cursor-pointer" />
              </th>
              <th class="px-6 py-3 font-semibold font-mono">文件</th>
              <th class="px-6 py-3 font-semibold font-mono">类型</th>
              <th class="px-6 py-3 font-semibold font-mono">大小</th>
              <th class="px-6 py-3 font-semibold font-mono">更新时间</th>
              <th class="px-6 py-3 font-semibold font-mono text-right">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.04]">
            <tr
              v-for="file in filteredFiles"
              :key="file.path"
              @click="handleFileClick(file)"
              @contextmenu="onContextMenu($event, file)"
              class="hover:bg-white/[0.02] transition-colors duration-200 cursor-pointer"
              :class="selectedFile?.path === file.path ? 'bg-indigo-500/5' : ''"
            >
              <td v-if="selecting" class="px-4 py-3">
                <input type="checkbox" :checked="isSelected(file.path)" @click.stop @change="toggleSelect(file.path)" class="cursor-pointer" />
              </td>
              <td class="px-6 py-3">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg overflow-hidden bg-white/[0.03] flex items-center justify-center flex-shrink-0">
                    <img v-if="file.isImage && (file.thumbnailUrl || file.publicUrl)" :src="file.thumbnailUrl || file.publicUrl!" class="w-full h-full object-cover" loading="lazy" @error="($event.target as HTMLImageElement).src = file.publicUrl || ''" />
                    <span v-else class="text-sm">{{ getFileIcon(file.kind, file.extension) }}</span>
                  </div>
                  <span class="text-white/90 font-medium truncate max-w-[200px]">{{ file.name }}</span>
                </div>
              </td>
              <td class="px-6 py-3 text-white/50 font-mono text-xs">
                <span class="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] uppercase">{{ file.extension }}</span>
              </td>
              <td class="px-6 py-3 text-white/50 font-mono">{{ file.sizeFormatted }}</td>
              <td class="px-6 py-3 text-white/40 font-mono text-xs">{{ new Date(file.updatedAt).toLocaleString() }}</td>
              <td class="px-6 py-3 text-right space-x-2" @click.stop>
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
</template>
