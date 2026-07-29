<script setup lang="ts">
interface Feedback {
  id: string
  type: string
  rating: number
  content: string
  author_name: string | null
  campaign_subdomain: string | null
  is_approved: boolean
  created_at: string
}

const props = defineProps<{ isLoading: boolean }>()
const emit = defineEmits<{ refresh: [] }>()

const feedbacks = ref<Feedback[]>([])
const loading = ref(false)
const typeFilter = ref('ALL')
const currentPage = ref(1)
const pageSize = ref(20)
const feedbacksTotal = ref(0)
const selectedIds = ref<Set<string>>(new Set())
const batchLoading = ref(false)
const expandedId = ref<string | null>(null)
const confirmDialog = ref()

const totalPages = computed(() => Math.max(1, Math.ceil(feedbacksTotal.value / pageSize.value)))

const fetchFeedbacks = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams()
    params.set('page', String(currentPage.value))
    params.set('pageSize', String(pageSize.value))
    if (typeFilter.value !== 'ALL') params.set('type', typeFilter.value)
    const res = await $fetch<any>(`/api/admin/feedback?${params.toString()}`).catch(() => null)
    const data = res?.data || res
    if (data?.items) {
      feedbacks.value = data.items
      feedbacksTotal.value = data.pagination?.total || 0
    } else {
      feedbacks.value = Array.isArray(data?.feedbacks) ? data.feedbacks : []
      feedbacksTotal.value = feedbacks.value.length
    }
  } catch { feedbacks.value = []; feedbacksTotal.value = 0 }
  finally { loading.value = false }
}

onMounted(() => fetchFeedbacks())

watch(typeFilter, () => {
  currentPage.value = 1
  fetchFeedbacks()
})

const filteredFeedbacks = computed(() => feedbacks.value)

const avgRating = computed(() => {
  if (!feedbacks.value.length) return 0
  return Math.round(feedbacks.value.reduce((s, f) => s + (f.rating || 0), 0) / feedbacks.value.length * 10) / 10
})

// 评分分布
const ratingDistribution = computed(() => {
  const dist: number[] = [0, 0, 0, 0, 0]
  feedbacks.value.forEach(f => {
    const idx = f.rating - 1
    if (idx >= 0 && idx < 5) dist[idx]!
    if (idx >= 0 && idx < 5) { dist.splice(idx, 1, (dist[idx] ?? 0) + 1) }
  })
  const max = Math.max(...dist, 1)
  return dist.map((count, i) => ({ stars: i + 1, count, percent: (count / max) * 100 }))
})

const pendingCount = computed(() => feedbacks.value.filter(f => !f.is_approved).length)

const typeLabels: Record<string, string> = {
  review: '评价', bug: 'Bug', feature: '建议', general: '通用'
}
const typeFilterList = ['ALL', 'review', 'bug', 'feature', 'general']
const typeFilterLabels: Record<string, string> = {
  ALL: '全部类型', review: '评价', bug: 'Bug 反馈', feature: '功能建议', general: '通用反馈'
}

const handlePageChange = (page: number) => {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  fetchFeedbacks()
}

// 审核操作
const approveLoading = ref<Record<string, boolean>>({})
async function toggleApprove(f: Feedback) {
  approveLoading.value[f.id] = true
  try {
    await $fetch(`/api/admin/feedback/${f.id}`, { method: 'PATCH', body: { is_approved: !f.is_approved } })
    f.is_approved = !f.is_approved
  } catch { /* silent */ }
  finally { approveLoading.value[f.id] = false }
}

const deleteLoading = ref<Record<string, boolean>>({})
async function deleteFeedback(f: Feedback) {
  if (!await confirmDialog.value.show('确定删除此条反馈？', { title: '删除反馈', confirmText: '确认删除', icon: 'i-lucide-trash-2' })) return
  deleteLoading.value[f.id] = true
  try {
    await $fetch(`/api/admin/feedback/${f.id}`, { method: 'DELETE' })
    feedbacks.value = feedbacks.value.filter(item => item.id !== f.id)
    feedbacksTotal.value = Math.max(0, feedbacksTotal.value - 1)
  } catch { /* silent */ }
  finally { deleteLoading.value[f.id] = false }
}

// 批量审批
const toggleSelect = (id: string) => {
  const s = new Set(selectedIds.value)
  s.has(id) ? s.delete(id) : s.add(id)
  selectedIds.value = s
}
const toggleSelectAll = () => {
  if (selectedIds.value.size === filteredFeedbacks.value.length) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(filteredFeedbacks.value.map(f => f.id))
  }
}
const isAllSelected = computed(() => filteredFeedbacks.value.length > 0 && selectedIds.value.size === filteredFeedbacks.value.length)

