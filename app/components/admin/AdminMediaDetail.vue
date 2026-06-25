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
  file: FileInfo
  bucket: string
}>()

const emit = defineEmits<{
  close: []
  delete: [file: FileInfo]
  copy: [text: string]
  lightbox: [file: FileInfo]
}>()

const { getSignedUrl } = useStorage()

// 私有文件临时链接
const tempSignedUrl = ref<string | null>(null)
const isLoadingSigned = ref(false)
const confirmDialog = ref()

async function generateSignedUrl() {
  isLoadingSigned.value = true
  try {
    const url = await getSignedUrl(props.bucket, props.file.path)
    tempSignedUrl.value = url
  } catch (e) {
    console.error('Failed to generate signed URL:', e)
  } finally {
    isLoadingSigned.value = false
  }
}

// 预览 URL（图片用 publicUrl 或 thumbnail 的原图，视频用 signed URL）
const previewUrl = computed(() => {
  if (props.file.publicUrl) return props.file.publicUrl
  return tempSignedUrl.value
})

function getFileIcon(kind: string): string {
  const map: Record<string, string> = { image: 'i-lucide-image', video: 'i-lucide-video', audio: 'i-lucide-music', document: 'i-lucide-file-text', other: 'i-lucide-package' }
  return map[kind] || 'i-lucide-package'
}

async function confirmDelete() {
  if (!await confirmDialog.value.show(`确定要将「${props.file.name}」移入回收站吗？`, { title: '移入回收站', confirmText: '确认移入', icon: 'i-lucide-trash-2' })) return
  emit('delete', props.file)
}
</script>

