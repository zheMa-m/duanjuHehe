<script setup lang="ts">
import AdminMedia from './AdminMedia.vue'
import { getRootDomain } from '~/utils/subdomain'

interface Campaign {
  id: string
  subdomain: string
  title: string
  subtitle: string
  badge: string
  color_from: string
  color_to: string
  is_active: boolean
  cta_text: string
  cta_url: string | null
  cover_image: string | null
  description: string | null
  features: any[]
  config: Record<string, any> | null
  sort_order: number
  leads_count?: number
  ga_measurement_id?: string | null
  meta_pixel_id?: string | null
  tiktok_pixel_id?: string | null
  created_at: string
  updated_at: string
}

const props = defineProps<{
  campaigns: Campaign[] | null
  campaignsTotal: number
  campaignsPage: number
  campaignsPageSize: number
  leads: any[] | null
  leadsTotal: number
  leadsPage: number
  leadsPageSize: number
  isLoading: boolean
}>()

const emit = defineEmits<{
  refresh: []
  save: [subdomain: string, data: Record<string, any>]
  toggleStatus: [subdomain: string, isActive: boolean]
  create: [data: Record<string, any>]
  deleteCampaign: [subdomain: string]
  'delete-lead': [id: string]
  exportLeads: [subdomain?: string]
  changeLeadsPage: [page: number]
  filterLeads: [subdomain: string]
  changeCampaignsPage: [page: number]
}>()

// ── 营销活动分页 ─────────────────────────────────────────────────
const campaignsTotalPages = computed(() => Math.max(1, Math.ceil(props.campaignsTotal / props.campaignsPageSize)))
const handleCampaignsPageChange = (page: number) => {
  if (page < 1 || page > campaignsTotalPages.value) return
  emit('changeCampaignsPage', page)
}

// ── 指标统计 ─────────────────────────────────────────────────
const totalCampaigns = computed(() => props.campaignsTotal || props.campaigns?.length || 0)
const activeCampaigns = computed(() => props.campaigns?.filter(c => c.is_active).length || 0)
const totalLeads = computed(() => props.campaigns?.reduce((sum, c) => sum + (c.leads_count || 0), 0) || 0)

// ── 检测活动是否内置智能问卷模块 ────────────────────────────
const hasQuestionnaire = (cam: Campaign): boolean => {
  return !!(cam.config?.questionnaire)
}

// ── 状态筛选 ─────────────────────────────────────────────────
const statusFilter = ref('all')
const filteredCampaigns = computed(() => {
  if (!props.campaigns) return []
  if (statusFilter.value === 'all') return props.campaigns
  return props.campaigns.filter(c => statusFilter.value === 'active' ? c.is_active : !c.is_active)
})

// ── 编辑弹窗 ─────────────────────────────────────────────────
const editModal = ref(false)
const editTarget = ref<Campaign | null>(null)
const editForm = reactive({
  title: '',
  subtitle: '',
  badge: '',
  is_active: true,
  cta_text: '',
  cta_url: '' as string | null,
  sort_order: 0,
  color_from: '',
  color_to: '',
  description: '' as string | null,
  cover_image: '' as string | null,
  ga_measurement_id: '' as string | null,
  meta_pixel_id: '' as string | null,
  tiktok_pixel_id: '' as string | null,
})

// ── 媒体库选取器 ─────────────────────────────────────────────
const showMediaPicker = ref(false)

function handleMediaSelected(file: { url: string | null; path: string }) {
  editForm.cover_image = file.url || file.path
  showMediaPicker.value = false
}

const openEdit = (cam: Campaign) => {
  editTarget.value = cam
  editForm.title = cam.title
  editForm.subtitle = cam.subtitle
  editForm.badge = cam.badge
  editForm.is_active = cam.is_active
  editForm.cta_text = cam.cta_text || '立即预约'
  editForm.cta_url = cam.cta_url
  editForm.sort_order = cam.sort_order
  editForm.color_from = cam.color_from
  editForm.color_to = cam.color_to
  editForm.description = cam.description
  editForm.cover_image = cam.cover_image
  editForm.ga_measurement_id = cam.ga_measurement_id || ''
  editForm.meta_pixel_id = cam.meta_pixel_id || ''
  editForm.tiktok_pixel_id = cam.tiktok_pixel_id || ''
  editModal.value = true
}