async function batchApprove() {
  if (selectedIds.value.size === 0) return
  batchLoading.value = true
  try {
    const ids = Array.from(selectedIds.value)
    await Promise.all(ids.map(id => $fetch(`/api/admin/feedback/${id}`, { method: 'PATCH', body: { is_approved: true } })))
    feedbacks.value.forEach(f => { if (selectedIds.value.has(f.id)) f.is_approved = true })
    selectedIds.value = new Set()
  } catch { /* silent */ }
  finally { batchLoading.value = false }
}
</script>

<template>
  <div class="space-y-4 sm:space-y-5 animate-fade-in text-white">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-[22px] sm:text-[26px] md:text-[28px] font-bold text-white tracking-tight">用户反馈</h1>
        <p class="text-white/40 text-xs mt-0.5">查看用户提交的评价与反馈，审核管理用户声音</p>
      </div>
      <button
        @click="async () => { emit('refresh'); await fetchFeedbacks() }"
        :disabled="loading"
        class="text-xs bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-full transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
      >
        <span :class="{ 'animate-spin': loading }">
          <span class="i-lucide-refresh-cw text-xs"></span>
        </span>
        {{ loading ? '刷新中...' : '刷新' }}
      </button>
    </div>

    <!-- KPI + 评分分布 -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
      <div class="relative p-4 rounded-xl bg-white/[0.03] border border-white/[0.05] overflow-hidden transition-all duration-300 hover:bg-white/[0.045] hover:border-white/[0.08] hover:-translate-y-px group">
        <div class="absolute -top-12 -right-12 w-24 h-24 rounded-full bg-blue-500/[0.04] blur-3xl group-hover:bg-blue-500/[0.07] transition-all duration-500"></div>
        <div class="relative z-10">
          <div class="flex items-center gap-1.5 mb-1">
            <span class="i-lucide-message-square text-[11px] text-blue-400/60" />
            <span class="text-[9px] font-semibold uppercase tracking-[0.1em] text-white/25">反馈总量</span>
          </div>
          <span class="text-[26px] font-bold tracking-tight text-white font-mono leading-none">{{ feedbacksTotal }}</span>
        </div>
      </div>
      <div class="relative p-4 rounded-xl bg-white/[0.03] border border-white/[0.05] overflow-hidden transition-all duration-300 hover:bg-white/[0.045] hover:border-[#ff9f0a]/15 hover:-translate-y-px group">
        <div class="absolute -top-12 -right-12 w-24 h-24 rounded-full bg-amber-500/[0.04] blur-3xl group-hover:bg-amber-500/[0.07] transition-all duration-500"></div>
        <div class="relative z-10">
          <div class="flex items-center gap-1.5 mb-1">
            <span class="i-lucide-star text-[11px] text-amber-400/60" />
            <span class="text-[9px] font-semibold uppercase tracking-[0.1em] text-white/25">平均评分</span>
          </div>
          <span class="text-[26px] font-bold tracking-tight text-[#ff9f0a] font-mono leading-none">{{ avgRating }} <span class="text-[14px] text-white/20">/ 5</span></span>
        </div>
      </div>
      <div class="relative p-4 rounded-xl bg-white/[0.03] border border-white/[0.05] overflow-hidden transition-all duration-300 hover:bg-white/[0.045] hover:border-[#ff453a]/15 hover:-translate-y-px group">
        <div class="absolute -top-12 -right-12 w-24 h-24 rounded-full bg-red-500/[0.04] blur-3xl group-hover:bg-red-500/[0.07] transition-all duration-500"></div>
        <div class="relative z-10">
          <div class="flex items-center gap-1.5 mb-1">
            <span class="i-lucide-clock text-[11px] text-red-400/60" />
            <span class="text-[9px] font-semibold uppercase tracking-[0.1em] text-white/25">待审核</span>
          </div>
          <span class="text-[26px] font-bold tracking-tight text-[#ff453a] font-mono leading-none">{{ pendingCount }}</span>
        </div>
      </div>
      <!-- 评分分布图 -->
      <div class="relative p-4 rounded-xl bg-white/[0.03] border border-white/[0.05] overflow-hidden">
        <div class="text-[9px] font-semibold uppercase tracking-[0.1em] text-white/25 mb-2">评分分布</div>
        <div class="space-y-1">
          <div v-for="r in ratingDistribution" :key="r.stars" class="flex items-center gap-1.5">
            <span class="text-[9px] text-[#ff9f0a] font-mono w-2.5">{{ r.stars }}</span>
            <div class="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
              <div class="h-full bg-[#ff9f0a]/60 rounded-full transition-all duration-500" :style="{ width: r.percent + '%' }" />
            </div>
            <span class="text-[9px] text-white/25 font-mono w-3.5 text-right">{{ r.count }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 筛选栏 + 批量操作 -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
      <div class="overflow-x-auto max-w-full">
        <div class="inline-flex bg-white/[0.02] border border-white/[0.06] p-1 rounded-full shadow-[inset_0_1px_rgba(0,0,0,0.02)] whitespace-nowrap">
          <button
            v-for="t in typeFilterList"
            :key="t"
            @click="typeFilter = t"
            class="text-[10px] font-semibold px-3 py-2 sm:px-4.5 sm:py-2.5 rounded-full transition-all cursor-pointer focus:outline-none border-0 whitespace-nowrap"
            :class="typeFilter === t
              ? 'bg-white/10 text-white shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_rgba(0,0,0,0.05)]'
              : 'bg-transparent text-white/60 hover:text-white/90'"
          >
            {{ typeFilterLabels[t] || t }}
          </button>
        </div>
      </div>
      <span class="text-xs text-white/30 font-mono whitespace-nowrap">{{ filteredFeedbacks.length }} 条结果</span>
      <div class="ml-auto flex items-center gap-2">
        <button
          v-if="selectedIds.size > 0"
          @click="batchApprove"
          :disabled="batchLoading"
          class="text-[11px] font-semibold bg-[#30d158]/10 hover:bg-[#30d158]/20 disabled:opacity-50 text-[#30d158] px-4 py-2 rounded-full border border-[#30d158]/20 transition-all active:scale-[0.93] cursor-pointer"
        >
          {{ batchLoading ? '处理中...' : `批量审批 (${selectedIds.size})` }}
        </button>
      </div>
    </div>

    <!-- 紧凑列表视图 -->
    <div class="bg-white/[0.04] rounded-2xl overflow-hidden shadow-xl shadow-black/20">
      <div class="overflow-x-auto overflow-y-auto max-h-[42vh]">
        <table class="w-full text-left text-sm border-collapse">
          <thead class="sticky top-0 z-10">
            <tr class="border-b border-white/[0.05] text-white/40 uppercase tracking-widest text-[10px] bg-[#0d0d18]/95 backdrop-blur-sm">
              <th class="px-3 py-3 md:px-4 md:py-3 font-semibold font-mono w-8">
                <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" class="accent-indigo-500 cursor-pointer" />
              </th>
              <th class="px-3 py-3 md:px-4 md:py-3 font-semibold font-mono">类型</th>
              <th class="px-3 py-3 md:px-4 md:py-3 font-semibold font-mono">评分</th>
              <th class="px-3 py-3 md:px-4 md:py-3 font-semibold font-mono">内容</th>
              <th class="px-3 py-3 md:px-4 md:py-3 font-semibold font-mono hidden md:table-cell">用户</th>
              <th class="px-3 py-3 md:px-4 md:py-3 font-semibold font-mono hidden lg:table-cell">时间</th>
              <th class="px-3 py-3 md:px-4 md:py-3 font-semibold font-mono">状态</th>
              <th class="px-3 py-3 md:px-4 md:py-3 font-semibold font-mono text-right">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/[0.04]">
            <template v-for="f in filteredFeedbacks" :key="f.id">
              <tr
                class="hover:bg-white/[0.02] transition-colors duration-200 cursor-pointer"
                @click="expandedId = expandedId === f.id ? null : f.id"
              >
                <td class="px-3 py-3 md:px-4 md:py-3" @click.stop>
                  <input type="checkbox" :checked="selectedIds.has(f.id)" @change="toggleSelect(f.id)" class="accent-indigo-500 cursor-pointer" />
                </td>
                <td class="px-3 py-3 md:px-4 md:py-3">
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                    :class="{
                      'bg-indigo-500/10 text-indigo-400 border-indigo-500/20': f.type === 'review',
                      'bg-[#ff453a]/10 text-[#ff453a] border-[#ff453a]/20': f.type === 'bug',
                      'bg-[#ff9f0a]/10 text-[#ff9f0a] border-[#ff9f0a]/20': f.type === 'feature',
                      'bg-white/5 text-white/50 border-white/10': f.type === 'general'
                    }">
                    {{ typeLabels[f.type] || f.type }}
                  </span>
                </td>
                <td class="px-3 py-3 md:px-4 md:py-3">
                  <span v-if="f.rating" class="text-[#ff9f0a] text-xs font-mono">{{ '★'.repeat(f.rating) }}{{ '☆'.repeat(5 - f.rating) }}</span>
                  <span v-else class="text-white/20 text-xs">-</span>
                </td>
                <td class="px-3 py-3 md:px-4 md:py-3">
                  <p class="text-white/80 text-xs leading-relaxed truncate max-w-[300px]">{{ f.content }}</p>
                </td>
                <td class="px-3 py-3 md:px-4 md:py-3 text-xs text-white/50 hidden md:table-cell">
                  {{ f.author_name || '匿名' }}
                  <span v-if="f.campaign_subdomain" class="text-white/25 ml-1">@{{ f.campaign_subdomain }}</span>
                </td>
                <td class="px-3 py-3 md:px-4 md:py-3 text-xs text-white/40 font-mono hidden lg:table-cell">{{ new Date(f.created_at).toLocaleDateString('zh-CN') }}</td>
                <td class="px-3 py-3 md:px-4 md:py-3">
                  <span class="text-[10px] px-2 py-0.5 rounded-full border"
                    :class="f.is_approved ? 'bg-[#30d158]/10 text-[#30d158] border-[#30d158]/20' : 'bg-[#ff9f0a]/10 text-[#ff9f0a] border-[#ff9f0a]/20'">
                    {{ f.is_approved ? '已审批' : '待审核' }}
                  </span>
                </td>
                <td class="px-3 py-3 md:px-4 md:py-3 text-right" @click.stop>
                  <div class="flex items-center justify-end gap-2">
                    <button
                      @click="toggleApprove(f)"
                      :disabled="approveLoading[f.id]"
                      class="px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all cursor-pointer disabled:opacity-50"
                      :class="f.is_approved
                        ? 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'
                        : 'bg-[#30d158]/10 text-[#30d158] border-[#30d158]/20 hover:bg-[#30d158]/20'">
                      {{ f.is_approved ? '撤回' : '审批' }}
                    </button>
                    <button
                      @click="deleteFeedback(f)"
                      :disabled="deleteLoading[f.id]"
                      class="px-2 py-1 rounded-full text-[10px] font-semibold border border-[#ff453a]/20 text-[#ff453a]/60 hover:bg-[#ff453a]/10 hover:text-[#ff453a] transition-all cursor-pointer disabled:opacity-50">
                      删除
                    </button>
                  </div>
                </td>
              </tr>
              <!-- 展开详情 -->
              <tr v-if="expandedId === f.id">
                <td colspan="8" class="px-4 py-0">
                  <div class="bg-white/[0.02] rounded-xl p-5 my-2 shadow-lg shadow-black/10">
                    <p class="text-white/80 text-sm leading-relaxed font-light">{{ f.content }}</p>
                    <div class="mt-3 flex items-center gap-4 text-[11px] text-white/30 font-mono">
                      <span>作者: {{ f.author_name || '匿名' }}</span>
                      <span>时间: {{ new Date(f.created_at).toLocaleString() }}</span>
                      <span v-if="f.campaign_subdomain">来源: {{ f.campaign_subdomain }}</span>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
            <tr v-if="!filteredFeedbacks.length">
              <td colspan="8" class="py-16 text-center">
                <div class="flex flex-col items-center gap-3">
                  <span class="i-lucide-inbox text-[32px] text-white/10" />
                  <span class="text-xs text-white/25 font-light">暂无用户反馈数据</span>
                  <span class="text-[10px] text-white/15">反馈数据将在用户提交后自动显示</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 分页控制栏 -->
    <div v-if="feedbacksTotal > 0" class="flex items-center justify-between px-5 py-3 bg-white/[0.02] rounded-xl border border-white/[0.04]">
      <div class="text-[11px] text-white/30 font-mono">共 {{ feedbacksTotal }} 条 · 第 {{ currentPage }}/{{ totalPages }} 页</div>
      <div class="flex items-center gap-2">
        <button @click="handlePageChange(currentPage - 1)" :disabled="currentPage <= 1" class="text-[11px] font-semibold bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white/80 px-3 py-1.5 rounded-full border border-white/10 transition-all cursor-pointer focus:outline-none">上一页</button>
        <button @click="handlePageChange(currentPage + 1)" :disabled="currentPage >= totalPages" class="text-[11px] font-semibold bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white/80 px-3 py-1.5 rounded-full border border-white/10 transition-all cursor-pointer focus:outline-none">下一页</button>
      </div>
    </div>
    <AdminConfirmDialog ref="confirmDialog" />
  </div>
</template>
