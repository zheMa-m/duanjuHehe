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

const totalPages = computed(() => Math.max(1, Math.ceil(feedbacksTotal.value / pageSize.value)))

const fetchFeedbacks = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams()
    params.set('page', String(currentPage.value))
    params.set('pageSize', String(pageSize.value))
    if (typeFilter.value !== 'ALL') params.set('type', typeFilter.value)
    const res = await $fetch<any>(`/api/v1/feedback?${params.toString()}`).catch(() => null)
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

const typeLabels: Record<string, string> = {
  review: '评价', bug: 'Bug', feature: '建议', general: '通用'
}

const handlePageChange = (page: number) => {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  fetchFeedbacks()
}
</script>

<template>
  <div class="space-y-8 animate-fade-in text-white">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-[28px] font-bold text-white tracking-tight">用户反馈</h1>
        <p class="text-white/40 text-sm mt-1">查看用户提交的评价与反馈，审核管理用户声音</p>
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

    <!-- KPI -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
      <div class="relative p-7 rounded-[14px] bg-white/[0.03] border border-white/[0.05] overflow-hidden transition-all duration-300 hover:bg-white/[0.045] hover:border-white/[0.08] hover:-translate-y-px hover:shadow-[0_12px_40px_rgba(0,0,0,0.25)] group">
        <div class="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-blue-500/[0.04] blur-3xl group-hover:bg-blue-500/[0.07] transition-all duration-500"></div>
        <div class="relative z-10">
          <div class="flex items-center gap-2 mb-3">
            <span class="i-lucide-message-square text-[13px] text-blue-400/60" />
            <span class="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/25">反馈总量</span>
          </div>
          <span class="text-[42px] font-bold tracking-tight text-white font-mono leading-none">{{ feedbacksTotal }}</span>
          <div class="text-[11px] text-white/20 mt-2 font-light leading-relaxed">用户反馈总量</div>
        </div>
      </div>
      <div class="relative p-7 rounded-[14px] bg-white/[0.03] border border-white/[0.05] overflow-hidden transition-all duration-300 hover:bg-white/[0.045] hover:border-[#ff9f0a]/15 hover:-translate-y-px hover:shadow-[0_12px_40px_rgba(0,0,0,0.25)] group">
        <div class="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-amber-500/[0.04] blur-3xl group-hover:bg-amber-500/[0.07] transition-all duration-500"></div>
        <div class="relative z-10">
          <div class="flex items-center gap-2 mb-3">
            <span class="i-lucide-star text-[13px] text-amber-400/60" />
            <span class="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/25">平均评分</span>
          </div>
          <span class="text-[42px] font-bold tracking-tight text-[#ff9f0a] font-mono leading-none">{{ avgRating }} <span class="text-[20px] text-white/20">/ 5</span></span>
          <div class="text-[11px] text-white/20 mt-2 font-light leading-relaxed">平均评分</div>
        </div>
      </div>
      <div class="relative p-7 rounded-[14px] bg-white/[0.03] border border-white/[0.05] overflow-hidden transition-all duration-300 hover:bg-white/[0.045] hover:border-[#30d158]/15 hover:-translate-y-px hover:shadow-[0_12px_40px_rgba(0,0,0,0.25)] group">
        <div class="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-emerald-500/[0.04] blur-3xl group-hover:bg-emerald-500/[0.07] transition-all duration-500"></div>
        <div class="relative z-10">
          <div class="flex items-center gap-2 mb-3">
            <span class="i-lucide-check-circle text-[13px] text-emerald-400/60" />
            <span class="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/25">已审批</span>
          </div>
          <span class="text-[42px] font-bold tracking-tight text-[#30d158] font-mono leading-none">{{ feedbacks.filter(f => f.is_approved).length }}</span>
          <div class="text-[11px] text-white/20 mt-2 font-light leading-relaxed">已审批通过</div>
        </div>
      </div>
    </div>

    <!-- 筛选 -->
    <div class="flex items-center gap-3">
      <select
        v-model="typeFilter"
        class="bg-[#141416] border border-white/[0.08] hover:border-white/20 rounded-full px-4 py-2 text-xs text-white/80 focus:outline-none focus:border-indigo-500/40 transition-all font-light cursor-pointer"
      >
        <option value="ALL">全部类型</option>
        <option value="review">评价</option>
        <option value="bug">Bug 反馈</option>
        <option value="feature">功能建议</option>
        <option value="general">通用反馈</option>
      </select>
      <span class="text-xs text-white/30 font-mono">{{ filteredFeedbacks.length }} 条结果</span>
    </div>

    <!-- 反馈列表（锁定高度 + 内部滚动） -->
    <div class="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
      <div
        v-for="f in filteredFeedbacks"
        :key="f.id"
        class="bg-white/[0.04] rounded-2xl p-6 shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/25 transition-all relative overflow-hidden group"
      >
        <div class="flex justify-between items-start gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-2">
              <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                :class="{
                  'bg-indigo-500/10 text-indigo-400 border-indigo-500/20': f.type === 'review',
                  'bg-[#ff453a]/10 text-[#ff453a] border-[#ff453a]/20': f.type === 'bug',
                  'bg-[#ff9f0a]/10 text-[#ff9f0a] border-[#ff9f0a]/20': f.type === 'feature',
                  'bg-white/5 text-white/50 border-white/10': f.type === 'general'
                }">
                {{ typeLabels[f.type] || f.type }}
              </span>
              <span v-if="f.rating" class="text-[#ff9f0a] text-xs font-mono">
                {{ '★'.repeat(f.rating) }}{{ '☆'.repeat(5 - f.rating) }}
              </span>
              <span v-if="f.campaign_subdomain" class="text-[10px] text-white/30 font-mono">@{{ f.campaign_subdomain }}</span>
            </div>
            <p class="text-white/80 text-sm leading-relaxed font-light">{{ f.content }}</p>
            <div class="mt-2 flex items-center gap-3 text-xs text-white/30 font-mono">
              <span>{{ f.author_name || '匿名' }}</span>
              <span>{{ new Date(f.created_at).toLocaleString() }}</span>
            </div>
          </div>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold border flex-shrink-0"
            :class="f.is_approved
              ? 'bg-[#30d158]/10 text-[#30d158] border-[#30d158]/20'
              : 'bg-[#ff9f0a]/10 text-[#ff9f0a] border-[#ff9f0a]/20'">
            {{ f.is_approved ? '已审批' : '待审核' }}
          </span>
        </div>
      </div>
      <div v-if="!filteredFeedbacks.length" class="py-12 text-center text-xs text-white/25 font-light">
        暂无用户反馈数据
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
  </div>
</template>