<template>
  <div class="fixed top-0 right-0 bottom-0 w-[380px] bg-[#08080f]/95 backdrop-blur-2xl border-l border-white/[0.06] shadow-[-10px_0_30px_rgba(0,0,0,0.6)] z-40 flex flex-col overflow-hidden">

    <!-- 顶栏 -->
    <div class="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
      <h3 class="text-sm font-semibold text-white/80 uppercase tracking-widest font-mono">文件详情</h3>
      <button
        @click="$emit('close')"
        class="w-7 h-7 rounded-lg bg-white/[0.05] hover:bg-white/[0.10] flex items-center justify-center text-white/50 hover:text-white transition-all cursor-pointer"
      ><span class="i-lucide-x text-[12px]" /></button>
    </div>

    <div class="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">

      <!-- ── 预览区 ─────────────────────────────────────────── -->
      <div class="relative bg-white/[0.02] border-b border-white/[0.06]">
        <div class="aspect-square flex items-center justify-center overflow-hidden">
          <template v-if="file.isImage">
            <img
              v-if="previewUrl"
              :src="previewUrl"
              :alt="file.name"
              class="max-w-full max-h-full object-contain"
            />
            <div v-else class="text-center text-white/30 text-xs space-y-2">
              <span class="i-lucide-image-off text-[32px] inline-block" />
              <p>无法预览</p>
            </div>
          </template>
          <template v-else-if="file.isVideo && previewUrl">
            <video :src="previewUrl" controls class="max-w-full max-h-full"></video>
          </template>
          <template v-else>
            <div class="text-center space-y-3">
              <div class="text-5xl">{{ getFileIcon(file.kind) }}</div>
              <span class="text-sm text-white/40 font-mono uppercase">{{ file.extension }}</span>
            </div>
          </template>
        </div>
        <!-- Lightbox 打开按钮（仅图片） -->
        <button
          v-if="file.isImage && previewUrl"
          @click="$emit('lightbox', file)"
          class="absolute bottom-2 right-2 w-8 h-8 rounded-lg bg-black/60 hover:bg-black/80 text-white/70 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          title="在 Lightbox 中打开"
        ><span class="i-lucide-maximize-2 text-[13px]" /></button>
      </div>

      <!-- ── 基本信息 ───────────────────────────────────────── -->
      <div class="px-5 py-3 space-y-3 border-b border-white/[0.04]">
        <h4 class="text-[11px] font-semibold text-white/30 uppercase tracking-widest font-mono">基本信息</h4>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-white/40">文件名</span>
            <span class="text-white/90 font-medium text-right truncate ml-4 max-w-[200px]" :title="file.name">{{ file.name }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-white/40">扩展名</span>
            <span class="text-white/70 font-mono uppercase">{{ file.extension || '—' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-white/40">MIME 类型</span>
            <span class="text-white/70 font-mono text-xs">{{ file.mimeType }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-white/40">文件大小</span>
            <span class="text-white/70 font-mono">{{ file.sizeFormatted }}</span>
          </div>
          <div v-if="file.width && file.height" class="flex justify-between">
            <span class="text-white/40">尺寸</span>
            <span class="text-white/70 font-mono">{{ file.width }} × {{ file.height }} px</span>
          </div>
        </div>
      </div>

      <!-- ── 访问信息 ───────────────────────────────────────── -->
      <div class="px-5 py-3 space-y-3 border-b border-white/[0.04]">
        <h4 class="text-[11px] font-semibold text-white/30 uppercase tracking-widest font-mono">访问信息</h4>
        <div class="space-y-2 text-sm">
          <div v-if="file.publicUrl" class="space-y-1.5">
            <span class="text-white/40 text-xs">公开 URL</span>
            <div class="flex items-center gap-2">
              <code class="flex-1 text-xs text-indigo-400 font-mono bg-white/[0.03] border border-white/[0.06] rounded-lg px-2.5 py-1.5 truncate" :title="file.publicUrl">
                {{ file.publicUrl }}
              </code>
              <button
                @click="$emit('copy', file.publicUrl!)"
                class="flex-shrink-0 text-xs bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-white/60 transition-all cursor-pointer"
              >复制</button>
            </div>
          </div>
          <div v-if="file.thumbnailUrl" class="space-y-1.5">
            <span class="text-white/40 text-xs">缩略图 URL</span>
            <div class="flex items-center gap-2">
              <code class="flex-1 text-xs text-[#30d158] font-mono bg-white/[0.03] border border-white/[0.06] rounded-lg px-2.5 py-1.5 truncate" :title="file.thumbnailUrl">
                {{ file.thumbnailUrl }}
              </code>
              <button
                @click="$emit('copy', file.thumbnailUrl!)"
                class="flex-shrink-0 text-xs bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-white/60 transition-all cursor-pointer"
              >复制</button>
            </div>
          </div>
          <div v-if="!file.publicUrl">
            <button
              @click="generateSignedUrl"
              :disabled="isLoadingSigned || !!tempSignedUrl"
              class="text-xs bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.08] rounded-lg px-3 py-2 text-white/70 transition-all cursor-pointer disabled:opacity-40"
            >
              {{ isLoadingSigned ? '生成中...' : tempSignedUrl ? '已生成临时链接 (1h)' : '生成临时链接' }}
            </button>
            <div v-if="tempSignedUrl" class="mt-2 flex items-center gap-2">
              <code class="flex-1 text-xs text-[#ff9f0a] font-mono bg-white/[0.03] border border-white/[0.06] rounded-lg px-2.5 py-1.5 truncate" :title="tempSignedUrl">
                {{ tempSignedUrl }}
              </code>
              <button
                @click="$emit('copy', tempSignedUrl!)"
                class="flex-shrink-0 text-xs bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-white/60 transition-all cursor-pointer"
              >复制</button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── 归属信息 ───────────────────────────────────────── -->
      <div class="px-5 py-3 space-y-3 border-b border-white/[0.04]">
        <h4 class="text-[11px] font-semibold text-white/30 uppercase tracking-widest font-mono">归属信息</h4>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-white/40">上传者 ID</span>
            <span class="text-white/70 font-mono text-xs truncate ml-4 max-w-[200px]" :title="file.uploadedBy || ''">{{ file.uploadedBy || '—' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-white/40">创建时间</span>
            <span class="text-white/70 font-mono text-xs">{{ file.createdAt ? new Date(file.createdAt).toLocaleString() : '—' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-white/40">更新时间</span>
            <span class="text-white/70 font-mono text-xs">{{ file.updatedAt ? new Date(file.updatedAt).toLocaleString() : '—' }}</span>
          </div>
        </div>
      </div>

      <!-- ── 存储路径 ───────────────────────────────────────── -->
      <div class="px-5 py-3 space-y-3 border-b border-white/[0.04]">
        <h4 class="text-[11px] font-semibold text-white/30 uppercase tracking-widest font-mono">存储路径</h4>
        <div class="flex items-center gap-2">
          <code class="flex-1 text-xs text-white/60 font-mono bg-white/[0.03] border border-white/[0.06] rounded-lg px-2.5 py-1.5 truncate" :title="file.path">
            {{ file.path }}
          </code>
          <button
            @click="$emit('copy', file.path)"
            class="flex-shrink-0 text-xs bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-white/60 transition-all cursor-pointer"
          >复制</button>
        </div>
      </div>

      <!-- ── EXIF 元数据 ───────────────────────────────────────── -->
      <div v-if="file.exif && Object.keys(file.exif).length > 0" class="px-5 py-3 space-y-3">
        <h4 class="text-[11px] font-semibold text-white/30 uppercase tracking-widest font-mono">EXIF 元数据</h4>
        <div class="space-y-2 text-sm">
          <div v-if="file.exif.Make || file.exif.Model" class="flex justify-between">
            <span class="text-white/40">拍摄设备</span>
            <span class="text-white/70 text-right">{{ [file.exif.Make, file.exif.Model].filter(Boolean).join(' ') }}</span>
          </div>
          <div v-if="file.exif.DateTimeOriginal" class="flex justify-between">
            <span class="text-white/40">拍摄时间</span>
            <span class="text-white/70 font-mono text-xs">{{ new Date(file.exif.DateTimeOriginal).toLocaleString() }}</span>
          </div>
          <div v-if="file.exif.ExposureTime || file.exif.FNumber || file.exif.ISO" class="flex justify-between">
            <span class="text-white/40">曝光参数</span>
            <span class="text-white/70 font-mono text-xs">
              {{ file.exif.ExposureTime ? `1/${Math.round(1/file.exif.ExposureTime)}s` : '' }}
              {{ file.exif.FNumber ? `f/${file.exif.FNumber}` : '' }}
              {{ file.exif.ISO ? `ISO ${file.exif.ISO}` : '' }}
            </span>
          </div>
          <div v-if="file.exif.FocalLength" class="flex justify-between">
            <span class="text-white/40">焦距</span>
            <span class="text-white/70 font-mono text-xs">{{ file.exif.FocalLength }}mm</span>
          </div>
          <div v-if="file.exif.latitude && file.exif.longitude" class="flex justify-between">
            <span class="text-white/40">GPS</span>
            <a :href="`https://www.google.com/maps?q=${file.exif.latitude},${file.exif.longitude}`" target="_blank" class="text-indigo-400 font-mono text-xs hover:underline">
              {{ file.exif.latitude.toFixed(4) }}, {{ file.exif.longitude.toFixed(4) }}
            </a>
          </div>
          <div v-if="file.exif.ImageWidth && file.exif.ImageHeight" class="flex justify-between">
            <span class="text-white/40">原始尺寸</span>
            <span class="text-white/70 font-mono text-xs">{{ file.exif.ImageWidth }} × {{ file.exif.ImageHeight }} px</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ── 底部操作 ─────────────────────────────────────────── -->
    <div class="flex-shrink-0 px-5 py-3 border-t border-white/[0.06] flex gap-2">
      <button
        v-if="file.publicUrl"
        @click="$emit('copy', file.publicUrl!)"
        class="w-10 h-10 flex-shrink-0 bg-white/[0.05] hover:bg-white/[0.10] text-white/60 hover:text-white border border-white/[0.08] rounded-xl flex items-center justify-center transition-all cursor-pointer"
        title="复制公开链接"
      ><span class="i-lucide-link text-[14px]" /></button>
      <button
        @click="confirmDelete"
        class="flex-1 text-sm font-semibold bg-[#ff453a]/10 hover:bg-[#ff453a]/20 text-[#ff453a] border border-[#ff453a]/25 rounded-xl py-2.5 transition-all active:scale-[0.98] cursor-pointer"
      >
        移入回收站
      </button>
      <button
        @click="$emit('close')"
        class="flex-1 text-sm font-semibold bg-white/[0.05] hover:bg-white/[0.10] text-white/70 border border-white/[0.08] rounded-xl py-2.5 transition-all active:scale-[0.98] cursor-pointer"
      >
        关闭
      </button>
    </div>
    <AdminConfirmDialog ref="confirmDialog" />
  </div>
</template>

<style scoped>
.scrollbar-thin::-webkit-scrollbar { width: 4px; }
.scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
.scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 999px; }
</style>