const submitEdit = () => {
  if (!editTarget.value) return
  const changes: Record<string, any> = {}
  if (editForm.title !== editTarget.value.title) changes.title = editForm.title
  if (editForm.subtitle !== editTarget.value.subtitle) changes.subtitle = editForm.subtitle
  if (editForm.badge !== editTarget.value.badge) changes.badge = editForm.badge
  if (editForm.is_active !== editTarget.value.is_active) changes.is_active = editForm.is_active
  if (editForm.cta_text !== editTarget.value.cta_text) changes.cta_text = editForm.cta_text
  if (editForm.cta_url !== editTarget.value.cta_url) changes.cta_url = editForm.cta_url || null
  if (editForm.sort_order !== editTarget.value.sort_order) changes.sort_order = editForm.sort_order
  if (editForm.color_from !== editTarget.value.color_from) changes.color_from = editForm.color_from
  if (editForm.color_to !== editTarget.value.color_to) changes.color_to = editForm.color_to
  if (editForm.description !== editTarget.value.description) changes.description = editForm.description || null
  if (editForm.cover_image !== editTarget.value.cover_image) changes.cover_image = editForm.cover_image || null
  if (editForm.ga_measurement_id !== (editTarget.value.ga_measurement_id || '')) changes.ga_measurement_id = editForm.ga_measurement_id || null
  if (editForm.meta_pixel_id !== (editTarget.value.meta_pixel_id || '')) changes.meta_pixel_id = editForm.meta_pixel_id || null
  if (editForm.tiktok_pixel_id !== (editTarget.value.tiktok_pixel_id || '')) changes.tiktok_pixel_id = editForm.tiktok_pixel_id || null
  if (Object.keys(changes).length === 0) { editModal.value = false; return }
  emit('save', editTarget.value.subdomain, changes)
  editModal.value = false
}

// ── 上下线切换 ───────────────────────────────────────────────
const handleToggleStatus = (cam: Campaign) => {
  if (!confirm(`确定要${cam.is_active ? '下线' : '上线'}活动「${cam.title}」吗？`)) return
  emit('toggleStatus', cam.subdomain, !cam.is_active)
}

// ── 新建活动弹窗 ─────────────────────────────────────────────────
const createModal = ref(false)
const createForm = reactive({
  subdomain: '',
  title: '',
  subtitle: '',
  badge: '',
  color_from: '#9333ea',
  color_to: '#6366f1',
  cta_text: '立即预约',
  sort_order: 0,
  ga_measurement_id: '',
  meta_pixel_id: '',
  tiktok_pixel_id: '',
})
const openCreate = () => {
  Object.assign(createForm, { subdomain: '', title: '', subtitle: '', badge: '', color_from: '#9333ea', color_to: '#6366f1', cta_text: '立即预约', sort_order: 0, ga_measurement_id: '', meta_pixel_id: '', tiktok_pixel_id: '' })
  createModal.value = true
}
const submitCreate = () => {
  if (!createForm.subdomain || !createForm.title || !createForm.subtitle || !createForm.badge) return
  emit('create', { ...createForm })
  createModal.value = false
}

// ── 删除活动 ─────────────────────────────────────────────────────
const handleDeleteCampaign = (cam: Campaign) => {
  if (!confirm(`确定要删除活动「${cam.title}」(${cam.subdomain}) 吗？\n此操作将同时删除所有关联留资记录，且不可撤销。`)) return
  emit('deleteCampaign', cam.subdomain)
}

// ── 留资看板 ─────────────────────────────────────────────────
const filterSubdomain = ref('')
const uniqueSubdomains = computed(() => {
  if (!props.campaigns) return []
  return [...new Set(props.campaigns.map(c => c.subdomain))]
})
const totalPages = computed(() => Math.max(1, Math.ceil(props.leadsTotal / props.leadsPageSize)))
const handlePageChange = (page: number) => {
  if (page < 1 || page > totalPages.value) return
  emit('changeLeadsPage', page)
}
watch(filterSubdomain, (val) => {
  emit('filterLeads', val)
})
const handleDeleteLead = (id: string) => {
  if (!confirm('确定要彻底清除该留资预约记录吗？此动作会同步抹除 Supabase 数据库对应条目。')) return
  emit('delete-lead', id)
}

// ── 预览链接（生产环境用子域名 URL，本地 fallback 到路径）────────
function getPreviewUrl(subdomain: string): string {
  if (import.meta.client) {
    const hostname = window.location.hostname
    if (hostname !== 'localhost' && !hostname.endsWith('.vercel.app')) {
      const rootDomain = getRootDomain(hostname)
      return `https://${subdomain}.${rootDomain}`
    }
  }
  return `/h5/${subdomain}`
}

defineExpose({ onSaved: () => {} })
</script>

<template>
  <div class="space-y-8 animate-fade-in text-white">
    <!-- 标题 -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-[28px] font-bold text-white tracking-tight">营销活动管理</h1>
        <p class="text-white/40 text-sm mt-1">管理 H5 营销落地页配置、活动上下线、留资数据追踪，SWR 实时热更新</p>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="openCreate"
          class="text-xs bg-gradient-to-r from-indigo-600 to-indigo-400 hover:from-indigo-500 hover:to-indigo-300 text-white font-semibold px-4 py-2 rounded-full transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5 shadow-[0_4px_12px_rgba(99,102,241,0.2)]"
        >
          <span>＋</span> 新建活动
        </button>
        <button
          @click="$emit('refresh')"
          :disabled="isLoading"
          class="text-xs bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-full transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
        >
          <span :class="{'animate-spin': isLoading}">🔄</span>
          刷新活动
        </button>
      </div>
    </div>

    <!-- 指标卡 -->
    <div v-if="campaigns" class="grid grid-cols-3 gap-3">
      <div class="bg-white/[0.04] rounded-xl px-5 py-4 shadow-lg shadow-black/20">
        <div class="text-white/30 text-[11px] uppercase tracking-widest font-mono mb-1">全部活动</div>
        <div class="text-white font-bold text-2xl">{{ totalCampaigns }}</div>
      </div>
      <div class="bg-white/[0.04] rounded-xl px-5 py-4 shadow-lg shadow-black/20">
        <div class="text-white/30 text-[11px] uppercase tracking-widest font-mono mb-1">运行中</div>
        <div class="text-[#30d158] font-bold text-2xl">{{ activeCampaigns }}</div>
      </div>
      <div class="bg-white/[0.04] rounded-xl px-5 py-4 shadow-lg shadow-black/20">
        <div class="text-white/30 text-[11px] uppercase tracking-widest font-mono mb-1">留资总数</div>
        <div class="text-indigo-400 font-bold text-2xl">{{ totalLeads }}</div>
      </div>
    </div>

    <!-- 状态筛选胶囊 -->
    <div class="inline-flex bg-white/[0.02] border border-white/[0.06] p-1 rounded-full shadow-[inset_0_1px_rgba(255,255,255,0.02)]">
      <button
        v-for="s in [{ key: 'all', label: '全部活动' }, { key: 'active', label: '运行中' }, { key: 'inactive', label: '已下线' }]"
        :key="s.key"
        @click="statusFilter = s.key"
        class="text-[10px] font-semibold px-4.5 py-2.5 rounded-full transition-all cursor-pointer focus:outline-none border-0"
        :class="statusFilter === s.key
          ? 'bg-white/10 text-white shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_rgba(255,255,255,0.05)]'
          : 'bg-transparent text-white/60 hover:text-white/90'"
      >
        {{ s.label }}
      </button>
    </div>

    <!-- 活动列表 -->
    <div class="bg-white/[0.04] rounded-2xl overflow-hidden shadow-xl shadow-black/20">
      <div class="overflow-x-auto overflow-y-auto max-h-[60vh]">
        <table class="w-full text-left text-sm border-collapse">
          <thead class="sticky top-0 z-10">
            <tr class="border-b border-white/[0.05] text-white/40 uppercase tracking-widest text-[10px] bg-[#0d0d18]/95 backdrop-blur-sm">
              <th class="px-5 py-4 font-semibold font-mono w-8">#</th>
              <th class="px-5 py-4 font-semibold font-mono">活动信息</th>
              <th class="px-5 py-4 font-semibold font-mono">状态</th>
              <th class="px-5 py-4 font-semibold font-mono">CTA</th>
              <th class="px-5 py-4 font-semibold font-mono">留资</th>
              <th class="px-5 py-4 font-semibold font-mono">创建时间</th>
              <th class="px-5 py-4 font-semibold font-mono text-right">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.04]">
            <tr v-for="cam in filteredCampaigns" :key="cam.subdomain" class="hover:bg-white/[0.02] transition-colors duration-200">
              <td class="px-5 py-5 text-white/30 font-mono text-xs">{{ cam.sort_order }}</td>
              <td class="px-5 py-5">
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded-sm flex-shrink-0" :style="{ background: `linear-gradient(135deg, ${cam.color_from || '#9333ea'}, ${cam.color_to || '#6366f1'})` }"></div>
                    <span class="text-white/90 font-semibold text-sm truncate max-w-[180px]">{{ cam.title }}</span>
                  </div>
                  <div class="flex items-center gap-2 mt-1">
                    <span class="text-indigo-400 font-mono text-xs">{{ cam.subdomain }}</span>
                    <span class="text-white/20">·</span>
                    <span class="px-1.5 py-0.5 bg-white/5 text-white/50 rounded text-[10px] font-mono">{{ cam.badge }}</span>
                    <span
                      v-if="hasQuestionnaire(cam)"
                      class="px-1.5 py-0.5 bg-purple-500/10 text-purple-400 rounded text-[10px] font-mono border border-purple-500/20"
                      title="内置智能问卷模块"
                    >问卷</span>
                  </div>
                </div>
              </td>
              <td class="px-5 py-5">
                <button
                  @click="handleToggleStatus(cam)"
                  class="px-3 py-1 rounded-full text-[10px] font-semibold border transition-all active:scale-[0.93] inline-flex items-center gap-1.5 cursor-pointer focus:outline-none"
                  :class="cam.is_active
                    ? 'bg-[#30d158]/10 text-[#30d158] border-[#30d158]/20'
                    : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'"
                >
                  <span class="w-1.5 h-1.5 rounded-full" :class="cam.is_active ? 'bg-[#30d158] animate-pulse' : 'bg-white/30'"></span>
                  {{ cam.is_active ? '运行中' : '已下线' }}
                </button>
              </td>
              <td class="px-5 py-5 text-white/50 text-xs">{{ cam.cta_text || '立即预约' }}</td>
              <td class="px-5 py-5">
                <span class="text-indigo-400 font-semibold text-sm font-mono">{{ cam.leads_count || 0 }}</span>
              </td>
              <td class="px-5 py-5 text-white/40 font-mono text-xs">
                {{ new Date(cam.created_at).toLocaleDateString() }}
              </td>
              <td class="px-5 py-5 text-right">
                <div class="flex items-center justify-end gap-2">
                  <!-- 预览 -->
                  <a
                    :href="getPreviewUrl(cam.subdomain)"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-[10px] font-semibold bg-white/10 hover:bg-white/15 text-white/80 px-3 py-1.5 rounded-full border border-white/15 transition-all no-underline cursor-pointer focus:outline-none"
                  >预览</a>
                  <button
                    @click="openEdit(cam)"
                    class="text-[11px] font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 px-4 py-2 rounded-full border border-indigo-500/20 transition-all active:scale-[0.93] cursor-pointer focus:outline-none"
                  >编辑</button>
                  <button
                    @click="handleDeleteCampaign(cam)"
                    class="text-[10px] font-semibold bg-[#ff453a]/10 hover:bg-[#ff453a]/20 text-[#ff453a] px-3 py-1.5 rounded-full border border-[#ff453a]/20 transition-all active:scale-[0.93] cursor-pointer focus:outline-none"
                  >删除</button>
                </div>
              </td>
            </tr>
            <tr v-if="!filteredCampaigns.length">
              <td colspan="7" class="py-12 text-center text-xs text-white/25 font-light">
                暂无符合条件的营销活动
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 营销活动分页 -->
    <div v-if="campaignsTotal > 0" class="flex items-center justify-between px-5 py-3 bg-white/[0.02] rounded-xl border border-white/[0.04]">
      <div class="text-[11px] text-white/30 font-mono">共 {{ campaignsTotal }} 条 · 第 {{ campaignsPage }}/{{ campaignsTotalPages }} 页</div>
      <div class="flex items-center gap-2">
        <button @click="handleCampaignsPageChange(campaignsPage - 1)" :disabled="campaignsPage <= 1" class="text-[11px] font-semibold bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white/80 px-3 py-1.5 rounded-full border border-white/10 transition-all cursor-pointer focus:outline-none">上一页</button>
        <button @click="handleCampaignsPageChange(campaignsPage + 1)" :disabled="campaignsPage >= campaignsTotalPages" class="text-[11px] font-semibold bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white/80 px-3 py-1.5 rounded-full border border-white/10 transition-all cursor-pointer focus:outline-none">下一页</button>
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <Teleport to="body">
      <div v-if="editModal" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" @click.self="editModal = false">
        <div class="bg-[#12121a] rounded-2xl shadow-[0_40px_80px_rgba(0,0,0,0.8)] w-full max-w-lg p-7 space-y-5 animate-fade-in max-h-[90vh] overflow-y-auto">
          <div class="flex justify-between items-center">
            <h2 class="text-white text-base font-semibold tracking-wide">编辑活动配置</h2>
            <button @click="editModal = false" class="text-white/40 hover:text-white text-lg leading-none cursor-pointer bg-transparent border-0">×</button>
          </div>

          <div v-if="editTarget" class="flex items-center gap-3 text-xs text-white/40 bg-white/[0.02] rounded-lg px-3 py-2">
            <span class="font-mono text-indigo-400">{{ editTarget.subdomain }}</span>
            <span class="text-white/20">|</span>
            <span>排序: {{ editTarget.sort_order }}</span>
            <span class="text-white/20">|</span>
            <span>留资: {{ editTarget.leads_count || 0 }}</span>
          </div>

          <form @submit.prevent="submitEdit" class="space-y-4">
            <!-- 基本信息 -->
            <div class="space-y-1.5">
              <label class="block text-[11px] text-white/40 uppercase tracking-widest font-mono">活动标题</label>
              <input v-model="editForm.title" type="text" required class="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all" />
            </div>

            <div class="space-y-1.5">
              <label class="block text-[11px] text-white/40 uppercase tracking-widest font-mono">副标题描述</label>
              <textarea v-model="editForm.subtitle" rows="2" required class="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all leading-relaxed"></textarea>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1.5">
                <label class="block text-[11px] text-white/40 uppercase tracking-widest font-mono">活动徽章</label>
                <input v-model="editForm.badge" type="text" required class="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all" />
              </div>
              <div class="space-y-1.5">
                <label class="block text-[11px] text-white/40 uppercase tracking-widest font-mono">排序权重</label>
                <input v-model.number="editForm.sort_order" type="number" min="0" class="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all" />
              </div>
            </div>

            <!-- CTA 配置 -->
            <div class="border-t border-white/[0.05] pt-4">
              <div class="text-[11px] text-white/30 uppercase tracking-widest font-mono mb-3">行动号召 (CTA)</div>
              <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1.5">
                  <label class="block text-[11px] text-white/40 font-mono">按钮文案</label>
                  <input v-model="editForm.cta_text" type="text" class="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all" placeholder="立即预约" />
                </div>
                <div class="space-y-1.5">
                  <label class="block text-[11px] text-white/40 font-mono">跳转链接 (可选)</label>
                  <input v-model="editForm.cta_url" type="text" class="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all" placeholder="https://..." />
                </div>
              </div>
            </div>

            <!-- 视觉配置 -->
            <div class="border-t border-white/[0.05] pt-4">
              <div class="text-[11px] text-white/30 uppercase tracking-widest font-mono mb-3">视觉主题</div>
              <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1.5">
                  <label class="block text-[11px] text-white/40 font-mono">渐变起始色</label>
                  <input v-model="editForm.color_from" type="text" class="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500/50 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all" placeholder="from-purple-600" />
                </div>
                <div class="space-y-1.5">
                  <label class="block text-[11px] text-white/40 font-mono">渐变结束色</label>
                  <input v-model="editForm.color_to" type="text" class="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500/50 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all" placeholder="to-indigo-600" />
                </div>
              </div>
            </div>

            <!-- 分析埋点覆盖 -->
            <div class="border-t border-white/[0.05] pt-4">
              <div class="text-[11px] text-white/30 uppercase tracking-widest font-mono mb-3">三方像素覆盖（覆盖全局，可选）</div>
              <div class="grid grid-cols-3 gap-2">
                <div class="space-y-1.5">
                  <label class="block text-[10px] text-white/40 font-mono">GA4 ID</label>
                  <input v-model="editForm.ga_measurement_id" type="text" class="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500/55 rounded-lg px-2.5 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition" placeholder="G-XXX" />
                </div>
                <div class="space-y-1.5">
                  <label class="block text-[10px] text-white/40 font-mono">Meta Pixel ID</label>
                  <input v-model="editForm.meta_pixel_id" type="text" class="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500/55 rounded-lg px-2.5 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition" placeholder="15位数字" />
                </div>
                <div class="space-y-1.5">
                  <label class="block text-[10px] text-white/40 font-mono">TikTok Pixel ID</label>
                  <input v-model="editForm.tiktok_pixel_id" type="text" class="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500/55 rounded-lg px-2.5 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition" placeholder="C-XXX" />
                </div>
              </div>
            </div>

            <!-- 活动配图 -->
            <div class="border-t border-white/[0.05] pt-4 space-y-3">
              <div class="text-[11px] text-white/30 uppercase tracking-widest font-mono mb-3">活动配图 (从媒体库选取)</div>
              <div class="space-y-2">
                <div v-if="editForm.cover_image" class="relative inline-block">
                  <img :src="editForm.cover_image" class="h-24 w-auto max-w-[200px] object-cover rounded-lg border border-white/[0.08]" />
                  <button
                    type="button"
                    @click="editForm.cover_image = null"
                    class="absolute -top-2 -right-2 w-5 h-5 bg-[#ff453a] rounded-full flex items-center justify-center text-[10px] text-white cursor-pointer"
                  >✕</button>
                </div>
                <div v-else>
                  <button
                    type="button"
                    @click="showMediaPicker = true"
                    class="text-xs bg-white/[0.05] hover:bg-white/[0.10] border border-dashed border-white/[0.15] hover:border-indigo-500/40 rounded-xl px-5 py-4 text-white/50 hover:text-indigo-400 transition-all cursor-pointer w-full text-left"
                  >
                    🖼️ 点击从媒体库选取配图...
                  </button>
                </div>
              </div>
            </div>

            <!-- 状态 & 描述 -->
            <div class="border-t border-white/[0.05] pt-4 space-y-3">
              <label class="flex items-center gap-3 cursor-pointer">
                <input v-model="editForm.is_active" type="checkbox" class="w-4 h-4 rounded border-white/20 bg-white/5 text-[#30d158] focus:ring-[#30d158]/20" />
                <span class="text-xs text-white/70">活动上线（公开可见）</span>
              </label>
              <div class="space-y-1.5">
                <label class="block text-[11px] text-white/40 font-mono">详细描述 (可选)</label>
                <textarea v-model="editForm.description" rows="2" class="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all" placeholder="活动的详细说明，不会在 H5 页面展示..."></textarea>
              </div>
            </div>

            <!-- 按钮组 -->
            <div class="flex gap-3 pt-2">
              <button type="button" @click="editModal = false" class="flex-1 text-xs bg-white/5 hover:bg-white/10 text-white/70 py-2.5 rounded-xl border border-white/[0.08] transition-all cursor-pointer">取消</button>
              <button type="submit" class="flex-1 text-sm font-semibold bg-gradient-to-r from-indigo-600 to-indigo-400 hover:from-indigo-500 hover:to-indigo-300 text-white py-2.5 rounded-xl transition-all active:scale-[0.97] cursor-pointer shadow-[0_4px_12px_rgba(99,102,241,0.2)]">保存修改</button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- 媒体库选取器弹窗 -->
    <Teleport to="body">
      <div v-if="showMediaPicker" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" @click.self="showMediaPicker = false">
        <div class="bg-[#0a0a0c]/95 border border-white/[0.08] rounded-2xl w-[90vw] max-w-4xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
          <div class="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] flex-shrink-0">
            <span class="text-xs font-semibold text-white/80 uppercase tracking-widest font-mono">从媒体库选取配图</span>
            <button @click="showMediaPicker = false" class="text-white/50 hover:text-white transition-all cursor-pointer text-xs">✕ 关闭</button>
          </div>
          <div class="flex-1 overflow-y-auto p-5">
            <AdminMedia :picker-mode="true" @selected="handleMediaSelected" @close="showMediaPicker = false" />
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 新建活动弹窗 -->
    <Teleport to="body">
      <div v-if="createModal" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" @click.self="createModal = false">
        <div class="bg-[#12121a] rounded-2xl shadow-[0_40px_80px_rgba(0,0,0,0.8)] w-full max-w-lg p-7 space-y-5 animate-fade-in">
          <div class="flex justify-between items-center">
            <h2 class="text-white text-base font-semibold tracking-wide">新建营销活动</h2>
            <button @click="createModal = false" class="text-white/40 hover:text-white text-lg leading-none cursor-pointer bg-transparent border-0">×</button>
          </div>
          <form @submit.prevent="submitCreate" class="space-y-4">
            <div class="space-y-1.5">
              <label class="block text-[11px] text-white/40 uppercase tracking-widest font-mono">子域名 (唯一标识) *</label>
              <input v-model="createForm.subdomain" type="text" required pattern="[a-z0-9][a-z0-9-]*" class="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500/50 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all" placeholder="例如: summer-sale" />
              <p class="text-[10px] text-white/20">仅小写字母、数字和短横线，访问路径 /h5/子域名</p>
            </div>
            <div class="space-y-1.5">
              <label class="block text-[11px] text-white/40 uppercase tracking-widest font-mono">活动标题 *</label>
              <input v-model="createForm.title" type="text" required class="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all" />
            </div>
            <div class="space-y-1.5">
              <label class="block text-[11px] text-white/40 uppercase tracking-widest font-mono">副标题描述 *</label>
              <textarea v-model="createForm.subtitle" rows="2" required class="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"></textarea>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1.5">
                <label class="block text-[11px] text-white/40 uppercase tracking-widest font-mono">活动徽章 *</label>
                <input v-model="createForm.badge" type="text" required class="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all" placeholder="限时 10,000 名" />
              </div>
              <div class="space-y-1.5">
                <label class="block text-[11px] text-white/40 uppercase tracking-widest font-mono">CTA 按钮文案</label>
                <input v-model="createForm.cta_text" type="text" class="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all" placeholder="立即预约" />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1.5">
                <label class="block text-[11px] text-white/40 font-mono">渐变起始色</label>
                <input v-model="createForm.color_from" type="text" class="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500/50 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all" />
              </div>
              <div class="space-y-1.5">
                <label class="block text-[11px] text-white/40 font-mono">渐变结束色</label>
                <input v-model="createForm.color_to" type="text" class="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500/50 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all" />
              </div>
            </div>

            <!-- 分析埋点覆盖 -->
            <div class="border-t border-white/[0.05] pt-4">
              <div class="text-[11px] text-white/30 uppercase tracking-widest font-mono mb-3">三方像素覆盖（覆盖全局，可选）</div>
              <div class="grid grid-cols-3 gap-2">
                <div class="space-y-1.5">
                  <label class="block text-[10px] text-white/40 font-mono">GA4 ID</label>
                  <input v-model="createForm.ga_measurement_id" type="text" class="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500/55 rounded-lg px-2.5 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition" placeholder="G-XXX" />
                </div>
                <div class="space-y-1.5">
                  <label class="block text-[10px] text-white/40 font-mono">Meta Pixel ID</label>
                  <input v-model="createForm.meta_pixel_id" type="text" class="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500/55 rounded-lg px-2.5 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition" placeholder="15位数字" />
                </div>
                <div class="space-y-1.5">
                  <label class="block text-[10px] text-white/40 font-mono">TikTok Pixel ID</label>
                  <input v-model="createForm.tiktok_pixel_id" type="text" class="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500/55 rounded-lg px-2.5 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition" placeholder="C-XXX" />
                </div>
              </div>
            </div>

            <div class="flex gap-3 pt-2">
              <button type="button" @click="createModal = false" class="flex-1 text-xs bg-white/5 hover:bg-white/10 text-white/70 py-2.5 rounded-xl border border-white/[0.08] transition-all cursor-pointer">取消</button>
              <button type="submit" class="flex-1 text-sm font-semibold bg-gradient-to-r from-indigo-600 to-indigo-400 hover:from-indigo-500 hover:to-indigo-300 text-white py-2.5 rounded-xl transition-all active:scale-[0.97] cursor-pointer shadow-[0_4px_12px_rgba(99,102,241,0.2)]">创建活动</button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- 留资看板 -->
    <div class="space-y-4 pt-6 border-t border-white/[0.08]">
      <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 class="text-base font-semibold text-white tracking-tight flex items-center gap-2">
            留资预约看板
            <span class="text-[10px] px-2 py-0.5 bg-[#30d158]/10 text-[#30d158] rounded-full border border-[#30d158]/20 font-mono">留资</span>
          </h2>
          <p class="text-white/40 text-[11px] mt-0.5">H5 营销活动页面收集的用户预约数据</p>
        </div>
        <div class="flex items-center gap-3">
          <button
            @click="$emit('exportLeads', filterSubdomain || undefined)"
            class="text-[11px] font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 px-4 py-2 rounded-full border border-indigo-500/20 transition-all active:scale-[0.98] cursor-pointer focus:outline-none"
          >📥 导出 CSV</button>
          <select v-model="filterSubdomain" class="bg-[#141416] border border-white/[0.08] text-xs text-white/80 rounded-full px-4 py-2 outline-none cursor-pointer">
            <option value="">全部渠道</option>
            <option v-for="sub in uniqueSubdomains" :key="sub" :value="sub">{{ sub }}</option>
          </select>
        </div>
      </div>

      <div class="bg-white/[0.04] rounded-2xl overflow-hidden shadow-xl shadow-black/20">
        <div class="overflow-x-auto overflow-y-auto max-h-[60vh]">
          <table class="w-full text-left text-sm border-collapse">
            <thead class="sticky top-0 z-10">
              <tr class="border-b border-white/[0.05] text-white/40 uppercase tracking-widest text-[10px] bg-[#0d0d18]/95 backdrop-blur-sm">
                <th class="px-5 py-4 font-semibold font-mono">邮箱</th>
                <th class="px-5 py-4 font-semibold font-mono">电话</th>
                <th class="px-5 py-4 font-semibold font-mono">渠道</th>
                <th class="px-5 py-4 font-semibold font-mono">用户</th>
                <th class="px-5 py-4 font-semibold font-mono">时间</th>
                <th class="px-5 py-4 font-semibold font-mono text-right">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/[0.04]">
              <tr v-for="lead in leads" :key="lead.id" class="hover:bg-white/[0.02]">
                <td class="px-5 py-5 text-white font-mono text-sm">{{ lead.email }}</td>
                <td class="px-5 py-5 text-white/80 font-mono text-sm">{{ lead.phone }}</td>
                <td class="px-5 py-5 text-[#30d158] font-mono text-sm">{{ lead.subdomain }}</td>
                <td class="px-5 py-5 text-white/30 font-mono text-xs">{{ lead.user_id || '访客' }}</td>
                <td class="px-5 py-5 text-white/40 font-mono text-xs">{{ new Date(lead.created_at).toLocaleString() }}</td>
                <td class="px-5 py-5 text-right">
                  <button @click="handleDeleteLead(lead.id)" class="text-[11px] font-semibold bg-[#ff453a]/10 hover:bg-[#ff453a]/20 text-[#ff453a] px-4 py-2 rounded-full border border-[#ff453a]/20 transition-all cursor-pointer focus:outline-none">删除</button>
                </td>
              </tr>
              <tr v-if="!leads?.length">
                <td colspan="6" class="py-10 text-center text-xs text-white/25">暂无留资记录</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 分页控制栏 -->
        <div v-if="leadsTotal > 0" class="flex items-center justify-between px-5 py-3 border-t border-white/[0.05]">
          <div class="text-[11px] text-white/30 font-mono">
            共 {{ leadsTotal }} 条 · 第 {{ leadsPage }}/{{ totalPages }} 页
          </div>
          <div class="flex items-center gap-2">
            <button
              @click="handlePageChange(leadsPage - 1)"
              :disabled="leadsPage <= 1"
              class="text-[11px] font-semibold bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white/80 px-3 py-1.5 rounded-full border border-white/10 transition-all cursor-pointer focus:outline-none"
            >上一页</button>
            <button
              @click="handlePageChange(leadsPage + 1)"
              :disabled="leadsPage >= totalPages"
              class="text-[11px] font-semibold bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white/80 px-3 py-1.5 rounded-full border border-white/10 transition-all cursor-pointer focus:outline-none"
            >下一页</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
